// static/pf_influencer_dashboard.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, onSnapshot /* ... other imports */ } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Step 1: DEFENSIVE DOM Ready Check ---
// We will wrap EVERYTHING inside the DOMContentLoaded event.
// This GUARANTEES that the script will only run after all HTML elements are ready.
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DEBUG: DOM is fully loaded. Script is now starting safely. ---");

    // --- Step 2: DOM References (now safely inside DOMContentLoaded) ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const logoutBtn = getElement('logout-btn');
    
    // Check for critical elements right away.
    if (!loadingContainer || !dashboardContent) {
        console.error("CRITICAL: Main containers 'loading-container' or 'dashboard-content' are missing. Script cannot run.");
        return;
    }

    let unsubscribeUserListener = null;

    // --- Step 3: Authentication and Authorization Check ---
    onAuthStateChanged(auth, (user) => {
        if (unsubscribeUserListener) unsubscribeUserListener();
        
        if (user) {
            console.log("DEBUG: User is authenticated. Attaching realtime listener...");
            const userRef = doc(db, 'users', user.uid);
            
            unsubscribeUserListener = onSnapshot(userRef, (docSnap) => {
                console.log("DEBUG: Realtime user data received from onSnapshot.");
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    const userData = { id: docSnap.id, ...docSnap.data() };
                    loadDashboard(userData);
                } else {
                    handleAccessDenied('You are not an approved influencer.');
                }
            }, (error) => handleAccessDenied(error.message));
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/i`;
        }
    });
    
    /**
     * Main function to load/update all dashboard data.
     * This function is only called when we are sure the user is an influencer.
     */
    async function loadDashboard(influencerData) {
        console.log("DEBUG: loadDashboard() called with data:", influencerData);
        try {
            // All UI population now happens here, when we are sure the DOM is ready
            // and we have the data.
            populateHeader(influencerData);
            
            // The rest of your data fetching and UI updates
            const stats = await fetchInfluencerStats(influencerData.id);
            populateStatsCards(influencerData, stats);
            // ... (other functions like fetchRecentActivity, etc.)

            loadingContainer.classList.add('hidden');
            dashboardContent.classList.remove('hidden');
            console.log("DEBUG: Dashboard loaded and displayed successfully.");

        } catch(error) {
            console.error("DEBUG: Error during loadDashboard execution:", error);
            dashboardContent.innerHTML = `<p class="text-red-500">${error.message}</p>`;
        }
    }
    
    // --- UI Population Functions (now guaranteed to find elements) ---
    function populateHeader(userData) {
        console.log("DEBUG: populateHeader() called.");
        
        // **THE FIX**: We get the elements right before we use them.
        const userNameEl = getElement('user-name');
        const profilePicHeaderEl = getElement('profile-pic-header');
        const viewProfileLinkEl = getElement('view-profile-link');
        
        // Defensive checks
        if (!userNameEl || !profilePicHeaderEl || !viewProfileLinkEl) {
            console.error("DEBUG: One or more header elements are NULL inside populateHeader. Check HTML IDs.");
            return;
        }
        
        console.log("DEBUG: All header elements found. Setting their properties...");
        
        userNameEl.textContent = userData.name || 'User';
        profilePicHeaderEl.src = userData.influencerApplication?.personal?.ownerPicUrl || 'https://via.placeholder.com/40';
        viewProfileLinkEl.href = `/pf/influencer/${userData.id}`;
    }
    
    function populateStatsCards(influencerData, stats) {
        // ... (The code for this function is correct, no changes needed)
    }

    // ... (All other functions like fetchInfluencerStats, displayRecentActivity, renderEarningsChart)
    
    function handleAccessDenied(message) {
        if (unsubscribeUserListener) unsubscribeUserListener();
        document.body.innerHTML = `<div class="text-center p-10"><h1>Access Denied</h1><p>${message}</p></div>`;
    }

    // --- Logout Button Event Listener ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribeUserListener) unsubscribeUserListener();
            signOut(auth);
        });
    }
});
