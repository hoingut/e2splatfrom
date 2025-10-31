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
    // NOTE: For 'influencer', fields are nested under 'influencerProfile'. 
    // This requires specific Firestore indexes if used with multiple 'where' clauses.
    const filterDefinitions = {
        influencer: [
            { id: 'mood', label: 'Mood', type: 'select', dbField: 'influencerProfile.mood', options: ['Ready Package', 'Creative Freedom'] },
            { id: 'category', label: 'Category', type: 'select', dbField: 'influencerProfile.category', options: ['Funny', 'Arts', 'Tech', 'Fashion', 'Beauty', 'Gaming', 'Food'] },
            { id: 'platform', label: 'Platform', type: 'checkbox', dbField: 'influencerProfile.platforms', options: ['Facebook', 'Instagram', 'YouTube', 'TikTok'] },
            { id: 'reach', label: 'Followers (Up to)', type: 'range', dbField: 'influencerProfile.followers', min: 1000, max: 1000000, step: 10000, default: 1000000 },
        ],
        job: [
            { id: 'mood', label: 'Collaboration Mood', type: 'select', dbField: 'mood', options: ['Ready Package', 'Creative Freedom'] },
            { id: 'category', label: 'Job Category', type: 'select', dbField: 'category', options: ['Fashion', 'Gadgets', 'Food', 'Gaming', 'Beauty', 'Tech'] },
            { id: 'platform', label: 'Platform', type: 'checkbox', dbField: 'platforms', options: ['Instagram', 'Facebook', 'TikTok', 'YouTube'] },
            { id: 'budget', label: 'Budget (Up to)', type: 'range', dbField: 'budget', min: 1000, max: 50000, step: 1000, default: 50000 },
        ]
    };

    // =================================================================
    // SECTION A: CORE FUNCTIONS
    // =================================================================

    /**
     * Renders the filter inputs based on the selected type ('influencer' or 'job').
     */
    function renderFilters(type = 'job') {
        const filters = filterDefinitions[type];
        if (!filters || !filterGrid) return;
        
        filterGrid.innerHTML = filters.map(filter => {
            if (filter.type === 'select') {
                // IMPORTANT: Ensure values are sanitized for Firestore queries
                const filterValue = filter.options.map(opt => `<option value="${opt.toLowerCase().replace(/ & /g, '-')}">${opt}</option>`).join('');
                return `<div><label for="${filter.id}_filter" class="block text-sm font-medium text-gray-400 mb-1">${filter.label}</label><select id="${filter.id}_filter" class="w-full p-2 bg-gray-800 border border-gray-700 rounded-md"><option value="all">All</option>${filterValue}</select></div>`;
            }
            if (filter.type === 'checkbox') {
                const checkboxGroup = filter.options.map(opt => `<label class="flex items-center text-sm"><input type="checkbox" value="${opt.toLowerCase()}" class="h-4 w-4 bg-gray-700 border-gray-600 rounded text-mulberry focus:ring-mulberry accent-mulberry"><span class="ml-2">${opt}</span></label>`).join('');
                return `<div><label class="block text-sm font-medium text-gray-400 mb-2">${filter.label}</label><div id="${filter.id}_filter" class="space-y-2">${checkboxGroup}</div></div>`;
            }
            if (filter.type === 'range') {
                return `<div><label for="${filter.id}_filter" class="block text-sm font-medium text-gray-400 mb-1">${filter.label} <span id="${filter.id}_value" class="font-semibold text-white"></span></label><input type="range" id="${filter.id}_filter" class="w-full mt-2" min="${filter.min}" max="${filter.max}" step="${filter.step}" value="${filter.default}"></div>`;
            }
            return '';
        }).join('');

        // Setup range sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const valueDisplay = getElement(`${slider.id.replace('_filter', '_value')}`);
            if (valueDisplay) {
                const updateValue = () => { valueDisplay.textContent = (slider.id.includes('budget') || slider.id.includes('reach') ? '৳' : '') + Number(slider.value).toLocaleString(); };
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
                // Only add to criteria if a specific option is chosen (not 'all' or the max range)
                if (element && element.value !== 'all' && Number(element.value) !== Number(filter.max)) {
                    // Use Number() for range values for accurate comparison
                    filters[filter.dbField] = filter.type === 'range' ? Number(element.value) : element.value;
                }
            }
            if (filter.type === 'checkbox') {
                const checked = Array.from(document.querySelectorAll(`#${filter.id}_filter input:checked`)).map(cb => cb.value);
                if (checked.length > 0) {
                    filters[filter.dbField] = checked;
                }
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
            const isJobSearch = criteria.filterFor === 'job';
            
            // FIX 1: Search 'posts' for jobs, and 'users' for influencer profiles. This is correct if the goal is to show PROFILES.
            const collectionName = isJobSearch ? 'posts' : 'users';
            let baseQuery = collection(db, collectionName);
            let queryConstraints = []; // Array to hold where clauses

            // --- 1. BASE FILTERS ---
            if (isJobSearch) {
                // Filter for brand jobs (Assuming 'postType' field is implicit or not used here)
                queryConstraints.push(where('status', '==', 'open-for-proposals'));
            } else {
                // Filter for approved influencer profiles (Crucial for influencer search)
                queryConstraints.push(where('role', '==', 'influencer'));
                // Assuming you have an 'isApproved' or similar flag on the user document:
                queryConstraints.push(where('isApprovedInfluencer', '==', true)); 
            }

            // --- 2. ADVANCED FILTERS ---
            let orderByField = null; // Field used for range query must be the first orderBy

            for (const key in criteria) {
                if (key !== 'filterFor') {
                    const value = criteria[key];
                    
                    if (Array.isArray(value)) {
                        // Array filters (e.g., platforms)
                        queryConstraints.push(where(key, 'array-contains-any', value));
                    } else if (typeof value === 'number' && (key.includes('budget') || key.includes('followers'))) {
                        // Range filters (Max value of range slider)
                        queryConstraints.push(where(key, '<=', value));
                        orderByField = key; // Set range field as orderBy field
                    } else {
                        // Exact match (e.g., mood, category)
                        queryConstraints.push(where(key, '==', value));
                    }
                }
            }
            
            // --- 3. CONSTRUCT AND ORDER THE QUERY ---
            
            // Range queries MUST be ordered by the range field first.
            if (orderByField) {
                // Order by the range field (Budget or Followers) descending
                queryConstraints.push(orderBy(orderByField, 'desc')); 
            } else if (!isJobSearch) {
                 // Default order for influencers if no range filter is applied
                 queryConstraints.push(orderBy('influencerProfile.followers', 'desc'));
            } else {
                 // Default order for jobs if no range filter is applied
                 queryConstraints.push(orderBy('createdAt', 'desc'));
            }
            
            // Apply all constraints and limit the results
            queryConstraints.push(limit(12));
            
            const finalQuery = query(baseQuery, ...queryConstraints);
            
            // --- 4. EXECUTE QUERY ---
            const querySnapshot = await getDocs(finalQuery);

            if (querySnapshot.empty) {
                noResults.classList.remove('hidden');
            } else {
                postListGrid.innerHTML = querySnapshot.docs.map(doc => 
                    isJobSearch ? createJobCard({ id: doc.id, ...doc.data() }) : createInfluencerCard({ id: doc.id, ...doc.data() })
                ).join('');
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            
            // CRITICAL: Display Firestore Indexing error to the user
            let errorMessage = "Failed to load results.";
            if (error.code === 'failed-precondition' && error.message.includes("requires an index")) {
                errorMessage = "Filtering failed. A required Firestore index is missing. Check the browser console (F12) for the creation link.";
            } else if (error.code === 'permission-denied') {
                 errorMessage = "Permission Denied. If you are logged out, try logging in. If you are logged in, check Firebase Security Rules.";
            }

            noResults.classList.remove('hidden');
            noResults.innerHTML = `<p class="text-red-500 font-bold mt-4">${errorMessage}</p><p class="text-sm text-gray-500">${error.message}</p>`;

        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // --- Card Creation Functions (Remain the same) ---
    function createJobCard(post) {
        // ... (Job Card HTML remains the same) ...
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
                ${post.coverImage ? `<img src="${post.coverImage}" alt="Job Image" class="w-full h-56 object-cover">` : ''}
                <div class="p-4 border-t border-gray-800 flex-grow">
                    <h4 class="text-lg font-semibold">${post.title}</h4>
                    <p class="text-sm text-gray-400 mt-2">${description}${description.length >= 130 ? '...' : ''}</p>
                </div>
                <div class="p-4 flex justify-between items-center bg-gray-900">
                    <div><span class="text-xs text-gray-400">Budget</span><p class="font-bold text-lg">৳${(post.budget || 0).toLocaleString()}</p></div>
                    <a href="/pf/work/${post.id}" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-5 rounded-full transition text-sm">View Details</a>
                </div>
            </div>`;
    }

    function createInfluencerCard(user) {
        const profile = user.influencerProfile;
        // FIX 2: Check for profile AND approval status explicitly
        if (!profile || user.role !== 'influencer' || user.isApprovedInfluencer !== true) return '';
        
        const bio = (profile.bio || '').substring(0, 130);
        return `
            <div class="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 flex flex-col">
                <div class="p-4 flex items-center space-x-3">
                    <img src="${profile.pageProfilePicUrl || 'https://i.pravatar.cc/150'}" alt="Profile Pic" class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <h3 class="font-bold">${profile.pageName} <i class="fas fa-check-circle text-blue-500 text-sm"></i></h3>
                        <p class="text-xs text-gray-400 capitalize">${profile.category}</p>
                    </div>
                </div>
                <div class="p-4 border-t border-gray-800 flex-grow">
                    <p class="text-sm text-gray-400">${bio}${bio.length >= 130 ? '...' : ''}</p>
                </div>
                <div class="p-4 flex justify-between items-center bg-gray-900">
                    <div><span class="text-xs text-gray-400">Followers</span><p class="font-bold text-lg">${(profile.followers || 0).toLocaleString()}</p></div>
                    <a href="/pf/influencer/${user.id}" class="bg-mulberry hover:bg-mulberry-dark text-white font-semibold py-2 px-5 rounded-full transition text-sm">View Profile</a>
                </div>
            </div>`;
    }

    // =================================================================
    // SECTION C: INITIALIZATION & EVENT LISTENERS
    // =================================================================

    // Ensure range sliders update display on load
    renderFilters('job'); // Must be called before adding listeners

    filterTypeRadios.forEach(radio => radio.addEventListener('change', (e) => {
        renderFilters(e.target.value);
        applyFiltersAndFetch();
    }));
    applyFiltersBtn.addEventListener('click', applyFiltersAndFetch);
    
    // Initial load
    applyFiltersAndFetch();
});
