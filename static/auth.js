// static/auth_universal.js

// --- Step 1: Import all necessary functions from Firebase SDKs ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Step 2: Firebase Configuration ---
// Make sure to replace this with your actual Firebase config keys.
const firebaseConfig = {
    apiKey: "AIzaSyD3F8gSkk6J9ChGRVB3_8DQP7FpBCl2T-w",
    authDomain: "anyshop-1f435.firebaseapp.com",
    projectId: "anyshop-1f435",
    storageBucket: "anyshop-1f435.firebasestorage.app",
    messagingSenderId: "710084687311",
    appId: "1:710084687311:web:5320f0c91b4fb3fe35ceba"
};

// --- Step 3: Initialize Firebase Services ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Step 4: Theme and Brand Configuration ---
const themes = {
    anyshop: {
        name: 'AnyShop',
        className: 'theme-anyshop',
        redirect: '/account',
        home: '/'
    },
    profitfluence: {
        name: 'PROFITFLUENCE',
        className: 'theme-pf',
        redirect: '/pf/dashboard',
        home: '/pf'
    }
};

// --- Step 5: Main Script Execution after DOM is loaded ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- Determine and Apply Theme ---
    const currentPath = window.location.pathname;
    const referrer = document.referrer;
    let activeTheme = themes.anyshop; // Default theme

    if (currentPath.includes('/pf') || referrer.includes('/pf')) {
        activeTheme = themes.profitfluence;
    }
    
    document.body.classList.add(activeTheme.className);
    document.getElementById('login-brand-link').textContent = activeTheme.name;
    document.getElementById('login-brand-link').href = activeTheme.home;
    document.getElementById('signup-brand-link').textContent = activeTheme.name;
    document.getElementById('signup-brand-link').href = activeTheme.home;
    
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loginContainer = getElement('login-container');
    const signupContainer = getElement('signup-container');
    const showLoginLink = getElement('show-login');
    const showSignupLink = getElement('show-signup');
    const loginForm = getElement('login-form');
    const signupForm = getElement('signup-form');
    const googleBtnLogin = getElement('google-btn'); // Button in the login form
    const googleBtnSignup = getElement('google-btn-signup'); // Button in the signup form
    const loginError = getElement('login-error');
    const signupError = getElement('signup-error');

    // --- Form Toggling Logic ---
    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            loginContainer.classList.add('hidden'); 
            signupContainer.classList.remove('hidden'); 
            loginError.classList.add('hidden');
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => { 
            e.preventDefault(); 
            signupContainer.classList.add('hidden'); 
            loginContainer.classList.remove('hidden'); 
            signupError.classList.add('hidden');
        });
    }

    // --- Email/Password Signup Logic ---
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            signupError.classList.add('hidden');
            const name = getElement('signup-name').value;
            const email = getElement('signup-email').value;
            const password = getElement('signup-password').value;

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                // Create a new user document in Firestore
                await setDoc(doc(db, 'users', user.uid), {
                    name, email, role: 'customer', createdAt: serverTimestamp(),
                    influencerBalance: 0, affiliateBalance: 0, walletBalance: 0,
                    applicationStatus: 'none'
                });
                redirectToDashboard();
            } catch (error) {
                signupError.textContent = error.message;
                signupError.classList.remove('hidden');
            }
        });
    }
    
    // --- Email/Password Login Logic ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            loginError.classList.add('hidden');
            const email = getElement('login-email').value;
            const password = getElement('login-password').value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                redirectToDashboard();
            } catch (error) {
                loginError.textContent = error.message;
                loginError.classList.remove('hidden');
            }
        });
    }

    // --- Google Sign-in & Sign-up Logic ---
    const handleGoogleAuth = async () => {
        loginError.classList.add('hidden');
        signupError.classList.add('hidden');
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            // If user does not exist in Firestore, create a new document (This is the "Signup" part)
            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    name: user.displayName,
                    email: user.email,
                    role: 'customer',
                    createdAt: serverTimestamp(),
                    influencerBalance: 0, affiliateBalance: 0, walletBalance: 0,
                    applicationStatus: 'none'
                });
            }
            // If user exists, it's just a sign-in.
            redirectToDashboard();
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    };
    
    // Attach the same handler to both Google buttons
    if (googleBtnLogin) {
        googleBtnLogin.addEventListener('click', handleGoogleAuth);
    }
    if (googleBtnSignup) {
        googleBtnSignup.addEventListener('click', handleGoogleAuth);
    }

    /**
     * Redirects user to the correct dashboard after login.
     * Checks for a 'redirect' query parameter first, otherwise uses the active theme's default.
     */
    function redirectToDashboard() {
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect');
        
        if (redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            window.location.href = activeTheme.redirect;
        }
    }
});
