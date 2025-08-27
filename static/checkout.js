// --- Step 1: Import necessary functions and services from Firebase ---
import { auth, db, doc, getDoc, addDoc, collection, serverTimestamp } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    
    const loadingContainer = getElement('loading-container');
    const checkoutContainer = getElement('checkout-container');
    const placeOrderForm = getElement('place-order-form');
    const placeOrderBtn = getElement('place-order-btn');
    const deliveryCitySelect = getElement('deliveryCity');
    const productSummaryDiv = getElement('product-summary');
    const priceDetailsDiv = getElement('price-details');
    const applyCouponBtn = getElement('apply-coupon-btn');
    const couponStatusP = getElement('coupon-status');
    const paymentOptionsDiv = getElement('payment-method-options');
    const paymentConfirmationSection = getElement('payment-confirmation-section');
    const paymentInstructions = getElement('payment-instructions');
    const transactionIdInput = getElement('transactionId');
    const senderNumberInput = getElement('senderNumber');
    const successScreen = getElement('success-screen');

    // --- Step 3: State Management & Configuration ---
    const state = {
        user: null, product: null, productId: null,
        subtotal: 0, discount: 0, deliveryFee: 0, total: 0,
        selectedCity: ''
    };
    
    const paymentAccounts = {
        bkash: "01700000000", // আপনার বিকাশ নম্বর দিন
        nagad: "01800000000"  // আপনার নগদ নম্বর দিন
    };

    // --- Step 4: Initialization ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            state.user = user;
            const params = new URLSearchParams(window.location.search);
            state.productId = params.get('productId');
            if (state.productId) {
                loadProductData();
            } else {
                showError("No product was selected for checkout. Please go back and choose a product.");
            }
        } else {
            const redirectUrl = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
            window.location.href = `/login?redirect=${redirectUrl}`;
        }
    });

    async function loadProductData() {
        try {
            const productRef = doc(db, 'products', state.productId);
            const docSnap = await getDoc(productRef);
            if (!docSnap.exists()) throw new Error("The selected product could not be found.");

            state.product = docSnap.data();
            const price = Number(state.product.price) || 0;
            const offerPrice = Number(state.product.offerPrice) || 0;
            state.subtotal = offerPrice > 0 ? offerPrice : price;
            
            populateOrderSummary();
            updatePriceDetails();

            loadingContainer.classList.add('hidden');
            checkoutContainer.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
        }
    }
    
    // --- Step 5: Core Logic for Dynamic Delivery ---
    deliveryCitySelect.addEventListener('change', (e) => {
        state.selectedCity = e.target.value.toLowerCase();
        calculateDeliveryFee();
        updatePriceDetails(); // This will also trigger updatePaymentOptions
    });

    function calculateDeliveryFee() {
        if (!state.product?.delivery || !state.selectedCity) {
            state.deliveryFee = 0;
            return;
        }
        const { specialDistrict, feeSpecial, feeRegular } = state.product.delivery;
        state.deliveryFee = (state.selectedCity === specialDistrict.toLowerCase()) ? (Number(feeSpecial) || 0) : (Number(feeRegular) || 0);
    }

    function updatePaymentOptions() {
        const isPrepaid = state.product?.delivery?.type === 'prepaid';
        const paymentAmount = isPrepaid ? state.deliveryFee : state.total;
        
        let html = '';
        
        // bKash/Nagad Option
        html += `
            <label class="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                <input type="radio" name="paymentMethod" value="bkash" class="h-4 w-4 text-indigo-600" required>
                <span class="ml-3 font-medium">bKash (${isPrepaid ? 'Delivery Fee Only' : 'Full Payment'}) - ৳${paymentAmount.toFixed(2)}</span>
            </label>
            <label class="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                <input type="radio" name="paymentMethod" value="nagad" class="h-4 w-4 text-indigo-600">
                <span class="ml-3 font-medium">Nagad (${isPrepaid ? 'Delivery Fee Only' : 'Full Payment'}) - ৳${paymentAmount.toFixed(2)}</span>
            </label>
        `;

        // COD Option (only available if delivery type is 'regular')
        if (!isPrepaid) {
            html += `
                <label class="flex items-center p-4 border rounded-lg cursor-pointer has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-500">
                    <input type="radio" name="paymentMethod" value="cod" class="h-4 w-4 text-indigo-600">
                    <span class="ml-3 font-medium">Cash on Delivery (COD)</span>
                </label>
            `;
        }
        
        paymentOptionsDiv.innerHTML = html;
        
        // Add event listeners to the newly created radio buttons
        paymentOptionsDiv.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
            radio.addEventListener('change', handlePaymentMethodChange);
        });
    }

    function handlePaymentMethodChange(e) {
        const selectedMethod = e.target.value;
        const isPrepaid = state.product?.delivery?.type === 'prepaid';
        const paymentAmount = isPrepaid ? state.deliveryFee : state.total;
        
        if (selectedMethod === 'bkash' || selectedMethod === 'nagad') {
            const accountNumber = paymentAccounts[selectedMethod];
            paymentInstructions.innerHTML = `<p class="font-semibold">Please send <strong>৳${paymentAmount.toFixed(2)}</strong> to this ${selectedMethod} personal number: <strong class="text-red-600">${accountNumber}</strong></p><p class="mt-2">After sending money, enter the Transaction ID and your sender number below.</p>`;
            paymentConfirmationSection.classList.remove('hidden');
            transactionIdInput.required = true;
            senderNumberInput.required = true;
        } else { // COD
            paymentConfirmationSection.classList.add('hidden');
            transactionIdInput.required = false;
            senderNumberInput.required = false;
        }
    }
    
    // --- Step 6: UI Update and Form Submission ---
    function updatePriceDetails() {
        state.total = state.subtotal - state.discount + state.deliveryFee;
        priceDetailsDiv.innerHTML = `
            <div class="flex justify-between"><span>Subtotal</span><span>৳${state.subtotal.toFixed(2)}</span></div>
            <div class="flex justify-between text-green-600"><span>Discount</span><span>- ৳${state.discount.toFixed(2)}</span></div>
            <div class="flex justify-between font-bold"><span>Delivery Fee</span><span>৳${state.deliveryFee.toFixed(2)}</span></div>
            <hr class="my-2">
            <div class="flex justify-between font-bold text-lg"><span>Total</span><span>৳${state.total.toFixed(2)}</span></div>
        `;
        if (state.selectedCity) updatePaymentOptions();
    }
    
    placeOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Processing...";

        const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
        const isPrepaid = state.product?.delivery?.type === 'prepaid';
        
        const orderDetails = {
            userId: state.user.uid,
            userEmail: state.user.email,
            productId: state.productId,
            productName: state.product.name,
            priceDetails: {
                subtotal: state.subtotal,
                discount: state.discount,
                deliveryFee: state.deliveryFee,
                total: state.total,
                amountPaid: 0
            },
            deliveryInfo: {
                name: getElement('deliveryName').value,
                phone: getElement('deliveryPhone').value,
                address: getElement('deliveryAddress').value,
                city: state.selectedCity,
            },
            paymentMethod: selectedPaymentMethod,
            status: 'Pending',
            orderDate: serverTimestamp()
        };

        if (selectedPaymentMethod !== 'cod') {
            orderDetails.priceDetails.amountPaid = isPrepaid ? state.deliveryFee : state.total;
            orderDetails.paymentDetails = {
                transactionId: transactionIdInput.value,
                senderNumber: senderNumberInput.value,
                accountNumber: paymentAccounts[selectedPaymentMethod],
                status: 'Unverified'
            };
        }

        try {
            const docRef = await addDoc(collection(db, 'orders'), orderDetails);
            showSuccessScreen(docRef.id, orderDetails);
        } catch (error) {
            console.error("Error writing document: ", error);
            alert("Failed to place order. Please try again.");
            placeOrderBtn.disabled = false;
            placeOrderBtn.textContent = "Confirm Order";
        }
    });

// --- Step 7: Other Helper Functions (Full Implementation) ---

/**
 * Populates the order summary section with the product details.
 */
function populateOrderSummary() {
    const { product, subtotal } = state;
    productSummaryDiv.innerHTML = `
        <img src="${product.ogPic || 'https://via.placeholder.com/100'}" alt="${product.name}" class="w-16 h-16 rounded-md object-cover">
        <div>
            <h3 class="font-semibold">${product.name}</h3>
            <p class="text-gray-600 text-sm">Price: ৳${subtotal.toFixed(2)}</p>
        </div>`;
}

/**
 * Displays an error message to the user, replacing the loading spinner.
 * @param {string} message - The error message to display.
 */
function showError(message) {
    loadingContainer.innerHTML = `
        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
            <p class="font-bold">An Error Occurred</p>
            <p>${message}</p>
        </div>`;
}

/**
 * Displays the order success screen, hiding the checkout form.
 * @param {string} orderId - The ID of the newly created order document.
 * @param {object} orderDetails - The details of the placed order.
 */
function showSuccessScreen(orderId, orderDetails) {
    checkoutContainer.classList.add('hidden');
    
    const totalPaid = Number(orderDetails.priceDetails.total) || 0;
    
    successScreen.innerHTML = `
        <i class="fas fa-check-circle text-6xl text-green-500 mb-4"></i>
        <h2 class="text-3xl font-bold">Order Placed Successfully!</h2>
        <p class="text-gray-600 mt-2">
            Your order is now pending confirmation. We will verify your payment and process it shortly.
        </p>
        <div class="mt-6 text-left border-t pt-4 bg-gray-50 p-4 rounded-md">
            <p><strong>Order ID:</strong> <span class="font-mono">${orderId}</span></p>
            <p><strong>Total Amount:</strong> <span class="font-bold">৳${totalPaid.toFixed(2)}</span></p>
            <p><strong>Deliver to:</strong> ${orderDetails.deliveryInfo.name}, ${orderDetails.deliveryInfo.address}</p>
        </div>
        <div class="mt-8 flex justify-center space-x-4">
            <a href="/account" class="inline-block bg-indigo-600 text-white py-2 px-6 rounded hover:bg-indigo-700">View Order History</a>
            <a href="/" class="inline-block bg-gray-200 text-gray-800 py-2 px-6 rounded hover:bg-gray-300">Continue Shopping</a>
        </div>
    `;
    successScreen.classList.remove('hidden');
}

/**
 * Event listener for the "Apply Coupon" button.
 */
applyCouponBtn.addEventListener('click', () => {
    const couponInput = document.getElementById('couponCode');
    const couponCode = couponInput.value.toUpperCase().trim();

    if (couponCode === 'DISCOUNT10') {
        state.discount = state.subtotal * 0.10; // 10% discount
        couponStatusP.textContent = "Coupon 'DISCOUNT10' applied successfully!";
        couponStatusP.className = "text-sm mt-2 text-green-600";
    } else {
        state.discount = 0;
        couponStatusP.textContent = "Invalid coupon code.";
        couponStatusP.className = "text-sm mt-2 text-red-500";
    }
    
    // After applying/failing coupon, update all price details.
    updatePriceDetails();
});

// --- End of DOMContentLoaded event listener ---
});
