// static/product-page.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const productDetailsContainer = document.getElementById('product-details');
    const productImageSection = document.getElementById('product-image-section');
    const productInfoSection = document.getElementById('product-info-section');
    const productContainer = document.getElementById('product-container');
    const relatedProductsContainer = document.getElementById('related-products-container');
    const relatedProductsGrid = document.getElementById('related-products-grid');

    // --- State Management ---
    const state = {
        productId: null,
        affiliateId: null,
        customPrice: null,
    };

    /**
     * Extracts parameters from the URL.
     */
    function getUrlParams() {
        // Get product ID from the URL path (e.g., /product/PRODUCT_ID)
        const pathParts = window.location.pathname.split('/');
        state.productId = pathParts[pathParts.length - 1];

        // Get affiliate details from URL query parameters (e.g., ?ref=...&price=...)
        const params = new URLSearchParams(window.location.search);
        state.affiliateId = params.get('ref');
        state.customPrice = params.get('price');
    }

    /**
     * Main function to load all page data.
     */
    async function loadPage() {
        getUrlParams();

        if (!state.productId) {
            displayError('Invalid product URL. No product ID found.');
            return;
        }
        
        try {
            const productRef = doc(db, 'products', state.productId);
            const docSnap = await getDoc(productRef);

            if (docSnap.exists()) {
                const product = docSnap.data();
                
                updateMetaTags(product);
                displayProduct(product);
                
                loadingSkeleton.classList.add('hidden');
                productDetailsContainer.classList.remove('hidden');
                
                // After displaying the main product, fetch related products.
                await fetchRelatedProducts(product);
            } else {
                throw new Error('Sorry, this product could not be found.');
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            displayError(error.message);
        }
    }
    
    // --- UI Update Functions ---

    function updateMetaTags(product) { /* ... ( আগের উত্তর থেকে কপি করুন ) ... */ }

    function displayProduct(product) {
        // Image Section
        productImageSection.innerHTML = `<img src="${product.ogPic || 'https://via.placeholder.com/600x600'}" alt="${product.name}" class="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-md">`;

        // Determine the price to show
        const regularPrice = product.offerPrice > 0 ? product.offerPrice : product.price;
        const finalPrice = state.customPrice ? Number(state.customPrice) : regularPrice;
        
        productInfoSection.innerHTML = `
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900">${product.name}</h1>
            ${state.affiliateId ? '<p class="text-sm text-green-600 font-semibold mt-2">Sold by an affiliate partner</p>' : ''}
            <div class="mt-4 mb-6">
                <span class="text-4xl font-bold text-indigo-600">৳${finalPrice.toFixed(2)}</span>
                ${!state.customPrice && product.offerPrice > 0 ? `<span class="text-xl text-gray-500 line-through ml-4">৳${product.price}</span>` : ''}
            </div>
            <p class="prose max-w-none text-gray-700 mb-8">${product.description || 'No detailed description.'}</p>
            <button id="buy-now-btn" class="w-full bg-indigo-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition" ${product.stock === 0 ? 'disabled' : ''}>
                <i class="fas fa-shopping-cart mr-2"></i> ${product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
            </button>
        `;
        
        const buyNowBtn = document.getElementById('buy-now-btn');
        if (buyNowBtn) buyNowBtn.addEventListener('click', handleBuyNow);
    }
    
    /**
     * Fetches and displays related products based on category.
     * @param {object} currentProduct - The main product being viewed.
     */
    async function fetchRelatedProducts(currentProduct) {
        if (!currentProduct.category) return;

        try {
            const productsRef = collection(db, 'products');
            const q = query(
                productsRef, 
                where("category", "==", currentProduct.category), 
                limit(6) // Fetch up to 6 related products
            );
            const querySnapshot = await getDocs(q);

            const relatedProducts = [];
            querySnapshot.forEach(doc => {
                // Exclude the current product from its own related list
                if (doc.id !== state.productId) {
                    relatedProducts.push({ id: doc.id, ...doc.data() });
                }
            });
            
            if (relatedProducts.length > 0) {
                relatedProductsGrid.innerHTML = relatedProducts.slice(0, 5).map(createRelatedProductCard).join('');
                relatedProductsContainer.classList.remove('hidden');
            }

        } catch (error) {
            console.warn("Could not fetch related products:", error);
        }
    }

    /**
     * Creates HTML for a small related product card.
     */
    function createRelatedProductCard(product) {
        const finalPrice = product.offerPrice > 0 ? product.offerPrice : product.price;
        return `
            <a href="/product/${product.id}" class="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform">
                <img src="${product.ogPic || 'https://via.placeholder.com/200'}" alt="${product.name}" class="w-full h-32 object-cover">
                <div class="p-3">
                    <h4 class="text-sm font-semibold truncate">${product.name}</h4>
                    <p class="text-md font-bold text-indigo-600 mt-1">৳${finalPrice}</p>
                </div>
            </a>
        `;
    }
    function updateMetaTags(product) {
        const pageTitle = product.metaTitle || `${product.name} - AnyShop`;
        const description = product.metaDescription || `Buy ${product.name} at a great price on AnyShop. High-quality and affordable.`;
        
        document.title = pageTitle;
        document.querySelector('#meta-description')?.setAttribute('content', description);
        document.querySelector('#og-title')?.setAttribute('content', pageTitle);
        document.querySelector('#og-description')?.setAttribute('content', description);
        document.querySelector('#og-image')?.setAttribute('content', product.ogPic || '');
    }

    // --- Event Handlers ---
    
    function handleBuyNow() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // Construct the checkout URL with all necessary parameters
                let checkoutUrl = `/checkout?productId=${state.productId}`;
                if (state.affiliateId) checkoutUrl += `&ref=${state.affiliateId}`;
                if (state.customPrice) checkoutUrl += `&price=${state.customPrice}`;
                
                window.location.href = checkoutUrl;
            } else {
                alert('Please log in to continue.');
                const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `/login?redirect=${redirectUrl}`;
            }
        });
    }

    // --- Initial Call ---
    loadPage();
});

// --- Helper Functions outside the main block (if needed) ---
function updateMetaTags(product) {
    const pageTitle = product.metaTitle || `${product.name} - AnyShop`;
    const description = product.metaDescription || `Buy ${product.name} at AnyShop.`;
    document.title = pageTitle;
    document.querySelector('#meta-description')?.setAttribute('content', description);
    document.querySelector('#og-title')?.setAttribute('content', pageTitle);
    document.querySelector('#og-image')?.setAttribute('content', product.ogPic || '');
}

function displayError(message) {
    const productContainer = document.getElementById('product-container');
    productContainer.innerHTML = `<div class="text-center py-10"><h2 class="text-2xl font-bold text-red-600">Oops!</h2><p class="mt-2">${message}</p><a href="/" class="mt-6 inline-block bg-indigo-600 text-white py-2 px-6 rounded">Go to Homepage</a></div>`;
                          }
