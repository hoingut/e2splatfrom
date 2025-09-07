// static/admin-orders.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    collection, 
    query, 
    orderBy, 
    getDocs, 
    doc, 
    updateDoc, 
    getDoc,
    where,  // <--- এই লাইনটি যোগ করা হয়েছে
    limit   // <--- এটিও যোগ করা হয়েছে, কারণ কোডে এটি ব্যবহৃত হয়েছে
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ... (আপনার বাকি সব কোড আগের মতোই থাকবে)
document.addEventListener('DOMContentLoaded', () => {
    const orderListBody = document.getElementById('order-list-body');

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Check if the user is an admin
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    // User is an admin, load the orders
                    await fetchAndDisplayOrders();
                } else {
                    throw new Error('You do not have permission to view this page.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            // No user logged in, redirect
            window.location.href = `/login?redirect=/admin/orders`;
        }
    });

    /**
     * Fetches all orders from Firestore and renders them in the table.
     */
    async function fetchAndDisplayOrders() {
        try {
            const ordersRef = collection(db, 'orders');
            const q = query(ordersRef, orderBy('orderDate', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                orderListBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-gray-500">No orders found.</td></tr>`;
                return;
            }

            let ordersHTML = '';
            querySnapshot.forEach(doc => {
                const order = { id: doc.id, ...doc.data() };
                ordersHTML += createOrderRow(order);
            });

            orderListBody.innerHTML = ordersHTML;

        } catch (error) {
            console.error("Error fetching orders:", error);
            orderListBody.innerHTML = `<tr><td colspan="4" class="text-center p-8 text-red-500">Failed to load orders.</td></tr>`;
        }
    }

    /**
     * Creates the HTML for a single order row.
     * @param {object} order - The order data object.
     * @returns {string} - The HTML string for the table row.
     */
    function createOrderRow(order) {
        const orderDate = order.orderDate?.toDate().toLocaleString() || 'N/A';
        const price = order.priceDetails?.total || 0;
        const payment = order.paymentDetails;
        
        return `
            <tr id="order-row-${order.id}" class="hover:bg-gray-50">
                <!-- Order Details -->
                <td class="p-4 align-top">
                    <div class="font-bold">${order.productName}</div>
                    <div class="text-sm text-gray-600">ID: <span class="font-mono text-xs">${order.id}</span></div>
                    <div class="text-sm text-gray-500">${orderDate}</div>
                </td>
                
                <!-- Customer & Delivery Info -->
                <td class="p-4 align-top text-sm text-gray-800">
                    <div><strong>Name:</strong> ${order.deliveryInfo.name}</div>
                    <div><strong>Phone:</strong> ${order.deliveryInfo.phone}</div>
                    <div><strong>Address:</strong> ${order.deliveryInfo.address}, ${order.deliveryInfo.city}</div>
                </td>

                <!-- Payment Info -->
                <td class="p-4 align-top text-sm">
                    <div class="font-semibold">Total: ৳${price.toFixed(2)}</div>
                    <div class="capitalize"><strong>Method:</strong> ${order.paymentMethod}</div>
                    ${payment ? `
                        <div class="mt-2 pt-2 border-t border-gray-200">
                            <div class="text-xs"><strong>TrxID:</strong> ${payment.transactionId}</div>
                            <div class="text-xs"><strong>Sender:</strong> ${payment.senderNumber}</div>
                            <div class="text-xs"><strong>Status:</strong> <span class="font-bold">${payment.status}</span></div>
                        </div>
                    ` : ''}
                </td>

                <!-- Status -->
                <td class="p-4 align-top">
                    <select onchange="updateOrderStatus('${order.id}', this.value)" 
                            class="status-select status-${order.status}"
                            data-order-id="${order.id}">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
            </tr>
        `;
    }

// static/admin-orders.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

// static/admin-orders.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Updates the status of an order and, if delivered, calculates the CORRECT profit
 * (excluding delivery fees) and adds it to the affiliate's balance.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} newStatus - The new status value from the dropdown.
 */
window.updateOrderStatus = async (orderId, newStatus) => {
    const orderRef = doc(db, 'orders', orderId);
    const selectElement = document.querySelector(`select[data-order-id="${orderId}"]`);

    try {
        // --- Step 1: Update the order status ---
        await updateDoc(orderRef, { status: newStatus });
        console.log(`Order ${orderId} status updated to ${newStatus}.`);
        if(selectElement) selectElement.className = `status-select status-${newStatus}`;

        // --- Step 2: If status is 'Delivered', handle affiliate balance ---
        if (newStatus === 'Delivered') {
            const orderDoc = await getDoc(orderRef);
            if (!orderDoc.exists()) throw new Error("Order document not found after update.");
            
            const orderData = orderDoc.data();

            // Check if it's a valid affiliate order
            if (orderData.affiliateId && orderData.productId) {
                console.log(`Processing affiliate payment for order ${orderId}...`);

                // Fetch the product details to get the wholesale price
                const productRef = doc(db, 'products', orderData.productId);
                const productDoc = await getDoc(productRef);
                if (!productDoc.exists()) throw new Error(`Product with ID ${orderData.productId} not found.`);
                
                const productData = productDoc.data();
                const wholesalePrice = Number(productData.wholesalePrice) || 0;

                // Calculate the final price the customer paid for the product (excluding delivery)
                const customerPaidForProduct = (Number(orderData.priceDetails.subtotal) || 0) - (Number(orderData.priceDetails.discount) || 0);

                // **THIS IS THE KEY FIX: Calculate profit accurately here**
                const calculatedProfit = customerPaidForProduct - wholesalePrice;

                if (calculatedProfit <= 0) {
                    console.warn(`Profit for order ${orderId} is zero or negative (${calculatedProfit}). No balance will be added.`);
                    return; // Stop execution if there is no profit
                }

                // Find the affiliate's user document
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where("affiliateId", "==", orderData.affiliateId), limit(1));
                const snapshot = await getDocs(q);
                if (snapshot.empty) throw new Error(`Affiliate user with ID ${orderData.affiliateId} not found.`);

                const affiliateDoc = snapshot.docs[0];
                const affiliateRef = affiliateDoc.ref;
                const currentBalance = Number(affiliateDoc.data().affiliateBalance) || 0;
                const newBalance = currentBalance + calculatedProfit;
                
                // Update the affiliate's balance
                await updateDoc(affiliateRef, { affiliateBalance: newBalance });

                console.log(`Successfully updated balance for user ${affiliateDoc.id}. Added: ৳${calculatedProfit.toFixed(2)}. New balance: ৳${newBalance.toFixed(2)}`);
                alert(`Affiliate ${affiliateDoc.data().name}'s balance updated by ৳${calculatedProfit.toFixed(2)}!`);
            }
        }
        
    } catch (error) {
        console.error("Error during order status update process:", error);
        alert(`An error occurred: ${error.message}`);
        
        // Revert dropdown on failure
        try {
            const orderDoc = await getDoc(orderRef);
            if(orderDoc.exists() && selectElement) {
                selectElement.value = orderDoc.data().status;
                selectElement.className = `status-select status-${orderDoc.data().status}`;
            }
        } catch (revertError) {
            console.error("Failed to revert dropdown state:", revertError);
        }
    }
};

// ... (ফাইলের বাকি অংশ আগে
});
