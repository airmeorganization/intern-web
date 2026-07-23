import { supabase } from './config.js';
import { escapeHtml } from './data.js';

let currentSubscription = null;
export let currentChatUserId = null;

export async function loadChatList(currentUserId) {
  const container = document.getElementById('chat-list-container');
  if (!container) return;

  container.innerHTML = '<div class="p-4 text-center text-[#6B7280]">Loading chats...</div>';

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*, sender:profiles!messages_sender_id_fkey(id, full_name, username), receiver:profiles!messages_receiver_id_fkey(id, full_name, username)')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<div class="p-4 text-center text-[#EF4444]">Error loading chats</div>';
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
          time: '2m' // mock time for MVP UI
        });
      }
    });
  }

  let html = `
    <div class="px-6 py-4 border-b border-[#FAFAFA] flex items-center gap-4 cursor-pointer hover:bg-[#FAFAFA]" onclick="navigateTo('ai-chat-screen')">
      <div class="w-12 h-12 rounded-full bg-[#111111] text-white flex items-center justify-center"><span class="material-symbols-rounded text-[20px]">smart_toy</span></div>
      <div class="flex-1">
        <div class="flex justify-between items-center mb-1"><h4 class="font-semibold text-[15px]">intern. AI</h4><span class="caption-text text-[#6B7280]">Now</span></div>
        <p class="small-text text-[#6B7280] truncate">Hi! How can I help?</p>
      </div>
    </div>
  `;

  uniqueUsers.forEach(({user, lastMessage, time}) => {
    html += `
      <div class="px-6 py-4 border-b border-[#FAFAFA] flex items-center gap-4 cursor-pointer hover:bg-[#FAFAFA]" onclick="window.openChatWrapper('${user.id}', '${escapeHtml(user.full_name)}')">
        <div class="w-12 h-12 rounded-full bg-[#FAFAFA] border border-[#E5E7EB] flex items-center justify-center font-bold">${user.full_name ? user.full_name.charAt(0) : 'U'}</div>
        <div class="flex-1">
          <div class="flex justify-between items-center mb-1"><h4 class="font-semibold text-[15px]">${escapeHtml(user.full_name)}</h4><span class="caption-text text-[#6B7280]">${time}</span></div>
          <p class="small-text text-[#6B7280] truncate">${escapeHtml(lastMessage)}</p>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

export async function openChat(receiverId, receiverName) {
  currentChatUserId = receiverId;
  const chatDetailName = document.getElementById('chat-detail-name');
  if (chatDetailName) chatDetailName.textContent = receiverName;

  if (typeof window.navigateTo === 'function') {
      window.navigateTo('chat-detail-screen');
  }

  const container = document.getElementById('chat-messages-container');
  if (!container) return;
  container.innerHTML = '<div class="text-center p-4 text-[#6B7280]">Loading messages...</div>';

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true });

  if (error) {
    container.innerHTML = '<div class="text-center text-[#EF4444]">Error loading messages</div>';
    return;
  }

  const renderMessage = (msg) => {
    const isMe = msg.sender_id === user.id;
    return `
      <div class="flex flex-col items-${isMe ? 'end' : 'start'}">
        <div class="max-w-[75%] px-4 py-3 rounded-[20px] ${isMe ? 'rounded-br-none bg-[#111111] text-white' : 'rounded-tl-none bg-white border border-[#E5E7EB] text-[#111111]'} body-text shadow-sm">
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

export async function askGemini(prompt) {
  const container = document.getElementById('ai-messages-container');
  if (!container) return;

  container.insertAdjacentHTML('beforeend', `
    <div class="flex flex-col items-end">
      <div class="max-w-[75%] px-4 py-3 rounded-[20px] rounded-br-none bg-[#111111] text-white body-text shadow-sm mb-4">
        ${escapeHtml(prompt)}
      </div>
    </div>
  `);

  const loadingId = 'loading-' + Date.now();
  container.insertAdjacentHTML('beforeend', `
    <div id="${loadingId}" class="flex flex-col items-start">
      <div class="px-4 py-3 rounded-[20px] rounded-tl-none bg-white border border-[#E5E7EB] shadow-sm flex items-center gap-1 mb-4">
        <div class="w-1.5 h-1.5 rounded-full bg-[#6B7280] typing-dot"></div>
        <div class="w-1.5 h-1.5 rounded-full bg-[#6B7280] typing-dot"></div>
        <div class="w-1.5 h-1.5 rounded-full bg-[#6B7280] typing-dot"></div>
      </div>
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
      <div class="flex flex-col items-start">
        <div class="max-w-[75%] px-4 py-3 rounded-[20px] rounded-tl-none bg-white border border-[#E5E7EB] text-[#111111] body-text shadow-sm mb-4 leading-relaxed">
          ${escapeHtml(data.reply)}
        </div>
      </div>
    `);
    container.scrollTop = container.scrollHeight;

  } catch (err) {
    document.getElementById(loadingId)?.remove();
    container.insertAdjacentHTML('beforeend', `
      <div class="text-[#EF4444] text-sm mb-2">Error connecting to AI</div>
    `);
  }
}
