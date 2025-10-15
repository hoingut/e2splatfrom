// static/pf_post_ad.js

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY';

    const getElement = (id) => document.getElementById(id);
    const jobPostForm = getElement('job-post-form');
    const submitBtn = getElement('submit-btn');
    const imageUploadInput = getElement('cover-image');
    const imagePreview = getElement('image-preview');
    const uploadStatus = getElement('upload-status');
    
    let currentUser = null;
    let currentUserData = null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) currentUserData = docSnap.data();
            else window.location.href = '/login';
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/ad`;
        }
    });

    async function uploadImage(file) {
        if (!file) return null;
        uploadStatus.textContent = 'Uploading...';
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(`Image upload failed: ${result.error.message}`);
        uploadStatus.textContent = 'Upload successful!';
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

    jobPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        submitBtn.disabled = true;
        const btnText = getElement('btn-text');
        const btnSpinner = getElement('btn-spinner');
        btnText.classList.add('hidden');
        btnSpinner.classList.remove('hidden');

        try {
            const coverImageUrl = await uploadImage(imageUploadInput.files[0]);

            const postData = {
                // Core Details
                title: getElement('title').value,
                description: getElement('description').value,
                // Content Requirements
                mood: document.querySelector('input[name="mood"]:checked').value,
                platforms: Array.from(document.querySelectorAll('#platforms input:checked')).map(cb => cb.value),
                contentTypes: Array.from(document.querySelectorAll('#contentTypes input:checked')).map(cb => cb.value),
                // Influencer & Budget
                category: getElement('category').value,
                budget: Number(getElement('budget').value),
                minReach: Number(getElement('minReach').value) || 0,
                targetViews: Number(getElement('targetViews').value) || 0,
                // System Info
                coverImage: coverImageUrl,
                authorId: currentUser.uid,
                brandName: currentUserData.name,
                type: 'job',
                status: 'open-for-proposals',
                createdAt: serverTimestamp(),
            };

            if (postData.platforms.length === 0 || postData.contentTypes.length === 0) {
                throw new Error("Please select at least one Platform and one Content Type.");
            }

            await addDoc(collection(db, 'posts'), postData);
            
            alert('Your job has been posted successfully!');
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
