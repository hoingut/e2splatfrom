// static/pf_influencer_inbox.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { 
    doc, getDoc, collection, query, where, getDocs, 
    updateDoc, serverTimestamp, arrayUnion, orderBy 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const workListContainer = getElement('work-list-container');
    const tabs = document.querySelectorAll('.tab-btn');
    const modal = getElement('work-modal');
    const modalBody = getElement('modal-body');
    const modalTitle = getElement('modal-title');
    
    // --- State Management ---
    let currentUser = null;
    let allWorks = [];
    let currentStatusFilter = 'pending'; // Default tab
    
    // NOTE: Replace with your actual ImgBB key if image upload is needed in modal
    const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY'; 

    // =================================================================
    // SECTION A: INITIALIZATION & AUTH
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                
                // CRITICAL CHECK: Ensure user is an influencer
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    // Initial fetch for the active tab (which is 'pending')
                    await fetchAllWorks();
                } else {
                    throw new Error('You must be an approved influencer to access this inbox.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-3xl text-red-500">Access Denied</h1><p class="text-gray-400">${error.message}</p></div>`;
            }
        } else {
            // Redirect unauthenticated users
            window.location.href = `/login?redirect=/pf/influencer/inbox`;
        }
    });

    /**
     * Fetches ALL work contracts related to the current influencer.
     */
    async function fetchAllWorks() {
        workListContainer.innerHTML = `<p class="text-center py-8 text-gray-500">Loading...</p>`;
        
        try {
            const worksRef = collection(db, 'works');
            // Fetch all works related to the current influencer ID
            const q = query(worksRef, where("influencerId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            allWorks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWorksByStatus(currentStatusFilter);
        } catch (error) {
            console.error("Error fetching works:", error);
            workListContainer.innerHTML = `<p class="text-red-500 text-center">Failed to load works: ${error.message}</p>`;
        }
    }

    // =================================================================
    // SECTION B: UI RENDERING & STATUS MAPPING
    // =================================================================

    /**
     * Maps the UI tab status to the corresponding Firestore work status array.
     */
    function getStatusArray(status) {
        switch (status) {
            case 'pending':
                // Status when Brand orders -> Pending Admin Payment Verification
                return ['pending-payment-verification']; 
            case 'in-progress':
                // Statuses when Admin has approved the payment AND works that have been started by Influencer
                return ['in-progress', 'submitted-for-review', 'waiting-for-brand-feedback'];
            case 'completed':
                // Finalized/Closed works
                return ['completed', 'rejected', 'cancelled'];
            default:
                return [];
        }
    }

    function renderWorksByStatus(status) {
        currentStatusFilter = status;
        const requiredStatuses = getStatusArray(status);
        
        // Filter works based on the required status array
        const filteredWorks = allWorks.filter(work => requiredStatuses.includes(work.status));

        if (filteredWorks.length === 0) {
            let message = '';
            if (status === 'pending') {
                message = 'No new orders requiring payment verification.';
            } else if (status === 'in-progress') {
                message = 'No active works currently.';
            } else {
                message = 'No history found.';
            }
            workListContainer.innerHTML = `<p class="text-gray-500 text-center py-8">${message}</p>`;
            return;
        }
        workListContainer.innerHTML = filteredWorks.map(work => createWorkCard(work)).join('');
    }

    function getStatusBadge(status) {
        const statuses = {
            'pending-payment-verification': { text: 'PAYMENT PENDING', color: 'bg-yellow-800 text-yellow-300' },
            'in-progress': { text: 'IN PROGRESS', color: 'bg-green-600 text-white' },
            'submitted-for-review': { text: 'AWAITING REVIEW', color: 'bg-indigo-600 text-white' },
            'completed': { text: 'COMPLETED', color: 'bg-gray-700 text-gray-300' },
            'rejected': { text: 'REJECTED', color: 'bg-red-700 text-white' },
            'cancelled': { text: 'CANCELLED', color: 'bg-red-900 text-gray-300' }
        };
        const badge = statuses[status] || { text: status.toUpperCase(), color: 'bg-gray-800 text-gray-500' };
        return `<span class="px-3 py-1 text-xs font-semibold rounded-full ${badge.color}">${badge.text}</span>`;
    }

    function createWorkCard(work) {
        const isPendingAdmin = work.status === 'pending-payment-verification';
        const isReadyToStart = work.status === 'in-progress';
        const isSubmitted = work.status === 'submitted-for-review';

        let actionButton = '';
        if (isReadyToStart) {
            actionButton = `<button data-work-id="${work.id}" data-action="open-modal" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-4 rounded-md text-sm transition">Submit Work</button>`;
        } else if (isPendingAdmin || isSubmitted) {
             actionButton = `<button disabled data-action="open-modal" data-work-id="${work.id}" class="bg-gray-700 text-gray-400 py-2 px-4 rounded-md text-sm">View Status</button>`;
        }

        return `
            <div class="bg-dark-card border border-dark rounded-xl p-4 flex justify-between items-center transition hover:border-mulberry">
                <div class="flex-grow">
                    <h3 class="text-lg font-semibold">${work.title}</h3>
                    <p class="text-sm text-gray-400 mt-1">Ordered by: ${work.brandName || 'Brand User'} | Budget: ৳${work.budget.toLocaleString()}</p>
                    <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span><i class="fas fa-calendar-alt mr-1"></i> Delivery: ${work.deliveryTime || 'N/A'} days</span>
                        <span class="text-gray-400">Content: ${work.contentTypes ? work.contentTypes.join(', ') : 'N/A'}</span>
                    </div>
                </div>
                
                <div class="flex flex-col items-end space-y-2">
                    ${getStatusBadge(work.status)}
                    ${actionButton}
                </div>
            </div>`;
    }
    
    // --- MODAL RENDERING ---
    
    function openWorkModal(workId) {
        const work = allWorks.find(w => w.id === workId);
        if (!work) return;

        modalTitle.textContent = work.title;
        let content = `<p class="text-gray-400 mb-4">${work.description || 'No description provided.'}</p>
                       <p><strong>Brand:</strong> ${work.brandName}</p>
                       <p><strong>Payment Status:</strong> ${work.payment.status.toUpperCase()}</p>
                       <p class="text-xl mt-3 font-bold text-green-500">Budget: ৳${work.budget.toLocaleString()}</p>
                       <hr class="border-dark my-4">`;
        
        // Define modal content based on status
        if (work.status === 'in-progress') {
            content += `<h4 class="font-semibold text-white mb-3">Submission Form</h4>
                        <form id="submission-form-${workId}" class="space-y-4">
                            <div><label class="block text-sm">Submission Link/Note</label><textarea class="js-note-input w-full p-2 rounded-md bg-gray-800 border-dark" rows="3" placeholder="Link to the final post, video, or brief summary..." required></textarea></div>
                            <div><label class="block text-sm">Proof Screenshot (Optional)</label><input type="file" class="js-screenshot-input mt-1 w-full text-sm text-gray-400"></div>
                            <button type="submit" data-action="submit-update" data-work-id="${work.id}" data-type="completed" class="bg-mulberry hover:bg-mulberry-dark text-white font-bold py-2 px-4 rounded-md transition">
                                Mark as Submitted
                            </button>
                        </form>`;
        } else if (work.status === 'pending-payment-verification') {
            content += `<p class="text-yellow-400 font-semibold text-center p-4 bg-gray-900 rounded-md">
                        <i class="fas fa-hourglass-half mr-2"></i>Awaiting Admin Payment Verification. You will be notified when the work begins.
                        </p>`;
        } else if (work.status === 'submitted-for-review' || work.status === 'waiting-for-brand-feedback') {
             content += `<p class="text-indigo-400 font-semibold text-center p-4 bg-gray-900 rounded-md">
                        <i class="fas fa-eye mr-2"></i>Work submitted successfully. Awaiting Brand Review.
                        </p>`;
        } else {
            content += `<p class="text-gray-400 text-center">Final Status: ${getStatusBadge(work.status)}</p>`;
        }
        
        modalBody.innerHTML = content;
        
        // Attach event listener for the submission form if present
        const submissionForm = getElement(`submission-form-${workId}`);
        if (submissionForm) {
            submissionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const submitButton = submissionForm.querySelector('[data-action="submit-update"]');
                submitUpdate(work.id, 'completed', submitButton);
            });
        }
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // --- Image Upload Helper (ImgBB) ---
    async function uploadImage(file) {
        if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY') {
            console.warn("IMGBB Key not set. Returning a placeholder URL.");
            return 'https://via.placeholder.com/150?text=NO_API_KEY';
        }
        
        // Convert file to Base64 format
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const base64Image = await new Promise(resolve => reader.onload = () => resolve(reader.result.split(',')[1]));

        const formData = new FormData();
        formData.append("image", base64Image);

        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const result = await response.json();
        
        if (!result.success) throw new Error(`Image upload failed: ${result.error.message}`);
        return result.data.url;
    }

    // --- Work Submission Handler ---
    async function submitUpdate(workId, type, submitButton) {
        const modalContent = document.getElementById('submission-form-' + workId);
        const noteInput = modalContent.querySelector('.js-note-input');
        const screenshotInput = modalContent.querySelector('.js-screenshot-input');
        
        const note = noteInput.value.trim();
        const file = screenshotInput.files[0];
        
        if (!file && !note) {
            alert("Please provide a submission link/note or upload a screenshot."); return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Submitting Proof...';

        try {
            let screenshotUrl = null;
            if (file) {
                screenshotUrl = await uploadImage(file);
            }
            
            const workRef = doc(db, 'works', workId);
            
            // Log submission data
            const submissionData = {
                type: 'final-submission',
                note, 
                proofUrl: screenshotUrl, 
                timestamp: serverTimestamp() 
            };
            
            // Update status and add submission log
            await updateDoc(workRef, {
                status: 'submitted-for-review', // New status awaits brand or admin review
                submissions: arrayUnion(submissionData)
            });

            alert('Final work submitted successfully! Awaiting Brand review.');
            closeModal();
            await fetchAllWorks();
        } catch (error) {
            console.error("Error submitting update:", error);
            alert(`Submission failed: ${error.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = `Mark as Submitted`;
        }
    }


    // --- Event Delegation ---
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        
        if (target.matches('.tab-btn')) {
            tabs.forEach(t => t.classList.remove('active'));
            target.classList.add('active');
            renderWorksByStatus(target.dataset.status);
        }

        const openModalBtn = target.closest('[data-action="open-modal"]');
        if (openModalBtn) {
            openWorkModal(openModalBtn.dataset.workId);
        }
        
        if (target.id === 'close-modal-btn' || target.closest('#close-modal-btn')) {
            closeModal();
        }

        const logoutBtn = getElement('logout-btn');
        if (logoutBtn && (target.id === 'logout-btn' || target.closest('#logout-btn'))) {
            signOut(auth).then(() => {
                window.location.href = '/pf';
            });
        }
    });

    // Initial render setup
    if (tabs.length > 0) {
        tabs[0].classList.add('active'); // Ensure 'Pending Acceptance' is active by default
    }

}); // End of DOMContentLoaded
