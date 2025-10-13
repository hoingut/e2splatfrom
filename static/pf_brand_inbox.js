// static/pf_brand_inbox.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    writeBatch, 
    updateDoc,
    limit,
    serverTimestamp// <--- এই লাইনটি যোগ করা হয়েছে
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// ... (আপনার বাকি সব কোড আগের মতোই থাকবে)
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsContent = getElement('details-content');
    
    let currentUser = null;

    // --- Authentication Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadBrandInbox();
        } else {
            window.location.href = `/login?redirect=/pf/brand/inbox`;
        }
    });

    /**
     * Fetches all job posts created by the current brand.
     */
    async function loadBrandInbox() {
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                jobPostsList.innerHTML = `<p class="text-gray-500">You have no active job posts.</p>`;
            } else {
                jobPostsList.innerHTML = snapshot.docs.map(doc => createJobPostItem(doc.id, doc.data())).join('');
            }

            loadingContainer.classList.add('hidden');
            inboxContent.classList.remove('hidden');

        } catch (error) {
            console.error("Error loading brand inbox:", error);
            jobPostsList.innerHTML = `<p class="text-red-500">Failed to load job posts.</p>`;
        }
    }

    function createJobPostItem(postId, post) {
        return `
            <div id="job-${postId}" onclick="selectJob('${postId}', '${post.status}')" class="p-3 rounded-md cursor-pointer border-2 border-transparent hover:bg-gray-800">
                <h4 class="font-semibold">${post.title}</h4>
                <p class="text-xs text-gray-400 capitalize">${post.status.replace('-', ' ')}</p>
            </div>
        `;
    }

    /**
     * Main function to handle job selection and display relevant details.
     */
    window.selectJob = async (postId, status) => {
        // Highlight selected job
        document.querySelectorAll('[id^="job-"]').forEach(el => el.classList.remove('bg-mulberry', 'text-white'));
        getElement(`job-${postId}`).classList.add('bg-mulberry', 'text-white');
        
        detailsContent.innerHTML = `<p class="py-16 text-center">Loading details...</p>`;

        if (status === 'open-for-proposals') {
            await displayProposals(postId);
        } else { // 'in-progress', 'completed', etc.
            await displayWorkDetails(postId);
        }
    };
    
    /**
     * Fetches and displays proposals for a selected job post.
     */
// pf_brand_inbox.js -> displayProposals()
async function displayProposals(postId) {
    const proposalsRef = collection(db, 'proposals');
    
    // **FIX**: Query by brandId (which is the current user's ID) AND postId
    const q = query(
        proposalsRef, 
        where("brandId", "==", currentUser.uid),
        where("postId", "==", postId),
        where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    // ... (বাকি কোড আগের মতোই)

        if (snapshot.empty) {
            detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Proposals</h3><p class="text-gray-500">No pending proposals for this job yet.</p>`;
            return;
        }

        const proposalPromises = snapshot.docs.map(async (propDoc) => {
            const proposal = { id: propDoc.id, ...propDoc.data() };
            const userRef = doc(db, 'users', proposal.influencerId);
            const userSnap = await getDoc(userRef);
            proposal.influencerData = userSnap.data();
            return proposal;
        });

        const proposals = await Promise.all(proposalPromises);

        let proposalsHTML = `<h3 class="text-xl font-semibold mb-4">Proposals Received (${proposals.length})</h3><div class="space-y-4">`;
        proposalsHTML += proposals.map(p => {
            const profile = p.influencerData.influencerApplication.page;
            return `
                <div class="bg-gray-800 p-4 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <img src="${profile.pageProfilePicUrl}" class="w-10 h-10 rounded-full">
                            <div>
                                <a href="/pf/influencer/${p.influencerId}" target="_blank" class="font-bold hover:underline">${profile.pageName}</a>
                                <p class="text-xs text-gray-400">${profile.followers.toLocaleString()} Followers</p>
                            </div>
                        </div>
                        <button onclick="hireInfluencer('${p.id}', '${p.influencerId}', '${postId}')" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md text-sm">Hire</button>
                    </div>
                    <p class="text-sm text-gray-300 mt-3 border-t border-dark pt-3">${p.coverLetter}</p>
                </div>`;
        }).join('');
        proposalsHTML += `</div>`;
        detailsContent.innerHTML = proposalsHTML;
    }

    /**
     * Displays the details and progress of a work that is 'in-progress' or 'completed'.
     */
    // static/pf_brand_inbox.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Displays the details and progress of a work that is 'in-progress' or 'completed'.
 * THIS IS THE UPDATED AND BUG-FREE FUNCTION.
 */
async function displayWorkDetails(postId) {
    try {
        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("postId", "==", postId), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            detailsContent.innerHTML = `<p class="text-gray-500">Work details not yet available for this post.</p>`;
            return;
        }
        
        const workDoc = snapshot.docs[0];
        const work = { id: workDoc.id, ...workDoc.data() };
        
        let workHTML = `<h3 class="text-xl font-semibold mb-4">Work Progress</h3>`;
        workHTML += `<p>Status: <span class="font-bold capitalize">${work.status.replace('-', ' ')}</span></p>`;
        
        // --- THIS IS THE KEY FIX ---
        // Check if submissions exist and the array is not empty.
        if (work.submissions && work.submissions.length > 0) {
            const lastSubmission = work.submissions[work.submissions.length - 1];
            
            workHTML += `
                <div class="mt-4 border-t border-dark pt-4">
                    <h4 class="font-semibold">Latest Submission from Influencer:</h4>
                    <p class="text-sm text-gray-300 my-2 bg-gray-800 p-3 rounded-md">Note: "${lastSubmission.note || 'No note provided.'}"</p>
            `;

            if (lastSubmission.screenshotUrl) {
                workHTML += `<a href="${lastSubmission.screenshotUrl}" target="_blank" class="text-blue-400 hover:underline">View Submission Screenshot/Link</a>`;
            }

            // Show the "Approve" button only if the work is submitted for review.
            if (work.status === 'submitted-for-review') {
                workHTML += `
                    <div class="mt-4">
                        <button onclick="window.approveWork('${work.id}')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Approve & Release Payment</button>
                    </div>
                `;
            }
            workHTML += `</div>`;
        } 
        else if (work.status === 'in-progress') {
             workHTML += `<p class="mt-4 text-yellow-400">Waiting for the influencer to start and submit the work.</p>`;
        }
        
        if (work.status === 'completed') {
             workHTML += `<p class="mt-4 text-green-400 font-semibold">This collaboration is complete. Payment has been released.</p>`;
        }
        
        detailsContent.innerHTML = workHTML;

    } catch (error) {
        console.error("Error displaying work details:", error);
        detailsContent.innerHTML = `<p class="text-red-500">Could not load work details.</p>`;
    }
}

// ... (ফাইলের বাকি অংশ আগের মতোই থাকবে)

    /**
     * Hires an influencer, creating a 'work' document and updating post/proposal statuses.
     */
    window.hireInfluencer = async (proposalId, influencerId, postId) => {
        if (!confirm('Are you sure you want to hire this influencer? This will create a formal work contract.')) return;
        
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);
        const postData = postSnap.data();

        const workData = {
            postId: postId,
            title: postData.title,
            description: postData.description,
            budget: postData.budget,
            brandId: currentUser.uid,
            brandName: postData.brandName,
            influencerId: influencerId,
            status: 'in-progress',
            createdAt: serverTimestamp(),
            submissions: []
        };

        const batch = writeBatch(db);
        batch.set(doc(collection(db, 'works')), workData); // Create new work
        batch.update(postRef, { status: 'in-progress', hiredInfluencerId: influencerId }); // Update post
        batch.update(doc(db, 'proposals', proposalId), { status: 'accepted' }); // Update proposal
        
        try {
            await batch.commit();
            alert('Influencer hired successfully! The work is now in progress.');
            await loadBrandInbox(); // Refresh the list
            selectJob(postId, 'in-progress'); // Show the updated work details
        } catch(error){
            console.error("Error hiring influencer:", error);
            alert("Failed to hire influencer.");
        }
    };
    
    /**
     * Approves a completed work and marks it as 'completed'.
     */
  // static/pf_brand_inbox.js

// ... (ফাইলের উপরের অংশ এবং hireInfluencer ফাংশন আগের মতোই থাকবে)

/**
 * Approves a completed work, marks its status as 'completed', and releases payment.
 * This function is attached to the 'window' object to be callable from inline HTML onclick.
 */
window.approveWork = async (workId) => {
    if (!confirm('Are you sure you want to approve this submission and release the payment? This action is final.')) return;
    
    // Find the button and show a loading state (optional but good UX)
    const detailsPanel = document.getElementById('details-content');
    const approveBtn = detailsPanel.querySelector(`button[onclick="window.approveWork('${workId}')"]`);
    if(approveBtn) {
        approveBtn.disabled = true;
        approveBtn.textContent = 'Approving...';
    }
    
    const workRef = doc(db, 'works', workId);
    try {
        await updateDoc(workRef, { 
            status: 'completed',
            approvedAt: serverTimestamp() // Add an approval timestamp
        });
        
        alert('Work approved successfully! Payment will be released to the influencer automatically by the server.');
        
        // Refresh the view to show the 'completed' status
        // Find the post ID associated with this work to re-select it
        const workDoc = await getDoc(workRef);
        if(workDoc.exists()) {
            const postId = workDoc.data().postId;
            // Highlight the job post again
            document.getElementById(`job-${postId}`).click();
        }

    } catch (error) {
        console.error("Error approving work:", error);
        alert("Failed to approve work. Please try again.");
        if(approveBtn) {
            approveBtn.disabled = false;
            approveBtn.textContent = 'Approve & Release Payment';
        }
    }
};
});
