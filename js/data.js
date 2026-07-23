import { supabase } from './config.js';

const KEYWORDS = ['javascript', 'python', 'react', 'node.js', 'sql', 'marketing', 'sales', 'design', 'ui', 'ux', 'agile', 'aws', 'docker', 'machine learning', 'data analysis'];

export async function loadFeed() {
  const container = document.getElementById('feed-container');
  if (!container) return;

  container.innerHTML = '<div class="text-center p-4 text-[#6B7280]">Loading...</div>';

  const { data: posts, error } = await supabase
    .from('posts')
    .select('*, profiles(full_name, username, avatar_url), likes(count), comments(count)')
    .order('created_at', { ascending: false });

  if (error || !posts || posts.length === 0) {
    container.innerHTML = '<div class="text-center p-4 text-[#6B7280]">No posts yet.</div>';
    if (error) console.error('Feed error:', error);
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="card !p-5">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center font-bold">
            ${post.profiles?.full_name ? post.profiles.full_name.charAt(0) : 'U'}
          </div>
          <div>
            <h4 class="font-semibold text-[15px] leading-tight">${post.profiles?.full_name || 'Unknown'}</h4>
            <p class="caption-text text-[#6B7280]">@${post.profiles?.username || 'unknown'} • 2h</p>
          </div>
        </div>
        <button class="text-[#6B7280]"><span class="material-symbols-rounded">more_horiz</span></button>
      </div>
      <p class="body-text mb-4 text-[#111111] leading-relaxed">${escapeHtml(post.content)}</p>
      <div class="flex items-center gap-6 border-t border-[#FAFAFA] pt-3">
        <button class="flex items-center gap-2 text-[#6B7280] caption-text font-medium"><span class="material-symbols-rounded text-[20px]">favorite_border</span> ${post.likes[0]?.count || 0}</button>
        <button class="flex items-center gap-2 text-[#6B7280] caption-text font-medium"><span class="material-symbols-rounded text-[20px]">chat_bubble_outline</span> ${post.comments[0]?.count || 0}</button>
        <button class="flex items-center gap-2 text-[#6B7280] caption-text font-medium ml-auto"><span class="material-symbols-rounded text-[20px]">share</span></button>
      </div>
    </div>
  `).join('');
}

export async function publishPost(userId, content, isJob = false) {
  const { data, error } = await supabase
    .from('posts')
    .insert([{ user_id: userId, content, is_job: isJob }]);

  if (!error) {
    await loadFeed();
  }
  return { data, error };
}

export async function parseResumeLocally(file) {
  if (!file) return null;

  let text = '';

  try {
    if (file.type === 'application/pdf') {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ');
      }
      text = fullText;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      throw new Error("Unsupported file format");
    }

    text = text.toLowerCase();
    const matchedKeywords = KEYWORDS.filter(kw => text.includes(kw));
    return matchedKeywords;

  } catch (err) {
    console.error("Error parsing resume:", err);
    return null;
  }
}

export function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
