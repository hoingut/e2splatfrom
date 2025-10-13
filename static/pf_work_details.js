// static/pf_work_details.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const contentContainer = getElement('work-details-content');
    const actionArea = getElement('action-area');

    // --- State Management ---
    let currentUser = null;
    let currentUserRole = null;
    let workData = null;
    const workId = window.location.pathname.split('/').pop();

    // --- Step 3: Authentication and Page Load Initialization ---
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                currentUserRole = docSnap.exists() ? docSnap.data().role : 'customer';
            } catch (error) {
                console.error("Error fetching user role:", error);
                currentUserRole = 'customer';
            }
        } else {
            currentUserRole = null; // Guest user
        }
        await loadWorkDetails();
    });

    /**
     * Main function to fetch and display the work/job details.
     */
    async function loadWorkDetails() {
        if (!workId) {
            displayError("Work ID not found in the URL.");
            return;
        }
        try {
            const workRef = doc(db, 'posts', workId);
            const docSnap = await getDoc(workRef);

            if (!docSnap.exists()) {
                throw new Error("This work post does not exist or has been removed.");
            }
            workData = docSnap.data();
            
            populateStaticDetails(workData);
            populateActionArea();

            loadingContainer.classList.add('hidden');
            contentContainer.classList.remove('hidden');
        } catch (error) {
            console.error("Error loading work details:", error);
            displayError(error.message);
        }
    }

    /**
     * Populates the static, non-interactive details of the job post.
     */
    function populateStaticDetails(data) {
        getElement('work-title').textContent = data.title;
        getElement('work-description').innerHTML = `<p>${(data.description || '').replace(/\n/g, '<br>')}</p>`;
        getElement('brand-logo').src = data.brandLogo || 'https://via.placeholder.com/80';
        getElement('brand-name').textContent = data.brandName;
        getElement('post-date').textContent = data.createdAt?.toDate().toLocaleDateString() || 'N/A';
        getElement('work-budget').textContent = `৳${(data.budget || 0).toLocaleString()}`;
        getElement('work-category').textContent = data.category;

        const statusEl = getElement('work-status');
        const statusText = (data.status || 'unknown').replace('-', ' ');
        statusEl.textContent = statusText;
        const statusColors = {'open-for-proposals': 'text-green-400', 'in-progress': 'text-yellow-400', 'completed': 'text-blue-400'};
        statusEl.className = `font-semibold capitalize ${statusColors[data.status] || 'text-gray-400'}`;
    }

    /**
     * Populates the action area with relevant buttons based on user role and work status.
     * This is the core logic that implements all your conditions.
     */
    function populateActionArea() {
        // Case 1: The user is the author of the post (Brand Owner)
        if (currentUser && workData.authorId === currentUser.uid) {
            actionArea.innerHTML = `
                <h3 class="font-semibold text-lg mb-2">My Post</h3>
                <p class="text-sm text-gray-400 mb-3">You are the author of this job post.</p>
                <a href="/pf/brand/inbox" class="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-md mb-2">Manage Proposals</a>
                <button id="delete-post-btn" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-md">Delete Post</button>`;
            getElement('delete-post-btn').addEventListener('click', deletePost);
        } 
        // Case 2: The user is an influencer and the job is open for applications
        else if (currentUserRole === 'influencer' && workData.status === 'open-for-proposals') {
            actionArea.innerHTML = `
                <h3 class="font-semibold text-lg mb-2">Apply for this Job</h3>
                <textarea id="cover-letter" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-md" rows="4" placeholder="Write a short proposal..."></textarea>
                <button id="apply-btn" class="w-full mt-3 bg-mulberry hover:bg-mulberry-dark text-white font-bold py-2 rounded-md">Submit Proposal</button>`;
            getElement('apply-btn').addEventListener('click', submitProposal);
        }
        // Case 3: The user is an influencer but the job is closed
        else if (currentUserRole === 'influencer' && workData.status !== 'open-for-proposals') {
            actionArea.innerHTML = `<p class="text-center text-yellow-400 font-semibold">This job is no longer accepting new applications.</p>`;
        }
        // Case 4: The user is not logged in (Guest)
        else if (!currentUser) {
            actionArea.innerHTML = `
                <h3 class="font-semibold text-lg mb-2">Join to Apply</h3>
                <p class="text-sm text-gray-400 mb-3">Log in or sign up as an influencer to apply for this job.</p>
                <a href="/login?redirect=${window.location.pathname}" class="w-full block text-center bg-mulberry hover:bg-mulberry-dark text-white font-bold py-2 rounded-md">Login or Sign Up</a>`;
        }
        // Case 5: The user is a logged-in customer/brand but not the author (Only View)
        else {
            actionArea.innerHTML = `<p class="text-center text-gray-500">This is a preview of the job post. Only influencers can apply.</p>`;
        }
    }

    /**
     * Handles the submission of a proposal by an influencer.
     */
    async function submitProposal() {
        const coverLetterInput = getElement('cover-letter');
        const coverLetter = coverLetterInput.value.trim();
        if (!coverLetter) {
            alert("Please write a proposal before applying.");
            return;
        }

        const applyBtn = getElement('apply-btn');
        applyBtn.disabled = true;
        applyBtn.textContent = 'Submitting...';

        try {
            const proposalsRef = collection(db, 'proposals');
            const q = query(proposalsRef, where("postId", "==", workId), where("influencerId", "==", currentUser.uid));
            const existingProposal = await getDocs(q);

            if (!existingProposal.empty) {
                throw new Error("You have already submitted a proposal for this job.");
            }

            const proposalData = {
                postId: workId,
                postTitle: workData.title,
                influencerId: currentUser.uid,
                brandId: workData.authorId,
                coverLetter: coverLetter,
                status: 'pending',
                createdAt: serverTimestamp()
            };
            await addDoc(proposalsRef, proposalData);
            
            alert('Your proposal has been submitted successfully!');
            actionArea.innerHTML = `<p class="text-center text-green-400 font-semibold">Application Submitted!</p>`;
        } catch (error) {
            alert(`Error: ${error.message}`);
            applyBtn.disabled = false;
            applyBtn.textContent = 'Submit Proposal';
        }
    }
    
    /**
     * Handles the deletion of a post by its author.
     */
    async function deletePost() {
        if (!confirm("Are you sure you want to permanently delete this job post? This action cannot be undone.")) return;

        const deleteBtn = getElement('delete-post-btn');
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';

        try {
            const workRef = doc(db, 'posts', workId);
            await deleteDoc(workRef);
            alert("Job post deleted successfully.");
            window.location.href = '/pf/dashboard'; // Redirect to brand dashboard
        } catch (error) {
            console.error("Error deleting post:", error);
            alert("Failed to delete the post.");
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Post';
        }
    }

    /**
     * Displays a full-page error message.
     */
    function displayError(message) {
        loadingContainer.classList.add('hidden');
        contentContainer.innerHTML = `<div class="text-center p-10"><h2 class="text-2xl font-bold text-red-500">Oops!</h2><p class="mt-2 text-gray-300">${message}</p><a href="/pf" class="mt-6 inline-block bg-mulberry text-white py-2 px-6 rounded">Back to Home</a></div>`;
    }
});
