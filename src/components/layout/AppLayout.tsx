import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { DashboardBackground } from '../brand/DashboardBackground';
import { FloatingFinAiBot } from '../chat/FloatingFinAiBot';
import { FloatingFinAiPanel } from '../chat/FloatingFinAiPanel';
import { GeminiLiveVoice } from '../chat/GeminiLiveVoice';
import { AudioTranscribeModal } from '../chat/AudioTranscribeModal';
import { useFinAi } from '../../context/FinAiContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbLabel?: string;
  actions?: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  subtitle,
  icon,
  breadcrumbLabel,
  actions
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const {
    isVoiceModalOpen,
    closeVoiceModal,
    selectedPersona,
    voiceInitialPrompt,
    isTranscribeModalOpen,
    closeTranscribeModal
  } = useFinAi();

  return (
    <div className="min-h-screen flex bg-[#faf7f0] text-[#14251e] overflow-x-hidden relative">
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Subtle Financial Ivory Canvas with Faint Grid, Candlesticks & Data Lines */}
        <DashboardBackground />

        <Topbar
          onMenuClick={() => setIsMobileOpen(true)}
          title={title}
          subtitle={subtitle}
          icon={icon}
          breadcrumbLabel={breadcrumbLabel}
          actions={actions}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto relative z-10">
          {children}
        </main>
      </div>

      {/* Persistent Floating Fin AI Assistant (Bot & Compact Chat Panel) */}
      <FloatingFinAiPanel />
      <FloatingFinAiBot />

      {/* Dedicated Audio Transcription Modal (gemini-3.5-transcribe) */}
      <AudioTranscribeModal
        isOpen={isTranscribeModalOpen}
        onClose={closeTranscribeModal}
      />

      {/* Fullscreen Voice Experience (Gemini 3.8 Live API) */}
      <GeminiLiveVoice
        isOpen={isVoiceModalOpen}
        onClose={closeVoiceModal}
        userRole={selectedPersona}
        initialPrompt={voiceInitialPrompt}
      />
    </div>
  );
};
