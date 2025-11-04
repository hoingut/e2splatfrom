// static/pf_brand_inbox_inf.js
// Dedicated script for Proposal Management (Brand's Job Posts only)

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    updateDoc, serverTimestamp, setDoc, orderBy 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js"; // Using v9.6.1 as requested

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsContent = getElement('details-content');
    
    // --- State Management ---
    let currentUser = null;
    let currentBrandPosts = []; 

    // =================================================================
    // SECTION A: INITIALIZATION & DATA FETCHING
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            
            // --- DEBUG: Check DB object before calling collection() ---
            console.log("[DEBUG] Firestore DB Object Status:", db ? "Ready" : "Undefined/Error");
            // --------------------------------------------------------
            
            if (!db) {
                 console.error("CRITICAL ERROR: Firestore 'db' object is undefined. Check firebaseConfig.js export.");
                 loadingContainer.innerHTML = `<p class="text-red-500 py-8">CRITICAL ERROR: Database connection failed. Check console.</p>`;
                 return;
            }
            
            inboxContent.classList.remove('hidden');
            loadingContainer.classList.add('hidden');
            await fetchAllJobPosts(); 
        } else {
            window.location.href = `/login?redirect=/pf/brand/inbox/inf`;
        }
    });

    /**
     * Fetches ONLY the Brand's own Job Posts (posts collection).
     */
    async function fetchAllJobPosts() {
        jobPostsList.innerHTML = `<p class="text-center text-gray-500 text-sm">Loading...</p>`;
        
        try {
            // FIX: This line should be fine IF db is correctly exported from firebaseConfig.js
            const postsRef = collection(db, 'posts'); 
            
            // Query: Fetch all posts authored by the current user (relying on client-side filter for postType absence)
            const jobQuery = query(postsRef, 
                where("authorId", "==", currentUser.uid),
                orderBy("createdAt", "desc")
            );
            const jobSnapshot = await getDocs(jobQuery);
            
            // Filter client-side: Assume posts without 'postType' are brand jobs
            currentBrandPosts = jobSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data(), type: 'job' }))
                .filter(post => post.postType === 'brand_job' || !post.postType); 

            renderJobPostList(currentBrandPosts);

        } catch (error) {
            console.error("Error fetching job posts:", error);
            // Re-throw the original error code for visibility
            if (error.code === 'invalid-argument') {
                 console.error("FIX REQUIRED: The 'db' object passed to collection() is incorrect.");
            }
            jobPostsList.innerHTML = `<p class="text-red-500 text-sm">Failed to load job posts: ${error.message}</p>`;
        }
    }

    // =================================================================
    // SECTION B: RENDERING & UI UPDATES
    // =================================================================
    
    function getStatusBadge(status) {
        const statuses = {
            'pending-admin-approval': { text: 'PENDING APPROVAL', color: 'bg-yellow-800 text-yellow-300' },
            'open-for-proposals': { text: 'ACTIVE', color: 'bg-green-600 text-white' },
            'verified': { text: 'VERIFIED', color: 'bg-green-600 text-white' }, 
            'job': { text: 'JOB POST', color: 'bg-gray-700 text-gray-300' }
        };
        const badge = statuses[status] || statuses['job'];
        return `<span class="px-3 py-1 text-xs font-semibold rounded-full ${badge.color}">${badge.text}</span>`;
    }

    function renderJobPostList(items) {
        if (items.length === 0) {
            detailsContent.innerHTML = `<i class="fas fa-info-circle text-3xl mb-4"></i><p>You haven't posted any jobs yet. Post a new job from your dashboard.</p>`;
            jobPostsList.innerHTML = `<p class="text-center text-gray-500 text-sm py-8">No active jobs found.</p>`;
            return;
        }

        jobPostsList.innerHTML = items.map(item => {
            const statusType = item.status || 'job';
            const subText = item.status === 'open-for-proposals' || item.status === 'verified' ? `Active` : `Status: ${statusType}`;
            
            return `
                <div data-id="${item.id}" data-type="job" class="job-item p-3 rounded-lg cursor-pointer transition hover:bg-gray-800 border-b border-dark last:border-b-0">
                    <p class="font-semibold text-white">${item.title}</p>
                    <p class="text-xs text-gray-400">${subText}</p>
                    <div class="mt-1 text-xs text-right">${getStatusBadge(statusType)}</div>
                </div>
            `;
        }).join('');
    }
    
    // --- Job Management Details (Proposals) ---
    async function renderJobManagementDetails(jobId) {
        const job = currentBrandPosts.find(j => j.id === jobId);
        if (!job) return;

        console.log(`[JOB MGT] Loading proposals for Job ID: ${jobId}`);
        
        detailsContent.innerHTML = `<h2 class="text-2xl font-bold mb-4">${job.title} Management</h2>
                                    <p class="text-center text-gray-500 py-4">Loading proposals...</p>`;
        
        try {
            // Fetch Proposals: Only load PENDING ones that require brand action
            const proposalsRef = collection(db, 'proposals');
            
            const proposalQuery = query(proposalsRef, 
                where("postId", "==", jobId), 
                where("status", "==", "pending"), 
                orderBy("createdAt", "desc")
            );
            const proposalSnapshot = await getDocs(proposalQuery);
            const proposals = proposalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`[JOB MGT] Successfully loaded ${proposals.length} pending proposals.`);

            // --- Render Job Details ---
            let html = `
                <div class="mt-4 p-4 bg-gray-800 rounded-lg mb-6">
                    <p class="font-semibold text-white">Budget: ৳${job.budget.toLocaleString()} | Status: ${getStatusBadge(job.status || 'open-for-proposals')}</p>
                </div>
                
                <h3 class="text-xl font-semibold mt-6 border-b border-dark pb-2">Pending Proposals (${proposals.length})</h3>
                <div id="proposals-list" class="space-y-4 mt-3">
                    ${proposals.length > 0 ? proposals.map(p => createProposalCard(p, job)).join('') : '<p class="text-gray-500">No new proposals requiring action.</p>'}
                </div>
            `;
            detailsContent.innerHTML = html;

        } catch (error) {
            console.error("[JOB MGT ERROR] Failed to fetch proposals:", error);
            
            let errorMessage = "Failed to load proposals.";
            if (error.code === 'permission-denied') {
                errorMessage = "ERROR: Permission Denied. Check Security Rules.";
            } else if (error.message.includes("requires an index")) {
                errorMessage = `ERROR: Firestore Indexing required for postId + status filter. Check console (F12) for the creation link.`;
            }

            detailsContent.innerHTML = `
                <div class="text-red-500 bg-red-900/20 p-4 rounded-lg mt-3">
                    <p class="font-bold">${errorMessage}</p>
                    <p class="text-sm text-gray-400 mt-2">Details: ${error.message}</p>
                </div>`;
        }
    }
    
    function createProposalCard(proposal, job) {
        const displayBudget = (proposal.proposedBudget || job.budget).toLocaleString();
        
        return `
            <div class="bg-gray-800 p-4 rounded-lg flex justify-between items-start border border-gray-700">
                <div class="flex-grow">
                    <p class="font-semibold text-lg text-white">${proposal.influencerName || 'Influencer'}</p>
                    <p class="text-sm text-gray-400">Proposed Budget: <span class="text-yellow-400">৳${displayBudget}</span></p>
                    <p class="text-xs text-gray-500 mt-2">Note: ${proposal.note || 'N/A'}</p>
                </div>
                <div class="flex flex-col space-y-2 ml-4">
                    <a href="/pf/influencer/${proposal.influencerId}" target="_blank" class="text-xs text-mulberry hover:underline">View Profile</a>
                    <button data-proposal-id="${proposal.id}" data-action="accept-proposal" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">Accept</button>
                    <button data-proposal-id="${proposal.id}" data-action="reject-proposal" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">Reject</button>
                </div>
            </div>
        `;
    }

    // =================================================================
    // SECTION C: PROPOSAL ACTION HANDLERS
    // =================================================================
    
    async function handleProposalAction(proposalId, action) {
        if (!confirm(`Are you sure you want to ${action.toUpperCase()} this proposal?`)) return;

        try {
            const proposalRef = doc(db, 'proposals', proposalId);
            const proposalSnap = await getDoc(proposalRef);
            if (!proposalSnap.exists()) throw new Error("Proposal not found.");
            const proposal = proposalSnap.data();
            const jobId = proposal.postId; 

            // 1. Update Proposal Status
            await updateDoc(proposalRef, { status: action === 'accept' ? 'accepted' : 'rejected' });
            
            if (action === 'accept') {
                // 2. Create a NEW WORK CONTRACT (pending brand payment)
                const newWorkRef = doc(collection(db, 'works'));
                
                const workContractData = {
                    postId: proposal.postId,
                    title: proposal.jobTitle || 'Job Contract',
                    budget: proposal.proposedBudget || proposal.jobBudget,
                    createdAt: serverTimestamp(),
                    
                    // Participants
                    brandId: currentUser.uid,
                    brandName: proposal.brandName || currentUser.displayName || currentUser.email,
                    influencerId: proposal.influencerId,
                    influencerName: proposal.influencerName,
                    
                    // Status: Payment required from brand
                    payment: { status: 'required', amount: proposal.proposedBudget || proposal.jobBudget }, 
                    status: 'pending-brand-payment', 
                    
                    // Details
                    contentTypes: proposal.contentTypes || [],
                    platforms: proposal.platforms || [],
                };

                await setDoc(newWorkRef, workContractData);
                
                alert("Proposal Accepted! Contract generated. You must now make the payment (outside this interface) to activate the contract.");
            } else {
                alert("Proposal rejected.");
            }

            // Refresh the view
            await fetchAllJobPosts(); 
            renderJobManagementDetails(jobId); 

        } catch (error) {
            console.error("Proposal action failed:", error);
            alert(`Action failed: ${error.message}. Check console.`);
        }
    }


    // =================================================================
    // SECTION D: EVENT LISTENERS (DELEGATION FIX)
    // =================================================================
    
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        
        // 1. Check for Job Item Click (Left Column)
        const jobItem = target.closest('.job-item');
        if (jobItem && jobPostsList.contains(jobItem)) { 
            document.querySelectorAll('.job-item').forEach(i => i.classList.remove('selected'));
            jobItem.classList.add('selected');
            
            const id = jobItem.dataset.id;
            
            renderJobManagementDetails(id); 
            return;
        }
        
        // 2. Check for Proposal Actions (Accept/Reject)
        const proposalTarget = target.closest('button[data-action="accept-proposal"], button[data-action="reject-proposal"]');
        if (proposalTarget) {
            handleProposalAction(proposalTarget.dataset.proposalId, proposalTarget.dataset.action.split('-')[0]);
            return;
        }

        // 3. Check for Logout
        if (target.id === 'logout-btn' || target.closest('#logout-btn')) {
            signOut(auth).then(() => {
                window.location.href = '/pf';
            });
            return;
        }
    });

});
