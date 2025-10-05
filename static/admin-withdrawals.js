

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const pendingBody = document.getElementById('pending-withdrawals-body');
    const completedBody = document.getElementById('completed-withdrawals-body');
    
    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    // User is an admin, load withdrawal requests
                    await fetchWithdrawals();
                } else {
                    throw new Error('You do not have permission to view this page.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/admin/withdrawals`;
        }
    });

    /**
     * Fetches all withdrawal requests and separates them into pending and completed lists.
     */
    async function fetchWithdrawals() {
        pendingBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">Loading...</td></tr>`;
        completedBody.innerHTML = `<tr><td colspan="3" class="text-center p-4">Loading...</td></tr>`;

        try {
            const withdrawalsRef = collection(db, 'withdrawals');
            const q = query(withdrawalsRef, orderBy('requestedAt', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                pendingBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">No pending requests.</td></tr>`;
                completedBody.innerHTML = `<tr><td colspan="3" class="text-center p-4 text-gray-500">No completed requests.</td></tr>`;
                return;
            }

            let pendingHTML = '';
            let completedHTML = '';

            // Using Promise.all to fetch user data for each withdrawal in parallel
            const withdrawalPromises = querySnapshot.docs.map(async (withdrawalDoc) => {
                const withdrawal = { id: withdrawalDoc.id, ...withdrawalDoc.data() };
                const userRef = doc(db, 'users', withdrawal.userId);
                const userSnap = await getDoc(userRef);
                withdrawal.userName = userSnap.exists() ? userSnap.data().name : 'Unknown User';
                return withdrawal;
            });
            
            const withdrawalsWithUserData = await Promise.all(withdrawalPromises);

            withdrawalsWithUserData.forEach(withdrawal => {
                if (withdrawal.status === 'pending') {
                    pendingHTML += createPendingRow(withdrawal);
                } else {
                    completedHTML += createCompletedRow(withdrawal);
                }
            });

            pendingBody.innerHTML = pendingHTML || `<tr><td colspan="4" class="text-center p-4 text-gray-500">No pending requests.</td></tr>`;
            completedBody.innerHTML = completedHTML || `<tr><td colspan="3" class="text-center p-4 text-gray-500">No completed requests.</td></tr>`;

        } catch (error) {
            console.error("Error fetching withdrawals:", error);
            pendingBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Failed to load requests.</td></tr>`;
        }
    }

    /**
     * Creates HTML for a pending withdrawal request row.
     */
    function createPendingRow(w) {
        const reqDate = w.requestedAt?.toDate().toLocaleString() || 'N/A';
        return `
            <tr id="withdrawal-row-${w.id}">
                <td class="p-4 align-top">
                    <div class="font-bold">${w.userName}</div>
                    <div class="text-sm text-gray-500 font-mono">${w.userId}</div>
                </td>
                <td class="p-4 align-top">
                    <div class="font-semibold text-lg text-red-600">৳${w.amount.toFixed(2)}</div>
                    <div class="text-xs text-gray-500">Requested on: ${reqDate}</div>
                </td>
                <td class="p-4 align-top text-sm">
                    <div><strong>Method:</strong> ${w.method}</div>
                    <div><strong>Number:</strong> ${w.accountNumber}</div>
                    ${w.accountHolder ? `<div><strong>Name:</strong> ${w.accountHolder}</div>` : ''}
                </td>
                <td class="p-4 align-top flex flex-col space-y-2">
                    <button onclick="handleWithdrawal('${w.id}', 'paid')" class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">Mark as Paid</button>
                    <button onclick="handleWithdrawal('${w.id}', 'rejected')" class="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600">Reject</button>
                </td>
            </tr>
        `;
    }

    /**
     * Creates HTML for a completed/rejected withdrawal request row.
     */
    function createCompletedRow(w) {
        const statusClass = w.status === 'paid' ? 'text-green-600' : 'text-red-600';
        return `
            <tr>
                <td class="p-4 align-top">
                    <div class="font-bold">${w.userName}</div>
                    <div class="text-sm text-gray-500 font-mono">${w.userId}</div>
                </td>
                <td class="p-4 align-top">
                    <div class="font-semibold">৳${w.amount.toFixed(2)}</div>
                    <div class="text-xs text-gray-500">${w.method} - ${w.accountNumber}</div>
                </td>
                <td class="p-4 align-top font-bold capitalize ${statusClass}">${w.status}</td>
            </tr>
        `;
    }

    /**
     * Handles marking a withdrawal as 'paid' or 'rejected'.
     * @param {string} withdrawalId - The ID of the withdrawal document.
     * @param {string} newStatus - The new status ('paid' or 'rejected').
     */
    window.handleWithdrawal = async (withdrawalId, newStatus) => {
        const action = newStatus === 'paid' ? 'pay' : 'reject';
        if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;

        const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
        try {
            await updateDoc(withdrawalRef, {
                status: newStatus,
                processedAt: serverTimestamp()
            });

            // IMPORTANT: If 'paid', the user's affiliateBalance MUST be deducted.
            // This is a simplified example. For production, use a Cloud Function transaction.
            if (newStatus === 'paid') {
                const withdrawalDoc = await getDoc(withdrawalRef);
                const { userId, amount } = withdrawalDoc.data();
                const userRef = doc(db, 'users', userId);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                    const currentBalance = userDoc.data().affiliateBalance || 0;
                    await updateDoc(userRef, {
                        affiliateBalance: currentBalance - amount
                    });
                }
            }
            
            alert(`Request successfully marked as ${newStatus}.`);
            await fetchWithdrawals(); // Refresh the lists

        } catch (error) {
            console.error(`Error marking request as ${newStatus}:`, error);
            alert(`Failed to update request status.`);
        }
    };
});
