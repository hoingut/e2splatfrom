// --- Step 1: Import necessary functions and services ---
// Import from your custom firebaseConfig.js file
import { auth, db } from './firebaseConfig.js';

// Import the specific auth function we need for this page
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Import all the firestore functions we will use in this file
import { 
    doc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const productDetailsContainer = document.getElementById('product-details');
    const productImageSection = document.getElementById('product-image-section');
    const productInfoSection = document.getElementById('product-info-section');
    const productContainer = document.getElementById('product-container');

    // --- Step 3: Get Product ID from URL ---
    // Example URL: /product/aBcDeFg123 (Flask dynamic route)
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];

    if (!productId || productId.trim() === '') {
        displayError('Invalid product URL. No product ID found.');
        return;
    }

    // --- Step 4: Main Function to Load Product Details ---
    async function loadProductDetails() {
        try {
            // Create a reference to the specific product document in Firestore
            const productRef = doc(db, 'products', productId);
            const docSnap = await getDoc(productRef);

            if (docSnap.exists()) {
                const product = docSnap.data();
                
                // Update the page with the product's data
                updateMetaTags(product);
                displayProduct(product, productId);
                
                // Hide skeleton and show the actual content
                loadingSkeleton.classList.add('hidden');
                productDetailsContainer.classList.remove('hidden');

            } else {
                // The product with the given ID was not found
                throw new Error('Sorry, this product could not be found.');
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            displayError(error.message);
        }
    }
    
    // --- Step 5: UI Update Functions ---

    /**
     * Updates the page's meta tags for better SEO.
     * @param {object} product - The product data from Firestore.
     */
    function updateMetaTags(product) {
        const pageTitle = product.metaTitle || `${product.name} - AnyShop`;
        const description = product.metaDescription || `Buy ${product.name} at a great price on AnyShop. High-quality and affordable.`;
        
        document.title = pageTitle;
        document.querySelector('#meta-description')?.setAttribute('content', description);
        document.querySelector('#og-title')?.setAttribute('content', pageTitle);
        document.querySelector('#og-description')?.setAttribute('content', description);
        document.querySelector('#og-image')?.setAttribute('content', product.ogPic || '');
    }

    /**
     * Renders the product details into the HTML.
     * @param {object} product - The product data.
     * @param {string} productId - The document ID of the product.
     */
    function displayProduct(product, productId) {
        // Populate Image Section
        productImageSection.innerHTML = `
            <img src="${product.ogPic || 'https://via.placeholder.com/600x600'}" alt="${product.name}" class="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-md">
        `;

        // Populate Info Section
        const hasOffer = product.offerPrice > 0;
        const finalPrice = hasOffer ? product.offerPrice : product.price;

        productInfoSection.innerHTML = `
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900">${product.name}</h1>
            <div class="mt-4 mb-6">
                <span class="text-4xl font-bold text-indigo-600">৳${finalPrice}</span>
                ${hasOffer ? `<span class="text-xl text-gray-500 line-through ml-4">৳${product.price}</span>` : ''}
            </div>
            <div class="text-sm text-gray-600 mb-4 space-y-1">
                <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
                <p><strong>Stock:</strong> <span class="${product.stock > 0 ? 'text-green-600' : 'text-red-600'} font-semibold">${product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}</span></p>
                <p><strong>Product Code:</strong> ${product.code || 'N/A'}</p>
            </div>
            <div class="prose max-w-none text-gray-700 mb-8">
                <p>${product.description || 'No detailed description available for this product.'}</p>
            </div>
            <button id="buy-now-btn" class="w-full bg-indigo-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition duration-300 flex items-center justify-center" ${product.stock === 0 ? 'disabled' : ''}>
                <i class="fas fa-shopping-cart mr-2"></i>
                ${product.stock > 0 ? 'Buy Now' : 'Out of Stock'}
            </button>
        `;

        // Add event listener to the newly created "Buy Now" button
        const buyNowBtn = document.getElementById('buy-now-btn');
        if (buyNowBtn) {
            buyNowBtn.addEventListener('click', () => handleBuyNow(productId));
        }
    }

    /**
     * Displays a full-page error message.
     * @param {string} message - The error message to display.
     */
    function displayError(message) {
        loadingSkeleton.classList.add('hidden');
        productDetailsContainer.classList.add('hidden');
        productContainer.innerHTML = `
            <div class="text-center py-10">
                <h2 class="text-2xl font-bold text-red-600">Oops! Something went wrong.</h2>
                <p class="text-gray-600 mt-2">${message}</p>
                <a href="/" class="mt-6 inline-block bg-indigo-600 text-white py-2 px-6 rounded hover:bg-indigo-700">Go to Homepage</a>
            </div>
        `;
    }

    // --- Step 6: Event Handlers ---
    
    /**
     * Handles the logic for the "Buy Now" button click.
     * Checks if the user is logged in before proceeding to checkout.
     * @param {string} productId - The ID of the product.
     */
    function handleBuyNow(productId) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // If user is logged in, redirect to the checkout page
                window.location.href = `/checkout?productId=${productId}`;
            } else {
                // If not logged in, show a message and redirect to the login page
                // We pass the current page as a redirect URL so the user comes back here after logging in.
                alert('Please log in to continue with your purchase.');
                const redirectUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `/login?redirect=${redirectUrl}`;
            }
        });
    }

    // --- Initial Call to start the process ---
    loadProductDetails();
});
