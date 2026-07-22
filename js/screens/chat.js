import { supabase } from '../supabase.js';

let messageSubscription = null;
let currentChatUserId = null;

export async function loadChats() {
    const container = document.getElementById('chats-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading messages...</div>';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">Please log in.</div>';
        return;
    }

    // Get latest message for each conversation
    // This requires a more complex query in Supabase, but for simplicity we fetch all messages and group
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="p-6 text-center text-red-500">Error: ${error.message}</div>`;
        return;
    }

    // Include AI chat as default first item
    let html = `
    <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors" onclick="navigateTo('ai-chat-detail-screen')">
      <div class="relative">
        <div class="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-md">
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"></path></svg>
        </div>
        <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
      </div>
      <div class="flex-1">
        <div class="flex justify-between items-center mb-1">
          <h3 class="text-sm font-bold text-black flex items-center gap-1">intern. AI <span class="bg-black text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">Beta</span></h3>
          <span class="text-[10px] text-gray-400 font-semibold">Now</span>
        </div>
        <p class="text-xs text-gray-500 font-medium truncate">Hey! How can I help with your career today?</p>
      </div>
    </div>
    `;

    if (messages && messages.length > 0) {
        const uniqueChats = new Map();

        messages.forEach(msg => {
            const otherUser = msg.sender_id === user.id ? msg.receiver : msg.sender;
            if (!uniqueChats.has(otherUser.id)) {
                uniqueChats.set(otherUser.id, {
                    otherUser,
                    lastMessage: msg.content,
                    time: new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    unread: msg.receiver_id === user.id && !msg.is_read
                });
            }
        });

        uniqueChats.forEach((chat, userId) => {
            const initials = chat.otherUser.name ? chat.otherUser.name.charAt(0).toUpperCase() : 'U';
            html += `
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors" onclick="openChatDetail('${userId}', '${chat.otherUser.name}')">
              <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">${initials}</div>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <h3 class="text-sm font-bold text-black ${chat.unread ? 'font-black' : ''}">${chat.otherUser.name}</h3>
                  <span class="text-[10px] text-gray-400 font-semibold">${chat.time}</span>
                </div>
                <p class="text-xs text-gray-500 font-medium truncate ${chat.unread ? 'text-black font-bold' : ''}">${chat.lastMessage}</p>
              </div>
            </div>
            `;
        });
    }

    container.innerHTML = html;
}

window.openChatDetail = function(userId, userName) {
    currentChatUserId = userId;
    // Set username in header
    // Initialize realtime subscription
    navigateTo('chat-detail-screen');
    // We would fetch specific chat history here
}

document.addEventListener('DOMContentLoaded', () => {
    const chatScreen = document.getElementById('chat-screen');
    if(chatScreen) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && chatScreen.style.display !== 'none') {
                    loadChats();
                }
            });
        });
        observer.observe(chatScreen, { attributes: true });
    }
});
