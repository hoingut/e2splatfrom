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
    const submitBtn = getElement('submit-btn');
    const uploadStatus = getElement('upload-status');

    let currentUser = null;

    // --- Authentication Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                const userData = docSnap.data();
                if (userData.role === 'influencer' || userData.applicationStatus === 'pending') {
                    alert('You have already submitted an application or you are an approved influencer.');
                    window.location.href = '/pf/dashboard'; // Redirect to appropriate dashboard
                }
            }
        } else {
            alert('You must be logged in to apply.');
            window.location.href = `/login?redirect=/pf/apply-influencer`;
        }
    });

    /**
     * Uploads a single image to ImgBB and returns the URL.
     * @param {File} file - The image file to upload.
     * @returns {Promise<string>} - The URL of the uploaded image.
     */
    async function uploadImage(file) {
        if (!file) return null;
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        
        const result = await response.json();
        if (!result.success) {
            throw new Error(`ImgBB upload failed: ${result.error.message}`);
        }
        return result.data.url;
    }

    // --- Image Preview Logic ---
    document.querySelectorAll('.image-upload-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            const preview = getElement(`${e.target.id}-preview`);
            if (file && preview) {
                const reader = new FileReader();
                reader.onload = () => { preview.src = reader.result; };
                reader.readAsDataURL(file);
            }
        });
    });

    // --- Form Submission Logic ---
    applicationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        // Show loading state
        submitBtn.disabled = true;
        const btnText = getElement('btn-text');
        const btnSpinner = getElement('btn-spinner');
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');
        uploadStatus.textContent = 'Uploading images... Please wait.';

        try {
            // Upload all images in parallel for speed
            const [ownerPicUrl, pageProfilePicUrl, analyticsSS1Url, analyticsSS2Url] = await Promise.all([
                uploadImage(getElement('ownerPic').files[0]),
                uploadImage(getElement('pageProfilePic').files[0]),
                uploadImage(getElement('analyticsSS1').files[0]),
                uploadImage(getElement('analyticsSS2').files[0]),
            ]);
            
            uploadStatus.textContent = 'Images uploaded. Submitting application...';
            
            // Gather all form data
            const applicationData = {
                personal: {
                    fullName: getElement('fullName').value,
                    contactNumber: getElement('contactNumber').value,
                    ownerPicUrl: ownerPicUrl,
                },
                page: {
                    pageName: getElement('pageName').value,
                    pageLink: getElement('pageLink').value,
                    platform: getElement('platform').value,
                    followers: Number(getElement('followers').value),
                    bio: getElement('bio').value,
                    description: getElement('description').value,
                    pageProfilePicUrl: pageProfilePicUrl,
                },
                analytics: {
                    ss1: analyticsSS1Url,
                    ss2: analyticsSS2Url,
                }
            };

            const userRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userRef, {
                applicationStatus: 'pending', // A more specific status field
                influencerApplication: applicationData // Store all details in a sub-object
            });
            
            alert('Your application has been submitted successfully! We will review it shortly.');
            window.location.href = '/pf/dashboard';

        } catch (error) {
            console.error('Application submission failed:', error);
            uploadStatus.textContent = '';
            alert(`Submission failed: ${error.message}`);
        } finally {
            // Hide loading state
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnSpinner.classList.add('hidden');
        }
    });
});
