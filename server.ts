import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/api/live-ws' });

app.use(express.json());

// Initialize Google GenAI with required telemetry User-Agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Role-based system instructions
const getSystemInstruction = (role?: string, customInstruction?: string) => {
  const base = `You are Fin AI, an elite financial intelligence assistant embedded in the FinSight AI wealth & analytics platform. 
You provide structured, insightful, data-driven financial analysis, transaction explanations, fraud assessments, and wealth optimization recommendations.
Maintain an articulate, professional, and clear tone. Use formatted bullets, bold key metrics, and INR (₹) or standard financial figures when referring to balances.`;

  if (customInstruction) {
    return `${base}\n\nAdditional Directive: ${customInstruction}`;
  }

  switch (role) {
    case 'ADMIN':
      return `${base}\n\nCurrent Role Context: Platform Administrator (Elena Rostova). Focus on platform governance, model uptime (99.98%), user role authorization, infrastructure latency, and system audit logs.`;
    case 'CUSTOMER':
      return `${base}\n\nCurrent Role Context: Private Wealth Client (Arjun Verma, CUST-1001). Focus on personal financial health, portfolio growth (₹12,45,230 balance), monthly surplus optimization (+₹52,600), categorized expenses, cashback rewards, and goals.`;
    case 'RISK_FRAUD_ANALYST':
      return `${base}\n\nCurrent Role Context: Risk & Fraud Specialist (Devraj Sen). Focus on real-time fraud scoring, suspicious velocity triggers, overseas POS anomalies, merchant blocks, and false positive reduction (0.74%).`;
    case 'BUSINESS_ANALYST':
    default:
      return `${base}\n\nCurrent Role Context: Senior Financial Analyst (T. Gopi Chand). Focus on transaction trends (30,000 txns, ₹12.45L volume), customer segmentation, merchant category distribution, and cohort growth.`;
  }
};

// =========================================================================
// CHAT API: Multi-turn conversation with model selection
// Supports gemini-3.5-flash (general), gemini-3.1-flash-lite (fast),
// and gemini-3.1-pro-preview (complex tasks)
// =========================================================================
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, model = 'gemini-3.5-flash', role, systemInstruction } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      // Graceful demo simulation if key is not yet set in environment
      const lastMsg = messages[messages.length - 1]?.content || '';
      return res.json({
        text: `[Fin AI Offline Mode] Analyzed your query: "${lastMsg}". Note: Configure GEMINI_API_KEY in Settings > Secrets to unlock live model generation with ${model}.`,
        modelUsed: model,
        isSimulated: true
      });
    }

    // Map allowed models as specified
    let selectedModel = model;
    if (model === 'complex' || model === 'pro') {
      selectedModel = 'gemini-3.1-pro-preview';
    } else if (model === 'fast' || model === 'lite') {
      selectedModel = 'gemini-3.1-flash-lite';
    } else if (model === 'general' || model === 'flash') {
      selectedModel = 'gemini-3.5-flash';
    }

    // Format multi-turn conversation contents for @google/genai
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config: {
        systemInstruction: getSystemInstruction(role, systemInstruction),
        temperature: 0.7
      }
    });

    const replyText = response.text || 'No response generated.';
    return res.json({
      text: replyText,
      modelUsed: selectedModel
    });
  } catch (err: any) {
    console.error('Gemini Chat API Error:', err);
    return res.status(500).json({
      error: err?.message || 'Failed to generate response from Gemini API',
      details: err?.toString()
    });
  }
});

// =========================================================================
// TTS API: Speech generation using gemini-3.8-flash-lite-tts
// =========================================================================
app.post('/api/speak', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 500), // Clean limit for smooth audio
              speechMetadata: {
                style: 'Clear, professional financial advisor'
              }
            }
          ]
        }
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        audioUrl: `data:audio/wav;base64,${base64Audio}`,
        mimeType: 'audio/wav'
      });
    }

    return res.status(500).json({ error: 'No audio returned by TTS model' });
  } catch (err: any) {
    console.error('TTS API error:', err);
    return res.status(500).json({ error: err?.message || 'TTS generation failed' });
  }
});

// =========================================================================
// AUDIO TRANSCRIBE API: using gemini-3.5-transcribe
// =========================================================================
app.post('/api/transcribe', async (req: Request, res: Response) => {
  try {
    const { audio, mimeType = 'audio/wav' } = req.body;
    if (!audio) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    // Call gemini-3.5-transcribe model
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: audio,
                mimeType
              }
            }
          ]
        }
      ]
    });

    // gemini-3.5-transcribe returns non-text audioTranscription objects in candidates parts
    let transcript = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if ((part as any).audioTranscription?.text) {
        transcript += (part as any).audioTranscription.text;
      } else if (part.text) {
        transcript += part.text;
      }
    }
    if (!transcript && response.text) {
      transcript = response.text.trim();
    }

    return res.json({
      transcript: transcript.trim(),
      model: 'gemini-3.5-transcribe'
    });
  } catch (err: any) {
    console.error('Audio transcribe error:', err);
    return res.status(500).json({ error: err?.message || 'Transcription failed' });
  }
});

// Helper to build tailored Live Voice instructions with role context
const getLiveVoiceInstruction = (role?: string) => {
  const base = getSystemInstruction(role);
  return `${base}

Voice Assistant Guidelines for Real-Time Conversation:
- You are communicating via live real-time voice (Gemini Live API).
- Respond directly, concisely, and naturally as a spoken financial advisor (1-3 sentences maximum).
- Avoid markdown asterisks, complex tables, or bullets when speaking. Use natural phrasing.
- Be warm and receptive. Acknowledge greetings and answer follow-up questions in the ongoing dialogue without repeating greetings.
- Keep context of the conversation across multiple turns.`;
};

// =========================================================================
// LIVE API WEBSOCKET: Real-time bidirectional streaming with gemini-3.8-live
// =========================================================================
wss.on('connection', async (clientWs: WebSocket, req: any) => {
  console.log('Client connected to Gemini 3.8 Live API WebSocket');
  let liveSession: any = null;

  // Extract role from WebSocket URL query params if provided
  let currentRole = 'CUSTOMER';
  try {
    const url = new URL(req?.url || '', 'http://localhost');
    const roleParam = url.searchParams.get('role');
    if (roleParam) currentRole = roleParam;
  } catch {}

  try {
    if (!process.env.GEMINI_API_KEY) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: 'GEMINI_API_KEY is not set on the server. Please set it in Settings > Secrets.'
        })
      );
      return;
    }

    // Connect to Gemini 3.8 Live API
    liveSession = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
        },
        systemInstruction: getLiveVoiceInstruction(currentRole),
        outputAudioTranscription: {},
        inputAudioTranscription: {}
      },
      callbacks: {
        onmessage: (msg: any) => {
          // Model audio chunk (24kHz 16-bit PCM little-endian)
          const audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          const text = msg.serverContent?.modelTurn?.parts?.[0]?.text;
          const outputTranscript = msg.serverContent?.outputAudioTranscription?.text;
          const inputTranscript = msg.serverContent?.inputAudioTranscription?.text;
          const isInterrupted = msg.serverContent?.interrupted;
          const turnComplete = msg.serverContent?.turnComplete;

          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'server_content',
                audio,
                text,
                outputTranscript,
                inputTranscript,
                interrupted: isInterrupted,
                turnComplete
              })
            );
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live Session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err?.message || 'Gemini 3.8 Live session encountered an error'
              })
            );
          }
        },
        onclose: () => {
          console.log('Gemini Live Session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'session_closed' }));
          }
        }
      }
    });

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'session_ready',
          role: currentRole,
          message: 'Connected to gemini-3.8-live session successfully.'
        })
      );
    }

    clientWs.on('message', (raw: Buffer) => {
      try {
        const payload = JSON.parse(raw.toString());

        if (payload.type === 'audio' && payload.data) {
          // Send 16kHz PCM audio chunk to Live session
          liveSession?.sendRealtimeInput({
            audio: {
              data: payload.data,
              mimeType: 'audio/pcm;rate=16000'
            }
          });
        } else if (payload.type === 'text' && payload.text) {
          liveSession?.sendRealtimeInput({
            text: payload.text
          });
        } else if (payload.type === 'greeting') {
          // Spoken opening greeting trigger
          liveSession?.sendRealtimeInput({
            text: `A user activated you by saying "Hello Fin". Greet them aloud naturally in one concise sentence: "Hello! I'm Fin, your financial assistant. What can I help you with today?"`
          });
        }
      } catch (e) {
        console.error('Error handling message from client:', e);
      }
    });

    clientWs.on('close', () => {
      try {
        liveSession?.close?.();
      } catch (e) {}
    });
  } catch (err: any) {
    console.error('Live connect failed:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: err?.message || 'Could not connect to Gemini 3.8 Live API'
        })
      );
    }
  }
});

// Setup Vite middleware in dev or static files in production
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.resolve('dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`FinSight AI server listening on http://0.0.0.0:${PORT}`);
});
