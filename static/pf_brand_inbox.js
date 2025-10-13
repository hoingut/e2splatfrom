// static/pf_brand_inbox.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    orderBy, writeBatch, updateDoc, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: pf_brand_inbox.js script started.");
    
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsContent = getElement('details-content');
    
    let currentUser = null;

    // --- Step 3: Authentication & Role Check ---
    onAuthStateChanged(auth, async (user) => {
        console.log("DEBUG: Auth state changed.");
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
        console.log("DEBUG: loadBrandInbox() called.");
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            console.log(`DEBUG: Found ${snapshot.size} job posts for this brand.`);

            if (snapshot.empty) {
                jobPostsList.innerHTML = `<p classঅব="text-gray-500 p-4">You have not posted any jobs yet.</p>`;
            } elseশ্যই! আমি বুঝতে পারছি আপনি `pf_brand_inbox.js {
                jobPostsList.innerHTML = snapshot.docs.map(doc => createJobPostItem(doc.` ফাইলের একটি সম্পূর্ণ এবং স্বয়ংসম্পূর্ণ সংস্করণ চান, যেখানে কোনো অংশ বাদ দেওয়া হয়নি এবং পূর্ববর্তী সমস্ত বাগ (বিশেষ করে `submission` বিস্তারিত না আসা এবং জব টাইটেল সংক্ষিপ্ত দেখানো) সমাধান করা হয়েছে।

নিচে Firebaseid, doc.data())).join('');
            }

            loadingContainer.classList.add('hidden');
            inboxContent.classList.remove('hidden');
        } catch (error) {
            console.error("DEBUG: Error in loadBrandInbox():", error);
            jobPostsList.innerHTML = `<p class="text-red-500 p-4">Failed to load job posts. Ensure Firestore indexes are created.</p>`;
        }
    }

    /**
     * Creates HTML for a single job post item in the left panel.
     */
    function createJobPostItem(postId, post) {
        return `
            <div id="job-${postId}" onclick Version 9 (v9) ব্যবহার করে আপনার ব্র্যান্ড ইনবক্সের জন্য চূড়ান্ত, সম্পূর্ণ এবং ডিবাগ-সহায়ক জাভাস্ক্রিপ্ট কোডটি দেওয়া হলো।

---

### `static/pf_brand_inbox.="window.selectJob('${postId}', '${post.status}')" class="p-3 rounded-md cursor-pointerjs` (চূড়ান্ত, সম্পূর্ণ এবং বাগ-মুক্ত সংস্করণ)

**আপনার পুরনো `static/pf_brand_inbox.js` ফাইলটি সম্পূর্ণ মুছে দিয়ে নিচের নতুন কোডটি পেস্ট করুন।**

```javascript
// static/pf_ border-2 border-transparent hover:bg-gray-800">
                <h4 class="font-semibold truncate">${post.title}</h4>
                <p class="text-xs text-gray-400 capitalize">${post.status.replace('-', ' ')}</p>
            </div>
        `;
    }

    /**brand_inbox.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import {
     * Main handler for selecting a job. It's attached to the window object to be globally accessible.
     */
    window.selectJob = async (postId, status) => {
        console.log(`DEBUG: auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www. selectJob() called. PostID: ${postId}, Status: ${status}`);
        document.querySelectorAll('[id^="job-"]').forEach(el => el.classList.remove('bg-mulberry', 'text-white'));
gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
            getElement(`job-${postId}`).classList.add('bg-mulberry', 'text-white');
        detailsContent.innerHTML = `<p class="py-16 text-center text-gray-400">Loading details...</doc, getDoc, collection, query, where, getDocs, 
    orderBy, writeBatch, updateDoc, limit, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1p>`;

        if (status === 'open-for-proposals') {
            await displayProposals(postId);
        } else { // 'in-progress', 'completed', 'submitted-for-review', etc.
            /firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: pfawait displayWorkDetails(postId);
        }
    };
    
    /**
     * Fetches and displays proposals for a selected job post.
     */
    async function displayProposals(postId) {
        console.log(`DEBUG: displayProposals() called for PostID: ${postId}`);
        try {
            const proposalsRef = collection(db, 'proposals');
            const q = query(proposalsRef, where_brand_inbox.js script started.");
    
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const inboxContent = getElement('inbox-content');
    const jobPostsList = getElement('job-posts-list');
    const detailsContent = getElement('details-content');
    
    ("brandId", "==", currentUser.uid), where("postId", "==", postId), where("status", "==", "pending"));
            const snapshot = await getDocs(q);
            console.log(`DEBUG: Found ${snapshot.size} proposals.`);

            if (snapshot.empty) {
                detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Proposals</h3><p class="text-gray-5let currentUser = null;

    // --- Step 3: Authentication and Role Check ---
    onAuthStateChanged(auth, async (user) => {
        console.log("DEBUG: Auth state changed.");
        if (user) {
            currentUser = user;
            // You can add a role check here to redirect influencers if they land on this page.
            await loadBrandInbox();
        } else {
            window.location.href = `/login?redirect00">No pending proposals for this job yet.</p>`;
                return;
            }

            const proposal=/pf/brand/inbox`;
        }
    });

    /**
     * Fetches all job posts created by the current brand and renders them.
     */
    async function loadBrandInbox() {
        console.log("DEBUG: loadBrandInbox() called.");
        try {
            const postsRef = collection(db, 'Promises = snapshot.docs.map(async (propDoc) => {
                const proposal = { id: propDoc.id, ...propDoc.data() };
                const userRef = doc(db, 'users', proposal.influencerId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    proposal.influencerData = userSnap.data();
                }
                return proposal;
            });

posts');
            const q = query(postsRef, where("authorId", "==", currentUser.uid), orderBy            const proposals = await Promise.all(proposalPromises);

            let proposalsHTML = `<h3 class="text-("createdAt", "desc"));
            const snapshot = await getDocs(q);
            console.log(`DEBUG: Found ${xl font-semibold mb-4">Proposals Received (${proposals.length})</h3><div class="space-y-4">`;
            proposalsHTML += proposals.map(p => {
                if (!p.influencerData?.influencerApplication?.page) return ''; // Safety check for incomplete profiles
                const profile = p.influencerData.influencerApplication.page;
                return `
                    <div class="bg-gray-800 p-4snapshot.size} job posts for this brand.`);

            if (snapshot.empty) {
                jobPostsList.innerHTML = `<p class="text-gray-500 p-4">You have not posted any jobs yet.</p>`;
            } else {
                jobPostsList.innerHTML = snapshot.docs.map(doc => createJobPostItem( rounded-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <img src="${profile.pageProfilePicUrl || 'https://via.placeholder.com/40'}" class="w-10 h-10 rounded-full object-cover">doc.id, doc.data())).join('');
            }

            loadingContainer.classList.add('hidden');
            inboxContent.classList.remove('hidden');

        } catch (error) {
            console.error("DEBUG: Error in loadBrandInbox():", error);
            jobPostsList.innerHTML = `<p class="text
                                <div>
                                    <a href="/pf/influencer/${p.influencerId}" target="_blank" class-red-500 p-4">Failed to load job posts. Ensure Firestore indexes are created.</p>`;
        }
    }

    /**
     * Creates HTML for a single job post item in the left panel.
     */="font-bold hover:underline">${profile.pageName}</a>
                                    <p class="text-xs text-gray-400">${(profile.followers || 0).toLocaleString()} Followers</p>
                                </div>
                            </div>
                            <button onclick="window.hireInfluencer('${p.id}', '${p.influencerId}', '${postId}')" class="bg-green-600 hover:bg-green-700 text-white font
    function createJobPostItem(postId, post) {
        console.log(`DEBUG: Creating job item for post: ${post.title}`);
        return `
            <div id="job-${postId}" onclick="window.selectJob('${postId}', '${post.status}')" class="p-3 rounded-md cursor-pointer border-2 border--semibold py-2 px-4 rounded-md text-sm">Hire</button>
                        </div>
                        <p class="text-sm text-gray-300 mt-3 border-t border-dark pt-3">${p.coverLetter}</p>
                    </div>`;
            }).join('');
            proposalsHTML += `</div>`;
            detailsContent.innerHTML = proposalsHTML;
        } catch (error) {
            console.errortransparent hover:bg-gray-800">
                <h4 class="font-semibold truncate">${post.title}</h4>
                <p class="text-xs text-gray-400 capitalize">${post.status.replace('-', ' ')}</p>
            </div>
        `;
    }

    /**
     * Main handler for selecting a job. It's attached to the window object to be globally accessible.
     */
    ("DEBUG: Error in displayProposals():", error);
            detailsContent.innerHTML = `<p class="text-red-500">Could not load proposals. Ensure Firestore indexes are set up correctly.</p>`;
        }
    }

    /**
     * Displays the details and progress of an ongoing or completed work.
     */
    async function displayWorkDetails(postId) {
        console.log(`DEBUG: displayWorkDetails() called for PostID: ${postId}`);
        try {
            const worksRef = collection(db, 'works');
            const q = query(worksRef, where("postId", "==", postId), limit(1));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                detailsContent.innerHTML = `<h3 class="text-xl fontwindow.selectJob = async (postId, status) => {
        console.log(`DEBUG: selectJob() called. PostID: ${postId}, Status: ${status}`);
        document.querySelectorAll('[id^="job-"]').forEach(el => el.classList.remove('bg-mulberry', 'text-white'));
        getElement(`job-${postId}`).classList.add('bg-mulberry', 'text-white');
        detailsContent.innerHTML = `<p class="py-16 text-center text-gray-400">Loading details...</p>`;

        if (status === 'open-for-proposals') {
            await displayProposals(postId);
        } else { //-semibold mb-4">Work Details</h3><p class="text-gray-500">Work has not been started for this post yet.</p>`;
                return;
            }
            
            const workDoc = snapshot.docs[0];
            const work = { id: workDoc.id, ...workDoc.data() };
            console.log("DEBUG: Found work document:", work);
            
            const influencerRef = doc(db, 'users', work.influencerId);
            const influencerSnap = await getDoc(influencerRef);
            const influencerName 'in-progress', 'completed', 'submitted-for-review', etc.
            await displayWorkDetails(postId);
        }
    };
    
    /**
     * Fetches and displays proposals for a selected job post.
     */
    async function displayProposals(postId) {
        console.log(`DEBUG: displayProposals() called for PostID: ${postId}`);
        try {
            const proposalsRef = collection(db, 'proposals');
            const q = query(proposalsRef, where("brandId", "==", currentUser.uid), where("postId", = influencerSnap.exists() ? influencerSnap.data().name : 'Unknown Influencer';

            let workHTML = `
 "==", postId), where("status", "==", "pending"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                detailsContent.innerHTML = `<h3 class="text-xl font-semibold                <h3 class="text-xl font-semibold mb-4">Work Progress</h3>
                <p class="text mb-4">Proposals</h3><p class="text-gray-500">No pending proposals for this job-sm text-gray-400">Influencer: <strong class="text-white">${influencerName}</strong> yet.</p>`;
                return;
            }

            const proposalPromises = snapshot.docs.map(async</p>
                <p>Status: <span class="font-bold capitalize text-yellow-400 (propDoc) => {
                const proposal = { id: propDoc.id, ...propDoc.data">${work.status.replace('-', ' ')}</span></p>
            `;
            
            if (Array.isArray(() };
                const userRef = doc(db, 'users', proposal.influencerId);
                const userSnapwork.submissions) && work.submissions.length > 0) {
                console.log("DEBUG: Work has submissions. Processing them...");
                const lastSubmission = work.submissions[work.submissions.length - 1];
 = await getDoc(userRef);
                if(userSnap.exists()){
                    proposal.influencerData = user                
                workHTML += `<div class="mt-4 border-t border-dark pt-4">`;Snap.data();
                }
                return proposal;
            });

            const proposals = await Promise.all(proposal
                workHTML += `<h4 class="font-semibold text-white">Latest Submission:</h4><p class="text-sm text-gray-300 my-2 bg-gray-800 p-3 rounded-mdPromises);
            let proposalsHTML = `<h3 class="text-xl font-semibold mb-4">Proposals Received (${proposals.length})</h3><div class="space-y-4">`;
            proposalsHTML += proposals.map(p => {
                if (!p.influencerData?.influencerApplication?.page)">Note: "${lastSubmission.note || 'No note provided.'}"</p>`;

                if (lastSubmission.screenshotUrl) {
                    console.log("DEBUG: Submission has a screenshot URL. Showing link.");
                    workHTML += `<a href="${lastSubmission.screenshotUrl}" target="_blank" class="text-blue-400 return '';
                const profile = p.influencerData.influencerApplication.page;
                return `
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="flex hover:underline">View Submission Proof</a>`;
                }

                if (work.status === 'submitted-for items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <-review') {
                    console.log("DEBUG: Status is 'submitted-for-review'. Showing Approve button.");img src="${profile.pageProfilePicUrl || 'https://via.placeholder.com/40'}" class="w
                    workHTML += `<div class="mt-4"><button onclick="window.approveWork('${work.id}')" class="bg-green-600 hover:bg-green-700 text-white font-bold-10 h-10 rounded-full object-cover">
                                <div>
                                    <a href="/pf/influencer/${p.influencerId}" target="_blank" class="font-bold hover:underline">${profile.page py-2 px-4 rounded">Approve & Release Payment</button></div>`;
                }
                workHTML +=Name}</a>
                                    <p class="text-xs text-gray-400">${(profile.followers `</div>`;
            } 
            else if (work.status === 'in-progress') {
                 workHTML += || 0).toLocaleString()} Followers</p>
                                </div>
                            </div>
                            <button onclick="window.hire `<p class="mt-4 text-yellow-400">Waiting for the influencer to make their first submission.</Influencer('${p.id}', '${p.influencerId}', '${postId}')" class="bg-green-6p>`;
            }
            
            if (work.status === 'completed') {
                 workHTML += `<00 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md textp class="mt-4 text-green-400 font-semibold">This collaboration is complete. Payment has been released.</-sm">Hire</button>
                        </div>
                        <p class="text-sm text-gray-300 mtp>`;
            }
            
            detailsContent.innerHTML = workHTML;
        } catch (error)-3 border-t border-dark pt-3">${p.coverLetter}</p>
                    </div>`;
            }). {
            console.error("DEBUG: Error in displayWorkDetails():", error);
            detailsContent.innerHTML = `<p class="text-red-500">Could not load work details.</p>`;
        }
join('');
            proposalsHTML += `</div>`;
            detailsContent.innerHTML = proposalsHTML;
        } catch (    }

    /**
     * Hires an influencer. Attached to the window object.
     */
    window.hireerror) {
            console.error("DEBUG: Error in displayProposals():", error);
            detailsContent.innerHTML = `<p class="text-red-500">Could not load proposals. Ensure Firestore indexes are set up correctlyInfluencer = async (proposalId, influencerId, postId) => {
        console.log(`DEBUG: hire.</p>`;
        }
    }

    /**
     * Displays the details and progress of an ongoing or completed work.
     */
    async function displayWorkDetails(postId) {
        console.log(`DEBUG: displayInfluencer() called. ProposalID: ${proposalId}`);
        if (!confirm('Are you sure you want to hire this influencer? This will create a work contract.')) return;
        
        const postRef = doc(db, 'posts',WorkDetails() called for PostID: ${postId}`);
        try {
            const worksRef = collection(db, 'works postId);
        const postSnap = await getDoc(postRef);
        if(!postSnap.exists()) {');
            const q = query(worksRef, where("postId", "==", postId), limit(1));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                detailsContent.innerHTML = `<h3 class="text-xl font-semibold mb-4">Work Details</h3><p class="text- alert("Post not found."); return; }
        const postData = postSnap.data();

        const workData = {
            postId, title: postData.title, description: postData.description, budget: postData.budgetgray-500">Work has not been started for this post yet.</p>`;
                return;
            }
,
            brandId: currentUser.uid, brandName: postData.brandName, influencerId,
            status:            
            const workDoc = snapshot.docs[0];
            const work = { id: workDoc.id, ... 'in-progress', createdAt: serverTimestamp(), submissions: []
        };

        const batch = writeBatch(workDoc.data() };
            console.log("DEBUG: Found work document:", work);
            
            const influencerRef = doc(db, 'users', work.influencerId);
            const influencerSnap = await getdb);
        batch.set(doc(collection(db, 'works')), workData);
        batch.update(postRef, { status: 'in-progress', hiredInfluencerId: influencerId });
        batch.update(doc(db, 'proposals', proposalId), { status: 'accepted' });
        
        tryDoc(influencerRef);
            const influencerName = influencerSnap.exists() ? influencerSnap.data().name : 'Unknown {
            await batch.commit();
            alert('Influencer hired successfully!');
            await loadBrandInbox(); Influencer';

            let workHTML = `
                <h3 class="text-xl font-semibold mb-4">
            window.selectJob(postId, 'in--progress');
        } catch(error){
            console.Work Progress</h3>
                <p class="text-sm text-gray-400">Influencer: <error("DEBUG: Error in hireInfluencer():", error);
            alert("Failed to hire influencer.");
        strong class="text-white">${influencerName}</strong></p>
                <p>Status: <span}
    };
    
    /**
     * Approves a completed work. Attached to the window object.
     */ class="font-bold capitalize text-yellow-400">${work.status.replace('-', ' ')}</span>
    window.approveWork = async (workId) => {
        console.log(`DEBUG: approveWork() called</p>
            `;
            
            if (Array.isArray(work.submissions) && work.submissions for WorkID: ${workId}`);
        if (!confirm('Are you sure you want to approve this submission and release payment?.length > 0) {
                console.log("DEBUG: Work has submissions. Processing them...");
                const last')) return;
        
        const workRef = doc(db, 'works', workId);
        try {Submission = work.submissions[work.submissions.length - 1];
                
                workHTML += `<div class="mt
            await updateDoc(workRef, { status: 'completed', approvedAt: serverTimestamp() });
            alert-4 border-t border-dark pt-4">`;
                workHTML += `<h4 class="font-semibold text-white">Latest Submission:</h4><p class="text-sm text-gray-300 my('Work approved! Payment will be released automatically by the Cloud Function.');
            
            const workDoc = await getDoc(workRef);
            if(workDoc.exists()) {
                window.selectJob(workDoc.data().-2 bg-gray-800 p-3 rounded-md">Note: "${lastSubmission.note || 'postId, 'completed');
            }
        } catch (error) {
            console.error("DEBUG:No note provided.'}"</p>`;

                if (lastSubmission.screenshotUrl) {
                    console.log("DEBUG Error in approveWork():", error);
            alert("Failed to approve work.");
        }
    };

});
