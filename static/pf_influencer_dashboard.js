// static/pf_influencer_dashboard.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const logoutBtn = getElement('logout-btn');
    
    let unsubscribeUserListener = null;
    let earningsChart = null; // To hold the chart instance

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, (user) => {
        if (unsubscribeUserListener) unsubscribeUserListener();
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            unsubscribeUserListener = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    loadDashboard({ id: docSnap.id, ...docSnap.data() });
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
     */
    async function loadDashboard(influencerData) {
        try {
            populateHeader(influencerData);
            
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
            console.error("Error loading dashboard:", error);
            dashboardContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    }
    
    // --- UI Population Functions ---
    function populateHeader(userData) {
        getElement('user-name').textContent = userData.name || 'User';
        getElement('profile-pic-header').src = userData.influencerApplication?.personal?.ownerPicUrl || 'https://via.placeholder.com/40';
        getElement('view-profile-link').href = `/pf/influencer/${userData.id}`;
    }
    
    function populateStatsCards(influencerData, stats) {
        getElement('balance').textContent = `৳${(influencerData.influencerBalance || 0).toFixed(2)}`;
        getElement('pending-works').textContent = stats.pending;
        getElement('works-completed').textContent = stats.completed;
    }

    /**
     * Fetches statistics about the influencer's work.
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
                const approvalMonth = work.approvedAt.toDate().getMonth();
                monthlyEarnings[monthNames[approvalMonth]] += profit;
            } else if (['in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status)) {
                pending++;
            }
        });
        return { completed, pending, monthlyEarnings };
    }

    /**
     * Fetches recent activities (new works, completed works).
     */
    async function fetchRecentActivity(userId) {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("influencerId", "==", userId), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data());
    }

    function displayRecentActivity(activities) {
        const listEl = getElement('recent-activity-list');
        if (!activities || activities.length === 0) {
            listEl.innerHTML = `<p class="text-gray-500">No recent activity.</p>`;
            return;
        }
        listEl.innerHTML = activities.map(act => {
            const icon = act.status === 'completed' ? 'fa-check-circle text-green-400' : 'fa-hourglass-start text-yellow-400';
            return `
                <div class="flex items-start space-x-3">
                    <i class="fas ${icon} mt-1"></i>
                    <div>
                        <p class="text-sm font-semibold">${act.title}</p>
                        <p class="text-xs text-gray-400">Status: ${act.status.replace('-', ' ')}</p>
                    </div>
                </div>`;
        }).join('');
    }

    /**
     * Renders the earnings chart using Chart.js.
     */
    function renderEarningsChart(monthlyEarnings) {
        const ctx = getElement('earnings-chart').getContext('2d');
        if (earningsChart) {
            earningsChart.data.datasets[0].data = Object.values(monthlyEarnings);
            earningsChart.update();
            return;
        }
        earningsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(monthlyEarnings).slice(0, 6), // Show first 6 months
                datasets: [{
                    label: 'Earnings',
                    data: Object.values(monthlyEarnings).slice(0, 6),
                    backgroundColor: 'rgba(125, 40, 93, 0.6)', // Mulberry with opacity
                    borderColor: '#7d285d',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#9CA3AF' } },
                    x: { ticks: { color: '#9CA3AF' } }
                },
                plugins: { legend: { display: false } }
            }
        });
    }

    // Logout Button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribeUserListener) unsubscribeUserListener();
            signOut(auth);
        });
    }
});
