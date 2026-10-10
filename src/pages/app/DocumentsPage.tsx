import React from 'react';
import { FileText, Shield, Search, BookOpen, AlertCircle, ArrowUpRight } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';

export const DocumentsPage: React.FC = () => {
  const documents = [
    {
      title: 'Anti-Money Laundering & KYC Compliance Manual (2024)',
      category: 'Compliance Policy',
      version: 'v4.2',
      pages: 48,
      lastUpdated: 'Oct 2024',
      status: 'Indexed for RAG'
    },
    {
      title: 'Retail Credit Underwriting & Risk Appetite Framework',
      category: 'Credit Policy',
      version: 'v2.1',
      pages: 32,
      lastUpdated: 'Sep 2024',
      status: 'Indexed for RAG'
    },
    {
      title: 'Cross-Border Wire Transfer Settlement Rules & Anomaly Guidelines',
      category: 'Transaction Monitoring',
      version: 'v3.0',
      pages: 26,
      lastUpdated: 'Aug 2024',
      status: 'Indexed for RAG'
    },
    {
      title: 'Obsidian Wealth Cardholder Product Terms & Benefit Schedule',
      category: 'Product Documentation',
      version: 'v1.5',
      pages: 18,
      lastUpdated: 'Jul 2024',
      status: 'Pending Re-indexing'
    }
  ];

  return (
    <AppLayout
      title="Financial Documents & Knowledge Foundation"
      subtitle="Institutional policies, regulatory compliance guides, and RAG vector store ingestion pipeline."
    >
      {/* Phase 0 Architecture Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#f0f8f4] border border-[#aee3cb] flex items-start gap-3.5 mb-6 text-xs text-[#0d4d38]">
        <BookOpen className="w-5 h-5 text-[#0d5941] flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm text-[#093828]">
            RAG Knowledge Repository Foundation (Phase 0)
          </h4>
          <p className="mt-0.5 leading-relaxed text-[#145a44]">
            This workspace serves as the semantic grounding catalog for FinSight AI document intelligence. In Phase 0, documents are registered and metadata-tagged. Full vector embeddings and citation search will be integrated in future phases.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {documents.map((doc, idx) => (
          <div
            key={idx}
            className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {doc.category}
                </span>
                <span className="text-[11px] font-semibold text-[#0d5941] bg-[#ecfdf5] px-2 py-0.5 rounded border border-[#a7f3d0]">
                  {doc.status}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base text-[#092b1e] mb-2">
                {doc.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                <span>{doc.version}</span>
                <span>·</span>
                <span>{doc.pages} pages</span>
                <span>·</span>
                <span>Updated {doc.lastUpdated}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f5f2ea] flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Grounding Source Document</span>
              <Button
                variant="primary"
                size="sm"
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Inspect Policy
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
};
