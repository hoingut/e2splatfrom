// static/pf_influencer_inbox.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const workListContainer = getElement('work-list-container');
    const loadingSpinner = getElement('loading-spinner');
    const tabs = document.querySelectorAll('.tab-btn');
    const modal = getElement('work-modal');
    const closeModalBtn = getElement('close-modal-btn');
    const logoutBtn = getElement('logout-btn');

    let currentUser = null;
    let allWorks = [];
    let currentStatusFilter = 'pending';

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    await fetchAllWorks();
                } else {
                    throw new Error('You are not an approved influencer.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><p class="text-red-500">${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/inbox`;
        }
    });

    /**
     * Fetches all works assigned to the current influencer.
     */
    async function fetchAllWorks() {
        loadingSpinner.style.display = 'block';
        workListContainer.innerHTML = '';
        
        try {
            const worksRef = collection(db, 'works');
            const q = query(worksRef, where("influencerId", "==", currentUser.uid));
            const snapshot = await getDocs(q);
            allWorks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderWorksByStatus(currentStatusFilter);
        } catch (error) {
            console.error("Error fetching works:", error);
            workListContainer.innerHTML = `<p class="text-red-500 text-center">Failed to load your works.</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    /**
     * Filters and renders works based on the selected status tab.
     */
    function renderWorksByStatus(status) {
        currentStatusFilter = status;
        const filteredWorks = allWorks.filter(work => {
            if (status === 'in-progress') return work.status === 'in-progress' || work.status === 'submitted-for-review';
            return work.status === status;
        });

        if (filteredWorks.length === 0) {
            workListContainer.innerHTML = `<p class="text-gray-500 text-center py-8">No works found in this category.</p>`;
            return;
        }

        workListContainer.innerHTML = filteredWorks.map(work => createWorkCard(work)).join('');
        
        // Add event listeners to the new "Manage" buttons
        document.querySelectorAll('.manage-work-btn').forEach(button => {
            button.addEventListener('click', () => openWorkModal(button.dataset.workId));
        });
    }

    /**
     * Creates HTML for a single work summary card.
     */
    function createWorkCard(work) {
        return `
            <div class="bg-dark-card border border-dark rounded-lg p-4 flex justify-between items-center">
                <div>
                    <p class="font-bold text-lg">${work.title}</p>
                    <p class="text-sm text-gray-400">From: ${work.brandName} | Budget: ৳${work.budget}</p>
                </div>
                <button data-work-id="${work.id}" class="manage-work-btn bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-4 rounded-md text-sm">
                    Manage
                </button>
            </div>
        `;
    }
    
    /**
     * Opens and populates the modal for managing a specific work.
     */
    function openWorkModal(workId) {
        const work = allWorks.find(w => w.id === workId);
        if (!work) return;

        getElement('modal-title').textContent = work.title;
        const modalBody = getElement('modal-body');
        
        let content = `
            <p class="text-gray-400 mb-4">${work.description}</p>
            <p><strong>Brand:</strong> ${work.brandName}</p>
            <p><strong>Budget:</strong> ৳${work.budget}</p>
            <hr class="border-dark my-4">
        `;
        
        // Dynamically show actions based on work status
        if (work.status === 'pending') {
            content += `
                <p class="font-semibold mb-2">Do you want to accept this job?</p>
                <div class="flex space-x-3">
                    <button onclick="updateWorkStatus('${work.id}', 'in-progress')" class="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">Accept Job</button>
                    <button onclick="updateWorkStatus('${work.id}', 'rejected-by-influencer')" class="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">Reject</button>
                </div>`;
        } else if (work.status === 'in-progress') {
            content += `
                <p class="font-semibold mb-2">Submit your work for review:</p>
                <p class="text-sm text-gray-400 mb-2">Please provide a link or screenshot of the completed work.</p>
                <input id="submission-link" type="text" class="w-full p-2 bg-gray-800 border border-gray-600 rounded mb-2" placeholder="e.g., https://instagram.com/p/...">
                <button onclick="updateWorkStatus('${work.id}', 'submitted-for-review', document.getElementById('submission-link').value)" class="bg-mulberry hover:bg-mulberry-dark text-white py-2 px-4 rounded">Submit for Review</button>`;
        } else if (work.status === 'submitted-for-review') {
             content += `<p class="text-yellow-400 font-semibold">Your work is under review by the brand. Please wait for their confirmation.</p>`;
        } else if (work.status === 'completed') {
            content += `<p class="text-green-400 font-semibold">This work has been successfully completed and approved!</p>`;
        }
        
        modalBody.innerHTML = content;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    closeModalBtn.addEventListener('click', closeModal);

    /**
     * Updates the status of a work in Firestore.
     */
    window.updateWorkStatus = async (workId, newStatus, submissionLink = null) => {
        const workRef = doc(db, 'works', workId);
        try {
            let updateData = { status: newStatus };
            if (newStatus === 'in-progress') updateData.acceptedAt = serverTimestamp();
            if (newStatus === 'submitted-for-review') {
                if (!submissionLink) { alert("Please provide a submission link or screenshot."); return; }
                updateData.submission = { link: submissionLink, submittedAt: serverTimestamp() };
            }

            await updateDoc(workRef, updateData);
            alert(`Work status updated to: ${newStatus}`);
            closeModal();
            await fetchAllWorks(); // Refresh the list
        } catch (error) {
            console.error("Error updating work status:", error);
            alert("Failed to update status.");
        }
    };

    // --- Tab Switching Logic ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderWorksByStatus(tab.dataset.status);
        });
    });

    // --- Logout Button ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => signOut(auth));
    }
});
