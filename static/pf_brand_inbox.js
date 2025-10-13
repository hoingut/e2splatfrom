// static/pf_brand_inbox.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    orderBy, writeBatch, updateDoc, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsContent = getElement('details-content');
    
    let currentUser = null;

    // --- Authentication & Role Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            // You can add a role check here to redirect non-brands
            await loadBrandInbox();
        } else {
            window.location.href = `/login?redirect=/pf/brand/inbox`;
        }
    });

    /**
     * Fetches all job posts created by the current brand and renders them.
     */
    async function loadBrandInbox() {
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                jobPostsList.innerHTML = `<p class="text-gray-500 p-4">You have not posted any jobs yet.</p>`;
            } else {
                jobPostsList.innerHTML = snapshot.docs.map(doc => createJobPostItem(doc.id, doc.data())).join('');
            }

            loadingContainer.classList.add('hidden');
            inboxContent.classList.remove('hidden');

        } catch (error) {
            console.error("Error loading brand inbox:", error);
            jobPostsList.innerHTML = `<p class="text-red-500 p-4">Failed to load job posts. Ensure Firestore indexes are created.</p>`;
        }
    }

    function createJobPostItem(postId, post) {
        return `
            <div id="job-${postId}" onclick="window.selectJob('${postId}', '${post.status}')" class="p-3 rounded-md cursor-pointer border-2 border-transparent hover:bg-gray-800">
                <h4 class="font-semibold">${post.title}</h4>
                <p class="text-xs text-gray-400 capitalize">${post.status.replace('-', ' ')}</p>
            </div>
        `;
    }

    /**
     * Main handler for selecting a job. It's attached to the window object to be globally accessible.
     */
    window.selectJob = async (postId, status) => {
        document.querySelectorAll('[id^="job-"]').forEach(el => el.classList.remove('bg-mulberry', 'text-white'));
        getElement(`job-${postId}`).classList.add('bg-mulberry', 'text-white');
        detailsContent.innerHTML = `<p class="py-16 text-center text-gray-400">Loading details...</p>`;

        if (status === 'open-for-proposals') {
            await displayProposals(postId);
        } else { // 'in-progress', 'completed', 'submitted-for-review', etc.
            await displayWorkDetails(postId);
        }
    };
    
    /**
     * Fetches and displays proposals for a selected job post.
     */
    async function displayProposals(postId) {
        try {
            const proposalsRef = collection(db, 'proposals');
            const q = query(proposalsRef, where("brandId", "==", currentUser.uid), where("postId", "==", postId), where("status", "==", "pending"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Proposals</h3><p class="text-gray-500">No pending proposals for this job yet.</p>`;
                return;
            }

            const proposalPromises = snapshot.docs.map(async (propDoc) => {
                const proposal = { id: propDoc.id, ...propDoc.data() };
                const userRef = doc(db, 'users', proposal.influencerId);
                const userSnap = await getDoc(userRef);
                if(userSnap.exists()){
                    proposal.influencerData = userSnap.data();
                }
                return proposal;
            });

            const proposals = await Promise.all(proposalPromises);

            let proposalsHTML = `<h3 class="text-xl font-semibold mb-4">Proposals Received (${proposals.length})</h3><div class="space-y-4">`;
            proposalsHTML += proposals.map(p => {
                if (!p.influencerData?.influencerApplication?.page) return ''; // Safety check
                const profile = p.influencerData.influencerApplication.page;
                return `
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <img src="${profile.pageProfilePicUrl || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover">
                                <div>
                                    <a href="/pf/influencer/${p.influencerId}" target="_blank" class="font-bold hover:underline">${profile.pageName}</a>
                                    <p class="text-xs text-gray-400">${(profile.followers || 0).toLocaleString()} Followers</p>
                                </div>
                            </div>
                            <button onclick="window.hireInfluencer('${p.id}', '${p.influencerId}', '${postId}')" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md text-sm">Hire</button>
                        </div>
                        <p class="text-sm text-gray-300 mt-3 border-t border-dark pt-3">${p.coverLetter}</p>
                    </div>`;
            }).join('');
            proposalsHTML += `</div>`;
            detailsContent.innerHTML = proposalsHTML;
        } catch (error) {
            console.error("Error displaying proposals:", error);
            detailsContent.innerHTML = `<p class="text-red-500">Could not load proposals. Ensure Firestore indexes are set up correctly.</p>`;
        }
    }

    /**
     * Displays the details and progress of an ongoing or completed work.
     */
// static/pf_brand_inbox.js

// ... (ফাইলের উপরের অংশ এবং অন্যান্য ফাংশন আগের মতোই থাকবে)

/**
 * Displays the details and progress of an ongoing or completed work.
 * THIS IS THE UPDATED AND BUG-FREE FUNCTION.
 */
async function displayWorkDetails(postId) {
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
        
        // --- THIS IS THE KEY FIX ---
        // Fetch influencer details to show in the progress panel
        const influencerRef = doc(db, 'users', work.influencerId);
        const influencerSnap = await getDoc(influencerRef);
        const influencerName = influencerSnap.exists() ? influencerSnap.data().name : 'Unknown Influencer';

        let workHTML = `
            <h3 class="text-xl font-semibold mb-4">Work Progress</h3>
            <p class="text-sm text-gray-400">Influencer: <strong class="text-white">${influencerName}</strong></p>
            <p class="mb-4">Status: <span class="font-bold capitalize text-yellow-400">${work.status.replace('-', ' ')}</span></p>
        `;
        
        // Check if submissions exist and the array is not empty.
        if (work.submissions && work.submissions.length > 0) {
            // Find the latest submission of type 'completed' (or the very last one)
            const lastSubmission = work.submissions.filter(s => s.type === 'completed').pop() || work.submissions[work.submissions.length - 1];
            
            workHTML += `
                <div class="mt-4 border-t border-dark pt-4">
                    <h4 class="font-semibold text-white">Latest Submission from Influencer:</h4>
                    <p class="text-sm text-gray-300 my-2 bg-gray-800 p-3 rounded-md">Note: "${lastSubmission.note || 'No note provided.'}"</p>
            `;

            if (lastSubmission.screenshotUrl) {
                workHTML += `<a href="${lastSubmission.screenshotUrl}" target="_blank" class="text-blue-400 hover:underline">View Submission Screenshot/Link</a>`;
            }

            // Show the "Approve" button ONLY if the work is submitted for review.
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
             workHTML += `<p class="mt-4 text-yellow-400">Waiting for the influencer to make their first submission.</p>`;
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
     * Hires an influencer. Attached to the window object.
     */
    window.hireInfluencer = async (proposalId, influencerId, postId) => {
        if (!confirm('Are you sure you want to hire this influencer? This will create a work contract.')) return;
        
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
            console.error("Error hiring influencer:", error);
            alert("Failed to hire influencer.");
        }
    };
    
    /**
     * Approves a completed work. Attached to the window object.
     */
    window.approveWork = async (workId) => {
        if (!confirm('Are you sure you want to approve this submission and release payment?')) return;
        
        const workRef = doc(db, 'works', workId);
        try {
            await updateDoc(workRef, { status: 'completed', approvedAt: serverTimestamp() });
            alert('Work approved! Payment will be released automatically.');
            const workDoc = await getDoc(workRef);
            if(workDoc.exists()) {
                selectJob(workDoc.data().postId, 'completed');
            }
        } catch (error) {
            console.error("Error approving work:", error);
            alert("Failed to approve work.");
        }
    };

// This is the closing bracket for the 'DOMContentLoaded' event listener.
});
