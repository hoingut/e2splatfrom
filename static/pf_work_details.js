// static/pf_work_details.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
    // This function runs as soon as the page loads. It checks the user's login status and role
    // BEFORE attempting to load any page content. 
    // static/pf_work_details.js

// ... (ফাইলের উপরের অংশ এবং DOM References আগের মতোই থাকবে)

// --- State Management ---
let currentUser = null;
let currentUserRole = null;
let workData = null;
const workId = window.location.pathname.split('/').pop();

// --- Authentication and Page Load Initialization ---
// THIS IS THE FINAL FIX: We will nest the core logic inside the auth check.
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    // Step 1: Determine the user's role (or if they are a guest).
    if (user) {
        try {
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                currentUserRole = docSnap.data().role;
                console.log("Auth Check Complete. User Role:", currentUserRole);
            } else {
                currentUserRole = 'customer'; // Default role if document is missing
                console.warn("User document not found, defaulting role to 'customer'.");
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
            // If we can't get the role, treat them as a guest for safety.
            currentUserRole = null; 
        }
    } else {
        currentUserRole = null; // No user, so role is null (guest).
        console.log("Auth Check Complete. User is not logged in (Guest).");
    }

    // Step 2: NOW that we know the user's role, load the work details.
    // This function will use the globally set `currentUserRole`.
    await loadWorkDetails();
});


/**
 * Main function to fetch and display the work/job details.
 * This function is now ONLY called after the auth state is known.
 */
async function loadWorkDetails() {
    console.log("loadWorkDetails: Starting to load work. Current user role is:", currentUserRole);
    if (!workId) {
        displayError("Work ID not found.");
        return;
    }

    try {
        const workRef = doc(db, 'posts', workId);
        const docSnap = await getDoc(workRef);

        if (!docSnap.exists()) {
            throw new Error("This work post does not exist.");
        }
        workData = docSnap.data();
        
        populateStaticDetails(workData);
        
        // This function will now have the correct `currentUserRole`.
        populateActionArea();

        loadingContainer.classList.add('hidden');
        contentContainer.classList.remove('hidden');

    } catch (error) {
        console.error("Error loading work details:", error);
        displayError(error.message);
    }
}

// ... (populateStaticDetails, populateActionArea, submitProposal, displayError ফাংশনগুলো আগের উত্তর থেকে কপি করে নিন, সেগুলোতে কোনো পরিবর্তন নেই)
    /**
     * Populates the main, non-interactive details of the job post.
     * @param {object} data - The work data from Firestore.
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
        
        const statusColors = {
            'open-for-proposals': 'text-green-400',
            'in-progress': 'text-yellow-400',
            'completed': 'text-blue-400'
        };
        statusEl.className = `font-semibold capitalize ${statusColors[data.status] || 'text-gray-400'}`;
    }

    /**
     * Populates the action area with relevant buttons based on user role and work status.
     * This is the core logic that fixes your bug.
     */
    function populateActionArea() {
        // Case 1: User is an influencer
        if (currentUserRole === 'influencer') {
            // Subcase 1.1: The job is open for applications
            if (workData.status === 'open-for-proposals') {
                actionArea.innerHTML = `
                    <h3 class="font-semibold text-lg mb-2">Apply for this Job</h3>
                    <textarea id="cover-letter" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-md" rows="4" placeholder="Write a short proposal..."></textarea>
                    <button id="apply-btn" class="w-full mt-3 bg-mulberry hover:bg-mulberry-dark text-white font-bold py-2 rounded-md">Submit Proposal</button>`;
                getElement('apply-btn').addEventListener('click', submitProposal);
            } else {
                // Subcase 1.2: The job is already in progress or completed
                actionArea.innerHTML = `<p class="text-center text-gray-400">This job is no longer accepting new applications.</p>`;
            }
        } 
        // Case 2: User is not logged in
        else if (!currentUser) {
            actionArea.innerHTML = `<p class="text-center text-gray-400">Please <a href="/login?redirect=${window.location.pathname}" class="text-mulberry font-semibold">log in or sign up</a> as an influencer to apply.</p>`;
        }
        // Case 3: User is a brand/customer or admin
        else {
            // Subcase 3.1: The user is the author of this job post
            if (workData.authorId === currentUser.uid) {
                actionArea.innerHTML = `<p class="text-center text-gray-400">You are the author of this post. <a href="/pf/brand/inbox" class="text-mulberry font-semibold">Manage proposals</a> in your brand inbox.</p>`;
            } else {
                // Subcase 3.2: The user is just a regular user, not the author
                actionArea.innerHTML = `<p class="text-center text-gray-400">Only approved influencers can apply for jobs.</p>`;
            }
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
     * Displays a full-page error message.
     */
    function displayError(message) {
        loadingContainer.classList.add('hidden');
        contentContainer.innerHTML = `<div class="text-center p-10"><h2 class="text-2xl font-bold text-red-500">Oops!</h2><p class="mt-2 text-gray-300">${message}</p><a href="/pf" class="mt-6 inline-block bg-mulberry text-white py-2 px-6 rounded">Back to Home</a></div>`;
    }
});
