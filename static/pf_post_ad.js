// static/pf_post_ad.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const IMGBB_API_KEY = '5e7311818264c98ebf4a79dbb58b55aa'; // <-- আপনার ImgBB API KEY এখানে দিন

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const jobPostForm = getElement('job-post-form');
    const submitBtn = getElement('submit-btn');
    const imageUploadInput = getElement('cover-image');
    const imagePreview = getElement('image-preview');
    const uploadStatus = getElement('upload-status');
    
    let currentUser = null;
    let currentUserData = null;

    // --- Authentication Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists()) {
                    currentUserData = docSnap.data();
                } else {
                    throw new Error('User data not found.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-red-500">${error.message}</h1></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/ad`;
        }
    });

    /**
     * Uploads an image to ImgBB and returns the URL. Returns null if no file.
     * @param {File} file - The image file.
     * @returns {Promise<string|null>} - The URL of the uploaded image or null.
     */
    async function uploadImage(file) {
        if (!file) return null; // Image is optional
        
        uploadStatus.textContent = 'Uploading image...';
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(`Image upload failed: ${result.error.message}`);
        
        uploadStatus.textContent = 'Image upload successful!';
        return result.data.url;
    }

    // --- Image Preview Logic ---
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
        if (!currentUser || !currentUserData) {
            alert('Authentication error. Cannot post job.');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const btnText = getElement('btn-text');
        const btnSpinner = getElement('btn-spinner');
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        try {
            // 1. Upload the image (if any)
            const coverImageUrl = await uploadImage(imageUploadInput.files[0]);

            // 2. Gather all form data
            const selectedPlatforms = Array.from(document.querySelectorAll('#platforms input:checked')).map(cb => cb.value);
            const selectedContentTypes = Array.from(document.querySelectorAll('#contentTypes input:checked')).map(cb => cb.value);

            if (selectedPlatforms.length === 0 || selectedContentTypes.length === 0) {
                throw new Error("Please select at least one Platform and one Content Type.");
            }
            
            const postData = {
                authorId: currentUser.uid,
                brandName: currentUserData.name, // Use the user's name as the brand name
                // brandLogo: currentUserData.logoUrl, // You can add a logo field to user profiles
                type: 'job', // Differentiates from an influencer's 'service' post
                title: getElement('title').value,
                description: getElement('description').value,
                category: getElement('category').value,
                budget: Number(getElement('budget').value),
                platforms: selectedPlatforms,
                contentTypes: selectedContentTypes,
                coverImage: coverImageUrl, // Can be null if no image was uploaded
                status: 'open-for-proposals', // 'active', 'in-progress', 'completed'
                createdAt: serverTimestamp(),
            };

            // 3. Save the post to Firestore 'posts' collection
            const postsCollection = collection(db, 'posts');
            await addDoc(postsCollection, postData);
            
            alert('Your job has been posted successfully!');
            window.location.href = '/pf/dashboard'; // Redirect to user dashboard

        } catch (error) {
            console.error('Failed to post job:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // Hide loading state
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    });
});
