import { supabase } from '../supabase.js';

export async function loadSuggestions() {
  const container = document.getElementById('suggestions-container');
  if (!container) return;

  container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading jobs...</div>';

  // Get current user to get their parsed_keywords
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
      container.innerHTML = '<div class="p-6 text-center text-gray-500">Please log in to see suggestions.</div>';
      return;
  }

  const { data: profile } = await supabase
      .from('profiles')
      .select('parsed_keywords')
      .eq('id', user.id)
      .single();

  const userKeywords = profile?.parsed_keywords || [];

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, profiles(name, college_company)');

  if (error) {
    container.innerHTML = `<div class="p-6 text-center text-red-500">Error loading jobs: ${error.message}</div>`;
    return;
  }

  if (!jobs || jobs.length === 0) {
    container.innerHTML = '<div class="p-6 text-center text-gray-500">No jobs available right now.</div>';
    return;
  }

  // Basic matching algorithm
  const matchedJobs = jobs.map(job => {
      const jobKeywords = job.keywords || [];
      const matchCount = jobKeywords.filter(k => userKeywords.includes(k)).length;
      return { ...job, matchCount };
  }).sort((a, b) => b.matchCount - a.matchCount);

  container.innerHTML = matchedJobs.map(job => {
    const employer = job.profiles || {};
    const initials = employer.name ? employer.name.substring(0, 2).toUpperCase() : 'CO';
    const timeAgo = new Date(job.created_at).toLocaleDateString();

    let aiScreenBadge = '';
    if (job.ai_interview) {
        aiScreenBadge = `<span class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded flex items-center gap-1 border border-blue-200"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> AI Screen</span>`;
    }

    let actionButton = `<button class="flex-1 bg-black text-white text-sm font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors" onclick="quickApply('${job.id}')">Quick Apply</button>`;

    if(job.ai_interview) {
        actionButton = `<button class="flex-1 bg-black text-white text-sm font-bold py-2.5 rounded-xl hover:bg-gray-800 transition-colors flex justify-center items-center gap-2" onclick="startAIInterview('${job.id}')">Start AI Interview</button>`;
    }

    const keywordChips = (job.keywords || []).map(k => `<span class="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">${k}</span>`).join('');

    return `
      <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
        <div class="flex justify-between items-start mb-3">
          <div class="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold text-sm">${initials}</div>
          <div class="flex flex-col items-end gap-1">
            ${aiScreenBadge}
            <span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">${timeAgo}</span>
          </div>
        </div>
        <h3 class="text-lg font-bold text-black mb-1">${job.title}</h3>
        <p class="text-sm text-gray-600 font-medium mb-4">${employer.college_company || 'Unknown Company'}</p>
        <div class="flex flex-wrap gap-2 mb-5">
          ${keywordChips}
        </div>
        <div class="flex items-center gap-3">
          ${actionButton}
        </div>
      </div>
    `;
  }).join('');
}

window.quickApply = async function(jobId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Please log in first.");

    const { error } = await supabase
        .from('applications')
        .insert({
            job_id: jobId,
            applicant_id: user.id
        });

    if (error) {
        if(error.code === '23505') {
            alert('You have already applied for this job!');
        } else {
            alert('Error applying: ' + error.message);
        }
    } else {
        alert('Application submitted successfully!');
    }
}

window.startAIInterview = function(jobId) {
    // Navigate to AI Interview Screen (can pass jobId later in global state)
    navigateTo('ai-interviewer-screen');
}

// Add an observer to trigger loadSuggestions when suggestions screen is visible
document.addEventListener('DOMContentLoaded', () => {
  const suggestionsScreen = document.getElementById('suggestions-screen');
  if(suggestionsScreen) {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.attributeName === 'style' && suggestionsScreen.style.display !== 'none') {
                  loadSuggestions();
              }
          });
      });
      observer.observe(suggestionsScreen, { attributes: true });
  }
});
