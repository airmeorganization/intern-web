import { RECRUITABLE_KEYWORDS } from '../constants/keywords.js';
import { supabase } from '../supabase.js';

let selectedSkills = new Set();

export function initPostJobScreen() {
    const container = document.getElementById('skills-container');
    if (!container) return;

    // Assuming there's a div with id 'skills-container' in index.html for post-job-screen
    container.innerHTML = RECRUITABLE_KEYWORDS.map(keyword =>
        `<span class="skill-chip text-[10px] font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200 cursor-pointer hover:bg-black hover:text-white transition-colors" data-skill="${keyword}">${keyword}</span>`
    ).join('');

    container.addEventListener('click', (e) => {
        if(e.target.classList.contains('skill-chip')) {
            const skill = e.target.getAttribute('data-skill');
            if(selectedSkills.has(skill)) {
                selectedSkills.delete(skill);
                e.target.classList.remove('bg-black', 'text-white');
                e.target.classList.add('bg-gray-100', 'text-gray-700');
            } else {
                selectedSkills.add(skill);
                e.target.classList.add('bg-black', 'text-white');
                e.target.classList.remove('bg-gray-100', 'text-gray-700');
            }
        }
    });

    const publishBtn = document.getElementById('publish-job-btn');
    if(publishBtn) {
        publishBtn.onclick = async () => {
            const title = document.getElementById('job-title').value;
            const description = document.getElementById('job-description').value;
            const quickApply = document.getElementById('quick-apply-toggle').checked;
            const aiInterview = document.getElementById('ai-interview-toggle').checked;

            const { data: { user } } = await supabase.auth.getUser();
            if(!user) return alert("Log in to post a job.");

            const { error } = await supabase.from('jobs').insert({
                employer_id: user.id,
                title,
                description,
                keywords: Array.from(selectedSkills),
                quick_apply: quickApply,
                ai_interview: aiInterview
            });

            if(error) {
                alert("Error posting job: " + error.message);
            } else {
                alert("Job posted successfully!");
                navigateTo('home-screen');
            }
        };
    }
}
