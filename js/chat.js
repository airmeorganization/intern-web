import { supabase } from './config.js';

let currentSubscription = null;
let currentChatUserId = null;

export async function loadChatList(currentUserId) {
  const container = document.getElementById('chat-list-container');
  if (!container) return;

  container.innerHTML = '<div class="p-4 text-center">Loading chats...</div>';

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, username), receiver:profiles!messages_receiver_id_fkey(id, full_name, username)')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<div class="p-4 text-center text-red-500">Error loading chats</div>';
    return;
  }

  const uniqueUsers = new Map();

  if (messages) {
    messages.forEach(msg => {
      const otherUser = msg.sender_id === currentUserId ? msg.receiver : msg.sender;
      if (otherUser && !uniqueUsers.has(otherUser.id)) {
        uniqueUsers.set(otherUser.id, {
          user: otherUser,
          lastMessage: msg.content,
          time: new Date(msg.created_at).toLocaleDateString()
        });
      }
    });
  }

  let html = `
    <div class="p-4 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3" onclick="openAIChat()">
      <div class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">AI</div>
      <div>
        <h4 class="font-bold">intern. AI</h4>
        <p class="text-sm text-gray-500">Chat with AI</p>
      </div>
    </div>
  `;

  uniqueUsers.forEach(({user, lastMessage, time}) => {
    html += `
      <div class="p-4 border-b cursor-pointer hover:bg-gray-50 flex items-center gap-3" onclick="openChat('${user.id}', '${escapeHtml(user.full_name)}')">
        <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center font-bold">${user.full_name ? user.full_name.charAt(0) : 'U'}</div>
        <div class="flex-1">
          <div class="flex justify-between">
            <h4 class="font-bold">${escapeHtml(user.full_name)}</h4>
            <span class="text-xs text-gray-500">${time}</span>
          </div>
          <p class="text-sm text-gray-500 truncate">${escapeHtml(lastMessage)}</p>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

export async function openChat(receiverId, receiverName) {
  currentChatUserId = receiverId;
  document.getElementById('chat-detail-name').textContent = receiverName;
  navigateTo('chat-detail-screen');

  const container = document.getElementById('chat-messages-container');
  container.innerHTML = '<div class="text-center p-4">Loading messages...</div>';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = '<div class="text-center text-red-500">Error loading messages</div>';
    return;
  }

  const renderMessage = (msg) => {
    const isMe = msg.sender_id === user.id;
    return `
      <div class="flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'}">
        <div class="max-w-[70%] px-4 py-2 rounded-2xl ${isMe ? 'bg-black text-white rounded-br-none' : 'bg-gray-200 text-black rounded-bl-none'}">
          ${escapeHtml(msg.content)}
        </div>
      </div>
    `;
  };

  container.innerHTML = messages?.map(renderMessage).join('') || '';
  container.scrollTop = container.scrollHeight;

  if (currentSubscription) {
    await supabase.removeChannel(currentSubscription);
  }

  currentSubscription = supabase.channel('chat-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
      const msg = payload.new;
      if ((msg.sender_id === user.id && msg.receiver_id === receiverId) ||
          (msg.sender_id === receiverId && msg.receiver_id === user.id)) {
        container.insertAdjacentHTML('beforeend', renderMessage(msg));
        container.scrollTop = container.scrollHeight;
      }
    })
    .subscribe();
}

export async function sendMessage(content) {
  if (!content || !currentChatUserId) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('messages').insert([{
    sender_id: user.id,
    receiver_id: currentChatUserId,
    content
  }]);
}

window.openAIChat = function() {
  navigateTo('ai-chat-screen');
}

export async function askGemini(prompt) {
  const container = document.getElementById('ai-messages-container');

  // Append user message
  container.insertAdjacentHTML('beforeend', `
    <div class="flex flex-col mb-2 items-end">
      <div class="max-w-[70%] px-4 py-2 rounded-2xl bg-black text-white rounded-br-none">
        ${escapeHtml(prompt)}
      </div>
    </div>
  `);

  const loadingId = 'loading-' + Date.now();
  container.insertAdjacentHTML('beforeend', `
    <div id="${loadingId}" class="flex flex-col mb-2 items-start text-sm text-gray-500">
      Thinking...
    </div>
  `);
  container.scrollTop = container.scrollHeight;

  try {
    const { data, error } = await supabase.functions.invoke('gemini-chat', {
      body: { prompt }
    });

    document.getElementById(loadingId)?.remove();

    if (error) throw error;

    container.insertAdjacentHTML('beforeend', `
      <div class="flex flex-col mb-2 items-start">
        <div class="max-w-[70%] px-4 py-2 rounded-2xl bg-blue-100 text-black rounded-bl-none">
          ${escapeHtml(data.reply)}
        </div>
      </div>
    `);
    container.scrollTop = container.scrollHeight;

  } catch (err) {
    document.getElementById(loadingId)?.remove();
    container.insertAdjacentHTML('beforeend', `
      <div class="text-red-500 text-sm mb-2">Error connecting to AI</div>
    `);
  }
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
