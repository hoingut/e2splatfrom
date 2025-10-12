// static/pf_work_details.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const contentContainer = getElement('work-details-content');
    const actionArea = getElement('action-area');

    let currentUser = null;
    let currentUserRole = null;
    let workData = null;
    const workId = window.location.pathname.split('/').pop();

    // --- Authentication and Page Load ---
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (user) {
            const userRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(userRef);
            if (docSnap.exists()) {
                currentUserRole = docSnap.data().role;
            }
        }
        await loadWorkDetails();
    });

    /**
     * Main function to load the work/job details.
     */
    async function loadWorkDetails() {
        if (!workId) {
            displayError("Work ID not found in URL.");
            return;
        }

        try {
            const workRef = doc(db, 'posts', workId);
            const docSnap = await getDoc(workRef);

            if (!docSnap.exists()) {
                throw new Error("This work post does not exist or has been removed.");
            }
            workData = docSnap.data();
            
            // Populate the static details of the page
            populateStaticDetails(workData);
            
            // Populate the dynamic action area based on user role and work status
            populateActionArea();

            loadingContainer.classList.add('hidden');
            contentContainer.classList.remove('hidden');

        } catch (error) {
            displayError(error.message);
        }
    }

    /**
     * Populates the main details of the job post.
     */
    function populateStaticDetails(data) {
        getElement('work-title').textContent = data.title;
        getElement('work-description').innerHTML = `<p>${data.description.replace(/\n/g, '<br>')}</p>`; // Basic formatting
        getElement('brand-logo').src = data.brandLogo || 'https://via.placeholder.com/80';
        getElement('brand-name').textContent = data.brandName;
        getElement('post-date').textContent = data.createdAt?.toDate().toLocaleDateString() || 'N/A';
        getElement('work-budget').textContent = `৳${(data.budget || 0).toLocaleString()}`;
        getElement('work-category').textContent = data.category;

        const statusEl = getElement('work-status');
        statusEl.textContent = data.status.replace('-', ' ');
        const statusColors = { 'open-for-proposals': 'text-green-400', 'in-progress': 'text-yellow-400', 'completed': 'text-blue-400' };
        statusEl.className = `font-semibold capitalize ${statusColors[data.status] || 'text-gray-400'}`;
    }

    /**
     * Populates the action area with relevant buttons based on user role and work status.
     */
    function populateActionArea() {
        if (!currentUser) { // Not logged in
            actionArea.innerHTML = `<p class="text-center text-gray-400">Please <a href="/login" class="text-mulberry">log in</a> to apply.</p>`;
        } else if (currentUserRole === 'influencer') {
            if (workData.status === 'open-for-proposals') {
                actionArea.innerHTML = `
                    <h3 class="font-semibold text-lg mb-2">Apply for this Job</h3>
                    <textarea id="cover-letter" class="w-full p-2 bg-gray-800 border border-gray-600 rounded-md" rows="4" placeholder="Write a short proposal explaining why you are a good fit..."></textarea>
                    <button id="apply-btn" class="w-full mt-3 bg-mulberry hover:bg-mulberry-dark text-white font-bold py-2 rounded-md">Submit Proposal</button>`;
                getElement('apply-btn').addEventListener('click', submitProposal);
            } else {
                actionArea.innerHTML = `<p class="text-center text-gray-400">This job is no longer accepting applications.</p>`;
            }
        } else { // Brand or other user
            if (workData.authorId === currentUser.uid) {
                actionArea.innerHTML = `<p class="text-center text-gray-400">You posted this job. <a href="/pf/brand/inbox" class="text-mulberry">Manage proposals</a> in your inbox.</p>`;
            } else {
                actionArea.innerHTML = `<p class="text-center text-gray-400">Only influencers can apply for jobs.</p>`;
            }
        }
    }

    /**
     * Handles the submission of a proposal by an influencer.
     */
    async function submitProposal() {
        const coverLetter = getElement('cover-letter').value;
        if (!coverLetter.trim()) {
            alert("Please write a proposal before applying.");
            return;
        }

        const applyBtn = getElement('apply-btn');
        applyBtn.disabled = true;
        applyBtn.textContent = 'Submitting...';

        try {
            // Check if this influencer has already applied
            const proposalsRef = collection(db, 'proposals');
            const q = query(proposalsRef, where("postId", "==", workId), where("influencerId", "==", currentUser.uid));
            const existingProposal = await getDocs(q);

            if (!existingProposal.empty) {
                throw new Error("You have already applied for this job.");
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
            await addDoc(collection(db, 'proposals'), proposalData);
            
            alert('Your proposal has been submitted successfully!');
            actionArea.innerHTML = `<p class="text-center text-green-400 font-semibold">Application Submitted!</p>`;

        } catch (error) {
            alert(`Error: ${error.message}`);
            applyBtn.disabled = false;
            applyBtn.textContent = 'Submit Proposal';
        }
    }

    function displayError(message) {
        loadingContainer.classList.add('hidden');
        contentContainer.innerHTML = `<div class="text-center p-10"><p class="text-red-500">${message}</p></div>`;
    }
});
