// static/auth_universal.js

// --- Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
const firebaseConfig = { /* ... YOUR FIREBASE CONFIG KEYS ... */ };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Theme and Brand Configuration ---
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

document.addEventListener('DOMContentLoaded', () => {
    // --- Determine Theme based on URL or Referrer ---
    const currentPath = window.location.pathname;
    const referrer = document.referrer;
    let activeTheme = themes.anyshop; // Default theme

    if (currentPath.startsWith('/pf') || referrer.includes('/pf')) {
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
    const googleBtn = getElement('google-btn');
    const loginError = getElement('login-error');
    const signupError = getElement('signup-error');

    // --- Form Toggling ---
    showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginContainer.classList.add('hidden'); signupContainer.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); signupContainer.classList.add('hidden'); loginContainer.classList.remove('hidden'); });

    // --- Email/Password Signup ---
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = getElement('signup-name').value;
        const email = getElement('signup-email').value;
        const password = getElement('signup-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            await setDoc(doc(db, 'users', user.uid), {
                name, email, role: 'customer', createdAt: serverTimestamp()
            });
            redirectToDashboard();
        } catch (error) {
            signupError.textContent = error.message;
            signupError.classList.remove('hidden');
        }
    });
    
    // --- Email/Password Login ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
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

    // --- Google Signin & Signup ---
    googleBtn.addEventListener('click', async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            // If user does not exist in Firestore, create a new document (Signup)
            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    name: user.displayName,
                    email: user.email,
                    role: 'customer',
                    createdAt: serverTimestamp()
                });
            }
            redirectToDashboard();
        } catch (error) {
            loginError.textContent = error.message;
            loginError.classList.remove('hidden');
        }
    });

    /**
     * Redirects user to the correct dashboard after login.
     * Checks for a 'redirect' query parameter first.
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
