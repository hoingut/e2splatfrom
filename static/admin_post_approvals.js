// static/admin_post_approvals.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const pendingListBody = document.getElementById('pending-list-body');

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                if (docSnap.exists() && docSnap.data().role === 'admin') {
                    await fetchPendingPosts();
                } else {
                    throw new Error('Access denied. Admins only.');
                }
            } catch (error) {
                document.body.innerHTML = `<p class="text-red-500 text-center p-10">${error.message}</p>`;
            }
        } else {
            window.location.href = `/login?redirect=/admin/post-approvals`;
        }
    });

    /**
     * Fetches posts with 'pending-approval' status and displays them.
     */
    async function fetchPendingPosts() {
        pendingListBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">Loading...</td></tr>`;
        try {
            const postsRef = collection(db, 'posts');
            const q = query(postsRef, where("status", "==", "pending-approval"));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                pendingListBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-gray-500">No posts are pending for approval.</td></tr>`;
                return;
            }

            pendingListBody.innerHTML = querySnapshot.docs.map(doc => createPostRow(doc.id, doc.data())).join('');

        } catch (error) {
            console.error("Error fetching pending posts:", error);
            pendingListBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-red-500">Failed to load posts.</td></tr>`;
        }
    }

    /**
     * Creates HTML for a single pending post row.
     */
    function createPostRow(postId, post) {
        const payment = post.paymentDetails;
        return `
            <tr id="post-row-${postId}" class="hover:bg-gray-50">
                <td class="p-4 align-top">
                    <p class="font-bold">${post.title}</p>
                    <p class="text-sm text-gray-600">by ${post.brandName}</p>
                </td>
                <td class="p-4 align-top font-semibold">
                    ৳${(post.budget || 0).toLocaleString()}
                </td>
                <td class="p-4 align-top text-sm">
                    <p><strong>TrxID:</strong> <span class="font-mono bg-gray-200 px-1 rounded">${payment.transactionId}</span></p>
                    <p><strong>Sender:</strong> ${payment.senderNumber}</p>
                    <p><strong>Amount:</strong> ৳${(payment.amount || 0).toLocaleString()}</p>
                </td>
                <td class="p-4 align-top">
                    <button onclick="window.handleApproval('${postId}', true)" class="bg-green-500 text-white px-3 py-2 rounded-md text-sm hover:bg-green-600">Approve</button>
                    <button onclick="window.handleApproval('${postId}', false)" class="bg-red-500 text-white px-3 py-2 rounded-md text-sm hover:bg-red-600 mt-2">Reject</button>
                </td>
            </tr>
        `;
    }

    /**
     * Handles the approval or rejection of a job post.
     * @param {string} postId - The ID of the post.
     * @param {boolean} isApproved - True to approve, false to reject.
     */
    window.handleApproval = async (postId, isApproved) => {
        const action = isApproved ? 'approve' : 'reject';
        if (!confirm(`Are you sure you want to ${action} this post?`)) return;

        const postRef = doc(db, 'posts', postId);
        
        try {
            if (isApproved) {
                // If approved, change status to 'open-for-proposals' and verify payment
                await updateDoc(postRef, {
                    status: 'open-for-proposals',
                    'paymentDetails.status': 'verified'
                });
                alert('Post approved and is now live!');
            } else {
                // If rejected, change status to 'rejected'
                await updateDoc(postRef, {
                    status: 'rejected',
                    'paymentDetails.status': 'rejected'
                });
                alert('Post has been rejected.');
            }
            // Remove the processed post from the list in the UI
            document.getElementById(`post-row-${postId}`).remove();
        } catch (error) {
            console.error(`Error ${action}ing post:`, error);
            alert(`Failed to ${action} the post.`);
        }
    };
});
