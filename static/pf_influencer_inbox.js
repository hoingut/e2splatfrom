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
    const loadingSpinner = getElement('loading-spinner');
    const tabs = document.querySelectorAll('.tab-btn');
    const modal = getElement('work-modal');
    const closeModalBtn = getElement('close-modal-btn');
    
    // --- State Management ---
    let currentUser = null;
    let allWorks = [];
    let currentStatusFilter = 'pending';

    // =================================================================
    // SECTION A: INITIALIZATION & CORE LOGIC
    // =================================================================

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    await fetchAllWorks();
                } else {
                    throw new Error('You do not have permission to view this page.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><p class="text-red-500">${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/inbox`;
        }
    });

    async function fetchAllWorks() {
        loadingSpinner.style.display = 'block';
        workListContainer.innerHTML = '';
        
        try {
            const worksRef = collection(db, 'works');
            const q = query(worksRef, where("influencerId", "==", currentUser.uid), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            allWorks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWorksByStatus(currentStatusFilter);
        } catch (error) {
            console.error("Error fetching works:", error);
            workListContainer.innerHTML = `<p class="text-red-500 text-center">Failed to load works. Ensure Firestore indexes are created.</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // =================================================================
    // SECTION B: UI RENDERING & MODAL FUNCTIONS
    // =================================================================

    function renderWorksByStatus(status) {
        currentStatusFilter = status;
        const filteredWorks = allWorks.filter(work => {
            if (status === 'pending') return work.status === 'pending';
            if (status === 'in-progress') return ['in-progress', 'started-confirmation', 'submitted-for-review'].includes(work.status);
            if (status === 'completed') return ['completed', 'rejected-by-brand', 'rejected-by-influencer'].includes(work.status);
            return false;
        });

        if (filteredWorks.length === 0) {
            workListContainer.innerHTML = `<p class="text-gray-500 text-center py-8">No works found in this category.</p>`;
            return;
        }
        workListContainer.innerHTML = filteredWorks.map(work => createWorkCard(work)).join('');
    }

    function createWorkCard(work) {
        return `
            <div class="bg-dark-card border border-dark rounded-lg p-4 flex justify-between items-center">
                <div><p class="font-bold text-lg">${work.title}</p><p class="text-sm text-gray-400">From: ${work.brandName} | Budget: ৳${work.budget}</p></div>
                <button data-work-id="${work.id}" data-action="open-modal" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-4 rounded-md text-sm">Manage</button>
            </div>`;
    }
    
    function openWorkModal(workId) {
        const work = allWorks.find(w => w.id === workId);
        if (!work) return;

        getElement('modal-title').textContent = work.title;
        const modalBody = getElement('modal-body');
        let content = `<p class="text-gray-400 mb-4">${work.description}</p><p><strong>Budget:</strong> ৳${work.budget}</p><hr class="border-dark my-4">`;
        
        switch (work.status) {
            case 'pending':
                content += `<p class="font-semibold mb-2">Do you want to accept this job?</p><div class="flex space-x-3"><button data-action="update-status" data-work-id="${work.id}" data-new-status="in-progress" class="bg-green-600 ...">Accept Job</button><button data-action="update-status" data-work-id="${work.id}" data-new-status="rejected-by-influencer" class="bg-red-600 ...">Reject</button></div>`;
                break;
            case 'in-progress':
                content += `<p class="font-semibold mb-2">Confirm start:</p><textarea class="js-note-input w-full p-2 bg-gray-800 ..."></textarea><input type="file" class="js-screenshot-input mt-1 ..."><button data-action="submit-update" data-work-id="${work.id}" data-type="started" class="bg-mulberry ...">Mark as Started</button>`;
                break;
            case 'started-confirmation':
                content += `<p class="font-semibold mb-2">Submit final work:</p><textarea class="js-note-input w-full p-2 bg-gray-800 ..."></textarea><input type="file" class="js-screenshot-input mt-1 ..."><button data-action="submit-update" data-work-id="${work.id}" data-type="completed" class="bg-mulberry ...">Mark as Complete</button>`;
                break;
            case 'submitted-for-review':
                content += `<p class="text-yellow-400 font-semibold">Work is under review.</p>`;
                break;
            case 'completed':
                content += `<p class="text-green-400 font-semibold">Work completed!</p>`;
                break;
            default:
                content += `<p class="text-gray-400">Status: ${work.status}</p>`;
        }
        
        modalBody.innerHTML = content;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    // =================================================================
    // SECTION C: ACTION FUNCTIONS & EVENT LISTENERS
    // =================================================================

    async function updateWorkStatus(workId, newStatus) {
        if (!confirm(`Are you sure you want to update status to: ${newStatus}?`)) return;
        const workRef = doc(db, 'works', workId);
        try {
            await updateDoc(workRef, { status: newStatus });
            alert(`Work status updated!`);
            closeModal();
            await fetchAllWorks();
        } catch (error) {
            console.error("Error updating work status:", error);
            alert("Failed to update status.");
        }
    }

    async function submitUpdate(workId, type, submitButton) {
        const modalBody = getElement('modal-body');
        const noteInput = modalBody.querySelector('.js-note-input');
        const screenshotInput = modalBody.querySelector('.js-screenshot-input');
        
        if (!noteInput || !screenshotInput) {
            alert("Submission failed: UI components are missing."); return;
        }
        
        const note = noteInput.value.trim();
        const file = screenshotInput.files[0];
        
        if (type === 'completed' && !file && !note) {
            alert("Please provide a submission link/note or upload a screenshot."); return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        try {
            let screenshotUrl = null;
            if (file) {
                screenshotUrl = await uploadImage(file);
            }
            
            const submission = { type, note, screenshotUrl, timestamp: new Date() }; // Using client time
            const workRef = doc(db, 'works', workId);
            await updateDoc(workRef, {
                submissions: arrayUnion(submission),
                status: type === 'started' ? 'started-confirmation' : 'submitted-for-review'
            });

            alert('Update submitted successfully!');
            closeModal();
            await fetchAllWorks();
        } catch (error) {
            console.error("Error submitting update:", error);
            alert(`Submission failed: ${error.message}`);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = `Mark as ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            }
        }
    }
    
    async function uploadImage(file) {
        const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY'; // Ensure this is correct
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
        const result = await response.json();
        if (!result.success) throw new Error(`Image upload failed: ${result.error.message}`);
        return result.data.url;
    }

    // --- Event Delegation for the whole page ---
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

        const actionButton = target.closest('button[data-action]');
        if (actionButton) {
            const { action, workId, newStatus, type } = actionButton.dataset;

            if (action === 'update-status') {
                updateWorkStatus(workId, newStatus);
            } else if (action === 'submit-update') {
                submitUpdate(workId, type, actionButton);
            }
        }

        const logoutBtn = getElement('logout-btn');
        if (logoutBtn && (target.id === 'logout-btn' || target.closest('#logout-btn'))) {
            signOut(auth);
        }
    });

}); // End of DOMContentLoaded
