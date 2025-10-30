

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const IMGBB_API_KEY = '5e7311818264c98ebf4a79dbb58b55aa'; // <-- আপনার ImgBB API KEY এখানে দিন

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const servicePostForm = getElement('service-post-form');
    const submitBtn = getElement('submit-btn');
    const imageUploadInput = getElement('cover-image');
    const imagePreview = getElement('image-preview');
    const uploadStatus = getElement('upload-status');
    
    let currentUser = null;
    let influencerProfile = null;

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    influencerProfile = docSnap.data().influencerApplication; // Or influencerProfile
                } else {
                    throw new Error('You are not an approved influencer.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-red-500">${error.message}</h1></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/i/ad`;
        }
    });

    /**
     * Uploads an image to ImgBB and returns the URL.
     * @param {File} file - The image file.
     * @returns {Promise<string>} - The URL of the uploaded image.
     */
    async function uploadImage(file) {
        if (!file) throw new Error("Please select a cover image.");
        
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
    servicePostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser || !influencerProfile) {
            alert('Authentication error. Cannot post service.');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        const btnText = getElement('btn-text');
        const btnSpinner = getElement('btn-spinner');
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        try {
            // 1. Upload the image first
            const coverImageUrl = await uploadImage(imageUploadInput.files[0]);

            // 2. Gather all form data
            const selectedPlatforms = Array.from(document.querySelectorAll('#platforms input:checked')).map(cb => cb.value);
            const selectedContentTypes = Array.from(document.querySelectorAll('#contentTypes input:checked')).map(cb => cb.value);

            if (selectedPlatforms.length === 0 || selectedContentTypes.length === 0) {
                throw new Error("Please select at least one Platform and one Content Type.");
            }
            
            const postData = {
                authorId: currentUser.uid,
                authorName: influencerProfile.page.pageName,
                authorPic: influencerProfile.page.pageProfilePicUrl,
                type: 'service', // Differentiates from a 'job' post
                title: getElement('title').value,
                description: getElement('description').value,
                category: getElement('category').value,
                budget: Number(getElement('budget').value),
                platforms: selectedPlatforms,
                contentTypes: selectedContentTypes,
                coverImage: coverImageUrl,
                status: 'active', // 'active', 'paused'
                createdAt: serverTimestamp(),
            };

            // 3. Save the post to Firestore 'posts' collection
            const postsCollection = collection(db, 'posts');
            await addDoc(postsCollection, postData);
            
            alert('Your service package has been posted successfully!');
            window.location.href = '/pf/dashboard/i'; // Redirect to influencer dashboard

        } catch (error) {
            console.error('Failed to post service:', error);
            alert(`Error: ${error.message}`);
        } finally {
            // Hide loading state
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    });
});
