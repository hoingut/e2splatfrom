// static/pf_influencer_post_ad.js

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// !!! --- CRITICAL: REPLACE WITH YOUR ACTUAL IMGBB API KEY --- !!!
const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY'; 

// --- DOM Element References ---
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
        console.log(`[AUTH] User logged in: ${user.uid}. Checking profile...`);
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
        // ** DEBUG STEP 1: Check required fields in Firestore **
        if (!userSnap.exists()) {
            console.error("[AUTH ERROR] User document does not exist in Firestore.");
            submitBtn.disabled = true;
            btnText.textContent = 'ERROR: Profile Missing';
            alert("Error: Your profile document is missing. Cannot proceed.");
            return;
        }

        const userData = userSnap.data();
        currentProfile = userData;
        console.log("[AUTH] User Data Loaded:", userData);
        
        // Ensure user is an APPROVED influencer
        const isInfluencer = userData.role === 'influencer';
        const isApproved = userData.isApprovedInfluencer === true; // Must be BOOLEAN true

        if (isInfluencer && isApproved) {
            console.log("[AUTH] ACCESS GRANTED. User is an approved influencer.");
            
            // Populate hidden fields
            document.getElementById('authorId').value = user.uid;
            document.getElementById('authorName').value = userData.name || 'Influencer User';
            
            submitBtn.disabled = false;
            btnText.textContent = 'Post Service Package';
        } else {
            console.warn(`[AUTH ERROR] Access Denied. Role: ${userData.role}, Approved: ${isApproved}`);
            
            submitBtn.disabled = true;
            btnText.textContent = 'Access Denied';
            
            let msg = "Access Denied. ";
            if (!isInfluencer) {
                msg += "Your role is not set to 'influencer'.";
            } else if (!isApproved) {
                msg += "You are not yet approved by the admin.";
            } else {
                msg += "Please contact support.";
            }

            alert(msg);
            setTimeout(() => {
                window.location.href = '/pf/dashboard'; 
            }, 1500);
        }
    } else {
        // Not logged in
        console.log("[AUTH] User not logged in. Redirecting to login.");
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
        console.log("[UPLOAD] Starting image upload to ImgBB...");
        uploadStatus.textContent = 'Uploading to ImgBB...';
        submitBtn.disabled = true;

        const base64Image = await getBase64(file);

        const formData = new FormData();
        formData.append("image", base64Image); 

        // Send request to ImgBB API
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();
        console.log("[UPLOAD] ImgBB Response:", result);

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
        console.error("[UPLOAD FAILED]", error);
        uploadStatus.textContent = `Upload failed: ${error.message}`;
    } finally {
        // Re-enable button only if the main user check passed
        if (submitBtn.textContent === 'Post Service Package') {
            submitBtn.disabled = false;
        }
    }
});


// --- 3. Form Submission ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!currentUser || submitBtn.disabled) {
        alert("Please wait for authentication or fix upload errors.");
        return;
    }

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
            throw new Error("Please select at least one platform and one content type.");
        }

        const postData = {
            title, description, budget, category, mood, deliveryTime, platforms, contentTypes,
            coverImage: coverImage || 'https://via.placeholder.com/1200x675', // Fallback image
            
            // Essential Metadata for Filtering and Rules
            authorId: currentUser.uid,
            authorName: currentProfile.name,
            authorRole: 'influencer', 
            postType: 'influencer_service', // CRITICAL for pf_home.js
            createdAt: serverTimestamp(),
            
            // Status
            status: 'pending-admin-approval', 
            isApproved: false, 
            
            // Snapshot
            influencerSnapshot: {
                pageName: currentProfile.influencerProfile?.pageName || currentProfile.name,
                followers: currentProfile.influencerProfile?.followers || 0,
                category: currentProfile.influencerProfile?.category || category,
                pageProfilePicUrl: currentProfile.influencerProfile?.pageProfilePicUrl || 'https://via.placeholder.com/50'
            }
        };
        
        console.log("[SUBMIT] Final Post Data:", postData);

        // Save to Firestore 'posts' collection
        const newPostRef = doc(collection(db, 'posts'));
        await setDoc(newPostRef, postData);
        console.log("[SUBMIT] Post created successfully:", newPostRef.id);

        alert("Service Package submitted successfully! It is now pending admin approval.");
        form.reset();
        imagePreview.src = "https://via.placeholder.com/150";
        window.location.href = '/pf/dashboard/i'; 

    } catch (error) {
        console.error("[SUBMIT FAILED]", error);
        
        let displayMessage = "Failed to post service.";
        
        if (error.code === 'permission-denied') {
            displayMessage = "CRITICAL: Firebase Rules Denied Access. You are authenticated, but the rule is preventing write access to /posts. Check your Security Rules!";
        } else {
            displayMessage = "Submission Error: " + error.message;
        }
        
        alert(displayMessage);
    } finally {
        submitBtn.disabled = false;
        btnText.textContent = 'Post Service Package';
        btnSpinner.classList.add('hidden');
    }
});
