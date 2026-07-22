import { supabase } from '../supabase.js';

let conversationHistory = [];

export function initAIChat() {
    const sendBtn = document.getElementById('ai-chat-send');
    const inputField = document.getElementById('ai-chat-input');
    const messagesContainer = document.getElementById('ai-chat-messages');

    if (!sendBtn || !inputField || !messagesContainer) return;

    // Reset history when opening chat
    conversationHistory = [];

    const appendUserMessage = (text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'flex items-end gap-2 max-w-[85%] self-end';
        msgDiv.innerHTML = `
            <div class="bg-black rounded-2xl rounded-br-none px-4 py-2.5 text-sm text-white font-medium">
                ${text}
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const appendAIMessage = (text) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'flex items-end gap-2 max-w-[85%]';
        msgDiv.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-white">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"></path></svg>
            </div>
            <div class="bg-gray-100 rounded-2xl rounded-bl-none px-4 py-2.5 text-sm text-gray-800 font-medium">
                ${text}
            </div>
        `;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    };

    const handleSend = async () => {
        const text = inputField.value.trim();
        if (!text) return;

        inputField.value = '';
        appendUserMessage(text);

        conversationHistory.push({ role: 'user', content: text });

        // Add a temporary loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'text-xs text-gray-400 italic ml-8';
        loadingDiv.id = 'ai-loading';
        loadingDiv.textContent = 'Typing...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            const { data, error } = await supabase.functions.invoke('ai-chat', {
                body: { history: conversationHistory }
            });

            if (error) throw error;

            const aiResponseText = data.candidates[0].content.parts[0].text;

            // Remove loading indicator
            const loader = document.getElementById('ai-loading');
            if (loader) loader.remove();

            appendAIMessage(aiResponseText);
            conversationHistory.push({ role: 'model', content: aiResponseText });

        } catch (error) {
            console.error("AI Chat Error:", error);
            const loader = document.getElementById('ai-loading');
            if (loader) loader.remove();
            appendAIMessage("Sorry, I'm having trouble connecting right now.");
        }
    };

    sendBtn.onclick = handleSend;
    inputField.onkeypress = (e) => {
        if (e.key === 'Enter') handleSend();
    };
}
