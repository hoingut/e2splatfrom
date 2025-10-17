// static/pf_influencer_dashboard.js

// --- Step 1: Import services FROM your firebaseConfig.js file ---
import { auth, db } from './firebaseConfig.js';

// --- Step 2: Import functions you need FROM the SDKs ---
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// This log will only appear if the import from firebaseConfig.js was successful.
console.log("--- DEBUG: pf_influencer_dashboard.js -> Script started, imports successful. ---");

// --- Step 3: Main script execution block ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DEBUG: pf_influencer_dashboard.js -> DOMContentLoaded Fired. ---");

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const loadingText = getElement('loading-text');
    const dashboardContent = getElement('dashboard-content');
    const userNameEl = getElement('user-name');
    const balanceEl = getElement('balance');
    const logoutBtn = getElement('logout-btn');

    if (!loadingContainer || !dashboardContent) {
        console.error("CRITICAL: Loading or Dashboard container not found in HTML. Script cannot proceed.");
        return;
    }

    let unsubscribe = null;

    // --- Authentication Check ---
    onAuthStateChanged(auth, (user) => {
        console.log("--- DEBUG: Auth state changed. User:", user ? user.uid : "No user");
        
        if (unsubscribe) unsubscribe();

        if (user) {
            loadingText.textContent = "Checking permissions...";
            const userRef = doc(db, 'users', user.uid);

            unsubscribe = onSnapshot(userRef, (docSnap) => {
                console.log("--- DEBUG: onSnapshot triggered for user document.");
                
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log("--- DEBUG: User data received:", userData);

                    if (userData.role === 'influencer') {
                        console.log("--- DEBUG: Role is 'influencer'. Rendering dashboard.");
                        renderDashboard(userData);
                    } else {
                        handleAccessDenied('You are not an approved influencer.');
                    }
                } else {
                    handleAccessDenied("Your user profile could not be found.");
                }
            }, (error) => {
                console.error("--- DEBUG: onSnapshot ERROR:", error);
                handleAccessDenied(`Permission Error: ${error.message}`);
            });

        } else {
            window.location.href = `/login?redirect=/pf/dashboard/i`;
        }
    });

    function renderDashboard(userData) {
        if (userNameEl) userNameEl.textContent = userData.name || 'Influencer';
        if (balanceEl) {
            const balance = Number(userData.influencerBalance) || 0;
            balanceEl.textContent = `৳${balance.toFixed(2)}`;
        }
        loadingContainer.classList.add('hidden');
        dashboardContent.classList.remove('hidden');
        console.log("--- DEBUG: Dashboard UI Rendered Successfully! ---");
    }

    function handleAccessDenied(message) {
        if (unsubscribe) unsubscribe();
        document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-500 font-bold">Access Denied</h1><p>${message}</p></div>`;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribe) unsubscribe();
            signOut(auth);
        });
    }
});
