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
    
    // --- State Management ---
    let currentUser = null;
    let jobPosts = []; // Store all job posts data

    // =================================================================
    // SECTION A: INITIALIZATION & CORE LOGIC
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadBrandInbox();
        } else {
            window.location.href = `/login?redirect=/pf/brand/inbox`;
        }
    });

    async function loadBrandInbox() {
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);

            jobPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (jobPosts.length === 0) {
                jobPostsList.innerHTML = `<p class="text-gray-500 p-4">You have no job posts.</p>`;
            } else {
                jobPostsList.innerHTML = jobPosts.map(post => createJobPostItem(post)).join('');
            }
            
            loadingContainer.classList.add('hidden');
            inboxContent.classList.remove('hidden');

        } catch (error) {
            console.error("Error loading brand inbox:", error);
            jobPostsList.innerHTML = `<p class="text-red-500 p-4">Failed to load job posts.</p>`;
        }
    }

    // =================================================================
    // SECTION B: UI RENDERING FUNCTIONS
    // =================================================================

    function createJobPostItem(post) {
        return `
            <div id="job-${post.id}" 
                 class="job-item p-3 rounded-md cursor-pointer border-2 border-transparent hover:bg-gray-800"
                 data-post-id="${post.id}">
                <div class="flex justify-between items-center pointer-events-none">
                    <h4 class="font-semibold truncate">${post.title}</h4>
                    <span class="text-xs ${post.status === 'open-for-proposals' ? 'text-green-400' : 'text-yellow-400'}">${post.status === 'open-for-proposals' ? 'Open' : 'In Progress'}</span>
                </div>
                <p class="text-xs text-gray-400 capitalize pointer-events-none">${post.status.replace('-', ' ')}</p>
            </div>
        `;
    }

    async function selectJob(postId) {
        document.querySelectorAll('.job-item').forEach(el => el.classList.remove('selected'));
        getElement(`job-${postId}`).classList.add('selected');
        detailsContent.innerHTML = `<p class="py-16 text-center text-gray-400">Loading details...</p>`;

        const selectedPost = jobPosts.find(p => p.id === postId);
        if (!selectedPost) return;

        if (selectedPost.status === 'open-for-proposals') {
            await displayProposals(postId);
        } else {
            await displayWorkDetails(postId);
        }
    }
    
    async function displayProposals(postId) {
        // ... (This function remains mostly the same as the "Full" version)
    }

    async function displayWorkDetails(postId) {
        // ... (This is the new, advanced version)
        try {
            const worksRef = collection(db, 'works');
            const q = query(worksRef, where("postId", "==", postId), limit(1));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Work Details</h3><p class="text-gray-500">Work has not started.</p>`;
                return;
            }
            
            const workDoc = snapshot.docs[0];
            const work = { id: workDoc.id, ...workDoc.data() };
            
            const influencerRef = doc(db, 'users', work.influencerId);
            const influencerSnap = await getDoc(influencerRef);
            const influencerProfile = influencerSnap.exists() ? influencerSnap.data().influencerApplication.page : { pageName: 'Unknown' };

            let workHTML = `
                <h3 class="text-xl font-semibold mb-4">Work Progress: ${work.title}</h3>
                <div class="flex items-center space-x-3 mb-6">
                    <img src="${influencerProfile.pageProfilePicUrl || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover">
                    <div>
                        <p class="text-sm text-gray-400">Working with:</p>
                        <a href="/pf/influencer/${work.influencerId}" target="_blank" class="font-bold hover:underline">${influencerProfile.pageName}</a>
                    </div>
                </div>
            `;
            
            // Timeline view of submissions
            workHTML += '<div class="space-y-6 border-l-2 border-dark pl-6">';
            if (Array.isArray(work.submissions) && work.submissions.length > 0) {
                work.submissions.forEach(submission => {
                    workHTML += `
                        <div class="relative">
                            <div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-mulberry"></div>
                            <h4 class="font-semibold capitalize">${submission.type} Confirmation</h4>
                            <p class="text-xs text-gray-400">${submission.timestamp.toDate().toLocaleString()}</p>
                            <p class="text-sm text-gray-300 my-2 bg-gray-800 p-3 rounded-md">Note: "${submission.note || 'No note.'}"</p>
                            ${submission.screenshotUrl ? `<a href="${submission.screenshotUrl}" target="_blank" class="text-blue-400 text-sm hover:underline">View Proof</a>` : ''}
                        </div>`;
                });
            } else {
                 workHTML += `<div class="relative"><div class="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-yellow-400"></div><p class="text-yellow-400">Waiting for influencer to start the work.</p></div>`;
            }
            workHTML += '</div>';
            
            // Action button area
            if (work.status === 'submitted-for-review') {
                workHTML += `
                    <div class="mt-6 border-t border-dark pt-6">
                        <h4 class="font-semibold text-lg">Action Required</h4>
                        <p class="text-sm text-gray-400 mb-3">The influencer has submitted the final work. Please review and approve to release payment.</p>
                        <button onclick="window.approveWork('${work.id}')" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Approve & Release Payment</button>
                        <!-- You can add a "Request Revision" button here in the future -->
                    </div>`;
            } else if (work.status === 'completed') {
                workHTML += `<p class="mt-6 border-t border-dark pt-6 text-green-400 font-semibold">This collaboration is complete.</p>`;
            }
            
            detailsContent.innerHTML = workHTML;
        } catch (error) {
            console.error("Error displaying work details:", error);
            detailsContent.innerHTML = `<p class="text-red-500">Could not load work details.</p>`;
        }
    }

    // =================================================================
    // SECTION C: ACTION FUNCTIONS & EVENT LISTENERS
    // =================================================================

    // Event Delegation for Job Post Clicks
    jobPostsList.addEventListener('click', (e) => {
        const jobItem = e.target.closest('.job-item');
        if (jobItem) {
            const postId = jobItem.dataset.postId;
            if (postId) selectJob(postId);
        }
    });


    /**
     * Hires an influencer. Attached to the window object to be globally accessible from dynamic HTML.
     */
    window.hireInfluencer = async (proposalId, influencerId, postId) => {
        console.log(`DEBUG: hireInfluencer -> Attempting to hire. ProposalID: ${proposalId}`);
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
     * Approves a completed work. Attached to the window object.
     */
    window.approveWork = async (workId) => {
        console.log(`DEBUG: approveWork -> Attempting to approve. WorkID: ${workId}`);
        if (!confirm('Are you sure you want to approve this submission and release payment?')) return;
        
        const workRef = doc(db, 'works', workId);
        try {
            await updateDoc(workRef, { status: 'completed', approvedAt: serverTimestamp() });
            alert('Work approved! Payment will be released automatically by the server function.');
            const workDoc = await getDoc(workRef);
            if(workDoc.exists()) {
                selectJob(workDoc.data().postId, 'completed');
            }
        } catch (error) {
            console.error("DEBUG: approveWork -> CRITICAL ERROR:", error);
            alert("Failed to approve work.");
        }
    };

}); // End of DOMContentLoaded
