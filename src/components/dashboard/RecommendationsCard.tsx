import React from 'react';
import { Target, AlertTriangle, Megaphone, BarChart3, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const RecommendationsCard: React.FC = () => {
  const { recommendations, navigate } = useApp();

  const getIcon = (type: string) => {
    switch (type) {
      case 'target':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#ebf7f1] text-[#0f7654] flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4" />
          </div>
        );
      case 'alert':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#fef2f2] text-[#dc2626] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'megaphone':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] text-[#059669] flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
        );
      case 'chart':
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-base text-[#0a261c]">AI Recommendations</h3>
        <button
          onClick={() => navigate('/app/recommendations')}
          className="text-xs font-semibold text-[#095941] hover:text-[#063b2b] flex items-center gap-1 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recommendations List */}
      <div className="space-y-2.5">
        {recommendations.slice(0, 4).map((rec) => (
          <div
            key={rec.recommendation_id}
            onClick={() => navigate('/app/recommendations')}
            className="group flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[#ebe5d8] hover:bg-[#faf8f4] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              {getIcon(rec.icon_type)}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#0b281e] group-hover:text-[#0d543e] transition-colors truncate">
                  {rec.title}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{rec.description}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
          </div>
        ))}
      </div>
    </div>
  );
};
