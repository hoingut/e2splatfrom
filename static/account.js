
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
        console.error("Script halted: Essential elements ('loading-spinner' or 'account-dashboard') are missing.");
        return;
    }
    
    // --- Step 4: Authentication Observer (The Core Logic) ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadPageData(user);
        } else {
            const redirectUrl = encodeURIComponent(window.location.pathname);
            window.location.href = `/login?redirect=${redirectUrl}`;
        }
    });

// static/account.js

// ... (ফাইলের উপরের অংশ আগের মতোই থাকবে)

async function loadPageData(user) {
    console.log("--- DEBUG: loadPageData STARTED for user:", user.uid);

    try {
        // --- STEP A: Fetch User Profile ---
        console.log("--- DEBUG: [A] Attempting to fetch user profile...");
        const userData = await fetchUserProfile(user.uid);
        if (!userData) {
            // This condition should ideally never be hit if fetchUserProfile throws an error
            throw new Error("User data came back as null or undefined.");
        }
        console.log("--- DEBUG: [A] User profile fetched SUCCESSFULLY.", userData);
        
        // --- STEP B: Fetch User Orders ---
        console.log("--- DEBUG: [B] Attempting to fetch user orders...");
        const orders = await fetchUserOrders(user.uid);
        console.log(`--- DEBUG: [B] User orders fetched SUCCESSFULLY. Found ${orders.length} orders.`);

        // --- STEP C: Populate UI ---
        // We will call populate functions one by one to see if any of them cause an issue.
        console.log("--- DEBUG: [C] Attempting to populate Dashboard...");
        populateDashboard(userData, orders.length);
        console.log("--- DEBUG: [C] Dashboard populated.");

        console.log("--- DEBUG: [D] Attempting to populate Profile Form...");
        populateProfileForm(userData);
        console.log("--- DEBUG: [D] Profile Form populated.");
        
        console.log("--- DEBUG: [E] Attempting to display Orders...");
        displayOrders(orders);
        console.log("--- DEBUG: [E] Orders displayed.");

        console.log("--- DEBUG: [F] Attempting to initialize Event Listeners...");
        initializeEventListeners();
        console.log("--- DEBUG: [F] Event Listeners initialized.");

    } catch (error) {
        console.error("--- DEBUG: CRITICAL ERROR caught in loadPageData ---", error);
        if (accountDashboard) {
            accountDashboard.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md text-center">
                    <h2 class="text-xl text-red-600 font-bold">Oops! Could not load page.</h2>
                    <p class="text-gray-700 mt-2">${error.message}</p>
                </div>`;
        }
    } finally {
        // This will now definitely run unless the browser tab itself crashes.
        console.log("--- DEBUG: [G] 'finally' block reached. Hiding spinner.");
        if (loadingSpinner) loadingSpinner.style.display = 'none';
        if (accountDashboard) accountDashboard.classList.remove('hidden');
    }
}

// ... (ফাইলের বাকি অংশ আগের মতোই থাকবে)    }

    // --- Data Fetching Functions ---
    async function fetchUserProfile(uid) {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        throw new Error("Your user profile was not found in our database.");
    }

    async function fetchUserOrders(uid) {
        const q = query(collection(db, 'orders'), where("userId", "==", uid), orderBy("orderDate", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // static/account.js

// ... (ফাইলের উপরের অংশ আগের মতোই থাকবে)

// --- Role-Based UI Management ---
function updateUIVisibility(userData) {
    console.log("--- DEBUG: Updating UI based on user data:", userData); // লগ ১: ইউজারের ডেটা দেখুন

    const affiliateDashboardLink = getElement('affiliate-dashboard-link', false);
    const affiliateApplySection = getElement('affiliate-apply-section', false);

    // Ensure we have the elements before proceeding
    if (!affiliateDashboardLink || !affiliateApplySection) {
        console.warn("Affiliate UI elements not found in HTML. Cannot update visibility.");
        return;
    }

    const userRole = userData.role || 'customer'; // Default to 'customer' if role is not set
    console.log(`--- DEBUG: User role is determined as: "${userRole}"`); // লগ ২: ইউজারের রোল দেখুন

    if (userRole === 'affiliate') {
        console.log("--- DEBUG: User is an affiliate. Showing affiliate dashboard link."); // লগ ৩.১
        affiliateDashboardLink.classList.remove('hidden');
        affiliateApplySection.classList.add('hidden');
    } else { // 'customer' or any other role
        console.log("--- DEBUG: User is a customer. Showing affiliate apply section."); // লগ ৩.২
        affiliateDashboardLink.classList.add('hidden');
        affiliateApplySection.classList.remove('hidden');
        
        // Now, let's decide what to show inside the apply section
        handleAffiliateSectionContent(userData, affiliateApplySection);
    }
}

function handleAffiliateSectionContent(userData, sectionElement) {
    const status = userData.affiliateStatus;
    console.log(`--- DEBUG: Handling affiliate section content. Current status: "${status}"`); // লগ ৪: অ্যাফিলিয়েট স্ট্যাটাস দেখুন

    if (status === 'pending') {
        sectionElement.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">Application Submitted</h3>
            <p class="text-sm text-yellow-600 mt-2">Your affiliate application is currently under review. We will notify you once it's processed.</p>`;
        console.log("--- DEBUG: Displaying 'Pending' message.");
    } else if (status === 'rejected') {
        sectionElement.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">Application Status</h3>
            <p class="text-sm text-red-600 mt-2">Unfortunately, your recent affiliate application was not approved. Please contact support for more information.</p>`;
        console.log("--- DEBUG: Displaying 'Rejected' message.");
    } else {
        // This is the default state if status is undefined, null, 'revoked', or anything else.
        // It shows the "Apply Now" button.
        sectionElement.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800">Become an Affiliate Partner!</h3>
            <p class="text-sm text-gray-600 mt-2">Start your own business with zero investment. Sell our products and earn profit on every successful delivery.</p>
            <button id="apply-affiliate-btn" class="mt-4 bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 transition font-semibold">
                Apply Now
            </button>`;
        console.log("--- DEBUG: Displaying 'Apply Now' button.");

        // We need to re-add the event listener because we replaced the innerHTML.
        const applyBtn = getElement('apply-affiliate-btn', false);
        if (applyBtn) {
            applyBtn.addEventListener('click', handleAffiliateApplication);
        }
    }
}

// ... (ফাইলের বাকি অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে, যেমন handleAffiliateApplication)


    
    // --- UI Population Functions ---
    function populateDashboard(userData, orderCount) {
        getElement('user-name-display', false).textContent = userData.name || 'User';
        const balance = userData.walletBalance;
        getElement('wallet-balance-display', false).textContent = `৳${(typeof balance === 'number') ? balance.toFixed(2) : '0.00'}`;
        getElement('total-orders-display', false).textContent = orderCount;
    }

    function populateProfileForm(userData) {
        getElement('profile-name', false).value = userData.name || '';
        getElement('profile-email', false).value = userData.email || '';
        getElement('profile-phone', false).value = userData.phoneNumber || '';
    }

    function displayOrders(orders) {
        const orderHistoryContainer = getElement('order-history-container', false);
        if (!orderHistoryContainer) return;

        if (orders.length === 0) {
            orderHistoryContainer.innerHTML = '<p class="text-gray-500 text-center py-4">You have no past orders.</p>';
            return;
        }
        
        const tableHTML = `
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
        orderHistoryContainer.innerHTML = tableHTML;
    }

    // --- Event Listeners ---
    function initializeEventListeners() {
        // Logout Button
        const logoutBtn = getElement('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => signOut(auth).catch(error => console.error('Logout Error:', error)));
        }

        // Affiliate Application Button
        const applyBtn = getElement('apply-affiliate-btn', false);
        if (applyBtn) {
            applyBtn.addEventListener('click', handleAffiliateApplication);
        }

        // Profile Update Form
        const profileUpdateForm = getElement('profile-update-form', false);
        if (profileUpdateForm) {
            profileUpdateForm.addEventListener('submit', handleProfileUpdate);
        }

        // Tab Switching
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
    

    async function handleProfileUpdate(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;
        
        const updatedData = {
            name: getElement('profile-name').value,
            phoneNumber: getElement('profile-phone').value,
        };
        
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, updatedData);
            alert('Profile updated successfully!');
            getElement('user-name-display').textContent = updatedData.name;
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    }

    // --- Helper function for styling order status ---
    function getStatusChipClass(status) {
        const statusClasses = { 'Pending': 'bg-yellow-100 text-yellow-800', 'Confirmed': 'bg-blue-100 text-blue-800', 'Shipped': 'bg-indigo-100 text-indigo-800', 'Delivered': 'bg-green-100 text-green-800', 'Cancelled': 'bg-red-100 text-red-800' };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }
});
