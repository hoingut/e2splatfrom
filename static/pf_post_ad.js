// static/pf_post_ad.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const IMGBB_API_KEY = '5e7311818264c98ebf4a79dbb58b55aa';

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const jobPostForm = getElement('job-post-form');
    const budgetInput = getElement('budget');
    const amountToPay = getElement('amount-to-pay');
    const submitBtn = getElement('submit-btn');
    const imageUploadInput = getElement('cover-image');
    const imagePreview = getElement('image-preview');
    const uploadStatus = getElement('upload-status');
    
    let currentUser = null;
    let currentUserData = null;

    // --- Auth Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) currentUserData = docSnap.data();
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/ad`;
        }
    });

    // --- Dynamic Amount Display ---
    budgetInput.addEventListener('input', (e) => {
        const amount = Number(e.target.value) || 0;
        amountToPay.textContent = `৳${amount.toFixed(2)}`;
    });
    
    // --- Image Upload & Preview Logic ---
    async function uploadImage(file) {
        if (!file) return null;
        uploadStatus.textContent = 'Uploading image...';
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(`Image upload failed: ${result.error.message}`);
        uploadStatus.textContent = 'Image upload successful!';
        return result.data.url;
    }
    imageUploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => { imagePreview.src = reader.result; };
            reader.readAsDataURL(file);
        }
    });

    // --- Form Submission Logic ---
    jobPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser || !currentUserData) return;

        submitBtn.disabled = true;
        const btnText = getElement('btn-text'), btnSpinner = getElement('btn-spinner');
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        try {
            const coverImageUrl = await uploadImage(imageUploadInput.files[0]);
            
            const postData = {
                authorId: currentUser.uid,
                brandName: currentUserData.name,
                type: 'job',
                title: getElement('title').value,
                description: getElement('description').value,
                category: getElement('category').value,
                budget: Number(budgetInput.value),
                mood: document.querySelector('input[name="mood"]:checked').value,
                platforms: Array.from(document.querySelectorAll('#platforms input:checked')).map(cb => cb.value),
                contentTypes: Array.from(document.querySelectorAll('#contentTypes input:checked')).map(cb => cb.value),
                requirements: {
                    minReach: Number(getElement('minReach').value) || 0,
                    minViews: Number(getElement('minViews').value) || 0,
                },
                coverImage: coverImageUrl,
                status: 'pending-approval',
                paymentDetails: {
                    transactionId: getElement('transactionId').value,
                    senderNumber: getElement('senderNumber').value,
                    amount: Number(budgetInput.value),
                    status: 'unverified'
                },
                createdAt: serverTimestamp(),
            };
            
            if (postData.budget <= 0) throw new Error("Budget must be positive.");
            if (!postData.paymentDetails.transactionId) throw new Error("Transaction ID is required.");
            if (postData.platforms.length === 0) throw new Error("Select at least one platform.");

            await addDoc(collection(db, 'posts'), postData);
            
            alert('Your job has been submitted for approval!');
            window.location.href = '/pf/dashboard';

        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    });
});
