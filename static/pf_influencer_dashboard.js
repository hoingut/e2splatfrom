// static/pf_influencer_dashboard.js

// --- Imports ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const dashboardContent = getElement('dashboard-content');
    const logoutBtn = getElement('logout-btn');

    // --- Authentication and Authorization Check ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                const docSnap = await getDoc(userRef);
                
                if (docSnap.exists() && docSnap.data().role === 'influencer') {
                    const userData = { id: docSnap.id, ...docSnap.data() };
                    await loadDashboardData(userData);
                } else {
                    throw new Error('Access denied. You are not an approved influencer.');
                }
            } catch (error) {
                document.body.innerHTML = `<div class="text-center p-10"><h1 class="text-2xl text-red-500 font-bold">Access Denied</h1><p>${error.message}</p></div>`;
            }
        } else {
            window.location.href = `/login?redirect=/pf/dashboard/i`;
        }
    });

    /**
     * Main function to load all data for the influencer dashboard.
     * @param {object} userData - The influencer's full user data.
     */
    async function loadDashboardData(userData) {
        try {
            // Fetch stats and posts in parallel for faster loading
            const [stats, posts] = await Promise.all([
                fetchInfluencerStats(userData.id),
                fetchInfluencerPosts(userData.id)
            ]);
            
            // Populate all sections of the dashboard
            populateProfileHeader(userData);
            populateStatsCards(userData, stats);
            displayPosts(posts);

            loadingContainer.classList.add('hidden');
            dashboardContent.classList.remove('hidden');

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            dashboardContent.innerHTML = `<p class="text-red-500">Failed to load dashboard. ${error.message}</p>`;
        }
    }

    /**
     * Populates the profile header section.
     */
    function populateProfileHeader(userData) {
        const profile = userData.influencerApplication?.page; // Safely access nested object
        if (!profile) return;
        
        getElement('profile-pic').src = profile.pageProfilePicUrl || 'https://via.placeholder.com/100';
        getElement('page-name').textContent = profile.pageName || 'No Name';
        getElement('category').textContent = profile.category || 'No Category';
        getElement('username').textContent = `@${userData.name || 'username'}`;

        const copyLinkBtn = getElement('copy-profile-link');
        copyLinkBtn.addEventListener('click', () => {
            const profileUrl = `${window.location.origin}/pf/influencer/${userData.id}`;
            navigator.clipboard.writeText(profileUrl).then(() => {
                alert('Profile link copied to clipboard!');
            });
        });
    }
    
    /**
     * Populates the main stats cards.
     */
    function populateStatsCards(userData, stats) {
        getElement('balance').textContent = `৳${(userData.affiliateBalance || 0).toFixed(2)}`;
        getElement('works-completed').textContent = stats.completed;
        getElement('total-earned').textContent = `৳${(stats.totalEarned || 0).toFixed(2)}`;
        getElement('pending-works').textContent = stats.pending;
    }

    /**
     * Fetches statistics about the influencer's work.
     */
    async function fetchInfluencerStats(userId) {
        const worksRef = collection(db, 'works'); // Assuming you have a 'works' collection for collaborations
        const q = query(worksRef, where("influencerId", "==", userId));
        const snapshot = await getDocs(q);

        let completed = 0;
        let pending = 0;
        let totalEarned = 0;

        snapshot.forEach(doc => {
            const work = doc.data();
            if (work.status === 'completed') {
                completed++;
                totalEarned += work.budget || 0;
            } else if (work.status === 'pending' || work.status === 'in-progress') {
                pending++;
            }
        });
        return { completed, pending, totalEarned };
    }

    /**
     * Fetches the influencer's own service posts.
     */
    async function fetchInfluencerPosts(userId) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where("authorId", "==", userId), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Displays the influencer's posts in the list.
     */
    function displayPosts(posts) {
        const postList = getElement('post-list');
        if (!posts || posts.length === 0) {
            postList.innerHTML = `<p class="text-gray-500">You haven't posted any services yet. <a href="/pf/dashboard/i/ad" class="text-mulberry">Post one now!</a></p>`;
            return;
        }

        postList.innerHTML = posts.map(post => `
            <div class="border-b border-dark pb-3">
                <a href="/pf/work/${post.id}" class="font-semibold hover:text-mulberry">${post.title}</a>
                <p class="text-xs text-gray-400">Budget: ৳${post.budget} - Status: <span class="capitalize">${post.status || 'Active'}</span></p>
            </div>
        `).join('');
    }

    // Logout button event listener
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            signOut(auth).catch(error => console.error('Logout Error:', error));
        });
    }
});
