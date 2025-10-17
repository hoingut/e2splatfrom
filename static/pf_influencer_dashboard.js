// static/tws.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const contentContainer = getElement('content-container');
    const userNameEl = getElement('user-name');
    const walletBalanceEl = getElement('wallet-balance');
    const logoutBtn = getElement('logout-btn');

    let unsubscribe = null; // To hold the listener cleanup function

    // --- Authentication Check ---
    onAuthStateChanged(auth, (user) => {
        if (unsubscribe) unsubscribe(); // Clean up old listener

        if (user) {
            // User is logged in, attach a realtime listener to their document
            const userRef = doc(db, 'users', user.uid);
            
            unsubscribe = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    
                    // Update the UI with the latest data
                    userNameEl.textContent = userData.name || 'User';

                    // Check for all possible balance fields and show the relevant one
                    let balanceToShow = 0;
                    if (userData.role === 'influencer' && userData.influencerBalance) {
                        balanceToShow = userData.influencerBalance;
                    } else if (userData.role === 'affiliate' && userData.affiliateBalance) {
                        balanceToShow = userData.affiliateBalance;
                    } else {
                        balanceToShow = userData.walletBalance || 0;
                    }

                    walletBalanceEl.textContent = `৳${(Number(balanceToShow) || 0).toFixed(2)}`;

                    // Show content and hide loader
                    loadingContainer.classList.add('hidden');
                    contentContainer.classList.remove('hidden');

                } else {
                    // Handle case where user exists in Auth but not in Firestore
                    displayError('Your profile data could not be found.');
                }
            }, (error) => {
                console.error("Error listening to user document:", error);
                displayError(`Permission Error: ${error.message}`);
            });

        } else {
            // No user is logged in, redirect to the login page
            window.location.href = `/login?redirect=/tws`;
        }
    });

    /**
     * Displays an error message.
     */
    function displayError(message) {
        loadingContainer.innerHTML = `<p class="text-red-500">${message}</p>`;
    }

    // --- Logout Button ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (unsubscribe) unsubscribe();
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
