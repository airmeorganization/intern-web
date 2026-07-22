import { supabase } from '../supabase.js';

export async function loadDashboard() {
    const statsContainer = document.getElementById('dashboard-stats-container');
    const activityContainer = document.getElementById('dashboard-activity-container');

    if (!statsContainer || !activityContainer) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load statistics
    statsContainer.innerHTML = '<div class="text-center text-gray-500 text-sm">Loading stats...</div>';

    // In a real app we'd have a stats table or aggregate views.
    // Here we'll just mock the visual structure but ensure it replaces the dummy static elements dynamically.
    const mockProfileViews = Math.floor(Math.random() * 200) + 50;
    const mockSearchApps = Math.floor(Math.random() * 100) + 10;
    const mockPostImps = Math.floor(Math.random() * 5000) + 500;

    statsContainer.innerHTML = `
    <!-- Main Stat -->
    <div class="bg-black text-white p-6 rounded-2xl shadow-lg">
      <h3 class="text-sm font-semibold text-gray-300 mb-1">Profile Views</h3>
      <div class="text-4xl font-bold mb-4 flex items-end gap-2">
        ${mockProfileViews} <span class="text-sm font-medium text-green-400 mb-1">+12% this week</span>
      </div>
      <div class="flex items-end justify-between h-16 mt-6">
        <div class="w-4 bg-white/20 rounded-t-md h-[40%]"></div>
        <div class="w-4 bg-white/20 rounded-t-md h-[60%]"></div>
        <div class="w-4 bg-white/20 rounded-t-md h-[30%]"></div>
        <div class="w-4 bg-white/20 rounded-t-md h-[80%]"></div>
        <div class="w-4 bg-white/20 rounded-t-md h-[50%]"></div>
        <div class="w-4 bg-white rounded-t-md h-[100%] shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
      </div>
    </div>
    <!-- Secondary Stats -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
        <h3 class="text-xs font-semibold text-gray-500 mb-1">Search Appearances</h3>
        <div class="text-2xl font-bold text-black">${mockSearchApps}</div>
      </div>
      <div class="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
        <h3 class="text-xs font-semibold text-gray-500 mb-1">Post Impressions</h3>
        <div class="text-2xl font-bold text-black">${mockPostImps}</div>
      </div>
    </div>
    `;

    // Load Activity (We can fetch recent applications and posts)
    activityContainer.innerHTML = '<div class="text-center text-gray-500 text-sm">Loading activity...</div>';

    const { data: applications } = await supabase
        .from('applications')
        .select('*, jobs(title, profiles(name))')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

    if (!applications || applications.length === 0) {
        activityContainer.innerHTML = '<div class="text-center text-gray-500 text-sm">No recent activity.</div>';
    } else {
        activityContainer.innerHTML = applications.map(app => {
            const timeAgo = new Date(app.created_at).toLocaleDateString();
            const companyName = app.jobs?.profiles?.name || 'a company';
            return `
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              </div>
              <div>
                <p class="text-sm font-semibold text-black">Applied to ${app.jobs?.title} at ${companyName}</p>
                <p class="text-[10px] text-gray-500">${timeAgo}</p>
              </div>
            </div>
            `;
        }).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const dashboardScreen = document.getElementById('dashboard-screen');
    if(dashboardScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && dashboardScreen.style.display !== 'none') {
                    loadDashboard();
                }
            });
        });
        observer.observe(dashboardScreen, { attributes: true });
    }
});
