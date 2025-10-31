// static/pf_influencer_post_ad.js

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// !!! --- CRITICAL: REPLACE WITH YOUR ACTUAL IMGBB API KEY --- !!!
const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY'; 

const form = document.getElementById('service-post-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const coverImageInput = document.getElementById('cover-image');
const imagePreview = document.getElementById('image-preview');
const coverImageUrlInput = document.getElementById('coverImageUrl');
const uploadStatus = document.getElementById('upload-status');

let currentUser = null;
let currentProfile = null; // Store user/influencer profile data

// --- Helper function to convert File to Base64 (required by ImgBB) ---
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Only the Base64 string
        reader.onerror = error => reject(error);
    });
}

// --- 1. Authentication and Authorization Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        // Ensure user is an APPROVED influencer
        if (userSnap.exists() && userSnap.data().role === 'influencer' && userSnap.data().isApprovedInfluencer === true) {
            currentProfile = userSnap.data();
            
            // Populate hidden fields
            document.getElementById('authorId').value = user.uid;
            document.getElementById('authorName').value = currentProfile.name || 'Influencer User';
            
            submitBtn.disabled = false;
            btnText.textContent = 'Post Service Package';
        } else {
            // Not an approved influencer or missing profile
            alert("Access Denied. You must be an approved influencer to post a service.");
            // Wait a moment before redirecting to allow user to read the message
            setTimeout(() => {
                window.location.href = '/pf/dashboard'; 
            }, 1500);
        }
    } else {
        // Not logged in
        window.location.href = `/login?redirect=/pf/dashboard/i/ad`;
    }
});


// --- 2. ImgBB Image Upload Handling ---
coverImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // Max 5MB
        uploadStatus.textContent = 'Error: File size must be under 5MB.';
        coverImageInput.value = '';
        return;
    }

    if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
        uploadStatus.textContent = 'CRITICAL ERROR: Please set your ImgBB API Key.';
        return;
    }

    try {
        uploadStatus.textContent = 'Uploading to ImgBB...';
        submitBtn.disabled = true;

        // Convert file to Base64 format
        const base64Image = await getBase64(file);

        const formData = new FormData();
        formData.append("image", base64Image); // ImgBB accepts 'image' field with base64 data

        // Send request to ImgBB API
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (result.success) {
            const downloadURL = result.data.url;
            
            // 3. Update UI and hidden field
            imagePreview.src = downloadURL;
            coverImageUrlInput.value = downloadURL;
            uploadStatus.textContent = 'Upload successful!';
        } else {
            throw new Error(result.error.message || 'ImgBB upload failed.');
        }

    } catch (error) {
        console.error("Image upload failed:", error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    } finally {
        submitBtn.disabled = false;
    }
});


// --- 3. Form Submission ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser || submitBtn.disabled) return;

    submitBtn.disabled = true;
    btnText.textContent = 'Submitting...';
    btnSpinner.classList.remove('hidden');

    try {
        // Gather data
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        const budget = Number(document.getElementById('budget').value);
        const deliveryTime = Number(document.getElementById('deliveryTime').value);
        const mood = document.getElementById('mood').value;
        const coverImage = coverImageUrlInput.value;
        
        const platforms = Array.from(document.querySelectorAll('#platforms input:checked')).map(cb => cb.value);
        const contentTypes = Array.from(document.querySelectorAll('#contentTypes input:checked')).map(cb => cb.value);

        if (platforms.length === 0 || contentTypes.length === 0) {
            alert("Please select at least one platform and one content type.");
            // Re-enable button briefly before returning
            submitBtn.disabled = false;
            btnText.textContent = 'Post Service Package';
            btnSpinner.classList.add('hidden');
            return;
        }

        // Create the post data object
        const postData = {
            title,
            description,
            budget,
            category,
            mood,
            deliveryTime,
            platforms,
            contentTypes,
            coverImage: coverImage,
            
            // Essential Metadata
            authorId: currentUser.uid,
            authorName: currentProfile.name,
            authorRole: 'influencer', 
            postType: 'influencer_service', // CRITICAL for pf_home.js
            createdAt: serverTimestamp(),
            
            // Status: Requires Admin Approval
            status: 'pending-admin-approval', 
            isApproved: false, 
            
            // Influencer Profile Snapshot for quick reference
            influencerSnapshot: {
                pageName: currentProfile.influencerProfile?.pageName || currentProfile.name,
                followers: currentProfile.influencerProfile?.followers || 0,
                category: currentProfile.influencerProfile?.category || category,
                // Include profile picture URL for easy display on proposals
                pageProfilePicUrl: currentProfile.influencerProfile?.pageProfilePicUrl || 'https://via.placeholder.com/50'
            }
        };

        // Save to Firestore 'posts' collection
        const newPostRef = doc(collection(db, 'posts'));
        await setDoc(newPostRef, postData);

        alert("Service Package submitted successfully! It is now pending admin approval.");
        form.reset();
        imagePreview.src = "https://via.placeholder.com/150";
        window.location.href = '/pf/dashboard/i'; // Redirect to influencer dashboard

    } catch (error) {
        console.error("Submission failed:", error);
        alert("Failed to post service. Error: " + error.message);
    } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Post Service Package';
        btnSpinner.classList.add('hidden');
    }
});
