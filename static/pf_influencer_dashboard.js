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

    // --- Authentication and Authorization with Realtime Listener ---
    onAuthStateChanged(auth, (user) => {
        if (unsubscribeUserListener) unsubscribeUserListener();

        if (user) {
            const userRef = doc(db, 'users', user.uid);
            unsubscribeUserListener = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = { id: docSnap.id, ...docSnap.data() };
                    if (userData.role === 'influencer') {
                        loadDashboard(userData);
                    } else {
                        handleAccessDenied('You are not an approved influencer.');
                    }
                } else {
                    handleAccessDenied("Your user profile could not be found.");
                }
            }, (error) => {
                handleAccessDenied(error.message);
            });
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/i`;
        }
    });
    
    function handleAccessDenied(message) {
        if (unsubscribeUserListener) unsubscribeUserListener();
        document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-500 font-bold">Access Denied</h1><p>${message}</p></div>`;
    }

    /**
     * Main function to load/update dashboard data.
     * @param {object} influencerData - The influencer's real-time data.
     */
    async function loadDashboard(influencerData) {
        try {
            // Fetch non-realtime data
            const [stats, posts] = await Promise.all([
                fetchInfluencerStats(influencerData.id),
                fetchInfluencerPosts(influencerData.id)
            ]);
            
            // Populate UI with both realtime and fetched data
            populateProfileHeader(influencerData);
            populateStatsCards(influencerData, stats);
            displayPosts(posts);

            loadingContainer.classList.add('hidden');
            dashboardContent.classList.remove('hidden');
        } catch(error) {
            console.error("Error loading dashboard components:", error);
            dashboardContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    }
    
    /**
     * Populates the profile header section.
     */
    function populateProfileHeader(userData) {
        const profile = userData.influencerApplication?.page;
        const profilePic = getElement('profile-pic');
        const pageName = getElement('page-name');
        const categoryEl = getElement('category');
        const usernameEl = getElement('username');
        const copyLinkBtn = getElement('copy-profile-link');
        
        if (profilePic) profilePic.src = profile?.pageProfilePicUrl || 'https://via.placeholder.com/120';
        if (pageName) pageName.textContent = profile?.pageName || userData.name || 'No Page Name';
        if (categoryEl) categoryEl.textContent = profile?.category || 'No Category';
        if (usernameEl) usernameEl.textContent = `@${userData.name || 'username'}`;
        if (copyLinkBtn) {
            copyLinkBtn.onclick = () => {
                const profileUrl = `${window.location.origin}/pf/influencer/${userData.id}`;
                navigator.clipboard.writeText(profileUrl).then(() => alert('Profile link copied!'));
            };
        }
    }
    
    /**
     * Populates the main stats cards.
     */
    function populateStatsCards(influencerData, stats) {
        const balanceEl = getElement('balance');
        const worksCompletedEl = getElement('works-completed');
        const totalEarnedEl = getElement('total-earned');
        const pendingWorksEl = getElement('pending-works');
        
        if (balanceEl) balanceEl.textContent = `৳${(influencerData.influencerBalance || 0).toFixed(2)}`;
        if (worksCompletedEl) worksCompletedEl.textContent = stats.completed;
        if (totalEarnedEl) totalEarnedEl.textContent = `৳${(stats.totalEarned || 0).toFixed(2)}`;
        if (pendingWorksEl) pendingWorksEl.textContent = stats.pending;
    }

    /**
     * Fetches statistics about the influencer's work.
     */
    async function fetchInfluencerStats(userId) {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("influencerId", "==", userId));
        const snapshot = await getDocs(q);

        let completed = 0, pending = 0, totalEarned = 0;
        snapshot.forEach(doc => {
            const work = doc.data();
            if (work.status === 'completed') {
                completed++;
                totalEarned += (Number(work.budget) || 0) * 0.90;
            } else if (['pending', 'in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status)) {
                pending++;
            }
        });
        return { completed, pending, totalEarned };
    }

    /**
     * Fetches the influencer's own service posts.
     */
    async function fetchInfluencerPosts(userId) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where("authorId", "==", userId), where("type", "==", "service"), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Displays the influencer's posts in the list.
     */
    function displayPosts(posts) {
        const postList = getElement('post-list');
        if (!postList) return;
        if (!posts || posts.length === 0) {
            postList.innerHTML = `<p class="text-gray-500">You haven't posted any services yet. <a href="/pf/dashboard/i/ad" class="text-mulberry">Post one now!</a></p>`;
            return;
        }
        postList.innerHTML = posts.map(post => `
            <div class="border-b border-dark pb-3">
                <a href="/pf/work/${post.id}" class="font-semibold hover:text-mulberry">${post.title}</a>
                <p class="text-xs text-gray-400">Budget: ৳${post.budget} - Status: <span class="capitalize">${post.status || 'Active'}</span></p>
            </div>
        `).join('');
    }

    // --- Logout Button Event Listener ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribeUserListener) unsubscribeUserListener();
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
