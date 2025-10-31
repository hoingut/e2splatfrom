// static/pf_influencer_post_ad.js

import { auth, db, storage } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js";

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

// --- 1. Authentication and Authorization Check ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        
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
            window.location.href = '/pf/dashboard'; 
        }
    } else {
        // Not logged in
        window.location.href = `/login?redirect=/pf/dashboard/i/ad`;
    }
});


// --- 2. Image Upload Handling ---
coverImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // Max 5MB
        uploadStatus.textContent = 'Error: File size must be under 5MB.';
        coverImageInput.value = '';
        return;
    }

    try {
        uploadStatus.textContent = 'Uploading...';
        
        // 1. Show spinner and disable button temporarily
        submitBtn.disabled = true;

        // 2. Upload to Firebase Storage
        const storageRef = ref(storage, `posts/influencer/${currentUser.uid}/${Date.now()}_cover`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        // 3. Update UI and hidden field
        imagePreview.src = downloadURL;
        coverImageUrlInput.value = downloadURL;
        uploadStatus.textContent = 'Upload successful!';
        
        submitBtn.disabled = false;

    } catch (error) {
        console.error("Image upload failed:", error);
        uploadStatus.textContent = 'Upload failed. Check console.';
        submitBtn.disabled = true; // Keep disabled until resolved or re-login
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
            authorRole: 'influencer', // Essential for filtering
            postType: 'influencer_service', // Essential for pf_home.js
            createdAt: serverTimestamp(),
            
            // Status: Requires Admin Approval before appearing on /pf
            status: 'pending-admin-approval', 
            isApproved: false, 
            
            // Influencer Profile Snapshot for quick reference (optional but good practice)
            influencerSnapshot: {
                pageName: currentProfile.influencerProfile?.pageName || currentProfile.name,
                followers: currentProfile.influencerProfile?.followers || 0,
                category: currentProfile.influencerProfile?.category || category,
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
