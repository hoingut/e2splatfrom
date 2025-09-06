

    <!-- Firebase SDKs and custom script -->
    <script type="module" src="/static/firebaseConfig.js"></script>
    <script type="module" src="/static/admin-affiliates.js">
// static/admin-affiliates.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const pendingListBody = document.getElementById('pending-list-body');
    const approvedListBody = document.getElementById('approved-list-body');
    
    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    // User is an admin, load both lists
                    await Promise.all([
                        fetchPendingApplications(),
                        fetchApprovedAffiliates()
                    ]);
                } else {
                    throw new Error('You do not have permission to view this page.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/admin/affiliates`;
        }
    });
// static/admin-affiliates.js

// ... (ফাইলের উপরের অংশ আগের মতোই থাকবে)

/**
 * Fetches users with 'pending' affiliate status and displays them.
 */
async function fetchPendingApplications() {
    // Add a loading state for better UX
    pendingListBody.innerHTML = `<tr><td colspan="3" class="text-center p-4">Loading pending applications...</td></tr>`;

    try {
        console.log("--- DEBUG: Fetching users with affiliateStatus == 'pending'");
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("affiliateStatus", "==", "pending"));
        const querySnapshot = await getDocs(q);

        console.log(`--- DEBUG: Found ${querySnapshot.size} pending applications.`);

        if (querySnapshot.empty) {
            pendingListBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">No pending applications found.</td></tr>`;
            return;
        }

        let html = '';
        querySnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            const joinDate = user.createdAt?.toDate().toLocaleDateString() || 'N/A';
            html += `
                <tr id="pending-row-${user.id}">
                    <td class="p-4 align-top">
                        <div class="font-bold">${user.name}</div>
                        <div class="text-sm text-gray-600">${user.email}</div>
                    </td>
                    <td class="p-4 align-top text-sm">${joinDate}</td>
                    <td class="p-4 align-top flex space-x-2">
                        <button onclick="handleApplication('${user.id}', true)" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Approve</button>
                        <button onclick="handleApplication('${user.id}', false)" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Reject</button>
                    </td>
                </tr>
            `;
        });
        pendingListBody.innerHTML = html;
    } catch (error) {
        console.error("--- DEBUG: Error fetching pending applications:", error);
        pendingListBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-red-500">Failed to load applications. Check console for errors.</td></tr>`;
    }
}

// ... (ফাইলের বাকি অংশ আগের মতোই থাকবে)

    /**
     * Fetches users with 'affiliate' role and displays them.
     */
    async function fetchApprovedAffiliates() {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("role", "==", "affiliate"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            approvedListBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">No approved affiliates found.</td></tr>`;
            return;
        }

        let html = '';
        querySnapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            const balance = typeof user.affiliateBalance === 'number' ? user.affiliateBalance.toFixed(2) : '0.00';
            html += `
                <tr>
                    <td class="p-4 align-top">
                        <div class="font-bold">${user.name}</div>
                        <div class="text-sm text-gray-600">${user.email}</div>
                        <div class="font-mono text-xs mt-1">ID: ${user.affiliateId || 'N/A'}</div>
                    </td>
                    <td class="p-4 align-top text-sm">
                        <div><strong>Balance:</strong> ৳${balance}</div>
                        <!-- You can add order count here later -->
                    </td>
                    <td class="p-4 align-top">
                        <button onclick="revokeAffiliate('${user.id}')" class="bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600">Revoke</button>
                    </td>
                </tr>
            `;
        });
        approvedListBody.innerHTML = html;
    }

    /**
     * Handles the approval or rejection of an affiliate application.
     * @param {string} userId - The ID of the user.
     * @param {boolean} isApproved - True to approve, false to reject.
     */
    window.handleApplication = async (userId, isApproved) => {
        const userRef = doc(db, 'users', userId);
        const action = isApproved ? 'approve' : 'reject';
        
        if (!confirm(`Are you sure you want to ${action} this application?`)) return;

        try {
            if (isApproved) {
                await updateDoc(userRef, {
                    role: 'affiliate',
                    affiliateStatus: 'approved',
                    affiliateId: `AFF-${userId.substring(0, 6).toUpperCase()}`,
                    affiliateBalance: 0 // Initialize balance
                });
                alert('Application approved successfully!');
            } else {
                await updateDoc(userRef, {
                    affiliateStatus: 'rejected'
                });
                alert('Application rejected.');
            }
            // Refresh both lists to reflect the change
            await fetchPendingApplications();
            await fetchApprovedAffiliates();
        } catch (error) {
            console.error(`Error ${action}ing application:`, error);
            alert(`Failed to ${action} the application.`);
        }
    };
    
    /**
     * Revokes an affiliate's status, changing their role back to 'customer'.
     * @param {string} userId - The ID of the affiliate.
     */
    window.revokeAffiliate = async (userId) => {
        if (!confirm('Are you sure you want to revoke this affiliate\'s status? Their role will be changed back to customer.')) return;
        
        const userRef = doc(db, 'users', userId);
        try {
            await updateDoc(userRef, {
                role: 'customer',
                affiliateStatus: 'revoked' // Or just remove the affiliate fields
            });
            alert('Affiliate status has been revoked.');
            await fetchPendingApplications();
            await fetchApprovedAffiliates();
        } catch(error) {
            console.error('Error revoking affiliate status:', error);
            alert('Failed to revoke status.');
        }
    };
});
