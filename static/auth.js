// --- Step 1: Import necessary functions and services ---
import { auth, db, googleProvider, doc, setDoc, getDoc, serverTimestamp } from './firebaseConfig.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, // Using Popup for a better user experience
    getRedirectResult 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    
    const loginContainer = getElement('login-container');
    const signupContainer = getElement('signup-container');
    const showLoginLink = getElement('show-login');
    const showSignupLink = getElement('show-signup');
    const loginForm = getElement('login-form');
    const signupForm = getElement('signup-form');
    const googleLoginBtn = getElement('google-login-btn');
    const loginErrorDiv = getElement('login-error');
    const signupErrorDiv = getElement('signup-error');
    const loginSubmitBtn = getElement('login-submit-btn');
    const signupSubmitBtn = getElement('signup-submit-btn');

    // Guard clause: If essential elements aren't on this page, stop running the script.
    if (!loginContainer || !signupContainer) {
        console.warn("Auth script loaded on a page without login/signup forms. Halting execution.");
        return; 
    }

    // --- Step 3: UI Helper Functions ---
    const showLoading = (button) => {
        button.disabled = true;
        button.querySelector('.btn-text').classList.add('hidden');
        button.querySelector('.spinner').classList.remove('hidden');
    };

    const hideLoading = (button, defaultText) => {
        button.disabled = false;
        const btnText = button.querySelector('.btn-text');
        btnText.textContent = defaultText;
        btnText.classList.remove('hidden');
        button.querySelector('.spinner').classList.add('hidden');
    };

    const showError = (errorDiv, message) => {
        const friendlyMessages = {
            "Firebase: Error (auth/email-already-in-use).": "This email is already registered. Please login.",
            "Firebase: Error (auth/wrong-password).": "Incorrect password. Please try again.",
            "Firebase: Error (auth/user-not-found).": "No account found with this email. Please sign up.",
            "Firebase: Error (auth/popup-closed-by-user).": "The sign-in window was closed. Please try again."
        };
        errorDiv.textContent = friendlyMessages[message] || message;
        errorDiv.classList.remove('hidden');
    };
    
    const hideError = (errorDiv) => {
        errorDiv.textContent = '';
        errorDiv.classList.add('hidden');
    };

    // --- Step 4: Event Listeners ---
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideError(loginErrorDiv);
        loginContainer.classList.add('hidden');
        signupContainer.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        hideError(signupErrorDiv);
        signupContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(signupErrorDiv);
        showLoading(signupSubmitBtn);

        const name = getElement('signup-name').value;
        const email = getElement('signup-email').value;
        const password = getElement('signup-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, {
                name, email, role: 'customer', createdAt: serverTimestamp(), walletBalance: 0
            });
            window.location.href = '/account';
        } catch (error) {
            showError(signupErrorDiv, error.message);
        } finally {
            hideLoading(signupSubmitBtn, 'Create Account');
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(loginErrorDiv);
        showLoading(loginSubmitBtn);
        
        const email = getElement('login-email').value;
        const password = getElement('login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = '/account';
        } catch (error) {
            showError(loginErrorDiv, error.message);
        } finally {
            hideLoading(loginSubmitBtn, 'Login');
        }
    });
    
    googleLoginBtn.addEventListener('click', async () => {
        hideError(loginErrorDiv);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);

            if (!docSnap.exists()) {
                await setDoc(userRef, {
                    name: user.displayName, email: user.email, role: 'customer',
                    createdAt: serverTimestamp(), walletBalance: 0
                });
            }
            window.location.href = '/account';
        } catch (error) {
            showError(loginErrorDiv, error.message);
        }
    });
});
