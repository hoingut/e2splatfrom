// static/pf_influencer_dashboard.js

// --- Step 1: Import ONLY what you need ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Step 2: Main script execution block ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DEBUG: DOM is ready. Simple Dashboard Script Initializing... ---");

    // --- Firebase Configuration (Directly in this file for simplicity and to avoid import errors) ---
    const firebaseConfig = {
        apiKey: "AIzaSyD3F8gSkk6J9ChGRVB3_8DQP7FpBCl2T-w",
    authDomain: "anyshop-1f435.firebaseapp.com",
    projectId: "anyshop-1f435",
    storageBucket: "anyshop-1f435.firebasestorage.app",
    messagingSenderId: "710084687311",
    appId: "1:710084687311:web:5320f0c91b4fb3fe35ceba"
    };

    // --- Initialize Firebase Services ---
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log("--- DEBUG: Firebase Initialized. ---");

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const userNameEl = getElement('user-name');
    const balanceEl = getElement('balance');
    const profilePicEl = getElement('profile-pic');
    const pendingWorksEl = getElement('pending-works');
    const worksCompletedEl = getElement('works-completed');
    const logoutBtn = getElement('logout-btn');

    let unsubscribe = null; // To hold the listener cleanup function

    // --- Step 3: Authentication Check ---
    onAuthStateChanged(auth, (user) => {
        console.log("--- DEBUG: Auth state changed. User:", user ? user.uid : "No user");
        if (unsubscribe) unsubscribe();

        if (user) {
            const userRef = doc(db, 'users', user.uid);
            
            // Realtime listener for user data (name, balance, pic)
            unsubscribe = onSnapshot(userRef, (docSnap) => {
                console.log("--- DEBUG: onSnapshot triggered for user document.");
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    console.log("--- DEBUG: User data found:", userData);
                    
                    if (userData.role === 'influencer') {
                        // If role is correct, update the UI with REALTIME data
                        renderRealtimeData(userData);
                        
                        // Fetch non-realtime stats (works) only once or periodically
                        fetchWorkStats(user.uid);
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

    /**
     * Renders data that comes from the realtime listener (user document).
     */
    function renderRealtimeData(userData) {
        userNameEl.textContent = userData.name || 'Influencer';
        const balance = Number(userData.influencerBalance) || 0;
        balanceEl.textContent = `৳${balance.toFixed(2)}`;
        profilePicEl.src = userData.influencerApplication?.personal?.ownerPicUrl || 'https://via.placeholder.com/64';

        // Show the dashboard content
        loadingContainer.classList.add('hidden');
        dashboardContent.classList.remove('hidden');
        console.log("--- DEBUG: Realtime UI Updated. ---");
    }
    
    /**
     * Fetches statistics about works which don't need to be realtime.
     */
    async function fetchWorkStats(userId) {
        try {
            console.log("--- DEBUG: Fetching work stats...");
            const worksRef = collection(db, 'works');
            const q = query(worksRef, where("influencerId", "==", userId));
            const snapshot = await getDocs(q);

            let completed = 0, pending = 0;
            snapshot.forEach(doc => {
                const work = doc.data();
                if (work.status === 'completed') {
                    completed++;
                } else if (['in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status)) {
                    pending++;
                }
            });
            
            pendingWorksEl.textContent = pending;
            worksCompletedEl.textContent = completed;
            console.log(`--- DEBUG: Work stats fetched. Pending: ${pending}, Completed: ${completed}`);

        } catch (error) {
            console.error("--- DEBUG: Error fetching work stats:", error);
        }
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
