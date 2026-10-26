import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Radio,
  Volume2,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Sliders,
  AlertCircle,
  Mic,
  MicOff,
  User,
  HelpCircle,
  BookOpen,
  FileText
} from 'lucide-react';

import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { useFinAi } from '../../context/FinAiContext';
import { MicrophoneAudioRecorder } from '../../utils/audioRecorder';

export const AssistantPage: React.FC = () => {
  const {
    messages,
    sendMessage,
    isTyping,
    selectedModel,
    setSelectedModel,
    selectedPersona,
    setSelectedPersona,
    openVoiceModal,
    openTranscribeModal,
    clearHistory,
    isWakeWordEnabled,
    toggleWakeWord,
    wakeWordStatus,
    micNotice,
    setMicNotice,
    playingAudioId,
    speakMessage,
    stopVoicePlayback,
    transcribeAudio
  } = useFinAi();

  const { currentUser, devSwitchRole } = useApp();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showWakeInfo, setShowWakeInfo] = useState(false);

  const micRecorderRef = useRef<MicrophoneAudioRecorder | null>(null);
  const dictateTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Stop any voice reading when AssistantPage unmounts
  useEffect(() => {
    return () => {
      stopVoicePlayback();
    };
  }, [stopVoicePlayback]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || isTyping) return;
    stopVoicePlayback();
    setInput('');
    await sendMessage(q);
  };

  const handleSpeak = (msgId: string, text: string) => {
    speakMessage(msgId, text);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle microphone dictation with gemini-3.5-transcribe
  const handleToggleDictate = async () => {
    stopVoicePlayback();

    if (isListening && micRecorderRef.current) {
      if (dictateTimeoutRef.current) {
        clearTimeout(dictateTimeoutRef.current);
        dictateTimeoutRef.current = null;
      }
      setIsListening(false);
      setMicNotice('Transcribing audio with gemini-3.5-transcribe...');

      try {
        const result = await micRecorderRef.current.stop();
        micRecorderRef.current = null;
        const transcript = await transcribeAudio(result.base64Audio, result.mimeType);
        if (transcript) {
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setMicNotice(null);
        } else {
          setMicNotice('No speech detected in audio.');
          setTimeout(() => setMicNotice(null), 3500);
        }
      } catch (err: any) {
        console.error('Transcription error:', err);
        setMicNotice('Transcription failed. Please try again.');
        setTimeout(() => setMicNotice(null), 4000);
      }
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicNotice('Microphone hardware is unavailable.');
      setTimeout(() => setMicNotice(null), 4000);
      return;
    }

    try {
      const recorder = new MicrophoneAudioRecorder();
      micRecorderRef.current = recorder;
      await recorder.start();
      setIsListening(true);
      setMicNotice('Recording microphone... Speak your question, then click Mic again or wait.');

      // Auto-stop after 7 seconds
      dictateTimeoutRef.current = setTimeout(async () => {
        if (micRecorderRef.current) {
          setIsListening(false);
          setMicNotice('Transcribing audio with gemini-3.5-transcribe...');
          try {
            const result = await micRecorderRef.current.stop();
            micRecorderRef.current = null;
            const transcript = await transcribeAudio(result.base64Audio, result.mimeType);
            if (transcript) {
              setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
              setMicNotice(null);
            } else {
              setMicNotice('No speech detected.');
              setTimeout(() => setMicNotice(null), 3000);
            }
          } catch {
            setMicNotice('Transcription failed.');
            setTimeout(() => setMicNotice(null), 3000);
          }
        }
      }, 7000);
    } catch (err: any) {
      console.error('Mic start error:', err);
      setIsListening(false);
      if (err?.name === 'NotAllowedError') {
        setMicNotice('Microphone blocked. Allow permission in your browser address bar.');
      } else {
        setMicNotice('Could not access microphone.');
      }
      setTimeout(() => setMicNotice(null), 4000);
    }
  };

  return (
    <AppLayout
      title="Fin AI Assistant"
      subtitle="Context-aware financial intelligence powered by Google Gemini models."
    >
      <div className="bg-white border border-[#ece7dc] rounded-2xl shadow-xs flex flex-col h-[calc(100vh-210px)] min-h-[560px]">
        {/* Fin AI Header & Control Ribbon */}
        <div className="p-3.5 sm:p-4 border-b border-[#ece7dc] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-[#faf7f0] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#093828] text-[#f1cd6b] flex items-center justify-center shadow-xs flex-shrink-0">
              <span className="font-heading font-extrabold text-sm tracking-tight text-[#f1cd6b]">
                Fin
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-semibold text-base text-[#092b1e]">
                  Fin AI Copilot
                </h2>
                <span className="text-[10px] font-semibold text-[#0d5941] bg-[#d7f4e6] px-2 py-0.5 rounded-full border border-[#aee3cb]">
                  Multi-Turn Active
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Grounding: Supabase pgvector RAG · Session Clearance: <span className="font-semibold text-slate-700">{currentUser?.roleTitle || selectedPersona} ({currentUser?.role || 'CUSTOMER'})</span>
              </p>
            </div>
          </div>

          {/* Model, Voice & Wake Word Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Wake Word ("Hello Fin") Toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#ded8cb] rounded-xl text-xs shadow-2xs">
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

              <span
                className={`w-2 h-2 rounded-full ${
                  wakeWordStatus === 'listening'
                    ? 'bg-emerald-500 animate-ping'
                    : wakeWordStatus === 'in_conversation'
                    ? 'bg-yellow-500 animate-pulse'
                    : wakeWordStatus === 'denied'
                    ? 'bg-red-500'
                    : 'bg-slate-300'
                }`}
                title={`Wake Word Status: ${wakeWordStatus}`}
              />

              <button
                type="button"
                onClick={() => setShowWakeInfo(!showWakeInfo)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
                title="About Wake Word"
              >
                <HelpCircle className="w-3 h-3" />
              </button>
            </div>

            {/* Live Voice API Button */}
            <button
              onClick={() => openVoiceModal()}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0d5941] to-[#093d2e] hover:from-[#0a4834] hover:to-[#05261c] text-white text-xs font-semibold shadow-xs border border-[#1b6a50] transition-all cursor-pointer group"
              title="Launch Fin AI Live Voice Session"
            >
              <Radio className="w-3.5 h-3.5 text-[#fde047] animate-pulse" />
              <span>Live Voice</span>
              <span className="text-[9px] font-mono font-normal bg-black/25 px-1.5 py-0.5 rounded text-[#93c7b2]">
                gemini-3.8-live
              </span>
            </button>

            {/* Dedicated Transcribe Audio Button */}
            <button
              onClick={() => openTranscribeModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#ebf5f0] hover:bg-[#d8ece2] text-[#0d5941] text-xs font-semibold shadow-xs border border-[#0d5941]/30 transition-all cursor-pointer group"
              title="Open Audio Transcriber Studio (gemini-3.5-transcribe)"
            >
              <Mic className="w-3.5 h-3.5 text-[#0d5941] group-hover:scale-110 transition-transform" />
              <span>Transcribe</span>
              <span className="text-[9px] font-mono bg-[#0d5941] text-white px-1.5 py-0.5 rounded">
                3.5
              </span>
            </button>

            {/* Model Selector Dropdown */}
            <div className="flex items-center gap-1 bg-white border border-[#ded8cb] rounded-xl px-2 py-1 text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#0d5941]" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                title="Select Gemini Model"
              >
                <option value="gemini-3.5-flash">General: gemini-3.5-flash</option>
                <option value="gemini-3.1-flash-lite">Fast: gemini-3.1-flash-lite</option>
                <option value="gemini-3.1-pro-preview">Complex: gemini-3.1-pro-preview</option>
              </select>
            </div>

            {/* Role / Persona Selector */}
            <div className="flex items-center gap-1 bg-white border border-[#ded8cb] rounded-xl px-2 py-1 text-xs">
              <Sliders className="w-3.5 h-3.5 text-[#b0882e]" />
              <select
                value={selectedPersona}
                onChange={async (e) => {
                  const newRole = e.target.value;
                  setSelectedPersona(newRole);
                  if (devSwitchRole && newRole !== currentUser?.role) {
                    await devSwitchRole(newRole as any);
                  }
                }}
                className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                title="Select Assistant Persona & Demo Session"
              >
                <option value="BUSINESS_ANALYST">Analyst Persona (analyst@finsight.ai)</option>
                <option value="CUSTOMER">Private Wealth Advisor (customer@finsight.ai)</option>
                <option value="RISK_FRAUD_ANALYST">Fraud Investigator (risk@finsight.ai)</option>
                <option value="ADMIN">Platform Administrator (admin@finsight.ai)</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={clearHistory}
              className="p-1.5 rounded-xl border border-[#ded8cb] bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Reset Conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Wake Word Info Banner */}
        {showWakeInfo && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-[#faf7f0] border border-[#ece7dc] text-xs text-slate-700 leading-relaxed flex items-center justify-between">
            <p>
              Saying <strong>“Hello Fin”</strong> activates Fin AI voice conversation without clicking. All speech processing is performed locally in your browser.
            </p>
            <button
              onClick={() => setShowWakeInfo(false)}
              className="text-slate-400 hover:text-slate-800 ml-3 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Chat Messages Scrollable Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 max-w-3xl ${
                m.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xs text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-[#0d5941] text-white'
                    : 'bg-[#093828] text-[#f1cd6b]'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : 'Fin'}
              </div>

              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#0d5941] text-white rounded-tr-none'
                    : 'bg-[#faf7f0] border border-[#ece7dc] text-slate-800 rounded-tl-none shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Real RAG Source Citations */}
                {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#ece7dc] space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0d5941]">
                      <BookOpen className="w-3.5 h-3.5 text-[#0d5941]" />
                      <span>Verified Institutional Policy Sources ({m.citations.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.citations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="bg-white border border-[#ded8cb] rounded-xl p-2.5 shadow-2xs hover:border-[#0d5941]/40 transition-colors"
                        >
                          <div className="flex items-center justify-between text-slate-800 font-medium text-[11px]">
                            <span className="truncate max-w-[200px]" title={c.title}>
                              {c.title}
                            </span>
                            <span className="text-[10px] text-[#0d5941] font-mono font-semibold ml-1 shrink-0 bg-[#ebf7f1] px-1.5 py-0.5 rounded">
                              {c.pageNumber ? `Page ${c.pageNumber}` : `v${c.version}`}
                            </span>
                          </div>
                          {c.snippet && (
                            <p className="text-[10px] text-slate-600 line-clamp-3 mt-1.5 italic bg-[#faf7f0] p-1.5 rounded border border-[#ece7dc]">
                              "{c.snippet}"
                            </p>
                          )}
                          <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400">
                            <span>Relevance: {Math.round(c.similarity * 100)}%</span>
                            <span className="font-mono">v{c.version}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {m.role === 'assistant' && (

                  <div className="mt-3 pt-2 border-t border-[#ece7dc] flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-[10px]">
                      Model: {m.modelUsed || selectedModel}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSpeak(m.id, m.content)}
                        className={`hover:text-[#0d5941] transition-colors cursor-pointer flex items-center gap-1 ${
                          playingAudioId === m.id ? 'text-[#0d5941] font-bold' : ''
                        }`}
                        title="Read aloud with Fin AI voice"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{playingAudioId === m.id ? 'Speaking...' : 'Listen'}</span>
                      </button>
                      <button
                        onClick={() => handleCopy(m.id, m.content)}
                        className="hover:text-slate-700 transition-colors cursor-pointer flex items-center gap-1"
                        title="Copy to clipboard"
                      >
                        {copiedId === m.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === m.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Interactive Chips */}
                {m.chips && m.chips.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-[#ece7dc] flex flex-wrap gap-1.5">
                    {m.chips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(chip)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-[#ebf7f1] border border-[#ded8cb] hover:border-[#0d5941] text-[#0d5941] font-medium transition-all cursor-pointer shadow-2xs"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3 max-w-md">
              <div className="w-8 h-8 rounded-full bg-[#093828] text-[#f1cd6b] flex items-center justify-center text-xs font-bold">
                Fin
              </div>
              <div className="p-3.5 bg-[#faf7f0] border border-[#ece7dc] rounded-2xl rounded-tl-none text-xs text-slate-600 flex items-center gap-2 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d5941] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d5941] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#0d5941] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 text-[11px] font-medium font-mono text-slate-500">
                  Fin AI is generating response...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3.5 sm:p-4 border-t border-[#ece7dc] bg-[#faf7f0] rounded-b-2xl">
          {micNotice && (
            <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>{micNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setMicNotice(null)}
                className="text-amber-600 hover:text-amber-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isListening
                  ? 'Listening to microphone... Speak now'
                  : `Ask Fin AI about portfolio surplus, transactions, or fraud risk...`
              }
              disabled={isTyping}
              className={`flex-1 px-4 py-2.5 bg-white border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 ${
                isListening
                  ? 'border-red-400 ring-2 ring-red-300 animate-pulse'
                  : 'border-[#ded8cb] focus:ring-[#0d5941]'
              }`}
            />
            <button
              type="button"
              onClick={handleToggleDictate}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                isListening
                  ? 'bg-red-500/10 border-red-500 text-red-600 animate-pulse'
                  : 'bg-white border-[#ded8cb] text-slate-600 hover:text-[#0d5941] hover:border-[#0d5941]'
              }`}
              title={isListening ? 'Stop microphone dictation' : 'Dictate question with microphone'}
            >
              {isListening ? (
                <MicOff className="w-4 h-4 text-red-500" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={openTranscribeModal}
              className="p-2.5 rounded-xl border border-[#ece7dc] bg-[#ebf5f0] text-[#0d5941] hover:bg-[#d9ece3] transition-colors cursor-pointer flex items-center justify-center"
              title="Open Audio Transcriber Studio (gemini-3.5-transcribe)"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <Button
              type="submit"
              variant="emerald"
              size="md"
              disabled={!input.trim() || isTyping}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Send
            </Button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>
              Multi-turn model: <strong className="text-slate-600 font-mono">{selectedModel}</strong> · Voice: <strong className="text-slate-600 font-mono">gemini-3.8-live</strong>
            </span>
            <span>Fin AI Intelligence Suite</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
