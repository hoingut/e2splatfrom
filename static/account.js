// --- Step 1: Import all necessary functions and services from Firebase ---
// This modular approach ensures we only load the code we need.
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- Step 2: Main script execution block ---
// This ensures the script runs only after the entire HTML document is fully loaded and parsed.
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM is ready. Initializing AnyShop account page script.");

    // --- Step 3: Defensive DOM Element Selection ---
    // This helper function safely gets elements and provides clear error messages if an ID is missing.
    const getElement = (id, isCritical = true) => {
        const element = document.getElementById(id);
        if (!element && isCritical) {
            // This is your best debugging tool! It will tell you EXACTLY which ID is missing.
            console.error(`FATAL ERROR: A critical HTML element with id "${id}" was not found.`);
        } else if (!element) {
            console.warn(`Warning: A non-critical HTML element with id "${id}" was not found.`);
        }
        return element;
    };

    // Get all necessary elements. Check your browser console for any "FATAL ERROR" messages.
    const loadingSpinner = getElement('loading-spinner');
    const accountDashboard = getElement('account-dashboard');
    const logoutBtn = getElement('logout-btn');
    const userNameDisplay = getElement('user-name-display');
    const walletBalanceDisplay = getElement('wallet-balance-display');
    const totalOrdersDisplay = getElement('total-orders-display');
    const orderHistoryContainer = getElement('order-history-container');
    const profileUpdateForm = getElement('profile-update-form');

    // --- Step 4: Guard Clause ---
    // If the most critical elements for the page to function are missing, stop the script.
    if (!loadingSpinner || !accountDashboard) {
        console.error("Script halted because essential page elements ('loading-spinner' or 'account-dashboard') are missing.");
        return;
    }

    // --- Step 5: Authentication Observer (The Core Logic) ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loadPageData(user);
        } else {
            // If no user is logged in, redirect immediately. This solves the redirect bug.
            const redirectUrl = encodeURIComponent(window.location.pathname);
            window.location.href = `/login?redirect=${redirectUrl}`;
        }
    });

    /**
     * Main function to load all data for the logged-in user with robust error handling.
     * @param {object} user - The Firebase user object.
     */
    async function loadPageData(user) {
        try {
            // Fetch user profile and orders in parallel for faster loading.
            const [userData, orders] = await Promise.all([
                fetchUserProfile(user.uid),
                fetchUserOrders(user.uid)
            ]);

            // If we reach here, data fetching was successful. This solves the data not showing bug.
            populateDashboard(userData, orders.length);
            populateProfileForm(userData);
            displayOrders(orders);

        } catch (error) {
            console.error("CRITICAL ERROR while loading account page data:", error);
            if (accountDashboard) {
                accountDashboard.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-md text-center">
                        <h2 class="text-xl text-red-600 font-bold">Oops! Something went wrong.</h2>
                        <p class="text-gray-700 mt-2">Could not load your account details. Please refresh the page.</p>
                        <p class="text-xs text-gray-500 mt-4">Error: ${error.message}</p>
                    </div>`;
            }
        } finally {
            // THIS IS THE KEY FIX: This block always runs, regardless of success or error.
            // This solves the "loading spinner not disappearing" bug.
            if (loadingSpinner) loadingSpinner.style.display = 'none';
            if (accountDashboard) accountDashboard.classList.remove('hidden');
        }
    }

    // --- Data Fetching Functions ---
    async function fetchUserProfile(uid) {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            throw new Error("Your user profile was not found in our database. Please contact support.");
        }
    }

    async function fetchUserOrders(uid) {
        const q = query(collection(db, 'orders'), where("userId", "==", uid), orderBy("orderDate", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // --- UI Population Functions (with defensive checks) ---
    function populateDashboard(userData, orderCount) {
        if (userNameDisplay) userNameDisplay.textContent = userData.name || 'Valued Customer';
        if (walletBalanceDisplay) {
            const balance = userData.walletBalance;
            // **FIX for .toFixed error**: Check if balance is a number before formatting.
            walletBalanceDisplay.textContent = `৳${(typeof balance === 'number') ? balance.toFixed(2) : '0.00'}`;
        }
        if (totalOrdersDisplay) totalOrdersDisplay.textContent = orderCount;
    }

    function populateProfileForm(userData) {
        const nameInput = getElement('profile-name', false);
        const emailInput = getElement('profile-email', false);
        const phoneInput = getElement('profile-phone', false);

        if (nameInput) nameInput.value = userData.name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phoneNumber || '';
    }

    function displayOrders(orders) {
        if (!orderHistoryContainer) return;
        if (orders.length === 0) {
            orderHistoryContainer.innerHTML = '<p class="text-gray-500 text-center py-4">You haven\'t placed any orders yet.</p>';
            return;
        }
        
        const tableHTML = `
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th class="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                    ${orders.map(order => {
                        // **FIX for .toFixed error**: Check if price exists and is a number.
                        const price = order.priceDetails?.total;
                        const formattedPrice = (typeof price === 'number') ? price.toFixed(2) : 'N/A';
                        
                        return `
                        <tr>
                            <td class="py-3 px-3">${order.productName}</td>
                            <td class="py-3 px-3 font-semibold">৳${formattedPrice}</td>
                            <td class="py-3 px-3">
                                <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusChipClass(order.status)}">
                                    ${order.status}
                                </span>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>`;
        orderHistoryContainer.innerHTML = tableHTML;
    }

    // --- Event Listeners Setup ---
    if (profileUpdateForm) {
        profileUpdateForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const updatedData = {
                name: getElement('profile-name').value,
                phoneNumber: getElement('profile-phone').value,
            };

            const userRef = doc(db, 'users', user.uid);
            try {
                await updateDoc(userRef, updatedData);
                alert('Profile updated successfully!');
                if (userNameDisplay) userNameDisplay.textContent = updatedData.name;
            } catch (error) {
                alert('Error updating profile: ' + error.message);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }

    const navButtons = document.querySelectorAll('.account-nav-btn');
    if (navButtons.length > 0) {
        const tabContents = document.querySelectorAll('.tab-content');
        navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetId = button.dataset.target;
                navButtons.forEach(btn => btn.classList.remove('active-nav-btn'));
                button.classList.add('active-nav-btn');
                tabContents.forEach(content => {
                    if (content) {
                       content.id === targetId ? content.classList.remove('hidden') : content.classList.add('hidden');
                    }
                });
            });
        });
    }

    // --- Helper function for styling order status ---
    function getStatusChipClass(status) {
        const statusClasses = {
            'Pending': 'bg-yellow-100 text-yellow-800', 'Confirmed': 'bg-blue-100 text-blue-800',
            'Shipped': 'bg-indigo-100 text-indigo-800', 'Delivered': 'bg-green-100 text-green-800',
            'Cancelled': 'bg-red-100 text-red-800',
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }
});
