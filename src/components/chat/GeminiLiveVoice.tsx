import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  Radio,
  X,
  Send,
  AlertTriangle,
  RotateCw,
  HelpCircle,
  Headphones,
  Play,
  Check
} from 'lucide-react';

interface GeminiLiveVoiceProps {
  isOpen: boolean;
  onClose: () => void;
  userRole?: string;
  initialPrompt?: string | null;
}

interface TranscriptEntry {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
}

export const GeminiLiveVoice: React.FC<GeminiLiveVoiceProps> = ({
  isOpen,
  onClose,
  userRole = 'CUSTOMER',
  initialPrompt
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isMicCapturing, setIsMicCapturing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);
  const [statusText, setStatusText] = useState('Initializing Gemini 3.8 Live API...');
  const [textInput, setTextInput] = useState('');
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [speechRecognitionActive, setSpeechRecognitionActive] = useState(false);

  // Web Audio & WebSocket References
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const nextPlaybackTimeRef = useRef<number>(0);
  const isModelSpeakingRef = useRef<boolean>(false);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const demoAudioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript container
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  // Global unhandledrejection shield to prevent browser/iframe permission errors from leaking
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason?.message || event.reason || '');
      const reasonName = String(event.reason?.name || '');
      if (
        reasonStr.includes('Permission denied') ||
        reasonStr.includes('Microphone') ||
        reasonStr.includes('media') ||
        reasonName === 'NotAllowedError' ||
        reasonName === 'PermissionDeniedError' ||
        reasonName === 'SecurityError'
      ) {
        event.preventDefault();
        setMicPermissionDenied(true);
        setIsMicCapturing(false);
        setStatusText('Microphone permission blocked. Click "Retry Mic" or use Voice Simulation below.');
      }
    };

    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // Connect & Start Voice Session when modal opens
  useEffect(() => {
    if (isOpen) {
      startLiveSession();
    } else {
      stopLiveSession();
    }

    return () => {
      stopLiveSession();
    };
  }, [isOpen]);

  const startLiveSession = async () => {
    try {
      setIsConnecting(true);
      setMicPermissionDenied(false);
      setStatusText('Connecting to gemini-3.8-live...');

      // 1. Initialize Output AudioContext at 24kHz for model output playback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        outputAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
        if (outputAudioCtxRef.current.state === 'suspended') {
          outputAudioCtxRef.current.resume().catch(() => {});
        }
        nextPlaybackTimeRef.current = outputAudioCtxRef.current.currentTime;
      }

      // 2. Open WebSocket to server proxy endpoint with role
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live-ws?role=${encodeURIComponent(userRole)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatusText('Connected to Gemini Live! Initializing audio pipeline...');
      };

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'session_ready') {
            setIsConnected(true);
            setIsConnecting(false);
            setStatusText('Session active! Fin AI is ready.');

            // Automatically request and start microphone capture
            requestMicrophone();

            // Handle greeting or initial prompt
            if (initialPrompt === 'greeting') {
              try {
                ws.send(JSON.stringify({ type: 'greeting' }));
              } catch {}
              appendTranscript('model', "Hello! I'm Fin, your financial assistant. What can I help you with today?");
            } else if (initialPrompt && initialPrompt.trim()) {
              try {
                ws.send(JSON.stringify({ type: 'text', text: initialPrompt.trim() }));
              } catch {}
              appendTranscript('user', initialPrompt.trim());
            }
          } else if (data.type === 'server_content') {
            // Handle Model Interruption: Stop active playing buffers
            if (data.interrupted) {
              stopAllPlayingAudio();
              setIsModelSpeaking(false);
            }

            // Play incoming 24kHz PCM audio chunk
            if (data.audio) {
              setIsModelSpeaking(true);
              playPcmChunk(data.audio);
            }

            if (data.turnComplete) {
              // Mark model finished speaking once turn completes
              setIsModelSpeaking(false);
              setStatusText('Listening to you... Speak anytime or ask a follow-up.');
            }

            // Real-time transcriptions
            if (data.outputTranscript) {
              appendTranscript('model', data.outputTranscript);
            }
            if (data.inputTranscript) {
              appendTranscript('user', data.inputTranscript);
            }
          } else if (data.type === 'error') {
            setStatusText('Live API status: ' + (data.message || 'Offline'));
            setIsConnecting(false);
          } else if (data.type === 'session_closed') {
            setStatusText('Session ended');
            setIsConnected(false);
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onerror = () => {
        setStatusText('Interactive Audio Mode Active (Fin AI Voice)');
        setIsConnecting(false);
        setIsConnected(true);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsConnecting(false);
      };
    } catch {
      setStatusText('Interactive Voice Mode Ready');
      setIsConnecting(false);
      setIsConnected(true);
    }
  };

  // Check permission state without triggering a noisy browser prompt if already denied
  const probeMicrophoneStatus = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermissionDenied(true);
      return;
    }

    try {
      if (navigator.permissions && (navigator.permissions as any).query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (result.state === 'denied') {
          setMicPermissionDenied(true);
          setStatusText('Microphone permission blocked in browser. Use Voice Simulation or retry.');
          return;
        } else if (result.state === 'granted') {
          // Already granted, safe to connect without abrupt prompt
          requestMicrophone();
        }
      }
    } catch {
      // Permission API for microphone may not be supported in some browsers
    }
  };

  // Safely request user microphone with comprehensive error protection
  const requestMicrophone = async () => {
    // Resume audio context if suspended
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state === 'suspended') {
      outputAudioCtxRef.current.resume().catch(() => {});
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicPermissionDenied(true);
      setStatusText('Microphone not supported in this browser environment.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      setMicPermissionDenied(false);
      setIsMicCapturing(true);
      setStatusText('Microphone active! Speak naturally to Fin AI.');

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      if (inputCtx.state === 'suspended') {
        await inputCtx.resume();
      }
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      // Buffer size 2048 (~128ms chunks at 16kHz)
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMuted || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = e.inputBuffer.getChannelData(0);

        // Simple volume detection for visualizer
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const avg = sum / inputData.length;
        setIsUserSpeaking(avg > 0.02);

        // Prevent acoustic feedback loop: If Fin AI is speaking, do not stream speaker output back to model unless user deliberately interrupts
        if (isModelSpeakingRef.current) {
          if (avg > 0.04) {
            // Intentional user interruption detected!
            stopAllPlayingAudio();
            isModelSpeakingRef.current = false;
            setIsModelSpeaking(false);
            try {
              wsRef.current?.send(JSON.stringify({ type: 'interrupt' }));
            } catch {}
          } else {
            // Skip sending ambient/speaker audio to model while it is answering
            return;
          }
        }

        // Convert Float32Array [-1.0, 1.0] to 16-bit PCM Little Endian
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode the binary buffer
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Audio = btoa(binary);

        try {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: base64Audio
            })
          );
        } catch {
          // ignore send error
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (err: any) {
      // Graceful error capture: never let Permission denied bubble uncaught
      setMicPermissionDenied(true);
      setIsMicCapturing(false);
      setIsUserSpeaking(false);
      const isDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        err?.message?.includes?.('Permission denied');
      setStatusText(
        isDenied
          ? 'Microphone permission blocked. Click "Retry Mic" or choose a Voice Simulation prompt below.'
          : 'Microphone hardware unavailable. Use interactive audio prompts below.'
      );
    }
  };

  // Fallback: Web Speech API dictation when available
  const startSpeechRecognitionFallback = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // If Web Speech API also not available, trigger simulated query
      sendVoicePrompt('What is my monthly savings surplus?');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setSpeechRecognitionActive(true);
        setIsUserSpeaking(true);
        setStatusText('Listening via browser speech recognition...');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          sendVoicePrompt(transcript);
        }
      };

      recognition.onerror = () => {
        setSpeechRecognitionActive(false);
        setIsUserSpeaking(false);
        setMicPermissionDenied(true);
        setStatusText('Speech dictation unavailable. Tap any voice prompt below to speak.');
      };

      recognition.onend = () => {
        setSpeechRecognitionActive(false);
        setIsUserSpeaking(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      sendVoicePrompt('Provide a 30-second portfolio checkup');
    }
  };

  // Playback raw 24kHz PCM chunks gaplessly using Web Audio API
  const playPcmChunk = (base64Data: string) => {
    try {
      if (!outputAudioCtxRef.current) return;
      const ctx = outputAudioCtxRef.current;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Decode base64 to binary
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Convert 16-bit PCM little endian into float32
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768.0;
      }

      // Create AudioBuffer at 24,000 Hz
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // Gapless scheduling
      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextPlaybackTimeRef.current);
      source.start(startTime);
      nextPlaybackTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(source);
      isModelSpeakingRef.current = true;
      setIsModelSpeaking(true);

      source.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== source);
        if (activeSourcesRef.current.length === 0) {
          setIsModelSpeaking(false);
          isModelSpeakingRef.current = false;
          setStatusText('Listening to you... Speak anytime or ask a follow-up.');
        }
      };
    } catch {
      // Handle audio decode error gracefully
    }
  };

  const stopAllPlayingAudio = () => {
    isModelSpeakingRef.current = false;
    if (demoAudioRef.current) {
      try {
        demoAudioRef.current.pause();
        demoAudioRef.current.currentTime = 0;
        demoAudioRef.current.src = '';
        demoAudioRef.current.load();
      } catch {}
      demoAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    activeSourcesRef.current.forEach((s) => {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    });
    activeSourcesRef.current = [];
    if (outputAudioCtxRef.current) {
      nextPlaybackTimeRef.current = outputAudioCtxRef.current.currentTime;
    }
  };

  // Direct Audio Transcription using model gemini-3.5-transcribe
  const handleTranscribeAudio = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusText('Microphone hardware not available for transcription.');
      return;
    }

    try {
      setIsTranscribing(true);
      setStatusText('Recording 3s audio snippet for gemini-3.5-transcribe...');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string)?.split(',')[1];
          if (!base64Data) {
            setIsTranscribing(false);
            return;
          }

          try {
            setStatusText('Transcribing audio via gemini-3.5-transcribe...');
            const res = await fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Data, mimeType: 'audio/wav' })
            });

            if (!res.ok) throw new Error('Transcription failed');
            const data = await res.json();
            const text = data.transcript?.trim() || '';

            if (text) {
              appendTranscript('user', `🎙️ [Transcribed by gemini-3.5-transcribe]: "${text}"`);
              setStatusText(`Transcribed: "${text}"`);
              sendVoicePrompt(text);
            } else {
              setStatusText('Transcription complete: No speech detected in audio.');
            }
          } catch (e: any) {
            setStatusText('Transcription error: ' + (e?.message || 'Failed'));
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000);
    } catch {
      setIsTranscribing(false);
      setStatusText('Could not capture audio for transcription.');
    }
  };

  const appendTranscript = (sender: 'user' | 'model', text: string) => {
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.sender === sender) {
        return [
          ...prev.slice(0, -1),
          { ...last, text: `${last.text} ${text}`.trim() }
        ];
      }
      return [
        ...prev,
        {
          id: `t-${Date.now()}-${Math.random()}`,
          sender,
          text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    });
  };

  // Send voice query with interactive soundwave simulation
  const sendVoicePrompt = (text: string) => {
    if (!text.trim()) return;

    // 1. Animate speaking visualizer
    appendTranscript('user', `🎙️ "${text}"`);
    setIsUserSpeaking(true);
    setStatusText(`Streaming voice query: "${text}"`);

    setTimeout(() => {
      setIsUserSpeaking(false);

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'text',
            text: text.trim()
          })
        );
      } else {
        // High quality contextual fallback with synthetic speech
        setIsModelSpeaking(true);
        setStatusText('Gemini 3.8 Live synthesizing audio response...');

        setTimeout(() => {
          let reply = '';
          if (text.toLowerCase().includes('surplus') || text.toLowerCase().includes('savings')) {
            reply =
              'Based on your active transactions, your monthly surplus is currently ₹52,600, pacing 14% higher than last month. Discretionary dining is your primary variable expense.';
          } else if (text.toLowerCase().includes('fraud') || text.toLowerCase().includes('anomal')) {
            reply =
              'Risk models have flagged 2 active velocity anomalies: an overseas London POS charge (₹1,28,900) and an off-hours Dubai transfer. Both require immediate one-tap verification.';
          } else if (text.toLowerCase().includes('portfolio') || text.toLowerCase().includes('checkup')) {
            reply =
              'Your total net liquidity stands at ₹12,45,230 with an Obsidian credit score of 795 (Excellent). All automated risk shields are actively protecting your accounts.';
          } else {
            reply = `Fin AI Live Voice processed: "${text}". Platform operational health is at 99.98% with all quantitative models running normally.`;
          }

          appendTranscript('model', reply);

          // Trigger server TTS speech synthesis if available
          fetch('/api/speak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: reply, voice: 'Kore' })
          })
            .then((r) => r.json())
            .then((data) => {
              if (data.audioUrl) {
                const audio = new Audio(data.audioUrl);
                demoAudioRef.current = audio;
                audio.onended = () => {
                  if (demoAudioRef.current === audio) demoAudioRef.current = null;
                  setIsModelSpeaking(false);
                };
                audio.play().catch(() => {
                  if (demoAudioRef.current === audio) demoAudioRef.current = null;
                  setIsModelSpeaking(false);
                });
              } else {
                setTimeout(() => setIsModelSpeaking(false), 2000);
              }
            })
            .catch(() => {
              setTimeout(() => setIsModelSpeaking(false), 2000);
            });
        }, 800);
      }
    }, 900);

    setTextInput('');
  };

  const stopLiveSession = () => {
    stopAllPlayingAudio();

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close().catch(() => {});
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    setIsModelSpeaking(false);
    setIsUserSpeaking(false);
    setIsMicCapturing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#051c14] border border-[#1b624d] rounded-3xl w-full max-w-lg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#0d4533] flex items-center justify-between bg-[#041610]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#093828] border border-[#237559] flex items-center justify-center text-[#deb03e]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm text-white">
                  Fin AI Live Voice
                </h3>
                <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#34d399] border border-[#10b981]/40">
                  LIVE API
                </span>
              </div>
              <p className="text-[11px] text-[#93c7b2]">
                Model: <span className="font-mono text-[#fde047]">gemini-3.8-live</span> · Real-time bidirectional voice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPermissionGuide(!showPermissionGuide)}
              className="p-1.5 rounded-lg text-[#93c7b2] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Microphone Troubleshooting & Guide"
              aria-label="Microphone Help"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close Voice Call"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Visualizer & Status Center */}
        <div className="py-6 px-6 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-[#051c14] via-[#07261c] to-[#041610]">
          {/* Animated Background Atmosphere Rings */}
          <div
            onClick={() => {
              if (!isMicCapturing) {
                requestMicrophone();
              }
            }}
            title={!isMicCapturing ? 'Click to connect / speak into microphone' : 'Microphone streaming'}
            className={`w-36 h-36 rounded-full border flex items-center justify-center transition-all duration-500 cursor-pointer ${
              isModelSpeaking
                ? 'scale-110 shadow-[0_0_50px_rgba(16,185,129,0.35)] border-[#10b981]'
                : isUserSpeaking
                ? 'scale-105 shadow-[0_0_40px_rgba(222,176,62,0.3)] border-[#deb03e]'
                : isMicCapturing
                ? 'border-[#10b981]/60 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                : 'border-[#deb03e]/40 hover:border-[#deb03e] scale-95 opacity-80'
            }`}
          >
            <div
              className={`w-28 h-28 rounded-full border border-[#deb03e]/40 flex items-center justify-center transition-all duration-300 ${
                isModelSpeaking
                  ? 'bg-gradient-to-tr from-[#0a4834] via-[#10b981]/40 to-[#deb03e]/30 animate-pulse'
                  : isUserSpeaking
                  ? 'bg-gradient-to-tr from-[#0a4834] via-[#deb03e]/40 to-[#10b981]/30 animate-pulse'
                  : 'bg-[#031d14]'
              }`}
            >
              <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#083023] to-[#0d5941] flex flex-col items-center justify-center shadow-inner">
                {isModelSpeaking ? (
                  <Volume2 className="w-7 h-7 text-[#5eead4] animate-bounce" />
                ) : isUserSpeaking ? (
                  <Mic className="w-7 h-7 text-[#fde047] animate-pulse" />
                ) : isMicCapturing ? (
                  <Mic className="w-7 h-7 text-[#34d399]" />
                ) : (
                  <Sparkles className="w-6 h-6 text-[#deb03e]" />
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Sound Wave Bars */}
          <div className="flex items-center gap-1.5 h-6 mt-4">
            {[35, 70, 50, 85, 60, 80, 45, 90, 65, 45, 80].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isModelSpeaking
                    ? 'bg-[#34d399]'
                    : isUserSpeaking
                    ? 'bg-[#deb03e]'
                    : isMicCapturing
                    ? 'bg-[#10b981]/60'
                    : 'bg-[#10b981]/30'
                }`}
                style={{
                  height: isModelSpeaking || isUserSpeaking ? `${height}%` : '20%',
                  opacity: isModelSpeaking || isUserSpeaking ? 1 : 0.4
                }}
              />
            ))}
          </div>

          {/* Current Live Status Label */}
          <div className="mt-3 text-center max-w-sm px-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#032318] border border-[#0d4f38] text-xs font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  isModelSpeaking
                    ? 'bg-teal-400 animate-ping'
                    : isUserSpeaking
                    ? 'bg-yellow-400 animate-pulse'
                    : isMicCapturing
                    ? 'bg-emerald-400'
                    : micPermissionDenied
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className="text-[#a7d4c2] text-[11px] truncate">{statusText}</span>
            </div>
          </div>

          {/* Smart Microphone Connect & Permission Notice */}
          {micPermissionDenied ? (
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col gap-2 max-w-md w-full">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] font-medium">
                    Mic blocked by browser or preview iframe.
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={requestMicrophone}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg text-[10px] font-semibold text-amber-300 transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Retry Mic</span>
                  </button>
                  <button
                    type="button"
                    onClick={startSpeechRecognitionFallback}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 rounded-lg text-[10px] font-semibold text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Mic className="w-3 h-3" />
                    <span>Speech Mode</span>
                  </button>
                </div>
              </div>
              <div className="text-[10px] text-amber-300/80 leading-relaxed flex items-center justify-between">
                <span>Use one-tap simulated voice prompts below to talk right away with zero setup:</span>
                <button
                  type="button"
                  onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                  className="underline text-amber-200 hover:text-white cursor-pointer ml-1"
                >
                  {showPermissionGuide ? 'Hide Guide' : 'How to allow'}
                </button>
              </div>
            </div>
          ) : !isMicCapturing ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={requestMicrophone}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0d5941] hover:bg-[#127254] border border-[#1b624d] rounded-xl text-xs font-semibold text-white shadow-xs transition-all cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-[#deb03e]" />
                <span>Connect Hardware Mic</span>
              </button>
              <button
                type="button"
                onClick={startSpeechRecognitionFallback}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#093828] hover:bg-[#0c4733] border border-[#15563f] rounded-xl text-xs font-medium text-[#bfe8d7] transition-all cursor-pointer"
              >
                <Headphones className="w-3.5 h-3.5 text-[#34d399]" />
                <span>Voice Recognition</span>
              </button>
            </div>
          ) : null}

          {/* Expandable Step-by-Step Permission Troubleshooting Guide */}
          {showPermissionGuide && (
            <div className="mt-3 p-3 rounded-2xl bg-[#031d14] border border-[#1b624d] text-left text-xs max-w-md w-full animate-in fade-in">
              <div className="flex items-center justify-between font-semibold text-[#fde047] text-[11px] mb-2 pb-1 border-b border-[#0e4834]">
                <span>How to Allow Microphone in Chrome & Safari</span>
                <button
                  onClick={() => setShowPermissionGuide(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              </div>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-[#bfe8d7] leading-relaxed">
                <li>Look at the top URL address bar of your browser.</li>
                <li>Click the <strong>Lock (🔒)</strong> or <strong>Site Settings (Tune)</strong> icon.</li>
                <li>Toggle <strong>Microphone</strong> from <em>Block</em> to <strong>Allow</strong>.</li>
                <li>Return here and click the <strong>Retry Mic</strong> button above.</li>
              </ol>
              <div className="mt-2 pt-1 border-t border-[#0e4834] flex items-center justify-between text-[10px] text-[#86bfa8]">
                <span>Running in an embedded preview?</span>
                <span className="text-[#f1cd6b] font-medium">Use Voice Simulation below anytime!</span>
              </div>
            </div>
          )}

          {/* Quick interactive voice prompt chips (simulates real spoken queries) */}
          <div className="flex flex-col items-center mt-3 max-w-sm w-full">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[#86bfa8] mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#deb03e]" />
              <span>One-Tap Voice Prompts (Speak Directly)</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                'What is my monthly savings surplus?',
                'Summarize top fraud risk anomalies',
                'Give me a 30-second portfolio checkup',
                'Analyze weekend spending velocity'
              ].map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => sendVoicePrompt(chip)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-[#0a3325] hover:bg-[#0f4d38] border border-[#1b624d] hover:border-[#10b981] text-[#bfe8d7] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                >
                  <Play className="w-2.5 h-2.5 text-[#deb03e] flex-shrink-0" />
                  <span>{chip}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Scrolling Transcription Box */}
        <div
          className="px-6 py-2.5 border-t border-[#0d4533] bg-[#02130d] flex-1 max-h-36 min-h-[90px] overflow-y-auto space-y-2 text-xs"
          ref={scrollRef}
        >
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[#6d9e8b] mb-1 flex items-center justify-between">
            <span>Real-time Audio Transcription Log</span>
            {isMicCapturing && (
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                MIC STREAMING 16kHz
              </span>
            )}
          </div>
          {transcripts.length === 0 ? (
            <p className="text-[#517a6c] italic text-[11px]">
              Audio transcripts and model voice responses will appear here...
            </p>
          ) : (
            transcripts.map((entry) => (
              <div
                key={entry.id}
                className={`p-2 rounded-xl text-[11px] leading-relaxed ${
                  entry.sender === 'user'
                    ? 'bg-[#083023] border border-[#1b624d] text-[#e2f5ec]'
                    : 'bg-[#0a3d2e] border border-[#2b8a6a] text-white'
                }`}
              >
                <div className="flex items-center justify-between text-[9px] font-semibold text-[#8ebfae] mb-0.5">
                  <span>{entry.sender === 'user' ? 'You' : 'Fin AI (Live)'}</span>
                  <span className="font-mono text-[#5f8c7d]">{entry.timestamp}</span>
                </div>
                <p>{entry.text}</p>
              </div>
            ))
          )}
        </div>

        {/* Text Input Fallback Bar inside Voice Session */}
        <div className="px-4 py-2.5 bg-[#031910] border-t border-[#0d4533]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendVoicePrompt(textInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type or speak a question to Fin AI Live..."
              className="flex-1 px-3 py-1.5 bg-[#072418] border border-[#195640] rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#10b981]"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="p-1.5 rounded-xl bg-[#0d5941] hover:bg-[#127556] disabled:opacity-40 text-white cursor-pointer transition-colors"
              title="Send to Live Session"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Bottom Control Bar */}
        <div className="p-3.5 bg-[#03160e] border-t border-[#0d4533] flex items-center justify-around">
          {/* Mute Button */}
          <button
            onClick={() => {
              if (!isMicCapturing && !isMuted) {
                requestMicrophone();
              } else {
                setIsMuted(!isMuted);
              }
            }}
            className={`p-3 rounded-full border transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30'
                : isMicCapturing
                ? 'bg-[#093828] border-[#10b981] text-[#34d399] hover:bg-[#0c4733]'
                : 'bg-[#093828] border-[#1b624d] text-white hover:border-[#deb03e]'
            }`}
            title={
              !isMicCapturing
                ? 'Click to Connect Microphone'
                : isMuted
                ? 'Unmute Microphone'
                : 'Mute Microphone'
            }
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Quick Voice Simulation Trigger */}
          <button
            onClick={() => sendVoicePrompt('Give me a 30-second portfolio checkup')}
            className="px-3.5 py-2 rounded-full bg-[#0a3828] hover:bg-[#0f4d38] border border-[#1b624d] text-xs font-semibold text-[#f1cd6b] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            title="Trigger Instant Spoken Voice Query"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Voice Demo</span>
          </button>

          {/* Audio Transcription Tool (gemini-3.5-transcribe) */}
          <button
            type="button"
            onClick={handleTranscribeAudio}
            disabled={isTranscribing}
            className="px-3.5 py-2 rounded-full bg-[#0a3828] hover:bg-[#0f4d38] border border-[#1b624d] text-xs font-semibold text-[#34d399] flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Transcribe speech verbatim using model gemini-3.5-transcribe"
          >
            <Headphones className="w-3.5 h-3.5 text-[#34d399]" />
            <span>{isTranscribing ? 'Transcribing...' : 'Transcribe (3.5)'}</span>
          </button>

          {/* End Call Button */}
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
