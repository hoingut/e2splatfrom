
// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, query, orderBy, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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

    /**
     * Updates the status of an order in Firestore.
     * @param {string} orderId - The ID of the order to update.
     * @param {string} newStatus - The new status value.
     */
    window.updateOrderStatus = async (orderId, newStatus) => {
        const orderRef = doc(db, 'orders', orderId);
        const selectElement = document.querySelector(`select[data-order-id="${orderId}"]`);

        try {
            await updateDoc(orderRef, { status: newStatus });
            
            // Update the color of the select box visually
            selectElement.className = `status-select status-${newStatus}`;
            
            // Optionally, update payment status if the order is confirmed
            if (newStatus === 'Confirmed') {
                const orderDoc = await getDoc(orderRef);
                if (orderDoc.exists() && orderDoc.data().paymentDetails) {
                    await updateDoc(orderRef, { "paymentDetails.status": "Verified" });
                    // To refresh the whole page to see changes: location.reload();
                    // Or update just that part of the UI. For simplicity, we can leave it to the next page load.
                }
            }
            
            console.log(`Order ${orderId} status updated to ${newStatus}`);
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Failed to update status. Please try again.");
            // Revert the dropdown to its original state on failure
            const orderDoc = await getDoc(orderRef);
            if(orderDoc.exists()) selectElement.value = orderDoc.data().status;
        }
    };
});
  
