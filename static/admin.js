// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    collection, doc, addDoc, getDocs, updateDoc, deleteDoc, 
    query, orderBy, serverTimestamp, getDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: Global State and Defensive DOM Element Selection ---
    let allProducts = [];
    let editingProductId = null;

    const getElement = (id, isCritical = true) => {
        const element = document.getElementById(id);
        if (!element && isCritical) {
            console.error(`FATAL ERROR: A critical HTML element with id "${id}" was not found.`);
        }
        return element;
    };

    // DOM References
    const addProductForm = getElement('addProductForm');
    const formTitle = getElement('form-title');
    const clearFormBtn = getElement('clear-form-btn');
    const productListBody = getElement('productList');
    const searchInput = getElement('searchInput');
    
    // Guard Clause: Stop if essential form elements are missing
    if (!addProductForm || !productListBody) {
        console.error("Script halted: Essential admin form or product list elements are missing.");
        return;
    }

    // --- Step 3: Security - Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);

                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    console.log('Admin user authenticated. Loading products...');
                    await fetchProducts();
                } else {
                    throw new Error('Access denied. User is not an administrator.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/admin`;
        }
    });

    // --- Step 4: Form and Product Management Logic ---

    // Handle form submission for both creating and updating products
    addProductForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = addProductForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        const productData = {
            name: getElement('productName').value,
            ogPic: getElement('ogPic').value,
            description: getElement('productDescription').value,
            wholesalePrice: Number(getElement('wholesalePrice').value) || 0,
            price: Number(getElement('price').value) || 0,
            offerPrice: Number(getElement('offerPrice').value) || 0,
            productCode: getElement('productCode').value,
            stock: Number(getElement('stock').value) || 0,
            type: getElement('type').value,
            category: getElement('category').value,
            delivery: {
                type: getElement('deliveryType').value,
                specialDistrict: getElement('specialDistrict').value.trim().toLowerCase(),
                feeSpecial: Number(getElement('feeSpecial').value) || 0,
                feeRegular: Number(getElement('feeRegular').value) || 0
            },
            metaTitle: getElement('metaTitle')?.value || '', // Add optional chaining for safety
            keywords: getElement('keywords')?.value.split(',').map(k => k.trim()) || [],
            metaDescription: getElement('metaDescription')?.value || '',
        };

        try {
            if (editingProductId) {
                const productRef = doc(db, 'products', editingProductId);
                await updateDoc(productRef, productData);
                alert('Product updated successfully!');
            } else {
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'products'), productData);
                alert('Product added successfully!');
            }
            resetForm();
            await fetchProducts();
        } catch (error) {
            console.error("Error saving product:", error);
            alert("Error saving product: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }
    });
    
    clearFormBtn.addEventListener('click', resetForm);

    function resetForm() {
        editingProductId = null;
        if (formTitle) formTitle.textContent = 'Add New Product';
        addProductForm.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
            productListBody.innerHTML = `<tr><td colspan="5" class="text-center py-4">No products found. Add one using the form above.</td></tr>`;
            return;
        }
        products.forEach(p => {
            const finalPrice = p.offerPrice > 0 ? p.offerPrice : p.price;
            productListBody.innerHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="py-3 px-4 font-medium text-gray-900">${p.name}</td>
                    <td class="py-3 px-4">৳${finalPrice}</td>
                    <td class="py-3 px-4">${p.stock}</td>
                    <td class="py-3 px-4">${p.type}</td>
                    <td class="py-3 px-4 flex space-x-2">
                        <button onclick="editProduct('${p.id}')" class="text-indigo-600 hover:text-indigo-900" title="Edit"><i class="fas fa-edit"></i></button>
                        <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900" title="Delete"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        });
    }

    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredProducts = allProducts.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            (p.productCode && p.productCode.toLowerCase().includes(searchTerm))
        );
        displayProducts(filteredProducts);
    });
    
    // --- Step 5: Make functions globally accessible for inline event handlers ---
    window.editProduct = (id) => {
        const product = allProducts.find(p => p.id === id);
        if (!product) {
            console.error("Product to edit not found in local list.");
            return;
        }
        
        editingProductId = id;
        formTitle.textContent = `Editing: ${product.name}`;
        
        // Populate all form fields safely, checking if elements exist
        const fields = ['productName', 'ogPic', 'productDescription', 'wholesalePrice', 'price', 'offerPrice', 'productCode', 'stock', 'type', 'category', 'metaTitle', 'metaDescription'];
        fields.forEach(field => {
            const element = getElement(field, false);
            if (element) {
                // Special handling for legacy products without a field
                const key = (field === 'productName') ? 'name' : field;
                element.value = product[key] || '';
            }
        });
        
        // Handle keywords array
        const keywordsElement = getElement('keywords', false);
        if (keywordsElement) keywordsElement.value = (product.keywords || []).join(', ');

        // Populate delivery fields
        if (product.delivery) {
            const deliveryFields = ['deliveryType', 'specialDistrict', 'feeSpecial', 'feeRegular'];
            deliveryFields.forEach(field => {
                const element = getElement(field, false);
                // Special mapping for deliveryType
                const key = (field === 'deliveryType') ? 'type' : field.replace('fee', 'fee').replace('special', 'Special').replace('regular', 'Regular');
                if(element) element.value = product.delivery[key.charAt(0).toLowerCase() + key.slice(1)] || '';
            });
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteProduct = async (id) => {
        if (confirm('Are you sure you want to permanently delete this product?')) {
            try {
                await deleteDoc(doc(db, 'products', id));
                alert('Product deleted successfully.');
                await fetchProducts(); // Refresh the list
            } catch (error) {
                console.error("Error deleting product:", error);
                alert("Error deleting product.");
            }
        }
    };
});
