// static/product-page.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Defensive DOM Element Selection ---
    const getElement = (id) => document.getElementById(id);
    const loadingSkeleton = getElement('loading-skeleton');
    const productDetailsContainer = getElement('product-details');
    const productImageSection = getElement('product-image-section');
    const productInfoSection = getElement('product-info-section');
    const productContainer = getElement('product-container');
    const relatedProductsContainer = getElement('related-products-container');
    const relatedProductsGrid = getElement('related-products-grid');

    
    // --- State Management ---
    const state = {
        productId: null, affiliateId: null, customPrice: null, userRole: 'customer'
    };

    /**
     * Extracts parameters from the URL.
     */
    function getUrlParams() {
        const pathParts = window.location.pathname.split('/');
        state.productId = pathParts[pathParts.length - 1];
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
            displayError('Invalid product URL.'); return;
        }

        const user = auth.currentUser;
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists() && docSnap.data().role === 'affiliate') {
                state.userRole = 'affiliate';
            }
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
                await fetchRelatedProducts(product);
            } else {
                throw new Error('Sorry, this product could not be found.');
            }
        } catch (error) {
            console.error("Error fetching product:", error);
            displayError(error.message);
        }
    }

    /**
     * Renders the product details into the HTML.
     */
    function displayProduct(product) {
        const regularPrice = product.offerPrice > 0 ? product.offerPrice : product.price;
        let finalPrice = state.customPrice ? Number(state.customPrice) : regularPrice;
        const wholesalePrice = product.wholesalePrice || 0;
        const minSellingPrice = wholesalePrice > 0 ? wholesalePrice : regularPrice;

        productImageSection.innerHTML = `<img src="${product.ogPic || 'https://via.placeholder.com/600x600'}" alt="${product.name}" class="w-full h-auto max-h-[500px] object-contain rounded-lg shadow-md">`;

        let infoHTML = `
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900">${product.name}</h1>
            <div class="text-sm text-gray-600 my-4 space-y-1 border-t border-b py-3">
                <p><strong>Category:</strong> ${product.category || 'N/A'}</p>
                <p><strong>Product Code:</strong> ${product.productCode || 'N/A'}</p>
                <p><strong>Stock:</strong> <span class="${product.stock > 0 ? 'text-green-600' : 'text-red-600'} font-semibold">${product.stock > 0 ? `${product.stock} available` : 'Out of Stock'}</span></p>
            </div>`;
        
        if (state.userRole === 'affiliate') {
            const currentProfit = finalPrice - wholesalePrice;
            infoHTML += `
                <div class="bg-indigo-50 p-4 rounded-lg mb-4 border border-indigo-200">
                    <h3 class="font-bold text-indigo-800">Affiliate Tools</h3>
                    <p class="text-sm text-gray-700">Wholesale Price: <span class="font-bold">৳${wholesalePrice.toFixed(2)}</span></p>
                    <div class="mt-2">
                        <label for="affiliate-price-input" class="block text-sm font-medium">Set Your Selling Price (Min: ৳${minSellingPrice.toFixed(2)})</label>
                        <input type="number" id="affiliate-price-input" class="w-full mt-1 p-2 border rounded-md" value="${finalPrice.toFixed(2)}" min="${minSellingPrice}">
                    </div>
                    <p class="text-sm text-green-600 font-semibold mt-2">Your Profit: <span id="affiliate-profit">৳${currentProfit.toFixed(2)}</span></p>
                </div>`;
        }
        
        infoHTML += `
            <div class="mb-6">
                <span class="text-4xl font-bold text-indigo-600" id="final-price-display">৳${finalPrice.toFixed(2)}</span>
                ${!state.customPrice && product.offerPrice > 0 ? `<span class="text-xl text-gray-500 line-through ml-4">৳${product.price}</span>` : ''}
            </div>
            <div class="prose max-w-none text-gray-700 mb-8"><p>${product.description || 'No detailed description.'}</p></div>
            <button id="buy-now-btn" class="w-full bg-indigo-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition" ${product.stock === 0 ? 'disabled' : ''}>
                <i class="${state.userRole === 'affiliate' ? 'fas fa-copy' : 'fas fa-shopping-cart'} mr-2"></i>
                ${state.userRole === 'affiliate' ? 'Generate & Copy Link' : (product.stock > 0 ? 'Buy Now' : 'Out of Stock')}
            </button>`;
        
        productInfoSection.innerHTML = infoHTML;
        
        const buyNowBtn = getElement('buy-now-btn');
        if (buyNowBtn) buyNowBtn.addEventListener('click', handleBuyNow);
        
        if (state.userRole === 'affiliate') {
            const priceInput = getElement('affiliate-price-input');
            const profitDisplay = getElement('affiliate-profit');
            const finalPriceDisplay = getElement('final-price-display');
            
            if(priceInput) priceInput.addEventListener('input', () => {
                let newPrice = Number(priceInput.value);
                if (newPrice < minSellingPrice) newPrice = minSellingPrice;
                const newProfit = newPrice - wholesalePrice;
                if (profitDisplay) profitDisplay.textContent = `৳${newProfit.toFixed(2)}`;
                if (finalPriceDisplay) finalPriceDisplay.textContent = `৳${newPrice.toFixed(2)}`;
                state.customPrice = newPrice;
            });
        }
    }

    function handleBuyNow() {
        if (state.userRole === 'affiliate') {
            const user = auth.currentUser;
            const affiliateId = user ? `AFF-${user.uid.substring(0, 6).toUpperCase()}` : 'SHARED';
            const sellingPrice = getElement('affiliate-price-input').value;
            const link = `${window.location.origin}/product/${state.productId}?ref=${affiliateId}&price=${sellingPrice}`;
            navigator.clipboard.writeText(link).then(() => alert(`Affiliate Link Copied!\n${link}`));
        } else {
            onAuthStateChanged(auth, (user) => {
                if (user) {
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
    }

    // --- Initial Call ---
    onAuthStateChanged(auth, () => loadPage());

    // --- Other Helper Functions ---
    async function fetchRelatedProducts(currentProduct) {
        if (!currentProduct.category) return;
        try {
            const q = query(collection(db, 'products'), where("category", "==", currentProduct.category), limit(6));
            const snapshot = await getDocs(q);
            const related = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(p => p.id !== state.productId);
            if (related.length > 0) {
                relatedProductsGrid.innerHTML = related.slice(0, 5).map(createRelatedProductCard).join('');
                relatedProductsContainer.classList.remove('hidden');
            }
        } catch (error) { console.warn("Could not fetch related products:", error); }
    }

    function createRelatedProductCard(product) {
        const price = product.offerPrice > 0 ? product.offerPrice : product.price;
        return `<a href="/product/${product.id}" class="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform"><img src="${product.ogPic || 'https://via.placeholder.com/200'}" alt="${product.name}" class="w-full h-32 object-cover"><div class="p-3"><h4 class="text-sm font-semibold truncate">${product.name}</h4><p class="text-md font-bold text-indigo-600 mt-1">৳${price}</p></div></a>`;
    }

    function updateMetaTags(product) {
        const title = product.metaTitle || product.name;
        document.title = `${title} - AnyShop`;
        getElement('meta-description').setAttribute('content', product.metaDescription || `Buy ${title}`);
        getElement('og-title').setAttribute('content', title);
        getElement('og-image').setAttribute('content', product.ogPic || '');
    }

    function displayError(message) {
        productContainer.innerHTML = `<div class="text-center py-10"><h2 class="text-2xl font-bold text-red-600">Oops!</h2><p class="mt-2">${message}</p><a href="/" class="mt-6 inline-block bg-indigo-600 text-white py-2 px-6 rounded">Go to Homepage</a></div>`;
    }
});
