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
