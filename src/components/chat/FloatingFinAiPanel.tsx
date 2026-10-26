import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Mic,
  MicOff,
  Radio,
  X,
  Minus,
  Maximize2,
  Volume2,
  Copy,
  Check,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  BookOpen,
  FileText
} from 'lucide-react';


import { useFinAi } from '../../context/FinAiContext';
import { useApp } from '../../context/AppContext';
import { MicrophoneAudioRecorder } from '../../utils/audioRecorder';

export const FloatingFinAiPanel: React.FC = () => {
  const {
    isChatOpen,
    closeChat,
    openVoiceModal,
    isWakeWordEnabled,
    toggleWakeWord,
    wakeWordStatus,
    messages,
    sendMessage,
    isTyping,
    selectedModel,
    clearHistory,
    micNotice,
    setMicNotice,
    playingAudioId,
    speakMessage,
    stopVoicePlayback,
    transcribeAudio,
    openTranscribeModal
  } = useFinAi();

  const { currentRole } = useApp();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDictating, setIsDictating] = useState(false);
  const [showWakeInfo, setShowWakeInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const micRecorderRef = useRef<MicrophoneAudioRecorder | null>(null);
  const dictationTimeoutRef = useRef<any>(null);

  // Immediately stop any voice reading when the chat panel closes or unmounts
  useEffect(() => {
    if (!isChatOpen) {
      stopVoicePlayback();
    }
  }, [isChatOpen, stopVoicePlayback]);

  useEffect(() => {
    return () => {
      stopVoicePlayback();
    };
  }, [stopVoicePlayback]);

  // Handle Escape key to close the panel and stop any active voice reading
  useEffect(() => {
    if (!isChatOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopVoicePlayback();
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChatOpen, closeChat, stopVoicePlayback]);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isChatOpen]);

  if (!isChatOpen) return null;

  const handleClose = () => {
    stopVoicePlayback();
    closeChat();
  };

  const handleSend = () => {
    if (!input.trim() || isTyping) return;
    stopVoicePlayback();
    const text = input.trim();
    setInput('');
    sendMessage(text);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle microphone dictation with gemini-3.5-transcribe
  const toggleDictation = async () => {
    stopVoicePlayback();

    if (isDictating && micRecorderRef.current) {
      // User clicked stop: finish recording and transcribe
      if (dictationTimeoutRef.current) {
        clearTimeout(dictationTimeoutRef.current);
        dictationTimeoutRef.current = null;
      }
      setIsDictating(false);
      setMicNotice("Transcribing audio with gemini-3.5-transcribe...");

      try {
        const result = await micRecorderRef.current.stop();
        micRecorderRef.current = null;
        const transcript = await transcribeAudio(result.base64Audio, result.mimeType);
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setMicNotice(null);
        } else {
          setMicNotice("No speech detected in audio.");
          setTimeout(() => setMicNotice(null), 3500);
        }
      } catch (err: any) {
        console.error("Transcription error:", err);
        setMicNotice("Transcription failed. Please try again.");
        setTimeout(() => setMicNotice(null), 4000);
      }
      return;
    }

    // Start recording
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicNotice("Microphone hardware is unavailable.");
      return;
    }

    try {
      const recorder = new MicrophoneAudioRecorder();
      micRecorderRef.current = recorder;
      await recorder.start();
      setIsDictating(true);
      setMicNotice("Recording microphone... Speak your question, then click Mic again or wait.");

      // Auto-stop after 7 seconds of continuous speech
      dictationTimeoutRef.current = setTimeout(async () => {
        if (micRecorderRef.current) {
          setIsDictating(false);
          setMicNotice("Transcribing audio with gemini-3.5-transcribe...");
          try {
            const result = await micRecorderRef.current.stop();
            micRecorderRef.current = null;
            const transcript = await transcribeAudio(result.base64Audio, result.mimeType);
            if (transcript) {
              setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
              setMicNotice(null);
            } else {
              setMicNotice("No speech detected.");
              setTimeout(() => setMicNotice(null), 3000);
            }
          } catch {
            setMicNotice("Transcription failed.");
            setTimeout(() => setMicNotice(null), 3000);
          }
        }
      }, 7000);
    } catch (err: any) {
      console.error("Mic start error:", err);
      setIsDictating(false);
      if (err?.name === "NotAllowedError") {
        setMicNotice("Microphone blocked. Allow permission in your browser address bar.");
      } else {
        setMicNotice("Could not access microphone.");
      }
      setTimeout(() => setMicNotice(null), 4000);
    }
  };

  const getPersonaLabel = () => {
    switch (currentRole) {
      case 'ADMIN':
        return 'Platform Command Advisor';
      case 'RISK_FRAUD_ANALYST':
        return 'Fraud Investigation Copilot';
      case 'CUSTOMER':
        return 'Personal Wealth Advisor';
      case 'BUSINESS_ANALYST':
      default:
        return 'Financial Operations Analyst';
    }
  };

  return (
    <div
      role="dialog"
      aria-labelledby="fin-ai-panel-title"
      className="fixed bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[410px] h-[560px] max-h-[82vh] z-50 flex flex-col bg-white border border-[#1b624d]/30 rounded-2xl shadow-[0_20px_50px_rgba(4,22,16,0.35)] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Panel Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#072a1e] via-[#0b3829] to-[#041a13] text-white flex items-center justify-between border-b border-[#1b624d]/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#093828] border border-[#237559] flex items-center justify-center text-[#deb03e] shadow-xs">
            <span className="font-heading font-extrabold text-xs tracking-tight text-[#f1cd6b]">
              Fin
            </span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 id="fin-ai-panel-title" className="font-heading font-bold text-sm text-white leading-tight">
                Fin AI
              </h2>
              <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#10b981]/25 text-[#34d399] border border-[#10b981]/40">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-[#86bfa8] leading-tight">
              {getPersonaLabel()}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Fullscreen Voice Mode Trigger */}
          <button
            type="button"
            onClick={() => {
              stopVoicePlayback();
              openVoiceModal();
            }}
            className="p-1.5 rounded-lg text-[#deb03e] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Open Fullscreen Voice Mode (gemini-3.8-live)"
            aria-label="Open Fullscreen Voice Mode"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Reset Chat */}
          <button
            type="button"
            onClick={() => {
              stopVoicePlayback();
              clearHistory();
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Clear Chat History"
            aria-label="Clear Chat History"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Minimize */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Minimize Fin AI"
            aria-label="Minimize Fin AI"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close Fin AI"
            aria-label="Close Fin AI"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Wake Word Ribbon ("Hello Fin") */}
      <div className="px-3.5 py-2 bg-[#f4f1ea] border-b border-[#e5dfd2] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isWakeWordEnabled}
              onChange={toggleWakeWord}
              className="w-3.5 h-3.5 accent-[#0d5941] cursor-pointer rounded"
            />
            <span className="text-[11px] font-semibold text-[#092b1e]">
              Wake Word: <strong className="text-[#0d5941]">“Hello Fin”</strong>
            </span>
          </label>

          <button
            type="button"
            onClick={() => setShowWakeInfo(!showWakeInfo)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
            title="About Wake Word"
          >
            <HelpCircle className="w-3 h-3" />
          </button>
        </div>

        {/* Live Status Pill */}
        <div className="flex items-center gap-1 text-[10px] font-medium font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              wakeWordStatus === 'listening'
                ? 'bg-emerald-500 animate-ping'
                : wakeWordStatus === 'in_conversation'
                ? 'bg-yellow-500 animate-pulse'
                : wakeWordStatus === 'denied'
                ? 'bg-red-500'
                : 'bg-slate-400'
            }`}
          />
          <span
            className={
              wakeWordStatus === 'listening'
                ? 'text-[#0d5941] font-bold'
                : wakeWordStatus === 'denied'
                ? 'text-red-600 font-bold'
                : 'text-slate-500'
            }
          >
            {wakeWordStatus === 'listening'
              ? 'Listening'
              : wakeWordStatus === 'in_conversation'
              ? 'Active'
              : wakeWordStatus === 'denied'
              ? 'Mic Blocked'
              : 'Off'}
          </span>
        </div>
      </div>

      {/* Optional Wake Word Info Tooltip Banner */}
      {showWakeInfo && (
        <div className="px-3.5 py-2 bg-[#faf7f0] border-b border-[#ece7dc] text-[11px] text-slate-600 leading-relaxed animate-in fade-in">
          <p>
            When enabled, saying <strong>“Hello Fin”</strong> automatically wakes the assistant and begins voice interaction. Audio is processed locally in your browser and never streamed continuously to the cloud.
          </p>
        </div>
      )}

      {/* Mic Warning or Permission Notice */}
      {micNotice && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span className="truncate">{micNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setMicNotice(null)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#fdfbf7]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`flex gap-2 max-w-[85%] ${
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5 ${
                  m.role === 'user'
                    ? 'bg-[#0d5941] text-white'
                    : 'bg-[#093828] text-[#f1cd6b]'
                }`}
              >
                {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : 'Fin'}
              </div>

              <div
                className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                  m.role === 'user'
                    ? 'bg-[#0d5941] text-white rounded-tr-none'
                    : 'bg-white border border-[#e5dfd2] text-slate-800 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Real RAG Source Citations */}
                {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[#e5dfd2] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#0d5941]">
                      <BookOpen className="w-3 h-3 text-[#0d5941]" />
                      <span>Verified Policy Sources ({m.citations.length})</span>
                    </div>
                    <div className="space-y-1">
                      {m.citations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="bg-[#f7f5ef] border border-[#e5dfd2] rounded-lg p-1.5 text-[10px]"
                        >
                          <div className="flex items-center justify-between text-slate-800 font-medium">
                            <span className="truncate max-w-[210px]">{c.title}</span>
                            <span className="text-[9px] text-[#0d5941] font-mono font-semibold ml-1 shrink-0">
                              {c.pageNumber ? `p. ${c.pageNumber}` : `v${c.version}`}
                            </span>
                          </div>
                          {c.snippet && (
                            <p className="text-[9.5px] text-slate-600 line-clamp-2 mt-0.5 italic">
                              "{c.snippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Controls: TTS Speak & Copy */}

                {m.role === 'assistant' && (
                  <div className="mt-2 pt-1.5 border-t border-[#f0ece1] flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono">{m.modelUsed || selectedModel}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => speakMessage(m.id, m.content)}
                        className={`hover:text-[#0d5941] transition-colors cursor-pointer flex items-center gap-1 ${
                          playingAudioId === m.id ? 'text-[#0d5941] font-bold' : ''
                        }`}
                        title={playingAudioId === m.id ? "Stop voice reading" : "Listen to response"}
                      >
                        <Volume2 className={`w-3 h-3 ${playingAudioId === m.id ? 'animate-pulse text-[#0d5941]' : ''}`} />
                        <span>{playingAudioId === m.id ? 'Speaking...' : 'Listen'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-0.5"
                        title="Copy Response"
                      >
                        {copiedId === m.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Prompt Suggestion Chips on initial message */}
            {m.chips && m.chips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 ml-8 max-w-[85%]">
                {m.chips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      stopVoicePlayback();
                      sendMessage(chip);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white hover:bg-[#ebf7f1] border border-[#d5cfc2] hover:border-[#0d5941] text-[#0d5941] font-medium transition-all cursor-pointer shadow-2xs"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex gap-2 max-w-[85%] items-start">
            <div className="w-6 h-6 rounded-full bg-[#093828] text-[#f1cd6b] flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
              Fin
            </div>
            <div className="p-2.5 bg-white border border-[#e5dfd2] rounded-2xl rounded-tl-none text-xs text-slate-500 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0d5941] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0d5941] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#0d5941] animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[10px] font-mono">Fin AI is analyzing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-2.5 bg-[#faf7f0] border-t border-[#ece7dc]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          {/* Dictation Mic Button */}
          <button
            type="button"
            onClick={toggleDictation}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              isDictating
                ? 'bg-red-500/10 border-red-500 text-red-600 animate-pulse'
                : 'bg-white border-[#ded8cb] text-slate-600 hover:text-[#0d5941] hover:border-[#0d5941]'
            }`}
            title={isDictating ? 'Stop microphone dictation' : 'Dictate with microphone'}
          >
            {isDictating ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isDictating
                ? 'Listening to microphone...'
                : 'Ask Fin AI about transactions, surplus, risk...'
            }
            disabled={isTyping}
            className={`flex-1 px-3 py-2 bg-white border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${
              isDictating
                ? 'border-red-400 ring-2 ring-red-300 animate-pulse'
                : 'border-[#ded8cb] focus:ring-[#0d5941]'
            }`}
          />

          {/* Fullscreen Voice Mode Action */}
          <button
            type="button"
            onClick={() => openVoiceModal()}
            className="p-2 rounded-xl border border-[#1b624d]/30 bg-[#072a1e] text-[#f1cd6b] hover:bg-[#0b3829] transition-colors cursor-pointer"
            title="Launch Fin AI Live Voice"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* Dedicated Audio Transcribe Studio */}
          <button
            type="button"
            onClick={openTranscribeModal}
            className="p-2 rounded-xl border border-[#ece7dc] bg-[#ebf5f0] text-[#0d5941] hover:bg-[#d9ece3] transition-colors cursor-pointer"
            title="Open Transcribe Audio Studio (gemini-3.5-transcribe)"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-2 rounded-xl bg-[#0d5941] hover:bg-[#127254] disabled:opacity-40 text-white transition-colors cursor-pointer"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 px-1">
          <span>Fin AI Intelligence Suite</span>
          <span className="font-mono">{selectedModel}</span>
        </div>
      </div>
    </div>
  );
};
