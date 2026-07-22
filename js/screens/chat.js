import { supabase } from '../supabase.js';

let currentChatUserId = null;
let currentChatUserName = null;
let messageSubscription = null;


function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export async function loadChats() {
    const container = document.getElementById('chats-container');
    if (!container) return;

    container.innerHTML = '<div class="p-6 text-center text-gray-500">Loading messages...</div>';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        container.innerHTML = '<div class="p-6 text-center text-gray-500">Please log in.</div>';
        return;
    }

    // Fetch all messages involving the user to determine active chats
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(id, name), receiver:profiles!messages_receiver_id_fkey(id, name)')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="p-6 text-center text-red-500">Error: ${error.message}</div>`;
        return;
    }

    // AI Chat is always available
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
            if (otherUser && !uniqueChats.has(otherUser.id)) {
                uniqueChats.set(otherUser.id, {
                    otherUser,
                    lastMessage: msg.content,
                    time: new Date(msg.created_at).toLocaleDateString(),
                    unread: msg.receiver_id === user.id && !msg.is_read
                });
            }
        });

        uniqueChats.forEach((chat, userId) => {
            const initials = chat.otherUser.name ? chat.otherUser.name.charAt(0).toUpperCase() : 'U';
            html += `
            <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors" onclick="openChatDetail('${userId}', '${escapeHtml(chat.otherUser.name)}')">
              <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">${initials}</div>
              <div class="flex-1">
                <div class="flex justify-between items-center mb-1">
                  <h3 class="text-sm font-bold text-black ${chat.unread ? 'font-black' : ''}">${escapeHtml(chat.otherUser.name)}</h3>
                  <span class="text-[10px] text-gray-400 font-semibold">${chat.time}</span>
                </div>
                <p class="text-xs text-gray-500 font-medium truncate ${chat.unread ? 'text-black font-bold' : ''}">${escapeHtml(chat.lastMessage)}</p>
              </div>
            </div>
            `;
        });
    }

    container.innerHTML = html;
}

window.openChatDetail = function(userId, userName) {
    currentChatUserId = userId;
    currentChatUserName = userName;
    window.navigateTo('chat-detail-screen');
    // Ensure the chat detail screen has a container ready.
    // If not, we'll need to inject the HTML for it or update it.
    // Assuming we have chat-detail-screen, let's load messages.
    loadChatDetail();
}

async function loadChatDetail() {
    // Check if chat-detail-screen exists, if not we create the basic structure in index.html later or inject it here.
    const screen = document.getElementById('chat-detail-screen');
    if (!screen) {
        window.showToast("Chat detail screen missing.");
        return;
    }

    // Set header
    const headerName = document.getElementById('chat-detail-name');
    if (headerName) headerName.textContent = currentChatUserName || 'User';

    const messagesContainer = document.getElementById('chat-detail-messages');
    if (!messagesContainer) return;

    messagesContainer.innerHTML = '<div class="text-center text-xs text-gray-500 py-4">Loading messages...</div>';

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${currentChatUserId}),and(sender_id.eq.${currentChatUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

    if (error) {
        messagesContainer.innerHTML = `<div class="text-center text-red-500 text-xs py-4">Error loading messages.</div>`;
        return;
    }

    const renderMessage = (msg) => {
        const isMe = msg.sender_id === user.id;
        return `
        <div class="flex items-end gap-2 max-w-[85%] ${isMe ? 'self-end' : ''}">
          ${!isMe ? `<div class="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center font-bold text-[8px] text-gray-500">${currentChatUserName?.charAt(0).toUpperCase() || 'U'}</div>` : ''}
          <div class="${isMe ? 'bg-black text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'} rounded-2xl px-4 py-2.5 text-sm font-medium">
            ${escapeHtml(msg.content)}
          </div>
        </div>
        `;
    };

    if (!messages || messages.length === 0) {
        messagesContainer.innerHTML = '<div class="text-center text-xs text-gray-500 py-4">Say hi!</div>';
    } else {
        messagesContainer.innerHTML = messages.map(renderMessage).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Mark as read
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', currentChatUserId).eq('receiver_id', user.id).eq('is_read', false);

    // Setup realtime subscription
    if (messageSubscription) {
        await supabase.removeChannel(messageSubscription);
    }

    messageSubscription = supabase.channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            const msg = payload.new;
            if ((msg.sender_id === user.id && msg.receiver_id === currentChatUserId) ||
                (msg.sender_id === currentChatUserId && msg.receiver_id === user.id)) {

                // Remove 'Say hi!' if it's there
                if (messagesContainer.innerHTML.includes('Say hi!')) {
                    messagesContainer.innerHTML = '';
                }

                const msgDiv = document.createElement('div');
                msgDiv.outerHTML = renderMessage(msg); // OuterHTML replaces itself, so better to append child normally
                messagesContainer.insertAdjacentHTML('beforeend', renderMessage(msg));
                messagesContainer.scrollTop = messagesContainer.scrollHeight;

                if (msg.sender_id === currentChatUserId) {
                    supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
                }
            }
        })
        .subscribe();
}

export function initChatDetail() {
    const sendBtn = document.getElementById('chat-detail-send');
    const inputField = document.getElementById('chat-detail-input');

    if (sendBtn && inputField) {
        const handleSend = async () => {
            const content = inputField.value.trim();
            if (!content || !currentChatUserId) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            inputField.value = '';

            const { error } = await supabase.from('messages').insert({
                sender_id: user.id,
                receiver_id: currentChatUserId,
                content
            });

            if (error) {
                window.showToast('Error sending message: ' + error.message);
            }
        };

        sendBtn.onclick = handleSend;
        inputField.onkeypress = (e) => {
            if (e.key === 'Enter') handleSend();
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initChatDetail();

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
