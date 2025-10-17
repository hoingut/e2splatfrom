// static/pf_influencer_dashboard_simple.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// This is the starting point of our script.
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- Simple Dashboard Script Started ---");

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const loadingText = getElement('loading-text');
    const dashboardContent = getElement('dashboard-content');
    const userNameEl = getElement('user-name');
    const balanceEl = getElement('balance');
    const logoutBtn = getElement('logout-btn');

    let unsubscribe = null; // To hold the listener cleanup function

    // --- Authentication Check ---
    onAuthStateChanged(auth, (user) => {
        console.log("--- Auth state changed. User object:", user);
        
        // Clean up any previous listener
        if (unsubscribe) {
            console.log("--- Cleaning up old listener.");
            unsubscribe();
        }

        if (user) {
            loadingText.textContent = "Authenticating user...";
            const userRef = doc(db, 'users', user.uid);

            // Use onSnapshot for REALTIME updates to the user's document
            unsubscribe = onSnapshot(userRef, (docSnap) => {
                console.log("--- onSnapshot triggered. Document data received.");
                
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log("--- User data:", userData);

                    // --- Authorization Check ---
                    if (userData.role === 'influencer') {
                        console.log("--- User is an influencer. Rendering dashboard.");
                        // If the role is correct, update the UI
                        renderDashboard(userData);
                    } else {
                        console.error("--- Access Denied: User is not an influencer.");
                        handleAccessDenied('You are not an approved influencer.');
                    }
                } else {
                    console.error("--- Access Denied: User document not found in Firestore.");
                    handleAccessDenied("Your user profile could not be found.");
                }
            }, (error) => {
                // This function handles errors from the listener itself (e.g., permissions)
                console.error("--- onSnapshot ERROR:", error);
                handleAccessDenied(`Error fetching your profile: ${error.message}`);
            });

        } else {
            console.log("--- No user logged in. Redirecting to login page.");
            window.location.href = `/login?redirect=/pf/dashboard/i`;
        }
    });

    /**
     * Renders the dashboard with the provided user data.
     * @param {object} userData - The real-time data of the influencer.
     */
    function renderDashboard(userData) {
        // Populate the UI
        if (userNameEl) userNameEl.textContent = userData.name || 'Influencer';
        
        // Safely get and format the balance
        if (balanceEl) {
            const balance = Number(userData.influencerBalance) || 0;
            balanceEl.textContent = `৳${balance.toFixed(2)}`;
            console.log(`--- UI Updated. Balance set to: ৳${balance.toFixed(2)}`);
        }

        // Show the dashboard and hide the loader
        if (loadingContainer) loadingContainer.classList.add('hidden');
        if (dashboardContent) dashboardContent.classList.remove('hidden');
    }

    /**
     * Handles access denial by showing an error message.
     */
    function handleAccessDenied(message) {
        if (unsubscribe) unsubscribe();
        document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-500 font-bold">Access Denied</h1><p>${message}</p></div>`;
    }

    // --- Logout Button ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribe) unsubscribe();
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
