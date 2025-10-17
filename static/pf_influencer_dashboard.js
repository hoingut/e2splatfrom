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
    // static/pf_influencer_dashboard.js

// ... (ফাইলের উপরের অংশ এবং onSnapshot আগের মতোই থাকবে)

/**
 * Main function to load/update all dashboard data.
 * THIS IS THE UPDATED AND DEBUG-FOCUSED FUNCTION.
 */
async function loadDashboard(influencerData) {
    console.log("--- DEBUG: 1. loadDashboard STARTED ---");
    
    try {
        // We will fetch data sequentially to pinpoint the error.

        // --- Step A: Fetch Stats ---
        console.log("--- DEBUG: 2. Attempting to fetch stats...");
        const stats = await fetchInfluencerStats(influencerData.id);
        console.log("--- DEBUG: 3. Stats fetched SUCCESSFULLY:", stats);

        // --- Step B: Fetch Posts ---
        console.log("--- DEBUG: 4. Attempting to fetch posts...");
        const posts = await fetchInfluencerPosts(influencerData.id);
        console.log("--- DEBUG: 5. Posts fetched SUCCESSFULLY:", posts);
        
        // --- Step C: Populate UI ---
        console.log("--- DEBUG: 6. Attempting to populate UI...");
        populateProfileHeader(influencerData);
        populateStatsCards(influencerData, stats); // This should be called now
        displayPosts(posts);
        console.log("--- DEBUG: 7. UI population COMPLETE.");

    } catch(error) {
        console.error("--- DEBUG: 8. CRITICAL ERROR caught inside loadDashboard:", error);
        if (dashboardContent) {
            dashboardContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    } finally {
        // This block MUST run if the function executes.
        console.log("--- DEBUG: 9. 'finally' block reached. Hiding spinner.");
        if (loadingContainer) loadingContainer.classList.add('hidden');
        if (dashboardContent) dashboardContent.classList.remove('hidden');
    }
}

// ... (ফাইলের বাকি অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)
    
   // static/pf_influencer_dashboard.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Populates the main stats cards with data.
 * THIS IS THE UPDATED AND BULLETPROOF FUNCTION.
 */

    function populateProfileHeader(userData) {
        console.log("DEBUG: Populating profile header...");
        
        // Defensive check for the elements
        const profilePic = getElement('profile-pic');
        const pageName = getElement('page-name');
        const categoryEl = getElement('category');
        const usernameEl = getElement('username');
        const copyLinkBtn = getElement('copy-profile-link');

        if (!profilePic || !pageName || !categoryEl || !usernameEl || !copyLinkBtn) {
            console.error("DEBUG: One or more profile header elements are missing from the HTML.");
            return;
        }

        // Safely access nested data from the application form
        const profileData = userData.influencerApplication?.page;
        
        profilePic.src = profileData?.pageProfilePicUrl || 'https://via.placeholder.com/120';
        pageName.textContent = profileData?.pageName || userData.name || 'Unnamed Page';
        categoryEl.textContent = profileData?.category || 'No Category';
        usernameEl.textContent = `@${userData.name || 'username'}`;

        copyLinkBtn.onclick = () => {
            const profileUrl = `${window.location.origin}/pf/influencer/${userData.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                alert('Profile link copied to clipboard!');
            });
        };
        console.log("DEBUG: Profile header populated successfully.");
    }
    
function populateStatsCards(influencerData, stats) {
    console.log("DEBUG: Populating stats cards with data:", { influencerData, stats });

    // --- THIS IS THE KEY FIX ---
    // Safely get and format each value, providing a default of 0 if undefined or not a number.
    
    // Fix for Available Balance
    const balance = Number(influencerData.influencerBalance) || 0;
    balanceEl.textContent = `৳${balance.toFixed(2)}`;
    console.log(`DEBUG: Available Balance set to: ৳${balance.toFixed(2)}`);

    // Fix for Works Completed
    const completed = Number(stats?.completed) || 0; // Use optional chaining for safety
    getElement('works-completed').textContent = completed;
    console.log(`DEBUG: Works Completed set to: ${completed}`);

    // Fix for Total Earned
    const earned = Number(stats?.totalEarned) || 0;
    totalEarnedEl.textContent = `৳${earned.toFixed(2)}`;
    console.log(`DEBUG: Total Earned set to: ৳${earned.toFixed(2)}`);

    // Fix for Pending Works
    const pending = Number(stats?.pending) || 0;
    pendingWorksEl.textContent = pending;
    console.log(`DEBUG: Pending Works set to: ${pending}`);
}

// ... (ফাইলের বাকি অংশ আগের মতোই থাকবে)
    
    /**
     * Populates the main stats cards.
     */
// static/pf_influencer_dashboard.js

// ...

    // static/pf_influencer_dashboard.js

// ... (ফাইলের উপরের অংশ, onAuthStateChanged, loadDashboard ইত্যাদি আগের মতোই থাকবে)

    // =================================================================
    // SECTION: UI POPULATION FUNCTIONS
    // =================================================================

    /**
     * Populates the profile header section with the influencer's data.
     * THIS IS THE MISSING FUNCTION.
     */
    

/**
 * Populates the main stats cards.
 */
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
