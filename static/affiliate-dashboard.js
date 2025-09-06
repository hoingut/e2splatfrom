// static/affiliate-dashboard.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const loadingContainer = document.getElementById('loading-container');
    const dashboardContent = document.getElementById('dashboard-content');
    const affiliateName = document.getElementById('affiliate-name');
    const affiliateId = document.getElementById('affiliate-id');
    const affiliateBalance = document.getElementById('affiliate-balance');
    const totalOrders = document.getElementById('total-orders');
    const totalEarned = document.getElementById('total-earned');
    const productsGrid = document.getElementById('affiliate-products-grid');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                
                if (docSnap.exists() && docSnap.data().role === 'affiliate') {
                    const affiliateData = docSnap.data();
                    await loadDashboard(user.uid, affiliateData);
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
     * @param {string} uid - The affiliate's user ID.
     * @param {object} affiliateData - The affiliate's data from the 'users' document.
     */
    async function loadDashboard(uid, affiliateData) {
        try {
            // Fetch stats and products in parallel
            const [stats, products] = await Promise.all([
                fetchAffiliateStats(uid),
                fetchAllProducts()
            ]);
            
            // Populate UI
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
            dashboardContent.innerHTML = `<p class="text-red-500">Failed to load dashboard data.</p>`;
        }
    }
    
    /**
     * Fetches affiliate's order stats (completed orders and total profit).
     * @param {string} uid - The affiliate's user ID.
     */
    async function fetchAffiliateStats(uid) {
        const affiliateId = `AFF-${uid.substring(0, 6).toUpperCase()}`;
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where("affiliateId", "==", affiliateId), where("status", "==", "Delivered"));
        const querySnapshot = await getDocs(q);
        
        let totalProfit = 0;
        querySnapshot.forEach(doc => {
            totalProfit += doc.data().profit || 0;
        });
        
        return {
            completedOrders: querySnapshot.size,
            totalProfit: totalProfit
        };
    }

    /**
     * Fetches all products available for selling.
     */
    async function fetchAllProducts() {
        const productsRef = collection(db, 'products');
        const q = query(productsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Renders product cards for affiliates.
     * @param {Array} products - An array of product objects.
     */
    function displayProducts(products) {
        if (!products || products.length === 0) {
            productsGrid.innerHTML = `<p>No products available to sell currently.</p>`;
            return;
        }

        productsGrid.innerHTML = products.map(product => {
            const retailPrice = product.offerPrice > 0 ? product.offerPrice : product.price;
            return `
                <div class="bg-white rounded-lg shadow p-4 flex flex-col">
                    <img src="${product.ogPic || 'https://via.placeholder.com/300'}" alt="${product.name}" class="w-full h-40 object-cover rounded-md mb-3">
                    <h4 class="font-semibold text-md">${product.name}</h4>
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
        if(Number(sellingPrice) < product.wholesalePrice){
            alert('Selling price cannot be less than the wholesale price.');
            return;
        }
        
        const link = `${window.location.origin}/product/${productId}?ref=${affId}&price=${sellingPrice}`;
        
        navigator.clipboard.writeText(link).then(() => {
            alert(`Link Copied!\n${link}`);
        }).catch(err => {
            alert('Failed to copy link. Please copy it manually.');
            console.error('Clipboard error:', err);
        });
    };
    
    // Store products globally for the generateLink function
    window.allProducts = []; 
    // This is a simplified way. A better approach would be to pass product data to the function.
    // Let's update `displayProducts` to do this.
    
    // Re-defining displayProducts to store data in the global scope for the simple onclick handler.
    // A more advanced way would be to add event listeners programmatically.
    function displayProducts(products) {
        window.allProducts = products;
        // ... (rest of the displayProducts function from above)
    }

    // Logout button event listener
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
