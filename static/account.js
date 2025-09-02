// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Step 2: Main script execution block ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM is ready. Initializing AnyShop account page script.");

    // --- Step 3: Defensive DOM Element Selection ---
    const getElement = (id, isCritical = true) => {
        const element = document.getElementById(id);
        if (!element && isCritical) {
            console.error(`FATAL ERROR: A critical HTML element with id "${id}" was not found.`);
        }
        return element;
    };

    const loadingSpinner = getElement('loading-spinner');
    const accountDashboard = getElement('account-dashboard');

    if (!loadingSpinner || !accountDashboard) {
        console.error("Script halted: Essential page elements ('loading-spinner' or 'account-dashboard') are missing.");
        return;
    }

    // =================================================================
    // --- SECTION A: HELPER & EVENT HANDLER FUNCTIONS (Defined First) ---
    // =================================================================

    /**
     * Handles the submission of the affiliate application.
     */
    async function handleAffiliateApplication() {
        const user = auth.currentUser;
        if (!user || !confirm("Are you sure you want to apply to become an affiliate partner?")) return;

        const applyBtn = getElement('apply-affiliate-btn');
        if (applyBtn) {
            applyBtn.disabled = true;
            applyBtn.textContent = 'Submitting...';
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { affiliateStatus: 'pending' });
            alert('Your application has been submitted successfully!');
            handleAffiliateSectionContent({ affiliateStatus: 'pending' }); // Update UI immediately
        } catch (error) {
            console.error("Error submitting application:", error);
            alert("Failed to submit application. Please try again.");
            if (applyBtn) {
                applyBtn.disabled = false;
                applyBtn.textContent = 'Apply Now';
            }
        }
    }

    /**
     * Handles the submission of the profile update form.
     */
    async function handleProfileUpdate(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        
        const nameInput = getElement('profile-name');
        const phoneInput = getElement('profile-phone');
        
        const updatedData = {
            name: nameInput.value,
            phoneNumber: phoneInput.value,
        };
        
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, updatedData);
            alert('Profile updated successfully!');
            const userNameDisplay = getElement('user-name-display');
            if (userNameDisplay) userNameDisplay.textContent = updatedData.name;
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    }

    /**
     * Manages the content of the affiliate application section based on user status.
     * @param {object} userData - The user's data from Firestore.
     */
    function handleAffiliateSectionContent(userData) {
        const sectionElement = getElement('affiliate-apply-section', false);
        if (!sectionElement) return;

        const status = userData.affiliateStatus;
        if (status === 'pending') {
            sectionElement.innerHTML = `<h3 class="text-lg font-semibold text-gray-800">Application Submitted</h3><p class="text-sm text-yellow-600 mt-2">Your affiliate application is under review.</p>`;
        } else if (status === 'rejected') {
            sectionElement.innerHTML = `<h3 class="text-lg font-semibold text-gray-800">Application Status</h3><p class="text-sm text-red-600 mt-2">Your application was not approved.</p>`;
        } else {
            sectionElement.innerHTML = `<h3 class="text-lg font-semibold text-gray-800">Become an Affiliate Partner!</h3><p class="text-sm text-gray-600 mt-2">Start your business with zero investment.</p><button id="apply-affiliate-btn" class="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 font-semibold">Apply Now</button>`;
            const applyBtn = getElement('apply-affiliate-btn', false);
            if (applyBtn) {
                applyBtn.addEventListener('click', handleAffiliateApplication);
            }
        }
    }

    /**
     * Shows/hides elements based on the user's role ('customer' or 'affiliate').
     */
    function updateUIVisibility(userData) {
        const affiliateDashboardLink = getElement('affiliate-dashboard-link', false);
        const affiliateApplySection = getElement('affiliate-apply-section', false);
        if (!affiliateDashboardLink || !affiliateApplySection) return;

        const userRole = userData.role || 'customer';
        if (userRole === 'affiliate') {
            affiliateDashboardLink.classList.remove('hidden');
            affiliateApplySection.classList.add('hidden');
        } else {
            affiliateDashboardLink.classList.add('hidden');
            affiliateApplySection.classList.remove('hidden');
            handleAffiliateSectionContent(userData);
        }
    }

    /**
     * Populates the main dashboard widgets with user data.
     */
    function populateDashboard(userData, orderCount) {
        const userNameDisplay = getElement('user-name-display', false);
        const walletBalanceDisplay = getElement('wallet-balance-display', false);
        const totalOrdersDisplay = getElement('total-orders-display', false);
        
        if (userNameDisplay) userNameDisplay.textContent = userData.name || 'User';
        if (walletBalanceDisplay) {
            const balance = userData.walletBalance;
            walletBalanceDisplay.textContent = `৳${(typeof balance === 'number') ? balance.toFixed(2) : '0.00'}`;
        }
        if (totalOrdersDisplay) totalOrdersDisplay.textContent = orderCount;
    }

    /**
     * Fills the profile settings form with user data.
     */
    function populateProfileForm(userData) {
        const nameInput = getElement('profile-name', false);
        const emailInput = getElement('profile-email', false);
        const phoneInput = getElement('profile-phone', false);
        if (nameInput) nameInput.value = userData.name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phoneNumber || '';
    }

    /**
     * Renders the user's order history into a table.
     */
    function displayOrders(orders) {
        const orderHistoryContainer = getElement('order-history-container', false);
        if (!orderHistoryContainer) return;

        if (orders.length === 0) {
            orderHistoryContainer.innerHTML = '<p class="text-gray-500 text-center py-4">You have no past orders.</p>';
            return;
        }
        
        orderHistoryContainer.innerHTML = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr><th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th><th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th><th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th></tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${orders.map(order => {
                        const price = order.priceDetails?.total;
                        const formattedPrice = (typeof price === 'number') ? price.toFixed(2) : 'N/A';
                        return `<tr><td class="py-3 px-3">${order.productName}</td><td class="py-3 px-3 font-semibold">৳${formattedPrice}</td><td class="py-3 px-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(order.status)}">${order.status}</span></td></tr>`;
                    }).join('')}
                </tbody>
            </table>`;
    }
    
    /**
     * Sets up all event listeners for the page.
     */
    function initializeEventListeners() {
        const logoutBtn = getElement('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => signOut(auth).catch(error => console.error('Logout Error:', error)));
        }

        const profileUpdateForm = getElement('profile-update-form', false);
        if (profileUpdateForm) {
            profileUpdateForm.addEventListener('submit', handleProfileUpdate);
        }

        const navButtons = document.querySelectorAll('.account-nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        if (navButtons.length > 0) {
            navButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetId = button.dataset.target;
                    navButtons.forEach(btn => btn.classList.remove('active-nav-btn'));
                    button.classList.add('active-nav-btn');
                    tabContents.forEach(content => {
                        if(content) content.id === targetId ? content.classList.remove('hidden') : content.classList.add('hidden');
                    });
                });
            });
        }
    }

    // =================================================================
    // --- SECTION B: CORE DATA FETCHING & INITIALIZATION (Calls functions from Section A) ---
    // =================================================================

    /**
     * Main function to load all data for the logged-in user.
     */
    async function loadPageData(user) {
        try {
            const [userData, orders] = await Promise.all([
                fetchUserProfile(user.uid),
                fetchUserOrders(user.uid)
            ]);
            
            updateUIVisibility(userData);
            populateDashboard(userData, orders.length);
            populateProfileForm(userData);
            displayOrders(orders);
            initializeEventListeners();

        } catch (error) {
            console.error("CRITICAL ERROR while loading account page data:", error);
            if (accountDashboard) {
                accountDashboard.innerHTML = `<div class="bg-white p-6 rounded-lg shadow-md text-center"><h2 class="text-xl text-red-600 font-bold">Oops!</h2><p class="text-gray-700 mt-2">${error.message}</p></div>`;
            }
        } finally {
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (accountDashboard) accountDashboard.classList.remove('hidden');
        }
    }

    async function fetchUserProfile(uid) {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) return docSnap.data();
        throw new Error("Your user profile was not found. Please contact support.");
    }

    async function fetchUserOrders(uid) {
        const q = query(collection(db, 'orders'), where("userId", "==", uid), orderBy("orderDate", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // This is the starting point of the script.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadPageData(user);
        } else {
            window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }
    });
});

/**
 * Helper function for styling order status chips. Must be outside the module scope
 * if it were to be used in inline HTML, but here it's fine inside or outside.
 */
function getStatusChipClass(status) {
    const statusClasses = { 'Pending': 'bg-yellow-100 text-yellow-800', 'Confirmed': 'bg-blue-100 text-blue-800', 'Shipped': 'bg-indigo-100 text-indigo-800', 'Delivered': 'bg-green-100 text-green-800', 'Cancelled': 'bg-red-100 text-red-800' };
    return statusClasses[status] || 'bg-gray-100 text-gray-800';
                }
