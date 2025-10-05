// static/affiliate-withdraw.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, addDoc, query, where, orderBy, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const withdrawContent = getElement('withdraw-content');
    const currentBalanceEl = getElement('current-balance');
    const withdrawForm = getElement('withdraw-form');
    const amountInput = getElement('amount');
    const amountError = getElement('amount-error');
    const historyContainer = getElement('history-container');
    const logoutBtn = getElement('logout-btn');

    // --- State & Config ---
    let availableBalance = 0;
    const MIN_WITHDRAWAL = 20;

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'affiliate') {
                    availableBalance = docSnap.data().affiliateBalance || 0;
                    await loadPage();
                } else {
                    throw new Error('You are not an approved affiliate.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-600 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/affiliate/withdraw`;
        }
    });

    /**
     * Main function to load UI and history.
     */
    async function loadPage() {
        currentBalanceEl.textContent = `৳${availableBalance.toFixed(2)}`;
        await fetchWithdrawalHistory();
        loadingContainer.classList.add('hidden');
        withdrawContent.classList.remove('hidden');
    }

    /**
     * Fetches and displays the user's withdrawal history.
     */
    async function fetchWithdrawalHistory() {
        try {
            const withdrawalsRef = collection(db, 'withdrawals');
            const q = query(withdrawalsRef, where("userId", "==", auth.currentUser.uid), orderBy("requestedAt", "desc"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                historyContainer.innerHTML = '<p class="text-center text-gray-500 py-4">You have no withdrawal history.</p>';
                return;
            }

            const tableHTML = `
                <table class="min-w-full bg-white">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="py-2 px-3 text-left text-xs font-medium text-gray-500">Date</th>
                            <th class="py-2 px-3 text-left text-xs font-medium text-gray-500">Amount</th>
                            <th class="py-2 px-3 text-left text-xs font-medium text-gray-500">Method</th>
                            <th class="py-2 px-3 text-left text-xs font-medium text-gray-500">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        ${snapshot.docs.map(doc => createHistoryRow(doc.data())).join('')}
                    </tbody>
                </table>`;
            historyContainer.innerHTML = tableHTML;
        } catch (error) {
            console.error("Error fetching withdrawal history:", error);
            historyContainer.innerHTML = '<p class="text-center text-red-500 py-4">Could not load history.</p>';
        }
    }

    function createHistoryRow(withdrawal) {
        const date = withdrawal.requestedAt?.toDate().toLocaleDateString() || 'N/A';
        const status = withdrawal.status || 'pending';
        const statusColors = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return `
            <tr>
                <td class="py-3 px-3 text-sm">${date}</td>
                <td class="py-3 px-3 font-semibold">৳${withdrawal.amount.toFixed(2)}</td>
                <td class="py-3 px-3 text-sm capitalize">${withdrawal.method} - ${withdrawal.accountNumber}</td>
                <td class="py-3 px-3">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status]} capitalize">${status}</span>
                </td>
            </tr>
        `;
    }

    /**
     * Handles the withdrawal request form submission.
     */
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        amountError.classList.add('hidden');
        const submitBtn = getElement('submit-request-btn');
        
        const amount = Number(amountInput.value);
        const method = getElement('method').value;
        const accountNumber = getElement('accountNumber').value;

        // --- Validation ---
        if (amount < MIN_WITHDRAWAL) {
            amountError.textContent = `Minimum withdrawal amount is ৳${MIN_WITHDRAWAL}.`;
            amountError.classList.remove('hidden');
            return;
        }
        if (amount > availableBalance) {
            amountError.textContent = 'Withdrawal amount cannot exceed your available balance.';
            amountError.classList.remove('hidden');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const withdrawalRequest = {
                userId: auth.currentUser.uid,
                amount: amount,
                method: method,
                accountNumber: accountNumber,
                status: 'pending',
                requestedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'withdrawals'), withdrawalRequest);
            
            alert('Your withdrawal request has been submitted successfully!');
            withdrawForm.reset();
            await fetchWithdrawalHistory(); // Refresh history

        } catch (error) {
            console.error("Error submitting withdrawal request:", error);
            alert('Failed to submit request. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Request';
        }
    });

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
