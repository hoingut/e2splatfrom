// static/pf_influencer_profile.js

// --- Imports ---
import { db } from './firebaseConfig.js';
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const loadingContainer = getElement('loading-container');
    const profileContent = getElement('profile-content');

    // --- Get Influencer ID from URL ---
    const userId = window.location.pathname.split('/').pop();

    /**
     * Main function to load all profile data.
     */
    async function loadProfile() {
        if (!userId) {
            displayError("Influencer ID not found in URL.");
            return;
        }

        try {
            // Fetch influencer's main data and their service posts in parallel
            const [userData, servicePosts] = await Promise.all([
                fetchUserProfile(userId),
                fetchServicePosts(userId)
            ]);

            // If user is not an influencer, show an error
            if (userData.role !== 'influencer' || !userData.influencerApplication) {
                throw new Error("This user is not a registered influencer.");
            }

            // Populate all sections of the profile
            populateProfileCard(userData);
            populateStats(userId); // Fetches stats separately
            populateSocialLinks(userData.influencerApplication.page.platforms);
            populateBio(userData.influencerApplication.page);
            displayServicePosts(servicePosts);

            loadingContainer.classList.add('hidden');
            profileContent.classList.remove('hidden');

        } catch (error) {
            console.error("Error loading influencer profile:", error);
            displayError(error.message);
        }
    }

    /**
     * Fetches the main user document from Firestore.
     */
    async function fetchUserProfile(uid) {
        const userRef = doc(db, 'users', uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        throw new Error("Profile not found.");
    }

    /**
     * Fetches the service posts created by the influencer.
     */
    async function fetchServicePosts(uid) {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where("authorId", "==", uid), where("type", "==", "service"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // --- UI Population Functions ---

    function populateProfileCard(userData) {
        const profile = userData.influencerApplication.page;
        const personal = userData.influencerApplication.personal;

        getElement('profile-pic').src = profile.pageProfilePicUrl || 'https://via.placeholder.com/128';
        getElement('page-name').innerHTML = `${profile.pageName} <i class="fas fa-check-circle text-blue-500 text-lg ml-2"></i>`;
        getElement('category').textContent = profile.category;
        getElement('owner-name').textContent = `by ${personal.fullName}`;
    }

    async function populateStats(userId) {
        const profile = (await getDoc(doc(db, 'users', userId))).data().influencerApplication.page;
        getElement('stat-followers').textContent = (profile.followers || 0).toLocaleString();

        const worksRef = collection(db, 'works');
        const q = query(worksRef, where("influencerId", "==", userId), where("status", "==", "completed"));
        const snapshot = await getDocs(q);
        getElement('stat-works-completed').textContent = snapshot.size;
    }
    
    function populateSocialLinks(platforms) {
        if (!platforms) return;
        const socialLinksEl = getElement('social-links');
        let linksHTML = '';
        if (platforms.facebook) linksHTML += `<a href="${platforms.facebook}" target="_blank" class="text-2xl text-gray-400 hover:text-blue-500"><i class="fab fa-facebook"></i></a>`;
        if (platforms.instagram) linksHTML += `<a href="${platforms.instagram}" target="_blank" class="text-2xl text-gray-400 hover:text-pink-500"><i class="fab fa-instagram"></i></a>`;
        if (platforms.youtube) linksHTML += `<a href="${platforms.youtube}" target="_blank" class="text-2xl text-gray-400 hover:text-red-500"><i class="fab fa-youtube"></i></a>`;
        socialLinksEl.innerHTML = linksHTML;
    }

    function populateBio(pageData) {
        getElement('bio').innerHTML = `<p>${pageData.bio || 'No bio provided.'}</p><br><p>${pageData.description || ''}</p>`;
    }

    function displayServicePosts(posts) {
        const listEl = getElement('service-posts-list');
        if (!posts || posts.length === 0) {
            listEl.innerHTML = `<p class="text-gray-500">This influencer has not offered any services yet.</p>`;
            return;
        }
        listEl.innerHTML = posts.map(post => `
            <div class="border-b border-dark pb-4">
                <a href="/pf/work/${post.id}" class="font-semibold hover:text-mulberry text-lg">${post.title}</a>
                <p class="text-sm text-gray-400 mt-1">${post.description.substring(0, 100)}...</p>
                <div class="flex justify-between items-center mt-2">
                    <span class="font-bold text-mulberry">৳${(post.budget || 0).toLocaleString()}</span>
                    <a href="/pf/work/${post.id}" class="text-sm font-semibold text-blue-400 hover:underline">View Service &rarr;</a>
                </div>
            </div>
        `).join('');
    }

    function displayError(message) {
        loadingContainer.classList.add('hidden');
        profileContent.innerHTML = `<div class="text-center p-10"><p class="text-red-500">${message}</p></div>`;
    }

    // --- Initial Call ---
    loadProfile();
});
