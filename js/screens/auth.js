import { supabase } from '../supabase.js';

export function initAuthScreens() {
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginBtn) {
        loginBtn.onclick = async () => {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            if (!email || !password) return window.showToast('Please enter both email and password.');

            const originalText = loginBtn.textContent;
            loginBtn.textContent = 'Signing In...';

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            loginBtn.textContent = originalText;

            if (error) {
                window.showToast(error.message);
            } else {
                // Check if user has a profile
                const { data: profile } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();

                if (!profile) {
                    window.navigateTo('create-profile-screen');
                } else {
                    window.navigateTo('home-screen');
                }
            }
        };
    }

    if (signupBtn) {
        signupBtn.onclick = async () => {
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;

            if (!email || !password) return window.showToast('Please enter both email and password.');

            const originalText = signupBtn.textContent;
            signupBtn.textContent = 'Signing Up...';

            const { data, error } = await supabase.auth.signUp({
                email,
                password
            });

            signupBtn.textContent = originalText;

            if (error) {
                window.showToast(error.message);
            } else {
                window.showToast('Account created successfully! Please complete your profile.');
                window.navigateTo('create-profile-screen');
            }
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await supabase.auth.signOut();
            window.navigateTo('login-screen');
        };
    }
}

import { parseResumeAndUpload } from '../resume-parser.js';

export function initCreateProfileScreen() {
    const createProfileBtn = document.getElementById('create-profile-btn');
    const resumeInput = document.getElementById('profile-resume-input');
    const resumeText = document.getElementById('profile-resume-text');

    if (resumeInput && resumeText) {
        resumeInput.onchange = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                resumeText.textContent = e.target.files[0].name;
            } else {
                resumeText.textContent = "Upload PDF";
            }
        };
    }

    if (createProfileBtn) {
        createProfileBtn.onclick = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return window.showToast("No user found. Please sign up again.");

            const name = document.getElementById('profile-name-input').value.trim();
            const username = document.getElementById('profile-username-input').value.trim();
            const role = document.querySelector('input[name="role"]:checked').value;
            const profession = document.getElementById('profile-profession-input').value.trim();
            const college = document.getElementById('profile-college-input').value.trim();
            const company = document.getElementById('profile-company-input').value.trim();

            if (!name || !username) {
                return window.showToast('Name and Username are required.');
            }

            createProfileBtn.textContent = 'Saving...';
            createProfileBtn.disabled = true;

            const updateData = {
                id: user.id,
                name,
                username,
                role,
                profession_major: profession,
                college_company: role === 'student' ? college : company,
            };

            const { error } = await supabase.from('profiles').insert(updateData);

            if (error) {
                createProfileBtn.textContent = 'Continue';
                createProfileBtn.disabled = false;
                if (error.code === '23505') {
                    return window.showToast('Username already taken.');
                }
                return window.showToast('Error saving profile: ' + error.message);
            }

            // Handle resume upload if student
            if (role === 'student' && resumeInput && resumeInput.files.length > 0) {
                createProfileBtn.textContent = 'Parsing Resume...';
                await parseResumeAndUpload(resumeInput.files[0], user.id);
            }

            createProfileBtn.textContent = 'Continue';
            createProfileBtn.disabled = false;
            window.navigateTo('home-screen');
        };
    }
}
