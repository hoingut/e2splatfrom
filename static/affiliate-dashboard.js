// static/affiliate-dashboard.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References (Defensive Selection) ---
    const getElement = (id) => document.getElementById(id);
    
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const affiliateName = getElement('affiliate-name');
    const affiliateId = getElement('affiliate-id');
    const affiliateBalance = getElement('affiliate-balance');
    const totalOrders = getElement('total-orders');
    const totalEarned = getElement('total-earned');
    const productsGrid = getElement('affiliate-products-grid');
    const logoutBtn = getElement('logout-btn');

    // --- Step 3: Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                
                if (docSnap.exists() && docSnap.data().role === 'affiliate') {
                    const affiliateData = docSnap.data();
                    await loadDashboard(affiliateData); // Pass the whole data object
                } else {
                    throw new Error('Access denied. You are not an approved affiliate.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/affiliate/dashboard`;
        }
    });

    /**
     * Main function to load all dashboard data.
     * @param {object} affiliateData - The affiliate's data from the 'users' document.
     */
    async function loadDashboard(affiliateData) {
        try {
            const [stats, products] = await Promise.all([
                fetchAffiliateStats(affiliateData.affiliateId),
                fetchAllProducts()
            ]);
            
            // Populate UI with fetched data
            affiliateName.textContent = affiliateData.name || 'Affiliate';
            affiliateId.textContent = affiliateData.affiliateId || 'N/A';
            affiliateBalance.textContent = `৳${(affiliateData.affiliateBalance || 0).toFixed(2)}`;
            totalOrders.textContent = stats.completedOrders;
            totalEarned.textContent = `৳${stats.totalProfit.toFixed(2)}`;
            
            displayProducts(products);

            loadingContainer.classList.add('hidden');
            dashboardContent.classList.remove('hidden');
        } catch(error) {
            console.error("Error loading dashboard:", error);
            dashboardContent.innerHTML = `<p class="text-red-500 p-4 bg-red-100 rounded-md">Failed to load dashboard data. Error: ${error.message}</p>`;
        }
    }
    
    /**
     * Fetches affiliate's order stats (completed orders and total profit).
     * @param {string} affId - The affiliate's unique ID from the user document.
     */
    async function fetchAffiliateStats(affId) {
        if (!affId) return { completedOrders: 0, totalProfit: 0 };
        
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where("affiliateId", "==", affId), where("status", "==", "Delivered"));
        const querySnapshot = await getDocs(q);
        
        let totalProfit = 0;
        querySnapshot.forEach(doc => {
            totalProfit += Number(doc.data().profit) || 0;
        });
        
        return { completedOrders: querySnapshot.size, totalProfit };
    }

    /**
     * Fetches all products available for selling from the 'products' collection.
     */
    async function fetchAllProducts() {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Renders product cards for affiliates and stores products globally for the link generator.
     * @param {Array} products - An array of product objects.
     */
    function displayProducts(products) {
        window.allProducts = products; // Store for access by generateLink
        if (!products || products.length === 0) {
            productsGrid.innerHTML = `<p class="col-span-full text-center text-gray-500">No products are available to sell at the moment.</p>`;
            return;
        }

        productsGrid.innerHTML = products.map(product => {
            const retailPrice = product.offerPrice > 0 ? product.offerPrice : product.price;
            return `
                <div class="bg-white rounded-lg shadow p-4 flex flex-col">
                    <img src="${product.ogPic || 'https://via.placeholder.com/300'}" alt="${product.name}" class="w-full h-40 object-cover rounded-md mb-3">
                    <h4 class="font-semibold text-md flex-grow">${product.name}</h4>
                    <p class="text-sm text-gray-500 mt-1">Wholesale: <span class="font-bold">৳${product.wholesalePrice}</span></p>
                    <p class="text-sm text-gray-500">Retail: <span class="font-bold">৳${retailPrice}</span></p>
                    
                    <div class="mt-4 pt-4 border-t">
                        <label for="price-${product.id}" class="block text-sm font-medium">Your Selling Price:</label>
                        <input type="number" id="price-${product.id}" class="w-full mt-1 p-2 border rounded-md" placeholder="e.g., ${retailPrice + 50}">
                        <button onclick="generateLink('${product.id}')" class="w-full mt-2 bg-indigo-500 text-white text-sm py-2 rounded-md hover:bg-indigo-600">Generate & Copy Link</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Generates a unique affiliate link and copies it to the clipboard.
     * This function is attached to the window object to be accessible from inline onclick handlers.
     * @param {string} productId - The ID of the product.
     */
    window.generateLink = (productId) => {
        const sellingPriceInput = document.getElementById(`price-${productId}`);
        const sellingPrice = sellingPriceInput.value;
        const affId = affiliateId.textContent;
        
        if (!sellingPrice || Number(sellingPrice) <= 0) {
            alert('Please enter a valid selling price.');
            return;
        }
        
        const product = window.allProducts.find(p => p.id === productId);
        if (Number(sellingPrice) < product.wholesalePrice) {
            alert('Selling price cannot be less than the wholesale price.');
            return;
        }
        
        const link = `${window.location.origin}/product/${productId}?ref=${affId}&price=${sellingPrice}`;
        
        navigator.clipboard.writeText(link).then(() => {
            alert(`Link Copied!\n${link}`);
        }).catch(err => {
            alert('Failed to copy link. Please copy it manually from the console.');
            console.log('Copy this link:', link);
            console.error('Clipboard error:', err);
        });
    };

    // Logout button event listener
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).then(() => {
                window.location.href = '/'; // Redirect to homepage after logout
            }).catch(error => console.error('Logout Error:', error));
        });
    }
});
