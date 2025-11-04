// static/pf_brand_inbox.js (Final Executable Version)

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    updateDoc, serverTimestamp, orderBy 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- DOM Elements ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsPanel = getElement('details-panel');
    const detailsContent = getElement('details-content');
    
    // --- State Management ---
    let currentUser = null;
    let currentBrandPosts = [];
    let currentWorkContracts = []; 

    // =================================================================
    // SECTION A: INITIALIZATION & DATA FETCHING
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            inboxContent.classList.remove('hidden');
            loadingContainer.classList.add('hidden');
            await fetchAllBrandData();
        } else {
            window.location.href = `/login?redirect=/pf/brand/inbox`;
        }
    });

    /**
     * Fetches the Brand's own Job Posts and their Work Contracts (Services purchased).
     */
    async function fetchAllBrandData() {
        jobPostsList.innerHTML = `<p class="text-center text-gray-500 text-sm">Loading...</p>`;
        
        try {
            // 1. Fetch Job Posts (Brand is author)
            const postsRef = collection(db, 'posts');
            const jobQuery = query(postsRef, 
                where("authorId", "==", currentUser.uid),
                where("postType", "==", "brand_job"), 
                orderBy("createdAt", "desc")
            );
            const jobSnapshot = await getDocs(jobQuery);
            currentBrandPosts = jobSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'job' }));

            // 2. Fetch Work Contracts (Brand is brandId)
            const worksRef = collection(db, 'works');
            const workQuery = query(worksRef, 
                where("brandId", "==", currentUser.uid),
                orderBy("createdAt", "desc")
            );
            const workSnapshot = await getDocs(workQuery);
            currentWorkContracts = workSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'work' }));

            // Combine and Render
            const combinedList = [...currentWorkContracts, ...currentBrandPosts];
            renderJobPostList(combinedList);

        } catch (error) {
            console.error("Error fetching brand data:", error);
            jobPostsList.innerHTML = `<p class="text-red-500 text-sm">Failed to load data: ${error.message}</p>`;
        }
    }

    // =================================================================
    // SECTION B: RENDERING & UI UPDATES
    // =================================================================
    
    function getStatusBadge(status) {
        const statuses = {
            'pending-payment-verification': { text: 'PAYMENT PENDING', color: 'bg-yellow-800 text-yellow-300' },
            'in-progress': { text: 'IN PROGRESS', color: 'bg-blue-800 text-white' },
            'submitted-for-review': { text: 'NEEDS YOUR REVIEW', color: 'bg-indigo-600 text-white' }, 
            'completed': { text: 'CLOSED / PAID', color: 'bg-green-700 text-white' },
            'rejected': { text: 'REJECTED', color: 'bg-red-700 text-white' },
            'brand_job': { text: 'JOB POST', color: 'bg-gray-700 text-gray-300' }
        };
        const badge = statuses[status] || { text: status.toUpperCase().replace(/-/g, ' '), color: 'bg-gray-800 text-gray-500' };
        return `<span class="px-3 py-1 text-xs font-semibold rounded-full ${badge.color}">${badge.text}</span>`;
    }

    function renderJobPostList(items) {
        if (items.length === 0) {
            jobPostsList.innerHTML = `<p class="text-center text-gray-500 text-sm py-8">No active jobs or purchased services.</p>`;
            return;
        }

        jobPostsList.innerHTML = items.map(item => {
            const isWork = item.type === 'work';
            const statusType = isWork ? item.status : 'brand_job';
            const title = isWork ? `ORDER: ${item.title}` : item.title;
            const subText = isWork ? `Influencer: ${item.influencerName}` : `Proposals: N/A`;
            
            return `
                <div data-id="${item.id}" data-type="${item.type}" class="job-item p-3 rounded-lg cursor-pointer transition hover:bg-gray-800 border-b border-dark last:border-b-0">
                    <p class="font-semibold text-white">${title}</p>
                    <p class="text-xs text-gray-400">${subText}</p>
                    <div class="mt-1 text-xs text-right">${getStatusBadge(statusType)}</div>
                </div>
            `;
        }).join('');
        
        // **IMPORTANT:** No event listeners here. Delegation handles clicks on '.job-item'.
    }
    
    // --- Work Contract Details (Purchased Services) ---
    function renderWorkContractDetails(workId) {
        const work = currentWorkContracts.find(w => w.id === workId);
        if (!work) return;

        detailsContent.innerHTML = `
            <h2 class="text-2xl font-bold mb-4">${work.title}</h2>
            <div class="grid grid-cols-2 gap-4 mb-4 text-sm border-b border-dark pb-4">
                <div><span class="text-gray-400">Influencer:</span> <span class="text-white">${work.influencerName}</span></div>
                <div><span class="text-gray-400">Budget:</span> <span class="text-green-400">৳${work.budget.toLocaleString()}</span></div>
                <div><span class="text-gray-400">Order Date:</span> ${work.createdAt?.toDate().toLocaleDateString() || 'N/A'}</div>
                <div><span class="text-gray-400">Current Status:</span> ${getStatusBadge(work.status)}</div>
            </div>
            
            <h3 class="text-xl font-semibold mt-6 pb-2">Work History & Review</h3>
            <div id="submission-history" class="space-y-4 mt-3">
                ${renderSubmissionHistory(work.submissions)}
            </div>
            
            <div id="review-action-area" class="mt-8">
                ${renderReviewAction(work)}
            </div>
        `;
    }
    
    function renderSubmissionHistory(submissions = []) {
        if (!submissions || submissions.length === 0) return '<p class="text-gray-500 text-sm">No submissions or history yet.</p>';
        
        return submissions.map(sub => {
            const date = sub.timestamp ? (sub.timestamp.toDate ? sub.timestamp.toDate().toLocaleDateString() : new Date(sub.timestamp).toLocaleDateString()) : 'N/A';
            return `
                <div class="bg-gray-800 p-3 rounded-lg border-l-4 border-dark">
                    <p class="text-xs text-gray-400">${sub.type.toUpperCase()} on ${date}</p>
                    <p class="mt-1">${sub.note || 'No note provided.'}</p>
                    ${sub.proofUrl ? `<a href="${sub.proofUrl}" target="_blank" class="text-mulberry text-sm mt-1 block hover:underline">View Proof/Screenshot</a>` : ''}
                </div>
            `;
        }).join('');
    }

    function renderReviewAction(work) {
        if (work.status === 'submitted-for-review') {
            return `
                <h4 class="text-xl font-semibold mb-3 text-white">Review & Finalize Work</h4>
                <div class="flex space-x-3">
                    <button data-work-id="${work.id}" data-review-action="complete" class="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-bold transition">
                        Approve & Pay (Complete)
                    </button>
                    <button data-work-id="${work.id}" data-review-action="reject" class="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-bold transition">
                        Request Revision (Reject)
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-3">Approving will complete the work and mark the budget as paid.</p>
            `;
        } else if (work.status === 'pending-payment-verification') {
             return `<p class="text-yellow-400 text-sm">Waiting for Admin to verify payment (TrxID: ${work.payment.trxId}).</p>`;
        }
        return `<p class="text-gray-500 text-sm">No further action required at this stage.</p>`;
    }

    // --- Job Management Details (Proposals) ---
    async function renderJobManagementDetails(jobId) {
        const job = currentBrandPosts.find(j => j.id === jobId);
        if (!job) return;

        console.log(`[JOB MGT] Loading management details for Job ID: ${jobId}`);
        
        detailsContent.innerHTML = `<h2 class="text-2xl font-bold mb-4">${job.title} Management</h2>
                                    <p class="text-center text-gray-500 py-4">Loading proposals...</p>`;
        
        try {
            // Fetch Proposals for this specific Job ID
            const proposalsRef = collection(db, 'proposals');
            const proposalQuery = query(proposalsRef, 
                where("postId", "==", jobId), 
                orderBy("createdAt", "desc")
            );
            const proposalSnapshot = await getDocs(proposalQuery);
            const proposals = proposalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            console.log(`[JOB MGT] Successfully loaded ${proposals.length} proposals.`);

            // --- Render Job Details ---
            let html = `
                <div class="mt-4 p-4 bg-gray-800 rounded-lg mb-6">
                    <p class="font-semibold text-white">Job Status: ${getStatusBadge(job.status || 'open-for-proposals')}</p>
                    <p class="text-sm text-gray-400 mt-1">Budget: ৳${job.budget.toLocaleString()} | Category: ${job.category}</p>
                </div>
                
                <h3 class="text-xl font-semibold mt-6 border-b border-dark pb-2">Incoming Proposals (${proposals.length})</h3>
                <div id="proposals-list" class="space-y-4 mt-3">
                    ${proposals.length > 0 ? proposals.map(p => createProposalCard(p, job)).join('') : '<p class="text-gray-500">No proposals received yet for this job.</p>'}
                </div>
            `;
            detailsContent.innerHTML = html;

        } catch (error) {
            console.error("[JOB MGT ERROR] Failed to fetch proposals:", error);
            
            let errorMessage = "Failed to load proposals.";
            if (error.code === 'permission-denied') {
                errorMessage = "ERROR: Permission Denied. Cannot read proposals collection. Check Security Rules for 'proposals'.";
            } else if (error.message.includes("requires an index")) {
                errorMessage = `ERROR: Firestore Indexing required for this filter combination. Check console (F12) for the creation link.`;
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
                    <p class="text-xs text-gray-500">Status: ${proposal.status.toUpperCase() || 'PENDING'}</p>
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
    // SECTION C: ACTION HANDLERS (Review and Proposal)
    // =================================================================
    
    // Proposal Accept/Reject Handler
    async function handleProposalAction(proposalId, action) {
        // Implementation from previous response (handling proposal status update and work contract creation)
        if (!confirm(`Are you sure you want to ${action.toUpperCase()} this proposal?`)) return;

        try {
            const proposalRef = doc(db, 'proposals', proposalId);
            const proposalSnap = await getDoc(proposalRef);
            if (!proposalSnap.exists()) throw new Error("Proposal not found.");
            const proposal = proposalSnap.data();
            const jobId = proposal.postId; // Get the original job ID

            // 1. Update Proposal Status
            await updateDoc(proposalRef, { status: action === 'accept' ? 'accepted' : 'rejected' });
            
            if (action === 'accept') {
                // 2. CRITICAL: Create a NEW WORK CONTRACT in the 'works' collection
                const newWorkRef = doc(collection(db, 'works'));
                
                const workContractData = {
                    postId: proposal.postId,
                    title: proposal.jobTitle || 'Custom Collaboration',
                    budget: proposal.proposedBudget || proposal.jobBudget,
                    createdAt: serverTimestamp(),
                    
                    // Participants
                    brandId: currentUser.uid,
                    brandName: proposal.brandName || currentUser.displayName || currentUser.email,
                    influencerId: proposal.influencerId,
                    influencerName: proposal.influencerName,
                    
                    // Initial Status (Brand must pay upfront)
                    payment: { status: 'required' }, 
                    status: 'pending-brand-payment', // New intermediate status
                    
                    // Details
                    contentTypes: proposal.contentTypes,
                    platforms: proposal.platforms,
                };

                await setDoc(newWorkRef, workContractData);
                
                alert("Proposal Accepted! A work contract has been generated. The next step is payment.");
            } else {
                alert("Proposal rejected.");
            }

            // Refresh the view
            await fetchAllBrandData();
            renderJobManagementDetails(jobId); // Re-render the job details page

        } catch (error) {
            console.error("Proposal action failed:", error);
            alert(`Action failed: ${error.message}. Check security rules for 'proposals' and 'works' collections.`);
        }
    }


    // Work Review Handler (Completing/Rejecting Influencer's work submission)
    async function handleWorkReview(workId, action) {
        const workRef = doc(db, 'works', workId);
        let work = currentWorkContracts.find(w => w.id === workId);
        let newStatus = '';
        let confirmMsg = '';

        if (action === 'complete') {
            newStatus = 'completed';
            confirmMsg = `Are you sure you want to COMPLETE this work? Funds will be released securely.`;
        } else if (action === 'reject') {
            newStatus = 'in-progress'; 
            confirmMsg = 'Are you sure you want to REJECT this work and request revision? Status will revert to In Progress.';
        } else {
            return;
        }

        if (!confirm(confirmMsg)) return;

        try {
            await updateDoc(workRef, {
                status: newStatus,
                brandReviewedAt: serverTimestamp(),
            });
            
            alert(`Work status updated to ${newStatus.toUpperCase()}. Funds processing initiated.`);

            await fetchAllBrandData(); 
            detailsContent.innerHTML = `<div class="text-center py-4 text-green-500"><i class="fas fa-check-circle text-2xl"></i><p>Status Updated! Funds are being processed securely.</p></div>`;

        } catch (error) {
            console.error("Error finalizing work:", error);
            alert("Failed to finalize work. Check console and security rules.");
        }
    }


    // =================================================================
    // SECTION D: EVENT LISTENERS (DELEGATION FIX)
    // =================================================================
    
    // Delegation for Review Actions and List Item Clicks
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        
        // 1. Check for Job/Work Item Click (Left Column)
        const jobItem = target.closest('.job-item');
        if (jobItem) {
            // Clear active state and set selection
            document.querySelectorAll('.job-item').forEach(i => i.classList.remove('selected'));
            jobItem.classList.add('selected');
            
            const id = jobItem.dataset.id;
            const type = jobItem.dataset.type;
            
            console.log(`[CLICK] Item clicked: ${type} - ${id}`); // DEBUG LOG
            
            // Execute the corresponding rendering function
            if (type === 'job') {
                renderJobManagementDetails(id); 
            } else if (type === 'work') {
                renderWorkContractDetails(id);
            }
            return; // Stop other handlers from running
        }
        
        // 2. Check for Review Actions (Right Panel: Complete/Reject)
        const reviewTarget = target.closest('button[data-review-action]');
        if (reviewTarget) {
            handleWorkReview(reviewTarget.dataset.workId, reviewTarget.dataset.reviewAction);
            return;
        }

        // 3. Check for Proposal Actions (Right Panel: Accept/Reject Proposal)
        const proposalTarget = target.closest('button[data-action="accept-proposal"], button[data-action="reject-proposal"]');
        if (proposalTarget) {
            handleProposalAction(proposalTarget.dataset.proposalId, proposalTarget.dataset.action.split('-')[0]);
            return;
        }

        // 4. Check for Logout
        const logoutBtn = getElement('logout-btn');
        if (logoutBtn && (target.id === 'logout-btn' || target.closest('#logout-btn'))) {
            signOut(auth).then(() => {
                window.location.href = '/pf';
            });
            return;
        }
    });

});
