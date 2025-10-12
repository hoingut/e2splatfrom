// static/pf_home.js

// --- Step 1: Import all necessary functions and services from Firebase ---
import { auth, db } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- Step 2: DOM Element References ---
    const getElement = (id) => document.getElementById(id);
    const filterGrid = getElement('filter-grid');
    const filterTypeRadios = document.querySelectorAll('input[name="filter_for"]');
    const applyFiltersBtn = getElement('apply-filters-btn');
    const postListGrid = getElement('post-list-grid');
    const loadingSpinner = getElement('loading-spinner');
    const noResults = getElement('no-results');
    const loginBtn = getElement('login-btn');
    const dashboardBtn = getElement('dashboard-btn');

    // --- Step 3: Check Auth State for UI update ---
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginBtn.classList.add('hidden');
            dashboardBtn.classList.remove('hidden');
        } else {
            loginBtn.classList.remove('hidden');
            dashboardBtn.classList.add('hidden');
        }
    });
    
    // --- Step 4: Filter Definitions ---
    // This structure makes it easy to add/remove filters in the future.
    const filterDefinitions = {
        influencer: [
            { id: 'category', label: 'Category', type: 'select', dbField: 'influencerProfile.category', options: ['Funny', 'Arts', 'Tech', 'Fashion', 'Beauty', 'Gaming', 'Food'] },
            { id: 'platform', label: 'Platform', type: 'checkbox', dbField: 'influencerProfile.platforms', options: ['Facebook', 'Instagram', 'YouTube', 'TikTok'] },
            { id: 'reach', label: 'Followers (Up to)', type: 'range', dbField: 'influencerProfile.reach', min: 1000, max: 1000000, step: 10000, default: 1000000 },
        ],
        job: [
            { id: 'category', label: 'Job Category', type: 'select', dbField: 'category', options: ['Fashion', 'Gadgets', 'Food', 'Gaming', 'Beauty', 'Tech'] },
            { id: 'platform', label: 'Platform', type: 'checkbox', dbField: 'platforms', options: ['Instagram', 'Facebook', 'TikTok', 'YouTube'] },
            { id: 'contentType', label: 'Content Type', type: 'checkbox', dbField: 'contentTypes', options: ['Story', 'Post', 'Video', 'Reel'] },
            { id: 'budget', label: 'Budget (Up to)', type: 'range', dbField: 'budget', min: 1000, max: 50000, step: 1000, default: 50000 },
        ]
    };
    
    // --- Step 5: Core Functions ---

    /**
     * Renders the filter inputs based on the selected type ('influencer' or 'job').
     */
    function renderFilters(type = 'job') {
        const filters = filterDefinitions[type];
        if (!filters || !filterGrid) return;
        
        filterGrid.innerHTML = filters.map(filter => {
            if (filter.type === 'select') {
                return `<div><label for="${filter.id}_filter" class="block text-sm font-medium text-gray-400 mb-1">${filter.label}</label><select id="${filter.id}_filter" class="w-full p-2 bg-gray-800 border border-gray-700 rounded-md"><option value="all">All</option>${filter.options.map(opt => `<option value="${opt.toLowerCase().replace(/ & /g, '-')}">${opt}</option>`).join('')}</select></div>`;
            }
            if (filter.type === 'checkbox') {
                return `<div><label class="block text-sm font-medium text-gray-400 mb-2">${filter.label}</label><div id="${filter.id}_filter" class="space-y-2">${filter.options.map(opt => `<label class="flex items-center text-sm"><input type="checkbox" value="${opt.toLowerCase()}" class="h-4 w-4 bg-gray-700 border-gray-600 rounded text-mulberry focus:ring-mulberry accent-mulberry"><span class="ml-2">${opt}</span></label>`).join('')}</div></div>`;
            }
            if (filter.type === 'range') {
                return `<div><label for="${filter.id}_filter" class="block text-sm font-medium text-gray-400 mb-1">${filter.label} <span id="${filter.id}_value" class="font-semibold text-white"></span></label><input type="range" id="${filter.id}_filter" class="w-full mt-2" min="${filter.min}" max="${filter.max}" step="${filter.step}" value="${filter.default}"></div>`;
            }
            return '';
        }).join('');

        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const valueDisplay = getElement(`${slider.id.replace('_filter', '_value')}`);
            if (valueDisplay) {
                const updateValue = () => { valueDisplay.textContent = (slider.id.includes('budget') ? '৳' : '') + Number(slider.value).toLocaleString(); };
                updateValue();
                slider.addEventListener('input', updateValue);
            }
        });
    }
    
    /**
     * Gathers all filter criteria from the form into a single object.
     */
    function gatherFilterCriteria() {
        const filterFor = document.querySelector('input[name="filter_for"]:checked').value;
        const filters = { filterFor };
        
        filterDefinitions[filterFor].forEach(filter => {
            if (filter.type === 'select' || filter.type === 'range') {
                const element = getElement(`${filter.id}_filter`);
                if (element.value !== 'all' && element.value !== String(filter.max)) filters[filter.id] = element.value;
            }
            if (filter.type === 'checkbox') {
                const checked = Array.from(document.querySelectorAll(`#${filter.id}_filter input:checked`)).map(cb => cb.value);
                if (checked.length > 0) filters[filter.id] = checked;
            }
        });
        return filters;
    }

    /**
     * Fetches and renders posts/influencers based on filters from Firestore.
     */
    async function applyFiltersAndFetch() {
        const criteria = gatherFilterCriteria();
        console.log("Applying filters:", criteria);

        loadingSpinner.style.display = 'block';
        postListGrid.innerHTML = '';
        noResults.classList.add('hidden');

        try {
            let firestoreQuery;
            const isJobSearch = criteria.filterFor === 'job';
            
            if (isJobSearch) {
                let q = collection(db, 'posts');
                if (criteria.category) q = query(q, where('category', '==', criteria.category));
                if (criteria.platforms) q = query(q, where('platforms', 'array-contains-any', criteria.platforms));
                if (criteria.contentType) q = query(q, where('contentTypes', 'array-contains-any', criteria.contentType));
                if (criteria.budget) q = query(q, where('budget', '<=', Number(criteria.budget)));
                firestoreQuery = query(q, orderBy('createdAt', 'desc'), limit(12));
            } else { // 'influencer'
                let q = collection(db, 'users');
                q = query(q, where('role', '==', 'influencer'));
                if (criteria.category) q = query(q, where('influencerProfile.category', '==', criteria.category));
                if (criteria.platforms) q = query(q, where('influencerProfile.platforms', 'array-contains-any', criteria.platforms));
                if (criteria.reach) q = query(q, where('influencerProfile.reach', '<=', Number(criteria.reach)));
                firestoreQuery = query(q, orderBy('influencerProfile.reach', 'desc'), limit(12));
            }

            const querySnapshot = await getDocs(firestoreQuery);

            if (querySnapshot.empty) {
                noResults.classList.remove('hidden');
            } else {
                const resultsHTML = querySnapshot.docs.map(doc => {
                    return isJobSearch 
                        ? createJobCard({ id: doc.id, ...doc.data() })
                        : createInfluencerCard({ id: doc.id, ...doc.data() });
                }).join('');
                postListGrid.innerHTML = resultsHTML;
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            noResults.classList.remove('hidden');
            noResults.innerHTML = `<p class="text-red-500">Error loading data. You may need to create Firestore indexes. Check the console for a link.</p>`;
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function createJobCard(post) {
        const description = (post.description || '').substring(0, 130);
        return `
            <div class="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
                <div class="p-4 flex items-center space-x-3">
                    <img src="${post.brandLogo || 'https://via.placeholder.com/50'}" alt="Brand Logo" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <h3 class="font-bold">${post.brandName || 'A Brand'}</h3>
                        <p class="text-xs text-gray-400">Posted: ${post.createdAt?.toDate().toLocaleDateString() || 'Recently'}</p>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-800 flex-grow">
                    <h4 class="text-lg font-semibold">${post.title}</h4>
                    <p class="text-sm text-gray-400 mt-2">${description}${post.description.length > 130 ? '...' : ''}</p>
                </div>
                <div class="p-4 flex justify-between items-center bg-gray-900">
                    <div><span class="text-xs text-gray-400">Budget</span><p class="font-bold text-lg">৳${(post.budget || 0).toLocaleString()}</p></div>
                    <a href="/pf/work/${post.id}" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-5 rounded-full transition text-sm">View Details</a>
                </div>
            </div>`;
    }

    function createInfluencerCard(user) {
        const profile = user.influencerProfile;
        if (!profile) return ''; // Don't render if influencer profile is incomplete
        const bio = (profile.bio || '').substring(0, 130);
        return `
            <div class="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
                <div class="p-4 flex items-center space-x-3">
                    <img src="${profile.profilePicUrl || 'https://i.pravatar.cc/150'}" alt="Profile Pic" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <h3 class="font-bold">${profile.pageName} <i class="fas fa-check-circle text-blue-500 text-sm"></i></h3>
                        <p class="text-xs text-gray-400 capitalize">${profile.category}</p>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-800 flex-grow">
                    <p class="text-sm text-gray-400">${bio}${profile.bio.length > 130 ? '...' : ''}</p>
                </div>
                <div class="p-4 flex justify-between items-center bg-gray-900">
                    <div><span class="text-xs text-gray-400">Followers</span><p class="font-bold text-lg">${(profile.reach || 0).toLocaleString()}</p></div>
                    <a href="/pf/influencer/${user.id}" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-5 rounded-full transition text-sm">View Profile</a>
                </div>
            </div>`;
    }

    // --- Step 6: Initial Setup & Event Listeners ---
    filterTypeRadios.forEach(radio => radio.addEventListener('change', (e) => renderFilters(e.target.value)));
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFiltersAndFetch);
    
    renderFilters('job'); // Render filters for 'job' by default
    applyFiltersAndFetch(); // Fetch initial data
});
