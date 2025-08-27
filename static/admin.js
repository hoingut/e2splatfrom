
import { auth, db } from './firebaseConfig.js';

// Import the specific auth function we need for this page
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Import all the firestore functions we will use in this file
import { 
    collection, 
    doc, 
    addDoc, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy,
    serverTimestamp,
    getDoc
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: Global State and DOM References ---
    let allProducts = [];
    let allOrders = [];
    let editingProductId = null;

    const getElement = (id) => document.getElementById(id);

    const productsTabBtn = getElement('products-tab-btn');
    const ordersTabBtn = getElement('orders-tab-btn');
    const productsContent = getElement('products-content');
    const ordersContent = getElement('orders-content');
    const addProductForm = getElement('addProductForm');
    const formTitle = getElement('form-title');
    const clearFormBtn = getElement('clear-form-btn');
    const productListBody = getElement('productList');
    const searchInput = getElement('searchInput');
    const orderListBody = getElement('orderList');

    // --- Step 3: Security - Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                // Check if the logged-in user has an 'admin' role
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);

                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    // User is an admin, load the panel data
                    console.log('Admin user authenticated. Loading panel...');
                    await Promise.all([fetchProducts(), fetchOrders()]);
                } else {
                    // User is logged in but not an admin. Deny access.
                    throw new Error('Access denied. User is not an administrator.');
                }
            } catch (error) {
                console.error("Authorization Error:", error);
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p class="text-gray-700">${error.message}</p><a href="/" class="text-indigo-600 mt-4 inline-block">Go to homepage</a></div>`;
            }
        } else {
            // No user is logged in. Redirect to the login page.
            console.log('No user logged in. Redirecting to login...');
            window.location.href = `/login?redirect=/admin`;
        }
    });

    // --- Step 4: UI and Tab Logic ---
    productsTabBtn.addEventListener('click', () => switchTab('products'));
    ordersTabBtn.addEventListener('click', () => switchTab('orders'));

    function switchTab(tabName) {
        productsTabBtn.classList.toggle('active-tab', tabName === 'products');
        ordersTabBtn.classList.toggle('active-tab', tabName === 'orders');
        productsContent.classList.toggle('hidden', tabName !== 'products');
        ordersContent.classList.toggle('hidden', tabName === 'products');
    }

    // --- Step 5: Product Management ---
    
    // Form submission for both creating and updating products
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = addProductForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const productData = {
            name: getElement('productName').value, price: Number(getElement('price').value),
            offerPrice: Number(getElement('offerPrice').value) || 0, code: getElement('productCode').value,
            stock: Number(getElement('stock').value), ogPic: getElement('ogPic').value,
            description: getElement('productDescription').value, type: getElement('type').value,
            category: getElement('category').value, metaTitle: getElement('metaTitle').value,
            keywords: getElement('keywords').value.split(',').map(k => k.trim()),
            metaDescription: getElement('metaDescription').value,
            // static/admin.js (productData অবজেক্টে যোগ করুন
            // admin.js -> addProductForm.addEventListener('submit', ...)
    // নতুন ডেলিভারি ফিল্ড যোগ করুন
    delivery: {
        type: getElement('deliveryType').value, // 'regular' or 'prepaid'
        specialDistrict: getElement('specialDistrict').value.trim().toLowerCase(), // e.g., 'dhaka'
        feeSpecial: Number(getElement('feeSpecial').value) || 0,
        feeRegular: Number(getElement('feeRegular').value) || 0
    }
};

        
        try {
            if (editingProductId) {
                // Update existing product
                const productRef = doc(db, 'products', editingProductId);
                await updateDoc(productRef, productData);
                alert('Product updated successfully!');
            } else {
                // Add new product with a creation timestamp
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'products'), productData);
                alert('Product added successfully!');
            }
            resetForm();
            await fetchProducts(); // Refresh the list
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Error saving product: " + error.message);
        } finally {
            submitBtn.disabled = false;
        }
    });
    
    clearFormBtn.addEventListener('click', resetForm);

    function resetForm() {
        editingProductId = null;
        formTitle.textContent = 'Add New Product';
        addProductForm.reset();
    }

    async function fetchProducts() {
        const productsCol = collection(db, 'products');
        const q = query(productsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        allProducts = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayProducts(allProducts);
    }

    function displayProducts(products) {
        productListBody.innerHTML = '';
        if (products.length === 0) {
            productListBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No products found.</td></tr>`;
            return;
        }
        products.forEach(p => {
            const hasOffer = p.offerPrice > 0;
            const finalPrice = hasOffer ? p.offerPrice : p.price;
            productListBody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium text-gray-900">${p.name}</td>
                    <td class="py-3 px-4">৳${finalPrice}</td>
                    <td class="py-3 px-4">${p.stock}</td>
                    <td class="py-3 px-4">${p.type}</td>
                    <td class="py-3 px-4 flex space-x-2">
                        <button onclick="editProduct('${p.id}')" class="text-indigo-600 hover:text-indigo-900"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = allProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.code && p.code.toLowerCase().includes(searchTerm))
        );
        displayProducts(filteredProducts);
    });

    // --- Step 6: Order Management ---
    
    async function fetchOrders() {
        const ordersCol = collection(db, 'orders');
        const q = query(ordersCol, orderBy('orderDate', 'desc'));
        const querySnapshot = await getDocs(q);
        allOrders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayOrders(allOrders);
    }

    function displayOrders(orders) {
        orderListBody.innerHTML = '';
        if (orders.length === 0) {
            orderListBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No orders found.</td></tr>`;
            return;
        }
        orders.forEach(order => {
            orderListBody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-4 font-mono text-xs">${order.id}</td>
                    <td class="py-3 px-4">${order.deliveryInfo.name}</td>
                    <td class="py-3 px-4">${order.productName}</td>
                    <td class="py-3 px-4 font-semibold">৳${order.price}</td>
                    <td class="py-3 px-4">
                        <select onchange="updateOrderStatus('${order.id}', this.value)" class="p-1 border rounded-md text-sm">
                            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                </tr>`;
        });
    }
    
    // --- Step 7: Make functions globally accessible for inline event handlers ---
    window.editProduct = (id) => {
        const product = allProducts.find(p => p.id === id);
        if (!product) return;
        
        editingProductId = id;
        formTitle.textContent = `Editing: ${product.name}`;

        
        // A safer way to populate the form
        getElement('productName').value = product.name || '';
        getElement('price').value = product.price || '';
        getElement('offerPrice').value = product.offerPrice || '';
        getElement('productCode').value = product.code || '';
        getElement('stock').value = product.stock || '';
        getElement('ogPic').value = product.ogPic || '';
        getElement('productDescription').value = product.description || '';
        getElement('type').value = product.type || 'Normal';
        getElement('category').value = product.category || '';
        getElement('metaTitle').value = product.metaTitle || '';
        getElement('keywords').value = (product.keywords || []).join(', ');
        getElement('metaDescription').value = product.metaDescription || '';
       // window.editProduct = (id) => { ... }
if (product.delivery) {
    getElement('deliveryType').value = product.delivery.type || 'regular';
    getElement('specialDistrict').value = product.delivery.specialDistrict || '';
    getElement('feeSpecial').value = product.delivery.feeSpecial || '';
    getElement('feeRegular').value = product.delivery.feeRegular || '';
    }
 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteProduct = async (id) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteDoc(doc(db, 'products', id));
                alert('Product deleted successfully.');
                await fetchProducts();
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Error deleting product.");
            }
        }
    };

    window.updateOrderStatus = async (orderId, newStatus) => {
        const orderRef = doc(db, 'orders', orderId);
        try {
            await updateDoc(orderRef, { status: newStatus });
            // Optionally, add a success notification here instead of an alert.
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Failed to update order status.");
        }
    };
});
