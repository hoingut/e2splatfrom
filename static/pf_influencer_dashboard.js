// static/pf_influencer_dashboard.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, orderBy, limit, 
    onSnapshot // Realtime listener import
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const affiliateName = getElement('affiliate-name');
    const affiliateId = getElement('affiliate-id');
    const affiliateBalance = getElement('affiliate-balance');
    const totalOrders = getElement('total-orders'); // Assuming this is works-completed
    const totalEarned = getElement('total-earned');
    const pendingWorks = getElement('pending-works');
    const productsGrid = getElement('affiliate-products-grid'); // Assuming this is post-list
    const logoutBtn = getElement('logout-btn');
    const copyLinkBtn = getElement('copy-profile-link');
    const profilePic = getElement('profile-pic');
    const pageName = getElement('page-name');
    const categoryEl = getElement('category');
    const usernameEl = getElement('username');
    const postList = getElement('post-list');

    let unsubscribeUserListener = null; // To hold the cleanup function for the listener

    // --- Step 3: Authentication and Authorization Check with Realtime Listener ---
    onAuthStateChanged(auth, (user) => {
        // Cleanup previous listener if user logs out and logs back in without a page refresh
        if (unsubscribeUserListener) {
            unsubscribeUserListener();
        }

        if (user) {
            const userRef = doc(db, 'users', user.uid);
            
            // onSnapshot listens for any changes to the user's document in realtime
            unsubscribeUserListener = onSnapshot(userRef, (docSnap) => {
                console.log("DEBUG: Realtime user data updated.");
                if (docSnap.exists()) {
                    const userData = { id: docSnap.id, ...docSnap.data() };
                    if (userData.role === 'influencer') {
                        loadDashboard(userData);
                    } else {
                        handleAccessDenied('You are not an approved influencer.');
                    }
                } else {
                    handleAccessDenied("User document not found.");
                }
            }, (error) => {
                console.error("DEBUG: Error listening to user document:", error);
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
     * Main function to load/update all dashboard data.
     * @param {object} influencerData - The influencer's real-time data from the 'users' document.
     */
    async function loadDashboard(influencerData) {
        try {
            const [stats, posts] = await Promise.all([
                fetchInfluencerStats(influencerData.id),
                fetchInfluencerPosts(influencerData.id)
            ]);
            
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
        if (!profile) return;
        
        profilePic.src = profile.pageProfilePicUrl || 'https://via.placeholder.com/100';
        pageName.textContent = profile.pageName || 'No Name';
        categoryEl.textContent = profile.category || 'No Category';
        usernameEl.textContent = `@${userData.name || 'username'}`;

        copyLinkBtn.onclick = () => { // Use onclick for simplicity here
            const profileUrl = `${window.location.origin}/pf/influencer/${userData.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                alert('Profile link copied!');
            });
        };
    }
    
    /**
     * Populates the main stats cards.
     */
    function populateStatsCards(influencerData, stats) {
        affiliateBalance.textContent = `৳${(influencerData.influencerBalance || 0).toFixed(2)}`;
        getElement('works-completed').textContent = stats.completed;
        totalEarned.textContent = `৳${(stats.totalEarned || 0).toFixed(2)}`;
        pendingWorks.textContent = stats.pending;
    }

    /**
     * Fetches statistics about the influencer's work from the 'works' collection.
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
                totalEarned += Number(work.budget) * 0.90 || 0;
            } else if (['pending', 'in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status)) {
                pending++;
            }
        });
        return { completed, pending, totalEarned };
    }

    /**
     * Fetches the influencer's own service posts from the 'posts' collection.
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
            if (unsubscribeUserListener) unsubscribeUserListener(); // Clean up listener on logout
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
