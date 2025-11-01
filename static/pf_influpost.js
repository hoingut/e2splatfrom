// static/pf_influpost.js

import { db } from './firebaseConfig.js';
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const getElement = (id) => document.getElementById(id);
    const postListGrid = getElement('post-list-grid');
    const loadingSpinner = getElement('loading-spinner');
    const noResults = getElement('no-results');
    
    // --- Core Logic ---
    
    /**
     * Fetches and renders approved influencer service posts.
     */
    async function fetchInfluencerPosts() {
        loadingSpinner.style.display = 'block';
        postListGrid.innerHTML = '';
        noResults.classList.add('hidden');

        try {
            const postsRef = collection(db, 'posts');
            
            // Query: 
            // 1. Must be an influencer service post.
            // 2. Must be approved by admin.
            // 3. Ordered by creation date (newest first for "random" feel).
            
            // NOTE: Firestore does not support truly random order. 
            // We use 'createdAt' descending (newest first).
            const q = query(
                postsRef, 
                where('postType', '==', 'influencer_service'),
                where('isApproved', '==', true),
                orderBy('createdAt', 'desc'),
                limit(30) // Limit to a reasonable number
            );

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                noResults.classList.remove('hidden');
            } else {
                postListGrid.innerHTML = querySnapshot.docs.map(doc => 
                    createServiceCard({ id: doc.id, ...doc.data() })
                ).join('');
            }

        } catch (error) {
            console.error("Error fetching influencer services:", error);
            noResults.classList.remove('hidden');
            noResults.innerHTML = `<p class="text-red-500 font-bold mt-4">Error loading services. Check Firebase Rules or Console.</p><p class="text-sm text-gray-500">${error.message}</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    /**
     * Creates the HTML card for an Influencer Service Post.
     * Reuses the styling from pf_home.js's Job Card but adapted for services.
     */
    function createServiceCard(post) {
        // Use influencerSnapshot for quick access to profile info
        const snapshot = post.influencerSnapshot || {}; 
        const description = (post.description || '').substring(0, 130);
        
        return `
            <div class="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
                <div class="p-4 flex items-center space-x-3">
                    <img src="${snapshot.pageProfilePicUrl || 'https://via.placeholder.com/50'}" alt="Influencer Profile" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <h3 class="font-bold">${snapshot.pageName || 'Verified Influencer'}</h3>
                        <p class="text-xs text-gray-400 capitalize">${post.category || 'General'}</p>
                    </div>
                </div>
                ${post.coverImage ? `<img src="${post.coverImage}" alt="Service Image" class="w-full h-56 object-cover">` : ''}
                <div class="p-4 border-t border-gray-800 flex-grow">
                    <h4 class="text-lg font-semibold">${post.title}</h4>
                    <p class="text-sm text-gray-400 mt-2">${description}${description.length >= 130 ? '...' : ''}</p>
                    <div class="mt-3 text-xs text-gray-500">
                        Platforms: ${post.platforms ? post.platforms.join(', ') : 'N/A'}
                    </div>
                </div>
                <div class="p-4 flex justify-between items-center bg-gray-900">
                    <div>
                        <span class="text-xs text-gray-400">Price</span>
                        <p class="font-bold text-lg text-green-500">৳${(post.budget || 0).toLocaleString()}</p>
                    </div>
                    <a href="/pf/work/${post.id}" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-5 rounded-full transition text-sm">View & Order</a>
                </div>
            </div>`;
    }

    // Initialize
    fetchInfluencerPosts();
});
