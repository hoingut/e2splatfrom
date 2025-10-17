// static/pf_influencer_dashboard.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, orderBy, limit, 
    onSnapshot // Realtime listener for balance updates
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References (Defensive Selection) ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const userNameEl = getElement('user-name');
    const profilePicHeaderEl = getElement('profile-pic-header');
    const viewProfileLinkEl = getElement('view-profile-link');
    const balanceEl = getElement('balance');
    const pendingWorksEl = getElement('pending-works');
    const worksCompletedEl = getElement('works-completed');
    const earningsChartCanvas = getElement('earnings-chart');
    const recentActivityListEl = getElement('recent-activity-list');
    const logoutBtn = getElement('logout-btn');
    
    let unsubscribeUserListener = null;
    let earningsChart = null; // To hold the chart instance

    // --- Step 3: Authentication and Authorization Check ---
    onAuthStateChanged(auth, (user) => {
        if (unsubscribeUserListener) unsubscribeUserListener(); // Clean up old listener
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            
            // Use onSnapshot for REALTIME updates to the user's document (especially for balance)
            unsubscribeUserListener = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    const userData = { id: docSnap.id, ...docSnap.data() };
                    loadDashboard(userData); // Load/refresh dashboard with new data
                } else {
                    handleAccessDenied('You are not an approved influencer.');
                }
            }, (error) => handleAccessDenied(error.message));
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/i`;
        }
    });

    function handleAccessDenied(message) {
        if (unsubscribeUserListener) unsubscribeUserListener();
        document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-red-500">${message}</h1></div>`;
    }

    /**
     * Main function to load/update all dashboard data.
     * @param {object} influencerData - The influencer's real-time data from the 'users' document.
     */
    async function loadDashboard(influencerData) {
        try {
            populateHeader(influencerData);
            
            // Fetch stats and activities which don't need to be real-time
            const [stats, activities] = await Promise.all([
                fetchInfluencerStats(influencerData.id),
                fetchRecentActivity(influencerData.id)
            ]);
            
            populateStatsCards(influencerData, stats);
            displayRecentActivity(activities);
            renderEarningsChart(stats.monthlyEarnings);
            
            loadingContainer.classList.add('hidden');
            dashboardContent.classList.remove('hidden');
        } catch(error) {
            console.error("Error loading dashboard components:", error);
            dashboardContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    }
    
    // --- UI Population Functions ---
    function populateHeader(userData) {
        if (userNameEl) userNameEl.textContent = userData.name || 'User';
        if (profilePicHeaderEl) profilePicHeaderEl.src = userData.influencerApplication?.personal?.ownerPicUrl || 'https://via.placeholder.com/40';
        if (viewProfileLinkEl) viewProfileLinkEl.href = `/pf/influencer/${userData.id}`;
    }
    
    function populateStatsCards(influencerData, stats) {
        if (balanceEl) balanceEl.textContent = `৳${(influencerData.influencerBalance || 0).toFixed(2)}`;
        if (pendingWorksEl) pendingWorksEl.textContent = stats.pending;
        if (worksCompletedEl) worksCompletedEl.textContent = stats.completed;
    }

    /**
     * Fetches statistics about the influencer's work from the 'works' collection.
     */
    async function fetchInfluencerStats(userId) {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("influencerId", "==", userId));
        const snapshot = await getDocs(q);

        let completed = 0, pending = 0;
        const monthlyEarnings = { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 };
        const monthNames = Object.keys(monthlyEarnings);
        
        snapshot.forEach(doc => {
            const work = doc.data();
            if (work.status === 'completed' && work.approvedAt) {
                completed++;
                const profit = (Number(work.budget) || 0) * 0.90;
                try {
                    const approvalMonth = work.approvedAt.toDate().getMonth();
                    monthlyEarnings[monthNames[approvalMonth]] += profit;
                } catch (e) {
                    console.warn("Could not parse 'approvedAt' timestamp for a work document.");
                }
            } else if (['in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status)) {
                pending++;
            }
        });
        return { completed, pending, monthlyEarnings };
    }

    /**
     * Fetches recent activities (new works, completed works) for the right-side panel.
     */
    async function fetchRecentActivity(userId) {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("influencerId", "==", userId), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    }

    function displayRecentActivity(activities) {
        if (!recentActivityListEl) return;
        if (!activities || activities.length === 0) {
            recentActivityListEl.innerHTML = `<p class="text-gray-500">No recent activity to show.</p>`;
            return;
        }
        recentActivityListEl.innerHTML = activities.map(act => {
            const iconInfo = {
                'completed': { icon: 'fa-check-circle', color: 'text-green-400' },
                'in-progress': { icon: 'fa-hourglass-start', color: 'text-yellow-400' },
                'submitted-for-review': { icon: 'fa-eye', color: 'text-blue-400' }
            };
            const { icon, color } = iconInfo[act.status] || { icon: 'fa-info-circle', color: 'text-gray-400' };
            
            return `
                <div class="flex items-start space-x-3">
                    <i class="fas ${icon} ${color} mt-1 fa-fw"></i>
                    <div>
                        <p class="text-sm font-semibold">${act.title}</p>
                        <p class="text-xs text-gray-400">Status: <span class="capitalize">${act.status.replace('-', ' ')}</span></p>
                    </div>
                </div>`;
        }).join('');
    }

    /**
     * Renders or updates the earnings chart using Chart.js.
     */
    function renderEarningsChart(monthlyEarnings) {
        if (!earningsChartCanvas) return;
        const ctx = earningsChartCanvas.getContext('2d');
        const labels = Object.keys(monthlyEarnings).slice(-6); // Show last 6 months
        const data = Object.values(monthlyEarnings).slice(-6);

        if (earningsChart) {
            earningsChart.data.labels = labels;
            earningsChart.data.datasets[0].data = data;
            earningsChart.update();
            return;
        }
        earningsChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{
                    label: 'Earnings', data,
                    backgroundColor: 'rgba(125, 40, 93, 0.6)',
                    borderColor: '#7d285d', borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(55, 65, 81, 0.5)' } },
                    x: { ticks: { color: '#9CA3AF' }, grid: { display: false } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- Logout Button Event Listener ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribeUserListener) unsubscribeUserListener();
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
