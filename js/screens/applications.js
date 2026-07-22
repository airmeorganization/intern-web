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

export async function loadApplications() {
    const container = document.getElementById('applications-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading applications...</div>';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">Please log in to view applications.</div>';
        return;
    }

    const { data: applications, error } = await supabase
        .from('applications')
        .select('*, jobs(title, profiles(name, college_company))')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="p-6 text-center text-red-500">Error loading applications: ${error.message}</div>`;
        return;
    }

    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center p-8 mt-12">
                <svg class="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <p class="text-sm font-semibold text-gray-500">No applications found.</p>
                <button class="mt-4 px-4 py-2 bg-black text-white text-xs font-bold rounded-lg" onclick="navigateTo('suggestions-screen')">Find Jobs</button>
            </div>
        `;
        return;
    }

    const getStatusStyles = (status) => {
        switch(status) {
            case 'under_review': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'interview': return 'text-blue-600 bg-blue-50 border-blue-200';
            case 'accepted': return 'text-green-600 bg-green-50 border-green-200';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const formatStatus = (status) => {
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    container.innerHTML = applications.map(app => {
        const timeAgo = new Date(app.created_at).toLocaleDateString();
        const statusStyles = getStatusStyles(app.status);
        const formattedStatus = formatStatus(app.status);
        const jobTitle = app.jobs?.title || 'Unknown Job';
        const companyName = app.jobs?.profiles?.college_company || app.jobs?.profiles?.name || 'Unknown Company';

        return `
            <div class="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div class="flex justify-between items-start mb-2">
                <h3 class="text-lg font-bold text-black">${escapeHtml(jobTitle)}</h3>
                <span class="text-[10px] font-bold px-2 py-1 rounded border ${statusStyles}">${formattedStatus}</span>
                </div>
                <p class="text-sm text-gray-600 font-medium mb-2">${escapeHtml(companyName)}</p>
                <p class="text-xs text-gray-400 font-semibold">Applied ${timeAgo}</p>
            </div>
        `;
    }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
    const appsScreen = document.getElementById('applications-screen');
    if(appsScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && appsScreen.style.display !== 'none') {
                    loadApplications();
                }
            });
        });
        observer.observe(appsScreen, { attributes: true });
    }
});
