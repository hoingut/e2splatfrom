

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db, doc, getDoc, addDoc, collection, serverTimestamp } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: Defensive DOM Element Selection ---
    const getElement = (id, isCritical = true) => {
        const element = document.getElementById(id);
        if (!element && isCritical) console.error(`FATAL ERROR: HTML element with id "${id}" was not found.`);
        return element;
    };
    
    // Forms and Containers
    const loadingContainer = getElement('loading-container');
    const checkoutContainer = getElement('checkout-container');
    const placeOrderForm = getElement('place-order-form');
    const successScreen = getElement('success-screen');
    const affiliateNotice = getElement('affiliate-notice');
    // ... (rest of the elements)
    const productSummaryDiv = getElement('product-summary');
    const priceDetailsDiv = getElement('price-details');
    const deliveryCitySelect = getElement('deliveryCity');
    const applyCouponBtn = getElement('apply-coupon-btn');
    const couponStatusP = getElement('coupon-status');
    const paymentOptionsDiv = getElement('payment-method-options');
    const paymentConfirmationSection = getElement('payment-confirmation-section');
    const transactionIdInput = getElement('transactionId');
    const senderNumberInput = getElement('senderNumber');

    // --- Step 3: State Management & Configuration ---
    const state = {
        user: null, product: null, productId: null, affiliateId: null,
        subtotal: 0, discount: 0, deliveryFee: 0, total: 0,
        selectedCity: ''
    };
    
    const paymentAccounts = { bkash: "01992944769", nagad: "01781146747" };

    // =================================================================
    // SECTION A: EVENT HANDLER FUNCTIONS (Defined First for clarity)
    // =================================================================
    
    async function handlePlaceOrder(e) {
        e.preventDefault();
        const placeOrderBtn = getElement('place-order-btn');
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Processing...";

        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const isPrepaidDelivery = state.product?.delivery?.type === 'prepaid';
        const profit = state.affiliateId ? (state.subtotal - (state.product.wholesalePrice || state.subtotal)) : 0;
        
        const orderDetails = {
            userId: state.user.uid, userEmail: state.user.email,
            productId: state.productId, productName: state.product.name,
            affiliateId: state.affiliateId || null,
            profit: profit > 0 ? profit : 0,
            priceDetails: { subtotal: state.subtotal, discount: state.discount, deliveryFee: state.deliveryFee, total: state.total, amountPaid: 0 },
            deliveryInfo: { name: getElement('deliveryName').value, phone: getElement('deliveryPhone').value, address: getElement('deliveryAddress').value, city: state.selectedCity },
            paymentMethod: selectedPaymentMethod, status: 'Pending', orderDate: serverTimestamp()
        };

        if (selectedPaymentMethod !== 'cod') {
            orderDetails.priceDetails.amountPaid = isPrepaidDelivery ? state.deliveryFee : state.total;
            orderDetails.paymentDetails = { transactionId: transactionIdInput.value, senderNumber: senderNumberInput.value, accountNumber: paymentAccounts[selectedPaymentMethod], status: 'Unverified' };
        }

        try {
            const docRef = await addDoc(collection(db, 'orders'), orderDetails);
            showSuccessScreen(docRef.id, orderDetails);
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Failed to place order. Please try again.");
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Confirm Order";
        }
    }

    function handleCityChange(e) {
        state.selectedCity = e.target.value.toLowerCase();
        calculateDeliveryFee();
        updatePriceDetails();
    }

   function handleCouponApply() {
        const couponInput = getElement('couponCode');
        const couponCode = couponInput.value.toUpperCase().trim();


        if (couponCode === 'DISCOUNT10') {
            state.discount = state.subtotal * 0.10;
            couponStatusP.textContent = "Coupon 'DISCOUNT10' applied!";
            couponStatusP.className = "text-sm mt-2 text-green-600";
        } else {
            state.discount = 0;
            couponStatusP.textContent = "Invalid coupon code.";
            couponStatusP.className = "text-sm mt-2 text-red-500";
        }
        updatePriceDetails();
   }
    
    function handlePaymentMethodChange(e) {
        const selectedMethod = e.target.value;
        const isPrepaid = state.product?.delivery?.type === 'prepaid';
        const paymentAmount = isPrepaid ? state.deliveryFee : state.total;
        
        if (selectedMethod === 'bkash' || selectedMethod === 'nagad') {
            const paymentInstructions = getElement('payment-instructions');
            const accountNumber = paymentAccounts[selectedMethod];
            paymentInstructions.innerHTML = `<p class="font-semibold">Please send <strong>৳${paymentAmount.toFixed(2)}</strong> to this ${selectedMethod} personal number: <strong class="text-red-600">${accountNumber}</strong></p>`;
            paymentConfirmationSection.classList.remove('hidden');
            transactionIdInput.required = true;
            senderNumberInput.required = true;
        } else { // COD
            paymentConfirmationSection.classList.add('hidden');
            transactionIdInput.required = false;
            senderNumberInput.required = false;
        }
    }

    // =================================================================
    // SECTION B: DATA FETCHING & UI UPDATE FUNCTIONS
    // =================================================================

    async function loadProductData(customPrice) {
        try {
            if (state.affiliateId) affiliateNotice.classList.remove('hidden');
            
            const productRef = doc(db, 'products', state.productId);
            const docSnap = await getDoc(productRef);
            if (!docSnap.exists()) throw new Error("Product not found.");

            state.product = docSnap.data();
            
            if (state.affiliateId && customPrice) {
                state.subtotal = Number(customPrice);
            } else {
                state.subtotal = Number(state.product.offerPrice > 0 ? state.product.offerPrice : state.product.price) || 0;
            }
            
            populateOrderSummary();
            updatePriceDetails();

            loadingContainer.classList.add('hidden');
            checkoutContainer.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
        }
    }

    function calculateDeliveryFee() {
        if (!state.product?.delivery || !state.selectedCity) { state.deliveryFee = 0; return; }
        const { specialDistrict, feeSpecial, feeRegular } = state.product.delivery;
        state.deliveryFee = (state.selectedCity === specialDistrict?.toLowerCase()) ? (Number(feeSpecial) || 0) : (Number(feeRegular) || 0);
    }
    
    function updatePriceDetails() {
        state.total = state.subtotal - state.discount + state.deliveryFee;
        priceDetailsDiv.innerHTML = `<div class="flex justify-between"><span>Subtotal</span><span>৳${state.subtotal.toFixed(2)}</span></div><div class="flex justify-between text-green-600"><span>Discount</span><span>- ৳${state.discount.toFixed(2)}</span></div><div class="flex justify-between font-bold"><span>Delivery Fee</span><span>৳${state.deliveryFee.toFixed(2)}</span></div><hr class="my-2"><div class="flex justify-between font-bold text-lg"><span>Total</span><span>৳${state.total.toFixed(2)}</span></div>`;
        if (state.selectedCity) updatePaymentOptions();
    }

    function updatePaymentOptions() {
        const isPrepaid = state.product?.delivery?.type === 'prepaid';
        const paymentAmount = isPrepaid ? state.deliveryFee : state.total;
        
        let html = `
            <label class="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                <input type="radio" name="paymentMethod" value="bkash" class="h-4 w-4 text-indigo-600" required>
                <span class="ml-3 font-medium">bKash (${isPrepaid ? 'Delivery Fee Only' : 'Full Payment'}) - ৳${paymentAmount.toFixed(2)}</span>
            </label>
            <label class="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                <input type="radio" name="paymentMethod" value="nagad" class="h-4 w-4 text-indigo-600">
                <span class="ml-3 font-medium">Nagad (${isPrepaid ? 'Delivery Fee Only' : 'Full Payment'}) - ৳${paymentAmount.toFixed(2)}</span>
            </label>
        `;

        if (!isPrepaid) {
            html += `
                <label class="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                    <input type="radio" name="paymentMethod" value="cod" class="h-4 w-4 text-indigo-600">
                    <span class="ml-3 font-medium">Cash on Delivery (COD)</span>
                </label>
            `;
        }
        
        paymentOptionsDiv.innerHTML = html;
        paymentOptionsDiv.querySelectorAll('input[name="paymentMethod"]').forEach(radio => radio.addEventListener('change', handlePaymentMethodChange));

        const firstOption = paymentOptionsDiv.querySelector('input[name="paymentMethod"]');
        if (firstOption) {
            firstOption.checked = true;
            handlePaymentMethodChange({ target: firstOption });
        }
    }
    
function populateOrderSummary() {
        productSummaryDiv.innerHTML = `<img src="${state.product.ogPic || 'https://via.placeholder.com/100'}" alt="${state.product.name}" class="w-16 h-16 rounded-md object-cover"><div><h3 class="font-semibold">${state.product.name}</h3><p class="text-gray-600 text-sm">Price: ৳${state.subtotal.toFixed(2)}</p></div>`;
    }


    function showError(message) {
        loadingContainer.innerHTML = `<p class="text-red-500 font-semibold p-4 bg-red-100 rounded-md">${message}</p>`;
    }


    function showSuccessScreen(orderId, orderDetails) {
        checkoutContainer.classList.add('hidden');
        successScreen.innerHTML = `<i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i><h2 class="text-3xl font-bold">Order Placed!</h2><p class="text-gray-600 mt-2">Your order is pending confirmation.</p><div class="mt-6 text-left border-t pt-4"><p><strong>Order ID:</strong> ${orderId}</p><p><strong>Total:</strong> ৳${orderDetails.priceDetails.total.toFixed(2)}</p></div><a href="/account" class="mt-6 inline-block bg-indigo-600 text-white py-2 px-6 rounded">View Orders</a>`;
        successScreen.classList.remove('hidden');
    }
    // =================================================================
    // --- SECTION C: INITIALIZATION & EVENT LISTENER ATTACHMENT ---
    // =================================================================

    if (placeOrderForm) placeOrderForm.addEventListener('submit', handlePlaceOrder);
    if (deliveryCitySelect) deliveryCitySelect.addEventListener('change', handleCityChange);
    if (applyCouponBtn) applyCouponBtn.addEventListener('click', handleCouponApply);
    
    onAuthStateChanged(auth, (user) => {
        if (user) {
            state.user = user;
            const params = new URLSearchParams(window.location.search);
            state.productId = params.get('productId');
            state.affiliateId = params.get('ref');
            const customPrice = params.get('price');
            
            if (state.productId) {
                loadProductData(customPrice);
            } else {
                showError("No product selected for checkout.");
            }
        } else {
            const redirectUrl = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
            window.location.href = `/login?redirect=${redirectUrl}`;
        }
    });
});
