import { supabase } from '../supabase.js';

export async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if(!profile) return;

    // Assuming we have these elements in profile-screen
    const nameEl = document.getElementById('profile-name');
    const usernameEl = document.getElementById('profile-username');
    const bioEl = document.getElementById('profile-bio');

    if (nameEl) nameEl.textContent = profile.name;
    if (usernameEl) usernameEl.textContent = `@${profile.username} • ${profile.profession_major || 'No profession set'}`;
    if (bioEl) bioEl.textContent = profile.bio || '';

    // Also load the user's posts
    const container = document.getElementById('my-posts-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading...</div>';

    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', user.id);

    if (error) {
        container.innerHTML = `<div class="p-6 text-center text-red-500">Error loading posts: ${error.message}</div>`;
        return;
    }

    if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">No posts yet.</div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const timeAgo = new Date(post.created_at).toLocaleDateString();
        const initials = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';

        return `
            <div class="border border-gray-100 rounded-2xl p-4 shadow-sm mb-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><span class="text-[8px] font-bold">${initials}</span></div>
                    <span class="text-xs font-bold">${profile.name}</span>
                    <span class="text-[10px] text-gray-400 ml-auto">${timeAgo}</span>
                </div>
                <p class="text-sm text-gray-800 font-medium">${post.content}</p>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const profileScreen = document.getElementById('profile-screen');
    if(profileScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && profileScreen.style.display !== 'none') {
                    loadProfile();
                }
            });
        });
        observer.observe(profileScreen, { attributes: true });
    }
});
