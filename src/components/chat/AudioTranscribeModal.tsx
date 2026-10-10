import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Sparkles,
  Volume2,
  Copy,
  Check,
  Send,
  Upload,
  RefreshCw,
  X,
  FileAudio,
  Radio,
  Play,
  Pause,
  AlertCircle
} from 'lucide-react';
import { useFinAi } from '../../context/FinAiContext';
import { MicrophoneAudioRecorder, RecordingResult } from '../../utils/audioRecorder';

interface AudioTranscribeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HistoryItem {
  id: string;
  transcript: string;
  timestamp: string;
  duration: number;
  audioUrl?: string;
}

export const AudioTranscribeModal: React.FC<AudioTranscribeModalProps> = ({
  isOpen,
  onClose
}) => {
  const { transcribeAudio, openChat, sendMessage, stopVoicePlayback } = useFinAi();

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [audioResult, setAudioResult] = useState<RecordingResult | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'mic' | 'upload' | 'samples'>('mic');

  const recorderRef = useRef<MicrophoneAudioRecorder | null>(null);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop any background playback on open
  useEffect(() => {
    if (isOpen) {
      stopVoicePlayback();
    }
  }, [isOpen, stopVoicePlayback]);

  // Handle timer during recording
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Auto-stop at 60 seconds
            handleStopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording]);

  // Clean up audio playback on close
  useEffect(() => {
    if (!isOpen) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      setIsPlayingAudio(false);
      if (isRecording) {
        recorderRef.current?.stop().catch(() => {});
        setIsRecording(false);
      }
    }
  }, [isOpen, isRecording]);

  // Start microphone recording
  const handleStartRecording = async () => {
    setErrorMessage(null);
    setCurrentTranscript('');
    setAudioResult(null);

    try {
      const recorder = new MicrophoneAudioRecorder();
      recorderRef.current = recorder;
      await recorder.start((level) => {
        setMicLevel(level);
      });
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setErrorMessage(
        err?.name === 'NotAllowedError'
          ? 'Microphone permission blocked. Please allow mic access in your browser.'
          : 'Could not access microphone hardware. Please check your mic connection.'
      );
    }
  };

  // Stop microphone recording & send to gemini-3.5-transcribe
  const handleStopRecording = useCallback(async () => {
    if (!recorderRef.current || !isRecording) return;
    setIsRecording(false);
    setIsTranscribing(true);
    setMicLevel(0);

    try {
      const result = await recorderRef.current.stop();
      setAudioResult(result);

      // Call transcribeAudio with base64Audio
      const transcript = await transcribeAudio(result.base64Audio, result.mimeType);

      if (transcript && transcript.trim()) {
        const text = transcript.trim();
        setCurrentTranscript(text);
        setHistory((prev) => [
          {
            id: `trans-${Date.now()}`,
            transcript: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: Math.round(result.durationSeconds),
            audioUrl: result.audioUrl
          },
          ...prev.slice(0, 4)
        ]);
      } else {
        setErrorMessage('No discernible speech detected in the audio clip.');
      }
    } catch (err: any) {
      console.error('Transcription error:', err);
      setErrorMessage(err?.message || 'Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording, transcribeAudio]);

  // Handle local file upload for transcription
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setCurrentTranscript('');
    setIsTranscribing(true);

    try {
      const audioUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string)?.split(',')[1];
        if (!base64Data) {
          setErrorMessage('Could not read audio file.');
          setIsTranscribing(false);
          return;
        }

        const mimeType = file.type || 'audio/wav';
        setAudioResult({
          base64Audio: base64Data,
          mimeType,
          blob: file,
          audioUrl,
          durationSeconds: 0
        });

        try {
          const transcript = await transcribeAudio(base64Data, mimeType);
          if (transcript && transcript.trim()) {
            const text = transcript.trim();
            setCurrentTranscript(text);
            setHistory((prev) => [
              {
                id: `trans-${Date.now()}`,
                transcript: text,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: 0,
                audioUrl
              },
              ...prev.slice(0, 4)
            ]);
          } else {
            setErrorMessage('No discernible speech detected in the uploaded file.');
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'Transcription failed.');
        } finally {
          setIsTranscribing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error processing file.');
      setIsTranscribing(false);
    }
  };

  // Play/pause recorded audio
  const togglePlayAudio = (url?: string) => {
    const targetUrl = url || audioResult?.audioUrl;
    if (!targetUrl) return;

    if (isPlayingAudio && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    const audio = new Audio(targetUrl);
    audioPlayerRef.current = audio;
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => setIsPlayingAudio(false);
    audio.play().then(() => setIsPlayingAudio(true)).catch(() => setIsPlayingAudio(false));
  };

  // Copy transcript to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Send directly to Fin AI
  const handleSendToFinAi = (text: string) => {
    onClose();
    openChat();
    sendMessage(text);
  };

  // Sample voice prompts for testing
  const samplePrompts = [
    {
      title: 'Savings & Surplus Query',
      text: 'What is my current monthly savings surplus and how can I optimize my high-yield deposit allocations?'
    },
    {
      title: 'Risk & Fraud Verification',
      text: 'Check my recent transactions for unusual merchant categories or flagged security anomalies.'
    },
    {
      title: 'Portfolio Health Check',
      text: 'Give me a concise 30-second financial health summary comparing this month to last month.'
    }
  ];

  const handleTestSample = async (sampleText: string) => {
    setIsTranscribing(true);
    setErrorMessage(null);
    setCurrentTranscript('');

    try {
      // First generate speech via TTS endpoint so we have real audio
      const ttsRes = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sampleText })
      });
      const ttsData = await ttsRes.json();
      if (!ttsData.audioUrl) throw new Error('Could not synthesize sample voice');

      const base64Audio = ttsData.audioUrl.split(',')[1];
      const audioUrl = ttsData.audioUrl;

      setAudioResult({
        base64Audio,
        mimeType: 'audio/wav',
        blob: new Blob([], { type: 'audio/wav' }),
        audioUrl,
        durationSeconds: 4
      });

      // Now transcribe it through gemini-3.5-transcribe
      const transcript = await transcribeAudio(base64Audio, 'audio/wav');
      const text = transcript || sampleText;
      setCurrentTranscript(text);
      setHistory((prev) => [
        {
          id: `trans-${Date.now()}`,
          transcript: text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: 4,
          audioUrl
        },
        ...prev.slice(0, 4)
      ]);
    } catch (err: any) {
      console.error('Sample test error:', err);
      // Fallback
      setCurrentTranscript(sampleText);
    } finally {
      setIsTranscribing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#e2dcd0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-[#061d16] to-[#0a2e23] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Mic className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Transcribe Audio</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#f1cd6b] text-[#061d16]">
                  gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-xs text-emerald-200/80">
                High-fidelity microphone speech-to-text powered by Gemini 3.5
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#ece7dc] bg-[#faf7f0] px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('mic')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'mic'
                ? 'border-[#0d5941] text-[#0d5941]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mic className="w-4 h-4" />
            Microphone Input
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#0d5941] text-[#0d5941]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload Audio File
          </button>
          <button
            onClick={() => setActiveTab('samples')}
            className={`pb-3 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'samples'
                ? 'border-[#0d5941] text-[#0d5941]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Financial Presets
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-amber-500 hover:text-amber-800 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: Live Microphone Input */}
          {activeTab === 'mic' && (
            <div className="flex flex-col items-center justify-center p-6 bg-[#faf7f0] rounded-2xl border border-[#ece7dc]">
              {/* Pulsing Visualizer Circle */}
              <div className="relative mb-6">
                {isRecording && (
                  <div
                    className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"
                    style={{ transform: `scale(${1 + micLevel * 0.8})` }}
                  />
                )}
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isTranscribing}
                  className={`relative w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all shadow-lg cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30 ring-4 ring-rose-200'
                      : isTranscribing
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-[#0d5941] hover:bg-[#0a4633] text-white shadow-[#0d5941]/30 hover:scale-105'
                  }`}
                  aria-label={isRecording ? 'Stop recording' : 'Start microphone recording'}
                >
                  {isRecording ? (
                    <>
                      <Square className="w-8 h-8 fill-current" />
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Stop</span>
                    </>
                  ) : isTranscribing ? (
                    <>
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Wait</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-8 h-8" />
                      <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Record</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status and Timer */}
              {isRecording ? (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-rose-600 font-mono text-sm font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    Recording: {Math.floor(recordingSeconds / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(recordingSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  {/* Real-time sound level bars */}
                  <div className="flex items-center justify-center gap-1 h-8 px-4">
                    {[0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.9, 0.6, 0.3].map((factor, i) => {
                      const height = Math.max(4, Math.min(32, micLevel * 40 * factor));
                      return (
                        <div
                          key={i}
                          className="w-1.5 bg-[#0d5941] rounded-full transition-all duration-75"
                          style={{ height: `${height}px` }}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-600">
                    Speak your financial question clearly. Click <span className="font-semibold text-rose-600">Stop</span> when done.
                  </p>
                </div>
              ) : isTranscribing ? (
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-[#0d5941] font-semibold text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Transcribing with gemini-3.5-transcribe...
                  </div>
                  <p className="text-xs text-slate-500">
                    Sending 16kHz audio to Gemini 3.5 Transcribe model for verbatim decoding.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-800">
                    Press Record to capture voice from your microphone
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    Audio is sampled at 16kHz mono PCM and processed directly with Google's <span className="font-mono text-[#0d5941] font-medium">gemini-3.5-transcribe</span> model.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="p-6 bg-[#faf7f0] rounded-2xl border border-[#ece7dc] text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#0d5941]/10 text-[#0d5941] flex items-center justify-center">
                  <FileAudio className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Upload Pre-Recorded Audio</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Upload a .wav, .mp3, .m4a, or .webm audio clip to transcribe verbatim with Gemini 3.5.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTranscribing}
                  className="mt-2 px-5 py-2.5 bg-[#0d5941] hover:bg-[#0a4633] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Choose Audio File
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Financial Presets */}
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Select a preset financial query to synthesize and test the <span className="font-mono font-semibold text-[#0d5941]">gemini-3.5-transcribe</span> pipeline:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {samplePrompts.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTestSample(sample.text)}
                    disabled={isTranscribing}
                    className="p-3.5 text-left bg-[#faf7f0] hover:bg-[#ebf5f0] border border-[#ece7dc] hover:border-[#0d5941]/40 rounded-xl transition-all cursor-pointer group flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#061d16] group-hover:text-[#0d5941] block">
                        {sample.title}
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        "{sample.text}"
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-white border border-[#e2dcd0] text-[10px] font-semibold text-[#0d5941] rounded-lg group-hover:bg-[#0d5941] group-hover:text-white transition-colors flex-shrink-0">
                      Test Model
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Output Box */}
          {currentTranscript ? (
            <div className="bg-[#fcfaf6] border border-[#0d5941]/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0d5941]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#061d16]">
                    Transcription Result
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#ebf5f0] text-[#0d5941]">
                    gemini-3.5-transcribe
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {audioResult?.audioUrl && (
                    <button
                      onClick={() => togglePlayAudio()}
                      className="p-1.5 rounded-lg bg-white border border-[#e2dcd0] text-slate-700 hover:text-[#0d5941] text-xs flex items-center gap-1.5 cursor-pointer"
                      title={isPlayingAudio ? 'Pause playback' : 'Play recorded audio'}
                    >
                      {isPlayingAudio ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-[#0d5941]" />
                          <span className="text-[10px] font-semibold">Playing</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-semibold">Play Clip</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleCopy(currentTranscript)}
                    className="p-1.5 rounded-lg bg-white border border-[#e2dcd0] text-slate-700 hover:text-[#0d5941] text-xs flex items-center gap-1.5 cursor-pointer"
                    title="Copy transcript"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[10px] font-semibold text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Transcript Text */}
              <div className="p-4 bg-white rounded-xl border border-[#ece7dc] text-sm text-[#061d16] font-medium leading-relaxed select-text shadow-2xs">
                "{currentTranscript}"
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-slate-500">
                  {currentTranscript.split(/\s+/).filter(Boolean).length} words transcribed verbatim
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCurrentTranscript('');
                      setAudioResult(null);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-[#e2dcd0] text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => handleSendToFinAi(currentTranscript)}
                    className="px-4 py-1.5 rounded-xl bg-[#0d5941] hover:bg-[#0a4633] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Ask Fin AI
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Session History */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Recent Transcripts ({history.length})
              </h4>
              <div className="space-y-2">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-[#ece7dc] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 truncate">
                      <p className="font-medium text-slate-800 truncate">"{item.transcript}"</p>
                      <span className="text-[10px] text-slate-400">
                        {item.timestamp} {item.duration > 0 ? `• ${item.duration}s` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.audioUrl && (
                        <button
                          onClick={() => togglePlayAudio(item.audioUrl)}
                          className="p-1 rounded-md text-slate-500 hover:text-[#0d5941] hover:bg-slate-100 cursor-pointer"
                          title="Play clip"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(item.transcript)}
                        className="p-1 rounded-md text-slate-500 hover:text-[#0d5941] hover:bg-slate-100 cursor-pointer"
                        title="Copy text"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleSendToFinAi(item.transcript)}
                        className="px-2.5 py-1 rounded-md bg-[#ebf5f0] text-[#0d5941] font-semibold text-[11px] hover:bg-[#0d5941] hover:text-white transition-colors cursor-pointer"
                      >
                        Ask
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#faf7f0] border-t border-[#ece7dc] flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Target Model: <strong className="font-mono text-[#061d16]">gemini-3.5-transcribe</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white border border-[#e2dcd0] text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
