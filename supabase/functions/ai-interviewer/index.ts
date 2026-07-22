import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }});
    }

    if (!GEMINI_API_KEY) {
        return new Response("GEMINI_API_KEY is missing", { status: 500 });
    }

    // Check if the request is a WebSocket upgrade request
    if (req.headers.get("upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);

    const geminiWsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

    let geminiSocket: WebSocket;

    socket.onopen = () => {
        geminiSocket = new WebSocket(geminiWsUrl);

        geminiSocket.onopen = () => {
            console.log("Connected to Gemini Live API");
            // Initial setup message could be sent here if required by Gemini Live API
            const setupMessage = {
                setup: {
                    model: "models/gemini-2.0-flash-exp"
                }
            };
            geminiSocket.send(JSON.stringify(setupMessage));
        };

        geminiSocket.onmessage = (event) => {
            // Forward Gemini's response to the client
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(event.data);
            }
        };

        geminiSocket.onerror = (error) => {
            console.error("Gemini WebSocket Error:", error);
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };

        geminiSocket.onclose = () => {
            console.log("Gemini WebSocket Closed");
            if (socket.readyState === WebSocket.OPEN) {
                socket.close();
            }
        };
    };

    socket.onmessage = (event) => {
        // Forward client messages (audio chunks/setup) to Gemini
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
            geminiSocket.send(event.data);
        }
    };

    socket.onerror = (e) => console.log("Client WebSocket error:", e);

    socket.onclose = () => {
        if (geminiSocket && geminiSocket.readyState === WebSocket.OPEN) {
            geminiSocket.close();
        }
    };

    return response;
});
