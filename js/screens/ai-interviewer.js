import { supabase } from '../supabase.js';

let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let websocket = null;
let isIntervewing = false;

// Audio parameters required by Gemini
const SAMPLE_RATE = 16000;

export function initAIInterviewer() {
    const aiScreen = document.getElementById('ai-interviewer-screen');
    if (!aiScreen) return;

    // The central big button in ai-interviewer-screen is our start/stop toggle
    // We need to add an ID to it to attach logic. We'll do this in the DOM when initializing.
    const buttons = aiScreen.querySelectorAll('button');
    const toggleBtn = buttons[1]; // Assuming the middle big button is the second one

    if (toggleBtn) {
        toggleBtn.id = 'ai-interviewer-toggle';
        toggleBtn.onclick = toggleInterview;
    }

    const backBtn = buttons[0];
    if (backBtn) {
        backBtn.onclick = () => {
            stopInterview();
            navigateTo('home-screen');
        };
    }
}

async function toggleInterview() {
    if (isIntervewing) {
        stopInterview();
    } else {
        await startInterview();
    }
}

async function startInterview() {
    try {
        isIntervewing = true;
        updateUIState(true);

        // 1. Get Supabase Edge Function URL for WebSocket
        // Replace https:// with wss:// for the edge function URL
        const functionsUrl = supabase.functions.url;
        const wsUrl = `${functionsUrl.replace('http', 'ws')}/ai-interviewer`;

        // 2. Connect to WebSocket
        websocket = new WebSocket(wsUrl);

        websocket.onopen = async () => {
            console.log("WebSocket connected to Supabase Edge Function.");
            await startAudioCapture();
        };

        websocket.onmessage = async (event) => {
            // Handle incoming message from Gemini
            try {
                let dataStr = event.data;
                if (event.data instanceof Blob) {
                    dataStr = await event.data.text();
                }
                const data = JSON.parse(dataStr);

                // Gemini Live API returns serverContent.modelTurn.parts[0].inlineData.data (base64 audio)
                if (data.serverContent && data.serverContent.modelTurn && data.serverContent.modelTurn.parts) {
                     for (const part of data.serverContent.modelTurn.parts) {
                         if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
                             playAudioChunk(part.inlineData.data);
                         }
                     }
                }
            } catch (e) {
                console.error("Error processing incoming message:", e);
            }
        };

        websocket.onerror = (e) => console.error("WebSocket Error:", e);
        websocket.onclose = () => {
            console.log("WebSocket Closed.");
            stopInterview();
        };

    } catch (err) {
        console.error("Failed to start interview:", err);
        stopInterview();
    }
}

async function startAudioCapture() {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(mediaStream);

    // We use ScriptProcessorNode for raw PCM extraction (AudioWorklet is better but more complex for a single file MVP)
    scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    scriptProcessor.onaudioprocess = (e) => {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            let s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to Base64
        const uint8Array = new Uint8Array(pcmData.buffer);
        let binary = '';
        for (let i = 0; i < uint8Array.byteLength; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binary);

        // Send to Gemini format: clientContent.turns...
        const msg = {
            realtimeInput: {
                mediaChunks: [{
                    mimeType: `audio/pcm;rate=${SAMPLE_RATE}`,
                    data: base64Audio
                }]
            }
        };
        websocket.send(JSON.stringify(msg));
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
}

function playAudioChunk(base64Data) {
    if (!audioContext) return;

    // Convert base64 to array buffer
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }

    // Convert Uint8Array to Int16Array
    const pcm16 = new Int16Array(bytes.buffer);

    // Convert to Float32Array for Web Audio API
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
    }

    const audioBuffer = audioContext.createBuffer(1, float32.length, SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
}

function stopInterview() {
    isIntervewing = false;
    updateUIState(false);

    if (scriptProcessor) {
        scriptProcessor.disconnect();
        scriptProcessor = null;
    }
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    if (websocket) {
        websocket.close();
        websocket = null;
    }
}

function updateUIState(active) {
    const waves = document.querySelectorAll('.voice-wave');
    const toggleBtn = document.getElementById('ai-interviewer-toggle');

    if (active) {
        waves.forEach(w => w.style.animationPlayState = 'running');
        if(toggleBtn) toggleBtn.classList.add('bg-red-500', 'text-white');
        if(toggleBtn) toggleBtn.classList.remove('bg-white', 'text-black');
        if(toggleBtn) toggleBtn.innerHTML = '<svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"></path></svg>'; // Stop icon
    } else {
        waves.forEach(w => w.style.animationPlayState = 'paused');
        if(toggleBtn) toggleBtn.classList.remove('bg-red-500', 'text-white');
        if(toggleBtn) toggleBtn.classList.add('bg-white', 'text-black');
        if(toggleBtn) toggleBtn.innerHTML = '<svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path></svg>'; // Mic icon
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Start waves paused
    const waves = document.querySelectorAll('.voice-wave');
    waves.forEach(w => w.style.animationPlayState = 'paused');
});
