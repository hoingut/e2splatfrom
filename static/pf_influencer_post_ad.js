// static/pf_influencer_post_ad.js

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- REPLACE WITH YOUR ACTUAL IMGBB API KEY ---
const IMGBB_API_KEY = "YOUR_IMGBB_API_KEY_HERE"; 
// ---------------------------------------------

const form = document.getElementById('service-post-form');
const submitBtn = document.getElementById('submit-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');
const coverImageInput = document.getElementById('cover-image');
const imagePreview = document.getElementById('image-preview');
const uploadStatus = document.getElementById('upload-status');

let currentUserId = null;
let isInfluencer = false;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserId = user.uid;
        // Check if user is an approved influencer
        const userRef = doc(db, 'users', currentUserId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'influencer') {
            isInfluencer = true;
        } else {
            alert("Access Denied. You must be an approved influencer.");
            window.location.href = '/pf/dashboard'; // Redirect non-influencers
        }
    } else {
        window.location.href = '/login?redirect=/pf/dashboard/i/ad';
    }
});

// Helper function to show loading state
function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    btnText.textContent = isLoading ? 'Publishing...' : 'Publish Service Package Instantly';
    btnSpinner.classList.toggle('hidden', !isLoading);
}

// Image Preview Handler
coverImageInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
        imagePreview.src = URL.createObjectURL(e.target.files[0]);
    }
});

// **********************************************
// --- IMGBB UPLOAD FUNCTION ---
// **********************************************
async function uploadImageToImgBB(file) {
    if (!IMGBB_API_KEY || IMGBB_API_KEY === "YOUR_IMGBB_API_KEY_HERE") {
        throw new Error("ImgBB API Key is missing or default.");
    }
    
    uploadStatus.textContent = "Uploading image to ImgBB...";
    
    const formData = new FormData();
    formData.append("image", file); // ImgBB expects the file named 'image'

    const url = `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`;
    
    const response = await fetch(url, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`ImgBB upload failed: ${errorData.error.message || response.statusText}`);
    }

    const result = await response.json();
    if (result.success) {
        return result.data.url; // Returns the direct image URL
    } else {
        throw new Error("ImgBB upload succeeded but returned an error status.");
    }
}
// **********************************************


form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isInfluencer || !currentUserId) return;
    setLoading(true);

    try {
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const category = document.getElementById('category').value;
        const budget = parseInt(document.getElementById('budget').value);
        const imageFile = coverImageInput.files[0];
        
        let imageUrl = '';
        if (imageFile) {
            imageUrl = await uploadImageToImgBB(imageFile); // Use the new function
        }

        // Collect platforms and content types
        const platforms = Array.from(document.querySelectorAll('#platforms input:checked')).map(input => input.value);
        const contentTypes = Array.from(document.querySelectorAll('#contentTypes input:checked')).map(input => input.value);

        if (platforms.length === 0 || contentTypes.length === 0) {
             alert("Please select at least one platform and one content type.");
             setLoading(false);
             return;
        }

        const serviceData = {
            userId: currentUserId,
            title: title,
            description: description,
            category: category,
            budget: budget,
            platforms: platforms,
            contentTypes: contentTypes,
            imageUrl: imageUrl,
            
            // --- CORE LOGIC: Auto-Approved Service Package ---
            status: 'approved', 
            type: 'service_package', 
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, 'jobPosts'), serviceData);
        
        alert("Service Package Published Successfully! It is now live.");
        form.reset();
        imagePreview.src = 'https://via.placeholder.com/150';
        uploadStatus.textContent = "";
        window.location.href = '/pf/dashboard/i';

    } catch (error) {
        console.error("Error posting service:", error);
        alert("Failed to post service: " + error.message);
    } finally {
        setLoading(false);
    }
});
