import { supabase } from './supabase.js';

window.navigateTo = function (screenId) {
  document.querySelectorAll('.app-screen').forEach(screen => {
    screen.style.display = 'none';
  });

  const target = document.getElementById(screenId);
  if (target) {
    target.style.display = 'flex';
    const scrollable = target.querySelector('.overflow-y-auto');
    if (scrollable) {
      scrollable.scrollTop = 0;
    }
  }
};

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    window.navigateTo('home-screen');
  } else {
    window.navigateTo('login-screen');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (document.getElementById('splash-screen').style.display !== 'none') {
      checkSession();
    }
  }, 2000);

  // Setup login listeners
  const googleBtn = document.querySelector('#login-screen button:nth-child(1)');
  if (googleBtn) {
    googleBtn.onclick = (e) => {
      e.preventDefault();
      alert("Google Sign-In integration is under review and will be live soon! Please sign in using Email or aorg.in.");
    };
  }
});
import { loadFeed } from './screens/feed.js';
import { loadSuggestions } from './screens/suggestions.js';
import { initPostJobScreen } from './screens/post-job.js';

document.addEventListener('DOMContentLoaded', () => {
    initPostJobScreen();
});
import { loadProfile } from './screens/profile.js';
import { loadChats } from './screens/chat.js';
import { initAIChat } from './screens/ai-chat.js';
document.addEventListener('DOMContentLoaded', initAIChat);
import { initSearchScreen } from './screens/search.js';
document.addEventListener('DOMContentLoaded', initSearchScreen);
import { initAIInterviewer } from './screens/ai-interviewer.js';
document.addEventListener('DOMContentLoaded', initAIInterviewer);
import { initAuthScreens, initCreateProfileScreen } from './screens/auth.js';

// Global toast function
window.showToast = function(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full text-white text-sm font-bold shadow-lg z-50 transition-opacity duration-300 ${isError ? 'bg-red-500' : 'bg-black'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {
    initAuthScreens();
    initCreateProfileScreen();
});
import { loadDashboard } from './screens/dashboard.js';
import { loadApplications } from './screens/applications.js';
import { initPostDetail } from './screens/post-detail.js';
