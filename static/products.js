// static/products.js

// --- Imports ---
import { db } from './firebaseConfig.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const productGrid = document.getElementById('product-grid');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const noResultsMessage = document.getElementById('no-results-message');
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    // --- State Management ---
    let allProducts = []; // To store all products fetched from Firestore
    let uniqueCategories = new Set(); // To store unique categories

    /**
     * Main function to fetch all products and initialize the page.
     */
    async function initializeProductsPage() {
        try {
            const productsRef = collection(db, 'products');
            const q = query(productsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            allProducts = querySnapshot.docs.map(doc => {
                const productData = doc.data();
                // Add category to the set for the filter dropdown
                if (productData.category) {
                    uniqueCategories.add(productData.category);
                }
                return { id: doc.id, ...productData };
            });
            
            populateCategoryFilter();
            renderProducts(allProducts); // Initial render with all products

        } catch (error) {
            console.error("Error fetching products:", error);
            productGrid.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load products.</p>`;
        } finally {
            loadingSkeleton.classList.add('hidden');
        }
    }

    /**
     * Populates the category filter dropdown with unique categories.
     */
    function populateCategoryFilter() {
        uniqueCategories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    /**
     * Renders a list of products into the product grid.
     * @param {Array} productsToRender - An array of product objects to display.
     */
    function renderProducts(productsToRender) {
        if (productsToRender.length === 0) {
            productGrid.innerHTML = '';
            noResultsMessage.classList.remove('hidden');
        } else {
            productGrid.innerHTML = productsToRender.map(product => createProductCard(product)).join('');
            noResultsMessage.classList.add('hidden');
        }
    }

    /**
     * Creates the HTML string for a single product card.
     * @param {object} product - A product object.
     * @returns {string} - The HTML string for the product card.
     */
    function createProductCard(product) {
        const hasOffer = product.offerPrice > 0;
        const finalPrice = hasOffer ? product.offerPrice : product.price;
        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group">
                <a href="/product/${product.id}" class="block">
                    <div class="relative"><img src="${product.ogPic || 'https://via.placeholder.com/300'}" alt="${product.name}" class="w-full h-48 object-cover"></div>
                    <div class="p-4">
                        <h3 class="font-semibold text-gray-800 truncate" title="${product.name}">${product.name}</h3>
                        <div class="mt-2 flex items-baseline">
                            <span class="text-xl font-bold text-indigo-600">৳${finalPrice}</span>
                            ${hasOffer ? `<span class="text-sm text-gray-500 line-through ml-2">৳${product.price}</span>` : ''}
                        </div>
                    </div>
                </a>
            </div>
        `;
    }

    /**
     * Filters products based on current search and category selections.
     */
    function filterAndRender() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedCategory = categoryFilter.value;

        let filteredProducts = allProducts;

        // Filter by category
        if (selectedCategory !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === selectedCategory);
        }

        // Filter by search term
        if (searchTerm) {
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchTerm) ||
                (p.keywords && p.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)))
            );
        }

        renderProducts(filteredProducts);
    }
    
    // --- Event Listeners for Search and Filter ---
    searchInput.addEventListener('input', filterAndRender);
    categoryFilter.addEventListener('change', filterAndRender);

    // --- Initial Call ---
    initializeProductsPage();
});
