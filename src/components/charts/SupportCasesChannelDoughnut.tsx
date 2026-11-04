import React, { useState, useMemo } from 'react';
import { Headphones, Inbox } from 'lucide-react';

export interface SupportCaseChannelItem {
  channel: string;
  count: number;
  percentage: number;
  color: string;
}

interface SupportCasesChannelDoughnutProps {
  data: SupportCaseChannelItem[];
  title?: string;
  className?: string;
}

export const SupportCasesChannelDoughnut: React.FC<SupportCasesChannelDoughnutProps> = ({
  data,
  title = 'Total Support Cases by Channel',
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalCases = useMemo(() => {
    return data.reduce((acc, d) => acc + d.count, 0);
  }, [data]);

  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = -90;

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <Headphones className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Live Supabase support_cases table
            </span>
          </div>
        </div>
      </div>

      {/* Handling Empty Dataset Correctly Without Fabricating Records */}
      {totalCases === 0 || data.length === 0 ? (
        <div className="my-auto flex flex-col items-center justify-center py-6 px-4 text-center">
          {/* Subtle Empty Doughnut Ring */}
          <div className="relative w-36 h-36 mx-auto mb-3">
            <svg viewBox="0 0 160 160" className="w-full h-full">
              <circle
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke="#ece7dc"
                strokeWidth={strokeWidth}
                strokeDasharray="4 4"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold font-mono text-slate-400">0</span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                Cases
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Inbox className="w-3.5 h-3.5 text-slate-400" />
            <span>No Support Cases Logged</span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
            The live database currently contains 0 support case records. Incoming customer escalations across channels (Email, Phone, Portal) will dynamically populate this chart.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-auto">
          {/* SVG Doughnut */}
          <div className="relative w-40 h-40 flex-shrink-0 mx-auto">
            <svg viewBox="0 0 170 170" className="w-full h-full -rotate-90 transform">
              {data.map((seg, idx) => {
                const fraction = totalCases > 0 ? seg.count / totalCases : 0;
                const strokeDasharray = `${fraction * circumference} ${circumference}`;
                const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
                accumulatedAngle += fraction * 360;

                const isHovered = hoveredIdx === idx;

                return (
                  <circle
                    key={seg.channel}
                    cx="85"
                    cy="85"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />
                );
              })}
            </svg>

            {/* Center Total Callout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-xl font-bold font-heading text-[#093425] leading-tight font-mono">
                {totalCases.toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                Total Cases
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex-1 space-y-2 w-full text-xs">
            {data.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={seg.channel}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                    isHovered ? 'bg-[#faf7f0]' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate text-slate-700">{seg.channel}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono">
                    <span className="text-slate-500">{seg.count.toLocaleString()}</span>
                    <span className="font-semibold text-slate-800 w-11 text-right">
                      {seg.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer / Helper Note */}
      <div className="pt-2 border-t border-[#f4f0e6] flex items-center justify-between text-[11px] text-slate-400">
        <span>Verified Supabase support_cases</span>
        <span className="font-mono text-slate-500">{totalCases} Total</span>
      </div>
    </div>
  );
};
