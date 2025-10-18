// static/pf_brand_inbox.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    orderBy, writeBatch, updateDoc, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: pf_brand_inbox.js -> DOM fully loaded and script started.");

    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsContent = getElement('details-content');
    
    let currentUser = null;

    // =================================================================
    // SECTION A: INITIALIZATION & CORE LOGIC
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        console.log("DEBUG: Auth state changed.");
        if (user) {
            currentUser = user;
            // You can add a role check here to redirect non-brands if needed
            await loadBrandInbox();
        } else {
            window.location.href = `/login?redirect=/pf/brand/inbox`;
        }
    });

    async function loadBrandInbox() {
        console.log("DEBUG: loadBrandInbox() -> Started.");
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            console.log(`DEBUG: loadBrandInbox -> Found ${snapshot.size} job posts.`);

            if (snapshot.empty) {
                jobPostsList.innerHTML = `<p class="text-gray-500 p-4">You have not posted any jobs yet.</p>`;
            } else {
                jobPostsList.innerHTML = snapshot.docs.map(doc => createJobPostItem(doc.id, doc.data())).join('');
            }

            loadingContainer.classList.add('hidden');
            inboxContent.classList.remove('hidden');

        } catch (error) {
            console.error("DEBUG: loadBrandInbox -> CRITICAL ERROR:", error);
            jobPostsList.innerHTML = `<p class="text-red-500 p-4">Failed to load job posts. Check console for details.</p>`;
        }
    }

    // =================================================================
    // SECTION B: UI RENDERING FUNCTIONS
    // =================================================================

    function createJobPostItem(postId, post) {
        return `
            <div id="job-${postId}" 
                 class="job-item p-3 rounded-md cursor-pointer border-2 border-transparent hover:bg-gray-800"
                 data-post-id="${postId}"
                 data-status="${post.status}">
                <h4 class="font-semibold truncate pointer-events-none">${post.title}</h4>
                <p class="text-xs text-gray-400 capitalize pointer-events-none">${post.status.replace('-', ' ')}</p>
            </div>
        `;
    }

    // static/pf_brand_inbox.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Main handler for selecting a job.
 * THIS IS THE UPDATED AND BUG-FREE FUNCTION.
 */
async function selectJob(postId, status) {
    console.log(`DEBUG: selectJob -> Selected PostID: ${postId}, Status: ${status}`);
    
    // --- THIS IS THE KEY FIX ---
    // Step 1: Visually update the selection immediately.
    document.querySelectorAll('.job-item').forEach(el => el.classList.remove('bg-mulberry', 'text-white'));
    const selectedJobElement = getElement(`job-${postId}`);
    if (selectedJobElement) {
        selectedJobElement.classList.add('bg-mulberry', 'text-white');
    }

    // Step 2: Immediately show a clean loading state in the details panel.
    // This clears all old content (including previous submission pics).
    detailsContent.innerHTML = `
        <div class="flex flex-col justify-center items-center h-full text-center text-gray-500 py-16">
            <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-mulberry"></div>
            <p class="mt-4 font-semibold">Loading Details...</p>
        </div>
    `;
    // -------------------------

    // Step 3: Now, fetch and display the new content.
    try {
        if (status === 'open-for-proposals') {
            await displayProposals(postId);
        } else { // 'in-progress', 'completed', etc.
            await displayWorkDetails(postId);
        }
        console.log(`DEBUG: selectJob -> Successfully displayed details for ${postId}`);
    } catch (error) {
        console.error(`DEBUG: selectJob -> Error while displaying details for ${postId}:`, error);
        detailsContent.innerHTML = `<p class="text-red-500 text-center py-16">Failed to load details. Please try again.</p>`;
    }
}

// ... (ফাইলের বাকি অংশ এবং অন্যান্য ফাংশন, যেমন displayProposals, displayWorkDetails, আগের মতোই থাকবে)

    // static/pf_brand_inbox.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Fetches and displays proposals for a selected job post.
 * THIS IS THE UPDATED AND BUG-FREE FUNCTION WITH CORRECT ORDER.
 */
async function displayProposals(postId) {
    console.log(`DEBUG: displayProposals -> Fetching for PostID: ${postId}`);
    try {
        const proposalsRef = collection(db, 'proposals');
        const q = query(proposalsRef, where("brandId", "==", currentUser.uid), where("postId", "==", postId), where("status", "==", "pending"));
        const snapshot = await getDocs(q);

        console.log(`DEBUG: displayProposals -> Found ${snapshot.size} pending proposals.`);

        if (snapshot.empty) {
            detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Proposals</h3><p class="text-gray-500">No pending proposals for this job yet.</p>`;
            return;
        }

        // --- THIS IS THE KEY FIX: DECLARE AND INITIALIZE BEFORE USE ---

        // Step 1: Create promises to fetch influencer data for each proposal.
        const proposalPromises = snapshot.docs.map(async (propDoc) => {
            const proposal = { id: propDoc.id, ...propDoc.data() };
            const userRef = doc(db, 'users', proposal.influencerId);
            const userSnap = await getDoc(userRef);
            proposal.influencerData = userSnap.exists() ? userSnap.data() : null;
            return proposal;
        });

        // Step 2: Wait for all promises to resolve. Now the 'proposals' variable is ready.
        const proposals = await Promise.all(proposalPromises);
        console.log(`DEBUG: displayProposals -> Successfully fetched data for ${proposals.length} proposals.`);

        // Step 3: Now that 'proposals' is initialized, we can safely use it.
        let proposalsHTML = `<h3 class="text-xl font-semibold mb-4">Proposals Received (${proposals.length})</h3><div class="space-y-4">`;
        proposalsHTML += proposals.map(p => createProposalCard(p, postId)).join('');
        proposalsHTML += `</div>`;
        
        detailsContent.innerHTML = proposalsHTML;

    } catch (error) {
        console.error("DEBUG: displayProposals -> CRITICAL ERROR:", error);
        detailsContent.innerHTML = `<p class="text-red-500">Could not load proposals. Error: ${error.message}</p>`;
    }
}

// ... (ফাইলের বাকি অংশ আগের মতোই থাকবে, যেমন createProposalCard, displayWorkDetails ইত্যাদি)
    function createProposalCard(proposal, postId) {
        const influencerId = proposal.influencerId;
        const profile = proposal.influencerData?.influencerApplication?.page;
        const name = profile?.pageName || proposal.influencerData?.name || 'Unknown Influencer';
        const picUrl = profile?.pageProfilePicUrl || 'https://via.placeholder.com/40';
        const followers = profile?.followers || 0;

        return `
            <div class="bg-gray-800 p-4 rounded-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-3">
                        <img src="${picUrl}" class="w-10 h-10 rounded-full object-cover" alt="${name}'s profile picture">
                        <div>
                            <a href="/pf/influencer/${influencerId}" target="_blank" class="font-bold hover:underline">${name}</a>
                            <p class="text-xs text-gray-400">${followers.toLocaleString()} Followers</p>
                        </div>
                    </div>
                    <button onclick="window.hireInfluencer('${proposal.id}', '${influencerId}', '${postId}')" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md text-sm">Hire</button>
                </div>
                <p class="text-sm text-gray-300 mt-3 border-t border-dark pt-3">${proposal.coverLetter}</p>
            </div>`;
    }

    // static/pf_brand_inbox.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Displays the details and a full timeline of a work that is in-progress or completed.
 * THIS IS THE UPDATED AND ADVANCED FUNCTION.
 */
async function displayWorkDetails(postId) {
    console.log(`DEBUG: displayWorkDetails -> Fetching work details for PostID: ${postId}`);
    try {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("postId", "==", postId), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Work Details</h3><p class="text-gray-500">Work has not been started for this post yet.</p>`;
            return;
        }
        
        const workDoc = snapshot.docs[0];
        const work = { id: workDoc.id, ...workDoc.data() };
        console.log("DEBUG: displayWorkDetails -> Found work document:", work);
        
        const influencerRef = doc(db, 'users', work.influencerId);
        const influencerSnap = await getDoc(influencerRef);
        const influencerName = influencerSnap.exists() ? influencerSnap.data().name : 'Unknown Influencer';

        let workHTML = `
            <h3 class="text-xl font-semibold mb-4">Work Progress: ${work.title}</h3>
            <div class="flex items-center space-x-3 mb-6">
                <img src="${influencerSnap.exists() ? influencerSnap.data().influencerApplication?.page.pageProfilePicUrl : 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover">
                <div>
                    <p class="text-sm text-gray-400">Working with:</p>
                    <a href="/pf/influencer/${work.influencerId}" target="_blank" class="font-bold hover:underline">${influencerName}</a>
                </div>
            </div>
            <p class="mb-4">Current Status: <span class="font-bold capitalize text-yellow-400">${work.status.replace('-', ' ')}</span></p>
        `;
        
        // --- THIS IS THE KEY FIX: Create a full timeline from the 'submissions' array ---
        workHTML += '<h4 class="font-semibold text-white mb-4 border-t border-dark pt-4">Collaboration History</h4>';
        workHTML += '<div class="space-y-6 border-l-2 border-dark pl-6 relative">';

        // Add the initial "Work Started" event to the timeline
        workHTML += `
            <div class="relative">
                <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-gray-500"></div>
                <h5 class="font-semibold">Work Contract Created</h5>
                <p class="text-xs text-gray-400">${work.createdAt?.toDate().toLocaleString() || 'N/A'}</p>
            </div>`;

        if (Array.isArray(work.submissions) && work.submissions.length > 0) {
            console.log(`DEBUG: Found ${work.submissions.length} submissions to display.`);
            
            work.submissions.forEach(submission => {
                const submissionType = submission.type === 'started' ? 'Work Started' : 'Final Submission';
                const icon = submission.type === 'started' ? 'fa-play-circle text-blue-400' : 'fa-check-double text-green-400';

                workHTML += `
                    <div class="relative">
                        <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-mulberry flex items-center justify-center">
                            <i class="fas ${icon} text-xs text-white"></i>
                        </div>
                        <h5 class="font-semibold">${submissionType} by Influencer</h5>
                        <p class="text-xs text-gray-400">${submission.timestamp.toDate().toLocaleString()}</p>
                        <p class="text-sm text-gray-300 my-2 bg-gray-800 p-3 rounded-md">Note: "${submission.note || 'No note provided.'}"</p>
                        ${submission.screenshotUrl ? `<a href="${submission.screenshotUrl}" target="_blank" class="text-blue-400 text-sm hover:underline flex items-center"><i class="fas fa-paperclip mr-2"></i>View Proof</a>` : ''}
                    </div>`;
            });
        } else {
             workHTML += `<div class="relative"><div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-yellow-400"></div><p class="text-yellow-400">Waiting for influencer to start the work.</p></div>`;
        }
        
        workHTML += '</div>'; // Close timeline div
        
        // Action button area
        if (work.status === 'submitted-for-review') {
            workHTML += `
                <div class="mt-6 border-t border-dark pt-6">
                    <h4 class="font-semibold text-lg">Action Required</h4>
                    <p class="text-sm text-gray-400 mb-3">The influencer has submitted the final work. Please review and approve to release payment.</p>
                    <button onclick="window.approveWork('${work.id}')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Approve & Release Payment</button>
                </div>`;
        } else if (work.status === 'completed') {
            workHTML += `<p class="mt-6 border-t border-dark pt-6 text-green-400 font-semibold flex items-center"><i class="fas fa-check-circle mr-2"></i>This collaboration is complete.</p>`;
        }
        
        detailsContent.innerHTML = workHTML;

    } catch (error) {
        console.error("DEBUG: Error in displayWorkDetails():", error);
        detailsContent.innerHTML = `<p class="text-red-500">Could not load work details.</p>`;
    }
}

// ... (ফাইলের বাকি অংশ এবং অন্যান্য ফাংশন, যেমন hireInfluencer, approveWork, আগের মতোই থাকবে)

    // =================================================================
    // SECTION C: ACTION FUNCTIONS & EVENT LISTENERS
    // =================================================================

    jobPostsList.addEventListener('click', (e) => {
        const jobItem = e.target.closest('.job-item');
        if (jobItem) {
            const postId = jobItem.dataset.postId;
            const status = jobItem.dataset.status;
            if (postId && status) {
                selectJob(postId, status);
            }
        }
    });

    window.hireInfluencer = async (proposalId, influencerId, postId) => {
        if (!confirm('Are you sure you want to hire this influencer?')) return;
        
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        if(!postSnap.exists()) { alert("Post not found."); return; }
        const postData = postSnap.data();

        const workData = {
            postId, title: postData.title, description: postData.description, budget: postData.budget,
            brandId: currentUser.uid, brandName: postData.brandName, influencerId,
            status: 'in-progress', createdAt: serverTimestamp(), submissions: []
        };

        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'works')), workData);
        batch.update(postRef, { status: 'in-progress', hiredInfluencerId: influencerId });
        batch.update(doc(db, 'proposals', proposalId), { status: 'accepted' });
        
        try {
            await batch.commit();
            alert('Influencer hired successfully!');
            await loadBrandInbox();
            selectJob(postId, 'in-progress');
        } catch(error){
            console.error("DEBUG: hireInfluencer -> CRITICAL ERROR:", error);
            alert("Failed to hire influencer.");
        }
    };

/**
 * Approves a completed work, updates its status, AND updates the influencer's balance.
 * This function is now responsible for the payment release logic.
 * It's attached to the 'window' object to be callable from inline HTML onclick.
 */
window.approveWork = async (workId) => {
    if (!confirm('Are you sure you want to approve this submission and release payment? This action is final.')) return;
    
    const approveBtn = document.querySelector(`button[onclick="window.approveWork('${workId}')"]`);
    if (approveBtn) {
        approveBtn.disabled = true;
        approveBtn.textContent = 'Processing...';
    }

    const workRef = doc(db, 'works', workId);

    try {
        // --- Step 1: Get the work details ---
        const workDoc = await getDoc(workRef);
        if (!workDoc.exists()) {
            throw new Error("Work document not found. It may have been deleted.");
        }
        const workData = workDoc.data();
        
        const influencerId = workData.influencerId;
        const budget = Number(workData.budget) || 0;

        if (!influencerId || budget <= 0) {
            throw new Error("Work data is incomplete (missing influencerId or budget).");
        }
        
        // --- Step 2: Calculate the profit ---
        const profit = budget * 0.90; // 90% profit
        console.log(`DEBUG: Calculated profit to add: ৳${profit}`);

        // --- Step 3: Get the influencer's user document ---
        const influencerRef = doc(db, 'users', influencerId);
        const influencerDoc = await getDoc(influencerRef);

        if (!influencerDoc.exists()) {
            throw new Error(`Influencer with ID ${influencerId} not found.`);
        }
        
        const currentBalance = Number(influencerDoc.data().influencerBalance) || 0;
        const newBalance = currentBalance + profit;

        // --- Step 4: Use a Batched Write to update everything at once ---
        // This ensures that either both updates succeed, or both fail.
        const batch = writeBatch(db);
        
        // Operation 1: Update the work status
        batch.update(workRef, { 
            status: 'completed', 
            approvedAt: serverTimestamp() 
        });

        // Operation 2: Update the influencer's balance
        batch.update(influencerRef, { 
            influencerBalance: newBalance 
        });
        
        // Commit the batch
        await batch.commit();
        
        console.log(`SUCCESS: Balance updated for ${influencerId}. Old: ৳${currentBalance}, New: ৳${newBalance}`);
        alert('Work approved! Influencer\'s balance has been updated.');
        
        // Refresh the UI
        selectJob(workData.postId, 'completed');

    } catch (error) {
        console.error("Error approving work:", error);
        alert(`Failed to approve work: ${error.message}`);
        if (approveBtn) {
            approveBtn.disabled = false;
            approveBtn.textContent = 'Approve & Release Payment';
        }
    }
};


});
