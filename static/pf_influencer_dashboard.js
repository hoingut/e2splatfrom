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
    const profilePic = getElement('profile-pic');
    const pageName = getElement('page-name');
    const categoryEl = getElement('category');
    const usernameEl = getElement('username');
    const copyLinkBtn = getElement('copy-profile-link');
    const balanceEl = getElement('balance');
    const worksCompletedEl = getElement('works-completed');
    const totalEarnedEl = getElement('total-earned');
    const pendingWorksEl = getElement('pending-works');
    const postList = getElement('post-list');
    const logoutBtn = getElement('logout-btn');

    let unsubscribeUserListener = null; // To hold the cleanup function for the listener

    // --- Step 3: Authentication and Authorization Check with Realtime Listener ---
    onAuthStateChanged(auth, (user) => {
        if (unsubscribeUserListener) unsubscribeUserListener(); // Clean up previous listener

        if (user) {
            const userRef = doc(db, 'users', user.uid);
            
            // onSnapshot listens for any changes to the user's document in realtime
            unsubscribeUserListener = onSnapshot(userRef, (docSnap) => {
                console.log("DEBUG: Realtime user data updated.");
                if (docSnap.exists()) {
                    const userData = { id: docSnap.id, ...docSnap.data() };
                    if (userData.role === 'influencer') {
                        // If role is correct, load/update the entire dashboard
                        loadDashboard(userData);
                    } else {
                        handleAccessDenied('You are not an approved influencer.');
                    }
                } else {
                    handleAccessDenied("Your user profile could not be found.");
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
            // Populate profile header and balance from REALTIME data
            populateProfileHeader(influencerData);
            
            // Fetch stats and posts, which don't need to be realtime for now
            const [stats, posts] = await Promise.all([
                fetchInfluencerStats(influencerData.id),
                fetchInfluencerPosts(influencerData.id)
            ]);
            
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

        copyLinkBtn.onclick = () => {
            const profileUrl = `${window.location.origin}/pf/influencer/${userData.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                alert('Profile link copied!');
            });
        };
    }
    
    /**
     * Populates the main stats cards.
     */
// static/pf_influencer_dashboard.js

// ...

/**
 * Populates the main stats cards.
 */
function populateStatsCards(influencerData, stats) {
    // Available Balance comes directly from the user's document (real-time)
    balanceEl.textContent = `৳${(influencerData.influencerBalance || 0).toFixed(2)}`;
    
    // These stats are calculated from the 'works' collection
    worksCompletedEl.textContent = stats.completed;
    totalEarnedEl.textContent = `৳${(stats.totalEarned || 0).toFixed(2)}`;
    pendingWorksEl.textContent = stats.pending;
}

/**
 * Fetches statistics about the influencer's work from the 'works' collection.
 */
async function fetchInfluencerStats(userId) {
    const worksRef = collection(db, 'works');
    const q = query(worksRef, where("influencerId", "==", userId));
    const snapshot = await getDocs(q);

    let completed = 0;
    let pending = 0;
    let totalEarned = 0;

    snapshot.forEach(doc => {
        const work = doc.data();
        // **FIX**: Only count profit for completed works towards total earned
        if (work.status === 'completed') {
            completed++;
            // Calculate profit based on 90% of the budget
            totalEarned += (Number(work.budget) || 0) * 0.90;
        } else if (['pending', 'in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status)) {
            pending++;
        }
    });
    
    // Fetch total withdrawn amount to show a more accurate "Total Earned"
    const withdrawalsRef = collection(db, 'withdrawals');
    const wq = query(withdrawalsRef, where("userId", "==", userId), where("status", "==", "paid"));
    const wSnapshot = await getDocs(wq);
    const totalWithdrawn = wSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    // Total Earned can be seen as (current balance + what they've already taken out)
    // This provides a lifetime earning stat.
    const currentBalanceFromDB = (await getDoc(doc(db, 'users', userId))).data().influencerBalance || 0;
    totalEarned = currentBalanceFromDB + totalWithdrawn;

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
