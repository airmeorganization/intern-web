import { supabase } from '../supabase.js';


function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export async function loadFeed() {
  const container = document.getElementById('posts-container');
  if (!container) return;

  container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading...</div>';

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(*)');

  if (error) {
    container.innerHTML = `<div class="p-6 text-center text-red-500">Error loading posts: ${error.message}</div>`;
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-gray-500">No posts yet.</div>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const author = post.profiles || {};
    const initials = author.name ? author.name.charAt(0).toUpperCase() : 'U';
    const timeAgo = new Date(post.created_at).toLocaleDateString();

    return `
      <div class="p-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors" onclick="navigateTo('post-detail-screen')">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-full bg-black flex items-center justify-center overflow-hidden text-white font-bold text-sm">${initials}</div>
          <div>
            <h4 class="text-sm font-bold text-black flex items-center gap-1" onclick="event.stopPropagation(); navigateTo('other-user-profile-screen')">${escapeHtml(author.name || 'Unknown')}</h4>
            <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">@${escapeHtml(author.username || 'unknown')} • ${timeAgo}</p>
          </div>
        </div>
        <p class="text-sm text-gray-800 leading-relaxed mb-4 font-medium">${escapeHtml(post.content)}</p>
        <div class="flex items-center gap-6">
          <button class="flex items-center gap-1.5 text-gray-500 hover:text-black transition-colors" onclick="event.stopPropagation();">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
            <span class="text-xs font-bold">${post.likes_count || 0}</span>
          </button>
          <button class="flex items-center gap-1.5 text-gray-500 hover:text-black transition-colors" onclick="event.stopPropagation(); navigateTo('post-detail-screen');">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <span class="text-xs font-bold">0</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Add an observer to trigger loadFeed when home screen is visible
document.addEventListener('DOMContentLoaded', () => {
  const homeScreen = document.getElementById('home-screen');
  if(homeScreen) {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'style' && homeScreen.style.display !== 'none') {
                  loadFeed();
              }
          });
      });
      observer.observe(homeScreen, { attributes: true });
  }
});
