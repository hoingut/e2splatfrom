// --- Step 1: Import necessary functions and services ---
// Import from your custom firebaseConfig.js file
import { db } from './firebaseConfig.js';

// Import all the firestore functions we will use in this file
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const hotProductsGrid = document.getElementById('hot-products-grid');
    const newProductsGrid = document.getElementById('new-products-grid');
    const menuToggleBtn = document.getElementById('menu-toggle-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    // --- Basic UI Event Listeners ---
    if (menuToggleBtn && mobileMenu) {
        menuToggleBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    /**
     * Reusable function to fetch products and populate a grid.
     * @param {HTMLElement} gridElement - The grid container element to populate.
     * @param {object} firestoreQuery - The Firestore query to execute.
     */
    async function loadProducts(gridElement, firestoreQuery) {
        try {
            const querySnapshot = await getDocs(firestoreQuery);
            
            if (querySnapshot.empty) {
                gridElement.innerHTML = '<p class="col-span-full text-center text-gray-500">No products found in this category.</p>';
                return;
            }
            
            // Map documents to HTML strings and join them
            const productsHTML = querySnapshot.docs.map(doc => 
                createProductCard(doc.data(), doc.id)
            ).join('');

            gridElement.innerHTML = productsHTML;

        } catch (error) {
            console.error("Error fetching products:", error);
            gridElement.innerHTML = '<p class="col-span-full text-center text-red-500">Failed to load products. Please try again later.</p>';
        }
    }

    /**
     * Creates an HTML string for a single product card.
     * @param {object} product - The product data from Firestore.
     * @param {string} id - The document ID of the product.
     * @returns {string} - The HTML string for the product card.
     */
    function createProductCard(product, id) {
        const hasOffer = product.offerPrice > 0;
        const finalPrice = hasOffer ? product.offerPrice : product.price;

        return `
            <div class="bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 group">
                <a href="/product/${id}" class="block">
                    <div class="relative">
                        <img src="${product.ogPic || 'https://via.placeholder.com/300'}" alt="${product.name}" class="w-full h-48 object-cover">
                        ${hasOffer ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">SALE</span>` : ''}
                    </div>
                    <div class="p-4">
                        <h3 class="font-semibold text-gray-800 truncate" title="${product.name}">${product.name}</h3>
                        <div class="mt-2 flex items-baseline justify-between">
                            <div>
                                <span class="text-xl font-bold text-indigo-600">৳${finalPrice}</span>
                                ${hasOffer ? `<span class="text-sm text-gray-500 line-through ml-2">৳${product.price}</span>` : ''}
                            </div>
                        </div>
                        <button onclick="buyNow(event, '${id}')" class="w-full text-center bg-indigo-500 text-white py-2 rounded-md mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm font-semibold">
                            Buy Now
                        </button>
                    </div>
                </a>
            </div>
        `;
    }

    // --- Step 3: Initial Data Load ---
    
    // Create a reference to the 'products' collection
    const productsCollection = collection(db, 'products');

    // Query for "Hot Products" (type == 'Popular'), limited to 20
    const hotProductsQuery = query(
        productsCollection,
        where('type', '==', 'Popular'),
        limit(20)
    );
    loadProducts(hotProductsGrid, hotProductsQuery);

    // Query for "New Products" (ordered by creation date), limited to 100
    const newProductsQuery = query(
        productsCollection,
        orderBy('createdAt', 'desc'),
        limit(100)
    );
    loadProducts(newProductsGrid, newProductsQuery);
});


/**
 * Handles the "Buy Now" button click.
 * This function is attached to the global 'window' object to be accessible
 * from the inline 'onclick' attribute in the dynamically generated HTML.
 * @param {Event} event - The click event object.
 * @param {string} productId - The ID of the product to buy.
 */
window.buyNow = function(event, productId) {
    // Stop the <a> tag from navigating to the product page
    event.preventDefault();
    // Stop the event from bubbling up to parent elements
    event.stopPropagation();
    
    // Redirect the user to the checkout page with the product ID
    window.location.href = `/checkout?productId=${productId}`;
};

let slider = document.querySelector('.slider .list');
let items = document.querySelectorAll('.slider .list .item');
let next = document.getElementById('next');
let prev = document.getElementById('prev');
let dots = document.querySelectorAll('.slider .dots li');

let lengthItems = items.length - 1;
let active = 0;
next.onclick = function(){
    active = active + 1 <= lengthItems ? active + 1 : 0;
    reloadSlider();
}
prev.onclick = function(){
    active = active - 1 >= 0 ? active - 1 : lengthItems;
    reloadSlider();
}
let refreshInterval = setInterval(()=> {next.click()}, 3000);
function reloadSlider(){
    slider.style.left = -items[active].offsetLeft + 'px';
    // 
    let last_active_dot = document.querySelector('.slider .dots li.active');
    last_active_dot.classList.remove('active');
    dots[active].classList.add('active');

    clearInterval(refreshInterval);
    refreshInterval = setInterval(()=> {next.click()}, 3000);

    
}

dots.forEach((li, key) => {
    li.addEventListener('click', ()=>{
         active = key;
         reloadSlider();
    })
})
window.onresize = function(event) {
    reloadSlider();
};
