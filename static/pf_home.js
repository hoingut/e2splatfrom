// static/pf_home.js

// --- Imports (uncomment when you connect to Firebase) ---
import { db } from './firebaseConfig.js';
 import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const getElement = (id) => document.getElementById(id);
    const filterGrid = getElement('filter-grid');
    const filterTypeRadios = document.querySelectorAll('input[name="filter_for"]');
    const applyFiltersBtn = getElement('apply-filters-btn');
    const postListGrid = getElement('post-list-grid');
    const loadingSpinner = getElement('loading-spinner');
    const noResults = getElement('no-results');

    // --- Filter Definitions ---
    // This structure makes it easy to add/remove filters in the future.
    const filterDefinitions = {
        influencer: [
            { id: 'category', label: 'Category', type: 'select', options: ['Funny', 'Arts', 'Tech', 'Fashion'] },
            { id: 'mood', label: 'Collaboration Mood', type: 'select', options: ['Ready Package', 'Creative Freedom'] },
            { id: 'platform', label: 'Platform', type: 'checkbox', options: ['Facebook', 'Instagram', 'YouTube'] },
            { id: 'reach', label: 'Follower Reach', type: 'range', min: 1000, max: 1000000, step: 1000, default: 1000000 },
        ],
        job: [
            { id: 'category', label: 'Job Category', type: 'select', options: ['Fashion', 'Gadgets', 'Food', 'Gaming'] },
            { id: 'platform', label: 'Platform', type: 'checkbox', options: ['Instagram', 'Facebook', 'TikTok'] },
            { id: 'content_type', label: 'Content Type', type: 'checkbox', options: ['Story', 'Post', 'Video', 'Text Only'] },
            { id: 'budget', label: 'Budget (Up to)', type: 'range', min: 1000, max: 50000, step: 1000, default: 50000 },
        ]
    };

    /**
     * Renders the filter inputs based on the selected type ('influencer' or 'job').
     */
    function renderFilters(type = 'influencer') {
        const filters = filterDefinitions[type];
        if (!filters || !filterGrid) return;
        
        filterGrid.innerHTML = filters.map(filter => {
            if (filter.type === 'select') {
                return `
                    <div>
                        <label for="${filter.id}_filter" class="block text-sm font-medium text-gray-400 mb-1">${filter.label}</label>
                        <select id="${filter.id}_filter" class="w-full p-2 bg-gray-800 border border-gray-700 rounded-md">
                            <option value="all">All ${filter.label}s</option>
                            ${filter.options.map(opt => `<option value="${opt.toLowerCase().replace(' ', '-')}">${opt}</option>`).join('')}
                        </select>
                    </div>`;
            }
            if (filter.type === 'checkbox') {
                return `
                    <div>
                        <label class="block text-sm font-medium text-gray-400 mb-2">${filter.label}</label>
                        <div id="${filter.id}_filter" class="space-y-2">
                            ${filter.options.map(opt => `
                                <label class="flex items-center text-sm">
                                    <input type="checkbox" value="${opt.toLowerCase()}" class="h-4 w-4 bg-gray-700 border-gray-600 rounded text-mulberry focus:ring-mulberry accent-mulberry">
                                    <span class="ml-2">${opt}</span>
                                </label>`).join('')}
                        </div>
                    </div>`;
            }
            if (filter.type === 'range') {
                return `
                    <div>
                        <label for="${filter.id}_filter" class="block text-sm font-medium text-gray-400 mb-1">
                            ${filter.label} <span id="${filter.id}_value" class="font-semibold text-white"></span>
                        </label>
                        <input type="range" id="${filter.id}_filter" class="w-full mt-2" min="${filter.min}" max="${filter.max}" step="${filter.step}" value="${filter.default}">
                    </div>`;
            }
            return '';
        }).join('');

        // Add event listeners for range sliders
        document.querySelectorAll('input[type="range"]').forEach(slider => {
            const valueDisplay = getElement(`${slider.id.replace('_filter', '_value')}`);
            if (valueDisplay) {
                const updateValue = () => {
                    valueDisplay.textContent = (slider.id.includes('budget') ? '৳' : '') + Number(slider.value).toLocaleString();
                };
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
                if (element.value !== 'all') filters[filter.id] = element.value;
            }
            if (filter.type === 'checkbox') {
                const checked = Array.from(document.querySelectorAll(`#${filter.id}_filter input:checked`)).map(cb => cb.value);
                if (checked.length > 0) filters[filter.id] = checked;
            }
        });
        return filters;
    }

    /**
     * Fetches and renders posts/influencers based on filters (SIMULATED).
     */
    async function applyFiltersAndFetch() {
        const criteria = gatherFilterCriteria();
        console.log("Applying filters:", criteria);

        loadingSpinner.style.display = 'block';
        postListGrid.innerHTML = '';
        noResults.classList.add('hidden');

        // --- Firestore Query Logic (Placeholder) ---
        // You would build your Firestore query here based on 'criteria' object.
        // For now, we simulate a network delay and show dummy data.
        setTimeout(() => {
            loadingSpinner.style.display = 'none';
            // In a real app, you would check if the fetched data is empty.
            // For simulation, we'll just show some dummy cards.
            const isJobSearch = criteria.filterFor === 'job';
            postListGrid.innerHTML = `
                <div class="bg-gray-900/50 border border-gray-800 rounded-xl ...">${isJobSearch ? 'Job Card Example' : 'Influencer Card Example'} 1</div>
                <div class="bg-gray-900/50 border border-gray-800 rounded-xl ...">${isJobSearch ? 'Job Card Example' : 'Influencer Card Example'} 2</div>
                <div class="bg-gray-900/50 border border-gray-800 rounded-xl ...">${isJobSearch ? 'Job Card Example' : 'Influencer Card Example'} 3</div>
            `;
            // if (resultsAreEmpty) { noResults.classList.remove('hidden'); }
        }, 1500); // Simulate 1.5 second loading time
    }

    // --- Initial Setup ---
    filterTypeRadios.forEach(radio => radio.addEventListener('change', (e) => renderFilters(e.target.value)));
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFiltersAndFetch);
    
    // Initial render
    renderFilters(); // Render filters for 'influencer' by default
    applyFiltersAndFetch(); // Fetch initial data
});
