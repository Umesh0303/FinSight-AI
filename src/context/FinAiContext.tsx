import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from './AppContext';
import type { RagCitation } from '../types/rag';

export interface FinAiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  modelUsed?: string;
  chips?: string[];
  citations?: RagCitation[];
  grounded?: boolean;
}


export type WakeWordStatus = 'off' | 'listening' | 'in_conversation' | 'denied' | 'unsupported';

interface FinAiContextType {
  isChatOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  isVoiceModalOpen: boolean;
  openVoiceModal: (initialPrompt?: string) => void;
  closeVoiceModal: () => void;
  voiceInitialPrompt: string | null;
  isWakeWordEnabled: boolean;
  toggleWakeWord: () => void;
  wakeWordStatus: WakeWordStatus;
  wakeWordFeedback: string | null;
  messages: FinAiMessage[];
  setMessages: React.Dispatch<React.SetStateAction<FinAiMessage[]>>;
  sendMessage: (content: string) => Promise<void>;
  isTyping: boolean;
  selectedModel: string;
  setSelectedModel: (m: string) => void;
  selectedPersona: string;
  setSelectedPersona: (p: string) => void;
  clearHistory: () => void;
  micNotice: string | null;
  setMicNotice: (n: string | null) => void;
  playingAudioId: string | null;
  speakMessage: (msgId: string, text: string) => Promise<void>;
  stopVoicePlayback: () => void;
  transcribeAudio: (base64Audio: string, mimeType?: string) => Promise<string>;
  isTranscribeModalOpen: boolean;
  openTranscribeModal: () => void;
  closeTranscribeModal: () => void;
}

const FinAiContext = createContext<FinAiContextType | undefined>(undefined);

// Friendly Web Audio two-tone chime (523.25Hz -> 659.25Hz)
const playWakeChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.1);
    gain2.gain.setValueAtTime(0.14, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.32);
  } catch {
    // ignore audio context failures
  }
};

export const FinAiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentRole, currentUser } = useApp();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isTranscribeModalOpen, setIsTranscribeModalOpen] = useState(false);
  const [voiceInitialPrompt, setVoiceInitialPrompt] = useState<string | null>(null);
  const [isWakeWordEnabled, setIsWakeWordEnabled] = useState(false);
  const [wakeWordStatus, setWakeWordStatus] = useState<WakeWordStatus>('off');
  const [wakeWordFeedback, setWakeWordFeedback] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [selectedPersona, setSelectedPersona] = useState<string>(currentRole);
  const [isTyping, setIsTyping] = useState(false);
  const [micNotice, setMicNotice] = useState<string | null>(null);

  // Sync persona with user's role
  useEffect(() => {
    setSelectedPersona(currentRole);
  }, [currentRole]);

  // Initial greeting as specified in prompt
  const [messages, setMessages] = useState<FinAiMessage[]>([
    {
      id: 'msg-init',
      role: 'assistant',
      content: "Hello! I'm Fin AI, your financial assistant. How can I help you today?",
      time: '10:00 AM',
      modelUsed: 'gemini-3.5-flash',
      chips: [
        'What is my monthly savings surplus?',
        'Summarize top fraud risk anomalies',
        'Compare weekend vs weekday spending',
        'Give me a 30-second portfolio checkup'
      ]
    }
  ]);

  // Wake word speech recognition ref
  const wakeRecognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const shouldListenRef = useRef<boolean>(false);

  // Active audio playback, speech synthesis, & TTS cancellation
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudioCtxRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const playbackTokenRef = useRef<number>(0);

  // Centralized stopVoicePlayback function to immediately halt all speech and audio
  const stopVoicePlayback = useCallback(() => {
    // Invalidate playback token so all pending async callbacks and streams are ignored
    playbackTokenRef.current += 1;

    // 1. Abort any in-flight /api/speak TTS request
    if (ttsAbortControllerRef.current) {
      try {
        ttsAbortControllerRef.current.abort();
      } catch {}
      ttsAbortControllerRef.current = null;
    }

    // 2. Pause and completely reset any active HTMLAudioElement
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
        currentAudioRef.current.src = '';
        currentAudioRef.current.load();
      } catch {}
      currentAudioRef.current = null;
    }

    // 3. Cancel any browser SpeechSynthesis utterances
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    currentUtteranceRef.current = null;

    // 4. Stop and disconnect active Web Audio API sources / contexts
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch {}
      currentAudioSourceRef.current = null;
    }
    if (currentAudioCtxRef.current) {
      try {
        if (currentAudioCtxRef.current.state !== 'closed') {
          currentAudioCtxRef.current.close().catch(() => {});
        }
      } catch {}
      currentAudioCtxRef.current = null;
    }

    // 5. Reset playing indicator so all Listen buttons reset to inactive/ready state
    setPlayingAudioId(null);
  }, []);

  // Shared speakMessage for reading assistant responses aloud
  const speakMessage = useCallback(
    async (msgId: string, text: string) => {
      // If already playing this message, toggle off immediately
      if (playingAudioId === msgId) {
        stopVoicePlayback();
        return;
      }

      // Stop any existing speech before starting
      stopVoicePlayback();

      const currentToken = ++playbackTokenRef.current;
      const controller = new AbortController();
      ttsAbortControllerRef.current = controller;
      setPlayingAudioId(msgId);

      const fallbackBrowserSpeech = (cleanText: string) => {
        if (playbackTokenRef.current !== currentToken) return;
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          setPlayingAudioId(null);
          return;
        }

        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 500));
          currentUtteranceRef.current = utterance;
          utterance.rate = 1.0;
          utterance.pitch = 1.0;

          utterance.onend = () => {
            if (playbackTokenRef.current === currentToken) {
              setPlayingAudioId(null);
              currentUtteranceRef.current = null;
            }
          };

          utterance.onerror = () => {
            if (playbackTokenRef.current === currentToken) {
              setPlayingAudioId(null);
              currentUtteranceRef.current = null;
            }
          };

          if (playbackTokenRef.current === currentToken) {
            window.speechSynthesis.speak(utterance);
          }
        } catch {
          setPlayingAudioId(null);
        }
      };

      try {
        const token = localStorage.getItem('finsight_token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/speak', {
          method: 'POST',
          headers,
          body: JSON.stringify({ text, voice: 'Kore' }),
          signal: controller.signal
        });

        if (!res.ok) throw new Error('TTS error');
        const data = await res.json();

        // If canceled or token changed while request was pending, abort playback
        if (controller.signal.aborted || playbackTokenRef.current !== currentToken) {
          return;
        }

        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            if (playbackTokenRef.current === currentToken && currentAudioRef.current === audio) {
              currentAudioRef.current = null;
              setPlayingAudioId(null);
            }
          };

          audio.onerror = () => {
            if (playbackTokenRef.current === currentToken) {
              currentAudioRef.current = null;
              fallbackBrowserSpeech(text);
            }
          };

          if (playbackTokenRef.current === currentToken) {
            await audio.play();
          }
        } else {
          fallbackBrowserSpeech(text);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError' || playbackTokenRef.current !== currentToken) {
          return;
        }
        // Fallback to browser SpeechSynthesis
        fallbackBrowserSpeech(text);
      }
    },
    [playingAudioId, stopVoicePlayback]
  );

  const openChat = useCallback(() => setIsChatOpen(true), []);
  const closeChat = useCallback(() => {
    stopVoicePlayback();
    setIsChatOpen(false);
  }, [stopVoicePlayback]);

  const toggleChat = useCallback(() => {
    setIsChatOpen((prev) => {
      if (prev) {
        stopVoicePlayback();
        return false;
      }
      return true;
    });
  }, [stopVoicePlayback]);

  const openVoiceModal = useCallback((initialPrompt?: string) => {
    stopVoicePlayback();
    setVoiceInitialPrompt(initialPrompt || null);
    setIsVoiceModalOpen(true);
  }, [stopVoicePlayback]);

  const closeVoiceModal = useCallback(() => {
    setIsVoiceModalOpen(false);
    setVoiceInitialPrompt(null);
  }, []);

  // Multi-turn sendMessage to server-side Gemini endpoint
  const sendMessage = async (content: string) => {
    if (!content.trim() || isTyping) return;
    stopVoicePlayback();

    const userMsg: FinAiMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: content.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('finsight_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
          model: selectedModel,
          role: selectedPersona
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error || `Server returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: FinAiMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: data.text || 'No response generated.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
        citations: Array.isArray(data.citations) && data.citations.length > 0 ? data.citations : undefined,
        grounded: Boolean(data.grounded || (Array.isArray(data.citations) && data.citations.length > 0))
      };

      setMessages((prev) => [...prev, assistantMsg]);

    } catch (err: any) {
      const errorMsg = err?.message || 'Unable to connect to Fin AI / Gemini API service.';
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `⚠️ **Connection Notice:** ${errorMsg}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: `${selectedModel} (connection notice)`
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearHistory = () => {
    stopVoicePlayback();
    setMessages([
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: "Hello! I'm Fin AI, your financial assistant. How can I help you today?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: selectedModel,
        chips: [
          'What is my monthly savings surplus?',
          'Summarize top fraud risk anomalies',
          'Give me a 30-second portfolio checkup'
        ]
      }
    ]);
  };

  // Safe Wake-Word ("Hello Fin") Recognition Engine
  const stopWakeWordListening = useCallback(() => {
    shouldListenRef.current = false;
    isListeningRef.current = false;
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.abort();
      } catch {}
      wakeRecognitionRef.current = null;
    }
  }, []);

  const handleWakeWordDetected = useCallback((phrase: string, trailingText?: string) => {
    console.log(`[Fin AI] Wake phrase recognized: "${phrase}"`);
    playWakeChime();

    setWakeWordFeedback("Hello Fin recognized! I'm listening...");
    setWakeWordStatus('in_conversation');

    // Pause wake recognition during active voice session to prevent feedback loops
    if (wakeRecognitionRef.current) {
      try {
        wakeRecognitionRef.current.stop();
      } catch {}
    }

    // Immediately open Live Voice modal with greeting or the spoken question
    const promptToPass = trailingText && trailingText.trim().length > 2 ? trailingText.trim() : 'greeting';
    openVoiceModal(promptToPass);

    setTimeout(() => {
      setWakeWordFeedback(null);
    }, 4000);
  }, [openVoiceModal]);

  const startWakeWordListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setWakeWordStatus('unsupported');
      setMicNotice("Wake-word 'Hello Fin' is not supported in this browser. Use the Mic button anytime.");
      return;
    }

    stopWakeWordListening();
    shouldListenRef.current = true;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        isListeningRef.current = true;
        setWakeWordStatus('listening');
        setWakeWordFeedback('Listening for "Hello Fin"...');
      };

      recognition.onresult = (event: any) => {
        if (!shouldListenRef.current) return;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript?.trim().toLowerCase() || '';

          // Match "hello fin", "hello, fin", "hey fin", "hi fin", "hello finn", "fin ai"
          const wakeRegex = /\b(hello|hey|hi)\s*(fin|finn|find|fine|fen)\b|\bfin\s*ai\b/i;
          const match = transcript.match(wakeRegex);

          if (match) {
            // Find trailing question if spoken in the same breath
            const matchEndIndex = (match.index || 0) + match[0].length;
            const trailing = transcript.slice(matchEndIndex).replace(/^[,\s.?!]+/, '');

            handleWakeWordDetected(match[0], trailing);
            return;
          }
        }
      };

      recognition.onerror = (e: any) => {
        const error = e?.error;
        if (error === 'not-allowed' || error === 'service-not-allowed') {
          setWakeWordStatus('denied');
          setIsWakeWordEnabled(false);
          shouldListenRef.current = false;
          setMicNotice(
            "Microphone permission blocked. Allow mic in your browser address bar to use 'Hello Fin'."
          );
        } else if (error === 'no-speech') {
          // Expected on silence, ignore
        } else {
          // Other transient errors
        }
      };

      recognition.onend = () => {
        isListeningRef.current = false;
        // Automatically restart if wake-word is still enabled and not currently in voice conversation
        if (shouldListenRef.current && !isVoiceModalOpen) {
          setTimeout(() => {
            if (shouldListenRef.current && !isVoiceModalOpen) {
              try {
                recognition.start();
              } catch {}
            }
          }, 400);
        } else if (!shouldListenRef.current) {
          setWakeWordStatus('off');
        }
      };

      wakeRecognitionRef.current = recognition;
      recognition.start();
    } catch {
      setWakeWordStatus('denied');
      setIsWakeWordEnabled(false);
      setMicNotice("Could not start microphone listener. Click Mic to speak directly.");
    }
  }, [stopWakeWordListening, handleWakeWordDetected, isVoiceModalOpen]);

  // Toggle Wake-Word Detection
  const toggleWakeWord = () => {
    if (isWakeWordEnabled) {
      setIsWakeWordEnabled(false);
      setWakeWordStatus('off');
      setWakeWordFeedback(null);
      stopWakeWordListening();
    } else {
      setIsWakeWordEnabled(true);
      startWakeWordListening();
    }
  };

  // Manage wake-word listening lifecycle when voice modal opens/closes
  useEffect(() => {
    if (isVoiceModalOpen) {
      // Pause wake recognition while full voice modal is open
      if (wakeRecognitionRef.current && isListeningRef.current) {
        try {
          wakeRecognitionRef.current.stop();
        } catch {}
      }
      if (isWakeWordEnabled) {
        setWakeWordStatus('in_conversation');
      }
    } else {
      // Resume wake recognition if enabled
      if (isWakeWordEnabled && shouldListenRef.current && !isListeningRef.current) {
        startWakeWordListening();
      }
    }
  }, [isVoiceModalOpen, isWakeWordEnabled, startWakeWordListening]);

  // Clean up on unmount or user change
  useEffect(() => {
    return () => {
      stopVoicePlayback();
      stopWakeWordListening();
    };
  }, [stopVoicePlayback, stopWakeWordListening, currentUser]);

  const openTranscribeModal = useCallback(() => {
    stopVoicePlayback();
    setIsTranscribeModalOpen(true);
  }, [stopVoicePlayback]);

  const closeTranscribeModal = useCallback(() => {
    setIsTranscribeModalOpen(false);
  }, []);

  // Direct audio transcription using gemini-3.5-transcribe model
  const transcribeAudio = useCallback(async (base64Audio: string, mimeType: string = 'audio/wav'): Promise<string> => {
    try {
      const token = localStorage.getItem('finsight_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers,
        body: JSON.stringify({ audio: base64Audio, mimeType })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Transcription failed');
      }
      const data = await res.json();
      return data.transcript || '';
    } catch (err: any) {
      console.error('transcribeAudio error:', err);
      throw err;
    }
  }, []);

  return (
    <FinAiContext.Provider
      value={{
        isChatOpen,
        openChat,
        closeChat,
        toggleChat,
        isVoiceModalOpen,
        openVoiceModal,
        closeVoiceModal,
        voiceInitialPrompt,
        isWakeWordEnabled,
        toggleWakeWord,
        wakeWordStatus,
        wakeWordFeedback,
        messages,
        setMessages,
        sendMessage,
        isTyping,
        selectedModel,
        setSelectedModel,
        selectedPersona,
        setSelectedPersona,
        clearHistory,
        micNotice,
        setMicNotice,
        playingAudioId,
        speakMessage,
        stopVoicePlayback,
        transcribeAudio,
        isTranscribeModalOpen,
        openTranscribeModal,
        closeTranscribeModal
      }}
    >
      {children}
    </FinAiContext.Provider>
  );
};

export const useFinAi = () => {
  const context = useContext(FinAiContext);
  if (!context) {
    throw new Error('useFinAi must be used within a FinAiProvider');
  }
  return context;
};
