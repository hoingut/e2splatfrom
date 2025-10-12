// static/admin_influencer_applications.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const pendingListContainer = getElement('pending-applications-list');
    const loadingText = getElement('loading-text');
    const modal = getElement('details-modal');
    const closeModalBtn = getElement('close-modal-btn');
    const modalBody = getElement('modal-body-content');
    const modalFooter = getElement('modal-footer-actions');

    let allApplications = [];

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    await fetchPendingApplications();
                } else {
                    throw new Error('You do not have permission to view this page.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><p class="text-red-500">${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/admin/influencer-applications`;
        }
    });

    /**
     * Fetches users with 'pending' application status and displays them.
     */
    async function fetchPendingApplications() {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("applicationStatus", "==", "pending"));
            const querySnapshot = await getDocs(q);

            loadingText.classList.add('hidden');

            if (querySnapshot.empty) {
                pendingListContainer.innerHTML = `<p class="text-center text-gray-500 py-8">No pending applications found.</p>`;
                return;
            }

            allApplications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            pendingListContainer.innerHTML = allApplications.map(user => createApplicationCard(user)).join('');
            
            // Add event listeners to the new "View Details" buttons
            document.querySelectorAll('.view-details-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const userId = e.currentTarget.dataset.userId;
                    openDetailsModal(userId);
                });
            });

        } catch (error) {
            console.error("Error fetching applications:", error);
            pendingListContainer.innerHTML = `<p class="text-center text-red-500 py-8">Failed to load applications.</p>`;
        }
    }

    /**
     * Creates HTML for a single application summary card.
     */
    function createApplicationCard(user) {
        const appData = user.influencerApplication;
        if (!appData) return '';
        return `
            <div id="card-${user.id}" class="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <img src="${appData.page.pageProfilePicUrl || 'https://via.placeholder.com/50'}" alt="Page Pic" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-bold text-lg">${appData.page.pageName}</p>
                        <p class="text-sm text-gray-600">${user.name} (<span class="font-mono text-xs">${user.email}</span>)</p>
                    </div>
                </div>
                <button data-user-id="${user.id}" class="view-details-btn bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-indigo-600">
                    View Details
                </button>
            </div>
        `;
    }
    
    /**
     * Opens and populates the details modal for a specific application.
     */
    function openDetailsModal(userId) {
        const user = allApplications.find(app => app.id === userId);
        if (!user) return;

        const appData = user.influencerApplication;
        
        modalBody.innerHTML = `
            <!-- Personal Info -->
            <div class="md:col-span-1 space-y-4">
                <h3 class="font-semibold text-lg">Personal Info</h3>
                <img src="${appData.personal.ownerPicUrl}" alt="Owner Pic" class="w-32 h-32 rounded-full object-cover shadow-lg mx-auto">
                <p><strong>Name:</strong> ${appData.personal.fullName}</p>
                <p><strong>Contact:</strong> ${appData.personal.contactNumber}</p>
            </div>
            <!-- Page Info -->
            <div class="md:col-span-2 space-y-4">
                <h3 class="font-semibold text-lg">Page & Content Info</h3>
                <p><strong>Page Name:</strong> ${appData.page.pageName}</p>
                <p><strong>Link:</strong> <a href="${appData.page.pageLink}" target="_blank" class="text-blue-500 hover:underline">${appData.page.pageLink}</a></p>
                <p><strong>Platform:</strong> ${appData.page.platform}</p>
                <p><strong>Followers:</strong> ${Number(appData.page.followers).toLocaleString()}</p>
                <p><strong>Category:</strong> ${appData.page.category}</p>
                <div class="prose prose-sm"><p><strong>Bio:</strong> ${appData.page.bio}</p></div>
                <div class="prose prose-sm"><p><strong>Description:</strong> ${appData.page.description}</p></div>
                <h4 class="font-semibold pt-4 border-t">Analytics Screenshots</h4>
                <div class="flex space-x-4">
                    <a href="${appData.analytics.ss1}" target="_blank"><img src="${appData.analytics.ss1}" class="w-32 h-32 object-cover rounded"></a>
                    <a href="${appData.analytics.ss2}" target="_blank"><img src="${appData.analytics.ss2}" class="w-32 h-32 object-cover rounded"></a>
                </div>
            </div>
        `;

        modalFooter.innerHTML = `
            <button onclick="handleApplication('${userId}', 'rejected')" class="bg-red-500 text-white px-4 py-2 rounded-md font-semibold">Reject</button>
            <button onclick="handleApplication('${userId}', 'approved')" class="bg-green-500 text-white px-4 py-2 rounded-md font-semibold">Approve</button>
        `;

        modal.classList.remove('hidden');
        setTimeout(() => modal.classList.remove('opacity-0'), 10);
        setTimeout(() => modal.querySelector('.modal-content').classList.remove('scale-95'), 10);
    }
    
    function closeModal() {
        modal.classList.add('opacity-0');
        modal.querySelector('.modal-content').classList.add('scale-95');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    closeModalBtn.addEventListener('click', closeModal);

    /**
     * Handles the approval or rejection of an influencer application.
     */
    window.handleApplication = async (userId, status) => {
        if (!confirm(`Are you sure you want to ${status} this application?`)) return;

        const userRef = doc(db, 'users', userId);
        const actionBtn = modalFooter.querySelector(`button[onclick*="${status}"]`);
        actionBtn.disabled = true;
        actionBtn.textContent = 'Processing...';

        try {
            let updateData = { applicationStatus: status };
            if (status === 'approved') {
                updateData.role = 'influencer';
                // You can add more fields here, like influencerId
            }
            
            await updateDoc(userRef, updateData);
            
            alert(`Application has been ${status}.`);
            closeModal();
            document.getElementById(`card-${userId}`).remove(); // Remove card from the list
            
        } catch (error) {
            console.error(`Error updating application:`, error);
            alert('Failed to update status.');
            actionBtn.disabled = false;
            actionBtn.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        }
    };
});
