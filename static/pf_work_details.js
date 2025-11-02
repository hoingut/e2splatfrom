// static/pf_work_details.js (Simplified for 'allow read, write: if request.auth != null;')

import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, setDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const workId = window.location.pathname.split('/').pop();

// DOM References
const loadingContainer = document.getElementById('loading-container');
const workDetailsContent = document.getElementById('work-details-content');
const actionArea = document.getElementById('action-area');
const backLink = document.getElementById('back-link');

let currentPost = null;
let currentUser = null;
let isInfluencerViewingOwnPost = false; // Flag for self-check

// --- Helper Functions ---

function showLoader(btn) {
    btn.disabled = true;
    btn.querySelector('.loader').style.display = 'inline-block';
}

// Function to render the Hire/Order Form for Brands (or any logged-in user)
function renderBrandActionArea(post) {
    actionArea.innerHTML = `
        <h3 class="text-lg font-semibold mb-4 text-white">Order Influencer Service</h3>
        
        <div class="bg-yellow-50/10 border border-yellow-400/30 p-3 rounded-md text-sm text-yellow-200 mb-4">
            <p><strong>Total Payment Due: ৳${post.budget.toLocaleString()}</strong></p>
            <p class="mt-1">Please send the full amount to the official bKash/Nagad number below.</p>
        </div>
        
        <div class="mb-4">
            <p class="text-gray-400 mb-2">Official Payment Number (bKash/Nagad Personal):</p>
            <p class="font-mono text-xl text-mulberry bg-gray-800 p-2 rounded">01700000000</p>
        </div>

        <form id="hire-influencer-form" class="space-y-4">
            <div>
                <label for="trxId" class="block text-sm text-gray-400">Transaction ID (TrxID)</label>
                <input type="text" id="trxId" class="mt-1 w-full p-2 rounded-md bg-gray-800 border-dark" required>
            </div>
            <div>
                <label for="senderNumber" class="block text-sm text-gray-400">Your Sender Number</label>
                <input type="tel" id="senderNumber" class="mt-1 w-full p-2 rounded-md bg-gray-800 border-dark" required>
            </div>
            
            <button type="submit" id="submit-hire-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-md transition flex items-center justify-center">
                Confirm Payment & Hire <span class="loader"></span>
            </button>
            <p id="form-error" class="text-red-500 text-sm mt-2 hidden"></p>
        </form>
    `;

    document.getElementById('hire-influencer-form').addEventListener('submit', handleHireSubmission);
}

// Function to handle the submission of the Hire Form
async function handleHireSubmission(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-hire-btn');
    const formError = document.getElementById('form-error');
    formError.classList.add('hidden');
    
    if (!currentUser) {
        // Should not happen if the UI is correctly rendered, but safety check
        alert("Authentication error. Please log in again.");
        return;
    }
    
    showLoader(submitBtn);

    const trxId = document.getElementById('trxId').value.trim();
    const senderNumber = document.getElementById('senderNumber').value.trim();
    
    try {
        if (currentPost.authorId === currentUser.uid) {
            throw new Error("You cannot hire yourself.");
        }

        // --- Brand/User Profile Fetch (for better data logging) ---
        const brandDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
        const brandName = brandDocSnap.exists() ? brandDocSnap.data().name || currentUser.email : currentUser.email;

        // 1. Create the 'work' document (Work Contract)
        const workData = {
            // General Info
            postId: workId,
            title: currentPost.title,
            budget: currentPost.budget,
            category: currentPost.category,
            createdAt: serverTimestamp(),
            
            // Brand (Buyer) Info
            brandId: currentUser.uid,
            brandName: brandName,
            
            // Influencer (Seller) Info
            influencerId: currentPost.authorId,
            influencerName: currentPost.authorName,
            
            // Payment Info (Needs Admin Verification)
            payment: {
                amount: currentPost.budget,
                trxId: trxId,
                senderNumber: senderNumber,
                status: 'pending-verification'
            },
            
            // Status: Waiting for Admin check before moving to 'in-progress'.
            status: 'pending-payment-verification',
            
            // Work deliverables snapshot (for influencer inbox)
            platforms: currentPost.platforms,
            contentTypes: currentPost.contentTypes,
            deliveryTime: currentPost.deliveryTime,
        };
        
        console.log("[SUBMIT] Work Contract Data:", workData);

        // This requires WRITE permission on the 'works' collection
        const newWorkRef = doc(collection(db, 'works'));
        await setDoc(newWorkRef, workData);

        alert("Order placed successfully! Waiting for payment confirmation from Admin.");
        actionArea.innerHTML = `<div class="bg-blue-900/50 p-4 rounded-md text-center text-blue-300">
                                    <i class="fas fa-check-circle text-xl mb-2 block"></i>
                                    <p class="font-semibold">Order Placed.</p>
                                    <p class="text-sm">Your payment details have been recorded. The Admin will verify the transaction soon. The influencer will be notified once approved.</p>
                                </div>`;

    } catch (error) {
        console.error("Hire submission failed:", error);
        
        let displayMessage = "Submission failed. Check console for details.";
        if (error.code === 'permission-denied') {
             displayMessage = "ERROR: Firebase Rules Denied Write Access to 'works' collection. The user is logged in, but the simplified rule might be cached incorrectly. Try clearing cache or re-publishing the rule.";
        }
        
        formError.textContent = error.message.includes('hire yourself') ? error.message : displayMessage;
        formError.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Confirm Payment & Hire';
    } finally {
        submitBtn.querySelector('.loader').style.display = 'none';
    }
}


// Function to render the default view (Job Details)
function renderWorkDetails(post) {
    currentPost = post;
    
    // Set basic details
    document.getElementById('work-title').textContent = post.title;
    document.getElementById('work-image').src = post.coverImage || 'https://via.placeholder.com/800x450';
    document.getElementById('work-description').innerHTML = post.description.replace(/\n/g, '<br>');
    document.getElementById('work-budget').textContent = `৳${post.budget.toLocaleString()}`;
    document.getElementById('work-category').textContent = post.category;
    document.getElementById('work-mood').textContent = post.mood;
    document.getElementById('work-platforms').textContent = post.platforms ? post.platforms.join(', ') : 'N/A';
    document.getElementById('work-content-types').textContent = post.contentTypes ? post.contentTypes.join(', ') : 'N/A';
    document.getElementById('work-delivery-time').textContent = post.deliveryTime || 'N/A';
    
    // Set Influencer Snapshot Details
    const snapshot = post.influencerSnapshot;
    document.getElementById('influencer-name').textContent = post.authorName || snapshot.pageName;
    document.getElementById('influencer-followers').textContent = snapshot.followers ? snapshot.followers.toLocaleString() : 'N/A';
    document.getElementById('influencer-pic').src = snapshot.pageProfilePicUrl || 'https://via.placeholder.com/80';
    document.getElementById('influencer-profile-link').href = `/pf/influencer/${post.authorId}`;


    // Set Action Area based on Auth Status
    if (!currentUser) { // Guest
        actionArea.innerHTML = `<div class="p-4 bg-gray-800 rounded-md text-center">
            <p class="text-gray-400">Please <a href="/login?redirect=/pf/work/${workId}" class="text-mulberry hover:underline font-semibold">Log in</a> to place an order.</p>
        </div>`;
    } else if (currentPost.authorId === currentUser.uid) { // Influencer viewing their own post
        actionArea.innerHTML = `<div class="p-4 bg-mulberry/20 border border-mulberry rounded-md text-center">
            <p class="font-semibold text-white">This is YOUR service package.</p>
            <p class="text-sm text-gray-400 mt-2">Check your <a href="/pf/influencer/inbox" class="text-mulberry hover:underline">Inbox</a> for incoming orders.</p>
        </div>`;
    } else {
        // Logged-in user/Brand
        renderBrandActionArea(post);
    }
    
    loadingContainer.style.display = 'none';
    workDetailsContent.classList.remove('hidden');
}

// --- Initialization ---

async function init() {
    backLink.href = `/pf/influpost`; // Link back to the influencer service market

    // 1. Get User/Auth Status and load data sequentially
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
        } 
        
        // 2. Fetch Post Details
        const postRef = doc(db, 'posts', workId);
        try {
            // CRITICAL: Must check READ access here first.
            const docSnap = await getDoc(postRef); 
            if (docSnap.exists()) {
                const post = docSnap.data();
                
                // We only show approved services here
                if (post.postType === 'influencer_service' && post.isApproved === true) {
                    renderWorkDetails(post);
                } else {
                    throw new Error("Post not found or not approved.");
                }
            } else {
                throw new Error("Post not found.");
            }
        } catch (error) {
            console.error("Error loading post:", error);
            
            let displayError = "Error 404: The requested service package was not found.";
            if (error.code === 'permission-denied') {
                 displayError = "ERROR: You do not have permission to read this post. If you are logged out, please log in.";
            }

            loadingContainer.innerHTML = `<div class="text-red-500 text-center py-20"><h1 class="text-3xl">${displayError}</h1><p class="mt-2 text-gray-400">${error.message}</p></div>`;
            workDetailsContent.classList.add('hidden');
        }
    });
}

init();
