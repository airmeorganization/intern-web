import { supabase } from '../supabase.js';

let currentPostId = null;

export async function openPostDetail(postId) {
    currentPostId = postId;
    window.navigateTo('post-detail-screen');
    await loadPostDetail();
}

// Make it globally accessible for inline onclick handlers
window.openPostDetail = openPostDetail;

export async function loadPostDetail() {
    if (!currentPostId) return;

    const contentContainer = document.getElementById('post-content-container');
    const commentsContainer = document.getElementById('post-comments-container');

    if (!contentContainer || !commentsContainer) return;

    contentContainer.innerHTML = '<div class="p-6 text-center text-gray-500">Loading post...</div>';
    commentsContainer.innerHTML = '';

    // Fetch post and author
    const { data: post, error } = await supabase
        .from('posts')
        .select('*, profiles(name, username)')
        .eq('id', currentPostId)
        .single();

    if (error || !post) {
        contentContainer.innerHTML = '<div class="p-6 text-center text-red-500">Post not found.</div>';
        return;
    }

    const timeAgo = new Date(post.created_at).toLocaleDateString();
    const initials = post.profiles?.name ? post.profiles.name.charAt(0).toUpperCase() : 'U';

    contentContainer.innerHTML = `
      <div class="flex items-center gap-3 mb-4 cursor-pointer" onclick="navigateTo('other-user-profile-screen')">
        <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
          <span class="font-bold text-gray-500">${initials}</span>
        </div>
        <div>
          <h4 class="text-sm font-bold text-black flex items-center gap-1 hover:underline">${post.profiles?.name || 'Unknown'}</h4>
          <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">@${post.profiles?.username || 'unknown'} • ${timeAgo}</p>
        </div>
      </div>
      <p class="text-base text-gray-800 leading-relaxed mb-6 font-medium break-words">${post.content}</p>
      <div class="flex items-center gap-6 pb-2 border-b border-gray-100 mb-4">
        <button class="flex items-center gap-1.5 text-black hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
          <span class="text-xs font-bold" id="post-detail-likes">${post.likes_count || 0}</span>
        </button>
        <button class="flex items-center gap-1.5 text-black transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
          <span class="text-xs font-bold" id="post-detail-comment-count">0 Comments</span>
        </button>
      </div>
    `;

    await loadComments();
}

async function loadComments() {
    const commentsContainer = document.getElementById('post-comments-container');
    const commentCountEl = document.getElementById('post-detail-comment-count');
    if (!commentsContainer || !currentPostId) return;

    commentsContainer.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">Loading comments...</div>';

    const { data: comments, error } = await supabase
        .from('comments')
        .select('*, profiles(name, username)')
        .eq('post_id', currentPostId)
        .order('created_at', { ascending: true });

    if (error) {
        commentsContainer.innerHTML = `<div class="text-center text-red-500 text-xs py-4">Error loading comments.</div>`;
        return;
    }

    if (commentCountEl) {
        commentCountEl.textContent = `${comments.length} Comments`;
    }

    if (!comments || comments.length === 0) {
        commentsContainer.innerHTML = '<div class="text-center text-gray-500 text-xs py-4">No comments yet. Be the first to reply!</div>';
        return;
    }

    commentsContainer.innerHTML = comments.map(comment => {
        const timeAgo = new Date(comment.created_at).toLocaleDateString();
        const initials = comment.profiles?.name ? comment.profiles.name.charAt(0).toUpperCase() : 'U';

        return `
        <div class="flex gap-3">
          <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 cursor-pointer" onclick="navigateTo('other-user-profile-screen')">
            <span class="font-bold text-gray-500 text-xs">${initials}</span>
          </div>
          <div class="flex-1">
            <div class="bg-gray-50 rounded-2xl p-3 border border-gray-100">
              <h4 class="text-xs font-bold text-black mb-1 cursor-pointer hover:underline" onclick="navigateTo('other-user-profile-screen')">${comment.profiles?.name || 'Unknown'}</h4>
              <p class="text-xs text-gray-800 font-medium break-words">${comment.content}</p>
            </div>
            <div class="flex items-center gap-4 mt-1 ml-2">
              <span class="text-[10px] text-gray-400 font-semibold">${timeAgo}</span>
            </div>
          </div>
        </div>
        `;
    }).join('');
}

export function initPostDetail() {
    const commentBtn = document.getElementById('post-comment-btn');
    const commentInput = document.getElementById('post-comment-input');

    if (commentBtn && commentInput) {
        commentBtn.onclick = async () => {
            if (!currentPostId) return;

            const content = commentInput.value.trim();
            if (!content) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return window.showToast('Please log in to comment.');

            commentBtn.disabled = true;
            commentBtn.textContent = '...';

            const { error } = await supabase.from('comments').insert({
                post_id: currentPostId,
                author_id: user.id,
                content
            });

            commentBtn.disabled = false;
            commentBtn.textContent = 'Post';

            if (error) {
                window.showToast('Error posting comment: ' + error.message);
            } else {
                commentInput.value = '';
                await loadComments();
            }
        };

        commentInput.onkeypress = (e) => {
            if (e.key === 'Enter') commentBtn.click();
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initPostDetail();

    // Auto-reload logic if needed, but openPostDetail handles initial load.
    const postDetailScreen = document.getElementById('post-detail-screen');
    if(postDetailScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // If it was just opened by something other than openPostDetail, we might want to refresh,
                // but usually openPostDetail is the entry point.
            });
        });
        observer.observe(postDetailScreen, { attributes: true });
    }
});
