import { supabase } from '../supabase.js';

export function initSearchScreen() {
    // Assuming search-screen exists and has an input
    const searchInput = document.getElementById('search-input');
    const container = document.getElementById('search-results-container');

    if(!searchInput || !container) return;

    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if(query.length < 2) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '<div class="p-6 text-center text-gray-500">Searching...</div>';

        // Search profiles
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(3);

        // Search jobs
        const { data: jobs } = await supabase
            .from('jobs')
            .select('*, profiles(name)')
            .ilike('title', `%${query}%`)
            .limit(3);

        let html = '';

        if(profiles && profiles.length > 0) {
            html += '<h3 class="text-xs font-bold text-gray-500 uppercase px-6 py-2">Profiles</h3>';
            html += profiles.map(p => `
                <div class="px-6 py-3 border-b border-gray-100 flex items-center gap-3 cursor-pointer hover:bg-gray-50" onclick="navigateTo('other-user-profile-screen')">
                    <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">${p.name.charAt(0)}</div>
                    <div>
                        <div class="text-sm font-bold">${p.name}</div>
                        <div class="text-xs text-gray-500">@${p.username}</div>
                    </div>
                </div>
            `).join('');
        }

        if(jobs && jobs.length > 0) {
            html += '<h3 class="text-xs font-bold text-gray-500 uppercase px-6 py-2 mt-4">Jobs</h3>';
            html += jobs.map(j => `
                <div class="px-6 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50">
                    <div class="text-sm font-bold">${j.title}</div>
                    <div class="text-xs text-gray-500">${j.profiles?.name || 'Unknown Company'}</div>
                </div>
            `).join('');
        }

        if(html === '') {
            html = '<div class="p-6 text-center text-gray-500">No results found.</div>';
        }

        container.innerHTML = html;
    });
}
