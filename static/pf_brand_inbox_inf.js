// static/pf_brand_inbox_inf.js
// Dedicated script for Proposal Management (Brand's Job Posts only)

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    updateDoc, serverTimestamp, setDoc, orderBy 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

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
    // We only need currentBrandPosts as this inbox focuses only on Job Posts

    // =================================================================
    // SECTION A: INITIALIZATION & DATA FETCHING
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
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
            const postsRef = collection(db, 'posts');
            const jobQuery = query(postsRef, 
                where("authorId", "==", currentUser.uid),
                where("postType", "==", "brand_job"), 
                orderBy("createdAt", "desc")
            );
            const jobSnapshot = await getDocs(jobQuery);
            currentBrandPosts = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'job' }));

            renderJobPostList(currentBrandPosts);

        } catch (error) {
            console.error("Error fetching job posts:", error);
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
            'job': { text: 'JOB POST', color: 'bg-gray-700 text-gray-300' }
        };
        const badge = statuses[status] || statuses['job'];
        return `<span class="px-3 py-1 text-xs font-semibold rounded-full ${badge.color}">${badge.text}</span>`;
    }

    function getProposalStatusClass(status) {
        if (status === 'accepted') return 'proposal-status-accepted';
        if (status === 'rejected') return 'proposal-status-rejected';
        return 'proposal-status-pending';
    }


    function renderJobPostList(items) {
        if (items.length === 0) {
            detailsContent.innerHTML = `<i class="fas fa-info-circle text-3xl mb-4"></i><p>You haven't posted any jobs yet. Post a new job from your dashboard.</p>`;
            jobPostsList.innerHTML = `<p class="text-center text-gray-500 text-sm py-8">No active jobs found.</p>`;
            return;
        }

        jobPostsList.innerHTML = items.map(item => {
            const statusType = item.status || 'job';
            const subText = item.status === 'open-for-proposals' ? `Active` : `Status: ${statusType}`;
            
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
            // Fetch Proposals: Filter by JobId (No status filter initially, load all related proposals)
            const proposalsRef = collection(db, 'proposals');
            const proposalQuery = query(proposalsRef, 
                where("postId", "==", jobId), 
                orderBy("createdAt", "desc")
            );
            const proposalSnapshot = await getDocs(proposalQuery);
            const proposals = proposalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`[JOB MGT] Loaded ${proposals.length} total proposals.`);

            // Filter for Pending Proposals to show them first
            const pendingProposals = proposals.filter(p => p.status === 'pending' || !p.status); 
            const processedProposals = proposals.filter(p => p.status !== 'pending' && p.status);


            let html = `
                <div class="mt-4 p-4 bg-gray-800 rounded-lg mb-6">
                    <p class="font-semibold text-white">Budget: ৳${job.budget.toLocaleString()} | Status: ${getStatusBadge(job.status || 'open-for-proposals')}</p>
                </div>
                
                <h3 class="text-xl font-semibold mt-6 border-b border-dark pb-2">Pending Proposals (${pendingProposals.length})</h3>
                <div id="proposals-list-pending" class="space-y-4 mt-3">
                    ${pendingProposals.length > 0 ? pendingProposals.map(p => createProposalCard(p, job)).join('') : '<p class="text-gray-500">No new proposals requiring action.</p>'}
                </div>

                <h3 class="text-xl font-semibold mt-6 border-b border-dark pb-2">Processed Proposals (${processedProposals.length})</h3>
                <div id="proposals-list-processed" class="space-y-4 mt-3">
                    ${processedProposals.length > 0 ? processedProposals.map(p => createProposalCard(p, job, true)).join('') : '<p class="text-gray-500">No processed proposals.</p>'}
                </div>
            `;
            detailsContent.innerHTML = html;

        } catch (error) {
            console.error("[JOB MGT ERROR] Failed to fetch proposals:", error);
            
            let errorMessage = "Failed to load proposals.";
            if (error.message.includes("requires an index")) {
                 errorMessage = `ERROR: Indexing required. Check console (F12) for link.`;
            }

            detailsContent.innerHTML = `
                <div class="text-red-500 bg-red-900/20 p-4 rounded-lg mt-3">
                    <p class="font-bold">${errorMessage}</p>
                    <p class="text-sm text-gray-400 mt-2">Details: ${error.message}</p>
                </div>`;
        }
    }
    
    function createProposalCard(proposal, job, isProcessed = false) {
        const displayBudget = (proposal.proposedBudget || job.budget).toLocaleString();
        const statusClass = getProposalStatusClass(proposal.status);
        const disabledAttr = isProcessed ? 'disabled' : '';

        return `
            <div class="bg-gray-800 p-4 rounded-lg flex justify-between items-start border border-gray-700">
                <div class="flex-grow">
                    <p class="font-semibold text-lg text-white">${proposal.influencerName || 'Influencer'}</p>
                    <p class="text-sm text-gray-400">Proposed Budget: <span class="text-yellow-400">৳${displayBudget}</span></p>
                    <p class="text-xs text-gray-500 mt-2">Note: ${proposal.note || 'N/A'}</p>
                    <p class="text-xs ${statusClass} font-semibold mt-1">Status: ${proposal.status.toUpperCase() || 'PENDING'}</p>
                </div>
                <div class="flex flex-col space-y-2 ml-4">
                    <a href="/pf/influencer/${proposal.influencerId}" target="_blank" class="text-xs text-mulberry hover:underline">View Profile</a>
                    
                    ${!isProcessed ? `
                        <button data-proposal-id="${proposal.id}" data-action="accept-proposal" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs">Accept</button>
                        <button data-proposal-id="${proposal.id}" data-action="reject-proposal" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs">Reject</button>
                    ` : `
                        <button disabled class="bg-gray-700 text-gray-400 px-3 py-1 rounded text-xs">Processed</button>
                    `}
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
                    brandId: currentUser.uid,
                    brandName: proposal.brandName || currentUser.displayName || currentUser.email,
                    influencerId: proposal.influencerId,
                    influencerName: proposal.influencerName,
                    payment: { status: 'required', amount: workContractData.budget }, 
                    status: 'pending-brand-payment', 
                    // Add other details needed for the work contract
                    contentTypes: proposal.contentTypes || [],
                    platforms: proposal.platforms || [],
                };

                await setDoc(newWorkRef, workContractData);
                
                alert("Proposal Accepted! Contract generated. Brand must pay to activate.");
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
        if (jobItem && jobPostsList.contains(jobItem)) { // Ensure click is within the job list
            document.querySelectorAll('.job-item').forEach(i => i.classList.remove('selected'));
            jobItem.classList.add('selected');
            
            const id = jobItem.dataset.id;
            
            // This inbox only handles 'job' type
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
