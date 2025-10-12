// static/pf_user_dashboard.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const userName = getElement('user-name');
    const balance = getElement('balance');
    const workHistoryList = getElement('work-history-list');
    const influencerApplicationCard = getElement('influencer-application-card');
    const logoutBtn = getElement('logout-btn');

    let currentUser = null;

    // --- Authentication Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    // If user is already an approved influencer, redirect them to their dashboard
                    if (userData.role === 'influencer') {
                        window.location.href = '/pf/dashboard/i';
                        return; // Stop further execution
                    }
                    await loadDashboardData(userData);
                } else {
                    throw new Error("User data not found in database.");
                }
            } catch (error) {
                console.error("Error loading dashboard:", error);
                dashboardContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
                loadingContainer.classList.add('hidden');
                dashboardContent.classList.remove('hidden');
            }
        } else {
            window.location.href = `/login?redirect=/pf/dashboard`;
        }
    });

    /**
     * Main function to load all data for the user dashboard.
     * @param {object} userData - The user's data from Firestore.
     */
    async function loadDashboardData(userData) {
        // Populate header and balance
        userName.textContent = userData.name || 'User';
        balance.textContent = `৳${(userData.walletBalance || 0).toFixed(2)}`;

        // Populate influencer application card
        displayInfluencerApplicationStatus(userData);

        // Fetch and display user's job posts
        await fetchUserWorkHistory();

        loadingContainer.classList.add('hidden');
        dashboardContent.classList.remove('hidden');
    }

    /**
     * Displays the correct content in the influencer application card.
     */
    function displayInfluencerApplicationStatus(userData) {
        let content = '';
        switch (userData.applicationStatus) {
            case 'pending':
                content = `
                    <h3 class="font-semibold text-yellow-400">Application Pending</h3>
                    <p class="text-sm text-gray-400 mt-2">Your application to become an influencer is under review. We'll notify you soon!</p>
                `;
                break;
            case 'rejected':
                content = `
                    <h3 class="font-semibold text-red-400">Application Rejected</h3>
                    <p class="text-sm text-gray-400 mt-2">Your application was not approved at this time. Please contact support for details.</p>
                `;
                break;
            default: // No application or revoked
                content = `
                    <h3 class="font-semibold text-white">Are you a Content Creator?</h3>
                    <p class="text-sm text-gray-400 mt-2">Join our network to collaborate with brands and monetize your influence.</p>
                    <a href="/pf/apply-influencer" class="w-full block text-center mt-4 bg-mulberry hover:bg-mulberry-dark text-white font-bold py-2 px-4 rounded-md transition text-sm">
                        Apply to be an Influencer
                    </a>
                `;
        }
        influencerApplicationCard.innerHTML = content;
    }

    /**
     * Fetches and displays the job posts created by the current user.
     */
    async function fetchUserWorkHistory() {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            workHistoryList.innerHTML = `<p class="text-gray-500 text-center py-8">You haven't posted any jobs yet.</p>`;
            return;
        }

        workHistoryList.innerHTML = snapshot.docs.map(doc => {
            const post = doc.data();
            const status = post.status || 'Active'; // Example status
            const statusColors = {
                'Active': 'text-green-400',
                'In Progress': 'text-yellow-400',
                'Completed': 'text-blue-400',
            };

            return `
                <div class="border-b border-dark pb-3">
                    <div class="flex justify-between items-start">
                        <div>
                            <a href="/pf/work/${doc.id}" class="font-semibold hover:text-mulberry">${post.title}</a>
                            <p class="text-xs text-gray-400">Budget: ৳${post.budget}</p>
                        </div>
                        <span class="text-sm font-bold ${statusColors[status] || 'text-gray-400'} capitalize">${status}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Logout button event listener
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
