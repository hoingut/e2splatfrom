// static/pf_apply_influencer.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const IMGBB_API_KEY = '5e7311818264c98ebf4a79dbb58b55aa'; // <-- আপনার ImgBB API KEY এখানে দিন

    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const applicationForm = getElement('influencer-application-form');
    const imageUploadInput = getElement('image-upload');
    const imagePreview = getElement('image-preview');
    const uploadStatus = getElement('upload-status');
    const profilePicUrlInput = getElement('profilePicUrl');
    const submitBtn = getElement('submit-btn');
    const btnText = getElement('btn-text');
    const btnSpinner = getElement('btn-spinner');

    let currentUser = null;

    // --- Authentication Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // Check if user has already applied or is an influencer
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role === 'influencer' || userData.affiliateStatus === 'pending') {
                    // Redirect if they are already an influencer or have a pending application
                    alert('You have already submitted an application or you are an approved influencer.');
                    window.location.href = '/pf/dashboard';
                }
            }
        } else {
            // If not logged in, redirect to login page
            alert('You must be logged in to apply.');
            window.location.href = `/login?redirect=/pf/apply-influencer`;
        }
    });

    // --- Image Upload Logic ---
    imageUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show a preview
        const reader = new FileReader();
        reader.onload = () => { imagePreview.src = reader.result; };
        reader.readAsDataURL(file);

        uploadStatus.textContent = 'Uploading...';
        uploadStatus.classList.remove('text-red-500');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
                method: 'POST',
                body: formData,
            });
            
            const result = await response.json();

            if (result.success) {
                profilePicUrlInput.value = result.data.url; // Save the URL to the hidden input
                uploadStatus.textContent = 'Upload successful!';
                uploadStatus.classList.add('text-green-500');
            } else {
                throw new Error(result.error.message);
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            uploadStatus.textContent = `Upload failed: ${error.message}`;
            uploadStatus.classList.add('text-red-500');
            profilePicUrlInput.value = ''; // Clear the URL on failure
        }
    });

    // --- Form Submission Logic ---
    applicationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Authentication error. Please log in again.');
            return;
        }
        if (!profilePicUrlInput.value) {
            alert('Please upload a profile picture and wait for it to be successful.');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        // Gather all form data
        const applicationData = {
            pageName: getElement('pageName').value,
            contactNumber: getElement('contactNumber').value,
            profilePicUrl: profilePicUrlInput.value,
            category: getElement('category').value,
            platforms: {
                facebook: getElement('facebookUrl').value || null,
                instagram: getElement('instagramUrl').value || null,
                youtube: getElement('youtubeUrl').value || null,
            },
            bio: getElement('bio').value,
        };

        try {
            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                affiliateStatus: 'pending', // Use the same field as AnyShop affiliate
                influencerProfile: applicationData // Store all details in a sub-object
            });
            
            alert('Your application has been submitted successfully! We will review it shortly.');
            window.location.href = '/pf/dashboard'; // Redirect to user dashboard

        } catch (error) {
            console.error('Application submission failed:', error);
            alert(`Submission failed: ${error.message}`);
            // Hide loading state
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    });
});
