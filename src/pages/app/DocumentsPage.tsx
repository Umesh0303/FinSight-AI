import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Shield,
  Search,
  BookOpen,
  AlertCircle,
  ArrowUpRight,
  Upload,
  RefreshCw,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  Layers,
  FileCheck,
  Lock,
  Eye,
  AlertTriangle,
  Info,
  ChevronDown
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingState, ErrorState } from '../../components/ui/EmptyState';
import { useApp } from '../../context/AppContext';
import { ragService, DocumentInspectionDetails } from '../../services/ragService';
import { RagDocument, RagDocumentStatus } from '../../types/rag';

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'markdown'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const DEFAULT_CATEGORIES = [
  'Compliance Policy',
  'Credit Policy',
  'Risk Management',
  'Transaction Monitoring',
  'Product Documentation',
  'Customer Disclosures'
];

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(isoString?: string | null): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return isoString;
  }
}

export const DocumentsPage: React.FC = () => {
  const { currentUser, navigate } = useApp();

  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'updated' | 'title' | 'pages' | 'chunks'>('updated');

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [inspectDocId, setInspectDocId] = useState<string | null>(null);
  const [inspectionData, setInspectionData] = useState<DocumentInspectionDetails | null>(null);
  const [isInspectionLoading, setIsInspectionLoading] = useState<boolean>(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<RagDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Re-indexing state tracking
  const [reindexingDocId, setReindexingDocId] = useState<string | null>(null);

  // Action Notification Banner
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Role permissions
  const userClientRole = currentUser?.role || 'CUSTOMER';
  const isPrivilegedRole =
    userClientRole === 'ADMIN' ||
    userClientRole === 'BUSINESS_ANALYST' ||
    userClientRole === 'RISK_FRAUD_ANALYST';
  const isAdmin = userClientRole === 'ADMIN';

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data = await ragService.listDocuments();
      setDocuments(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load documents';
      setFetchError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments, currentUser?.role, currentUser?.id]);

  // Derived categories from available docs + defaults
  const categoriesList = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    documents.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return ['All', ...Array.from(set)];
  }, [documents]);

  // Filtered & Sorted documents
  const filteredDocuments = useMemo(() => {
    let list = [...documents];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.filename.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q))
      );
    }

    if (selectedCategory !== 'All') {
      list = list.filter((d) => d.category === selectedCategory);
    }

    if (selectedStatus !== 'All') {
      list = list.filter((d) => d.status.toLowerCase() === selectedStatus.toLowerCase());
    }

    list.sort((a, b) => {
      if (sortBy === 'updated') {
        const timeA = new Date(a.updated_at || a.created_at).getTime();
        const timeB = new Date(b.updated_at || b.created_at).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'pages') {
        return (b.total_pages || 0) - (a.total_pages || 0);
      }
      if (sortBy === 'chunks') {
        return (b.chunk_count || 0) - (a.chunk_count || 0);
      }
      return 0;
    });

    return list;
  }, [documents, searchQuery, selectedCategory, selectedStatus, sortBy]);

  // Handle Document Inspection
  const handleOpenInspection = async (doc: RagDocument) => {
    setInspectDocId(doc.id);
    setIsInspectionLoading(true);
    setInspectionData(null);
    try {
      const details = await ragService.getDocumentDetails(doc.id);
      setInspectionData(details);
    } catch (err: unknown) {
      console.warn('Could not fetch chunk details, falling back to document record:', err);
      setInspectionData({
        document: doc,
        chunks: []
      });
    } finally {
      setIsInspectionLoading(false);
    }
  };

  const handleCloseInspection = () => {
    setInspectDocId(null);
    setInspectionData(null);
  };

  // Handle Re-index Action
  const handleReindex = async (docId: string, docTitle: string) => {
    if (!isPrivilegedRole) {
      setNotification({
        type: 'error',
        message: 'Access Denied: Re-indexing policy documents requires analyst or administrator clearance.'
      });
      return;
    }

    setReindexingDocId(docId);
    setNotification({
      type: 'info',
      message: `Re-indexing "${docTitle}"... Parsing source binary, re-generating Gemini embeddings, and syncing pgvector.`
    });

    try {
      const res = await ragService.reindexDocument(docId);
      setNotification({
        type: 'success',
        message: `Successfully re-indexed "${res.document.title}". Generated ${res.document.chunk_count} vector embeddings.`
      });
      // Refresh documents
      await loadDocuments();
      // If currently inspecting this doc, refresh inspection data too
      if (inspectDocId === docId) {
        const details = await ragService.getDocumentDetails(docId);
        setInspectionData(details);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Re-indexing failed';
      setNotification({
        type: 'error',
        message: `Re-indexing failed for "${docTitle}": ${msg}`
      });
      await loadDocuments();
    } finally {
      setReindexingDocId(null);
    }
  };

  // Handle Delete Action
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDoc) return;
    setIsDeleting(true);
    try {
      await ragService.deleteDocument(deleteConfirmDoc.id);
      setNotification({
        type: 'success',
        message: `Document "${deleteConfirmDoc.title}" and its associated vector chunks were deleted successfully.`
      });
      setDeleteConfirmDoc(null);
      if (inspectDocId === deleteConfirmDoc.id) {
        handleCloseInspection();
      }
      await loadDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Deletion failed';
      setNotification({
        type: 'error',
        message: `Failed to delete document: ${msg}`
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status: RagDocumentStatus) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0d5941] bg-[#ecfdf5] px-2 py-0.5 rounded-md border border-[#a7f3d0]">
            <CheckCircle2 className="w-3 h-3 text-[#0d5941]" />
            Indexed for RAG
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <RefreshCw className="w-3 h-3 text-amber-600 animate-spin" />
            Indexing in Progress
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
            <AlertCircle className="w-3 h-3 text-red-600" />
            Indexing Failed
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            <Clock className="w-3 h-3 text-slate-500" />
            Pending Ingestion
          </span>
        );
    }
  };

  return (
    <AppLayout
      title="Financial Documents & Knowledge Foundation"
      subtitle="Institutional policies, regulatory compliance guides, and RAG vector store ingestion pipeline."
    >
      {/* Real RAG Knowledge Repository Banner (Phase 4 Active) */}
      <div className="p-4 rounded-2xl bg-[#f0f8f4] border border-[#aee3cb] flex items-start gap-3.5 mb-6 text-xs text-[#0d4d38] shadow-2xs">
        <BookOpen className="w-5 h-5 text-[#0d5941] shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-[#093828]">
              Institutional Knowledge Base & RAG Vector Engine
            </h4>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#dcfce7] text-[#0d5941] px-2 py-0.5 rounded border border-[#bbf7d0]">
              768-Dim pgvector Active
            </span>
          </div>
          <p className="mt-1 leading-relaxed text-[#145a44]">
            Manage institutional documents used by Fin AI for semantic retrieval, evidence-grounded answers, and source citations.
            Uploaded documents are securely parsed, chunked, and embedded into 768-dimensional vectors using <span className="font-mono font-semibold">gemini-embedding-2-preview</span> and indexed via Supabase pgvector with strict role-based access control.
          </p>
        </div>
      </div>

      {/* Action Notification Banner */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl mb-5 flex items-center justify-between text-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : notification.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-900'
              : 'bg-blue-50 border border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0" />}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search, Filter & Controls Bar */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-2xs mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, filename, or category..."
              className="w-full pl-9 pr-3.5 py-2 text-xs bg-[#faf8f4] border border-[#e5dfd2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0d5941] focus:border-[#0d5941] text-slate-800 placeholder:text-slate-400 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium hidden sm:inline">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs bg-[#faf8f4] border border-[#e5dfd2] rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0d5941] cursor-pointer"
              >
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium hidden sm:inline">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs bg-[#faf8f4] border border-[#e5dfd2] rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0d5941] cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="indexed">Indexed</option>
                <option value="indexing">Indexing</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="text-[11px] font-medium hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-[#faf8f4] border border-[#e5dfd2] rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#0d5941] cursor-pointer"
              >
                <option value="updated">Recently Updated</option>
                <option value="title">Title (A-Z)</option>
                <option value="pages">Most Pages</option>
                <option value="chunks">Most Chunks</option>
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              disabled={isLoading}
              title="Refresh document repository"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>

            {/* Upload Document Button (Authorized Roles) */}
            {isPrivilegedRole ? (
              <Button
                variant="emerald"
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                leftIcon={<Upload className="w-3.5 h-3.5" />}
              >
                Upload Document
              </Button>
            ) : (
              <div
                className="text-[11px] text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-xl flex items-center gap-1"
                title="Uploading documents requires Analyst or Admin clearance"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Read-Only Access</span>
              </div>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="mt-3 pt-2.5 border-t border-[#f4f0e6] flex items-center justify-between text-[11px] text-slate-500">
          {fetchError ? (
            <span className="text-red-700 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span>Repository connection failed — document count unavailable</span>
            </span>
          ) : isLoading ? (
            <span className="text-slate-500 flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 text-[#0d5941] animate-spin flex-shrink-0" />
              <span>Connecting to document repository...</span>
            </span>
          ) : (
            <span>
              Showing <strong className="text-slate-800">{filteredDocuments.length}</strong> of{' '}
              <strong className="text-slate-800">{documents.length}</strong> institutional policy documents
            </span>
          )}
          <span className="font-mono text-[10px] text-slate-400">
            Active User Clearance: <strong className="text-[#0d5941]">{currentUser?.roleTitle || 'Unassigned'}</strong>
          </span>
        </div>
      </div>

      {/* Main Content Area: Loading, Error, Empty, or Document Grid */}
      {isLoading ? (
        <LoadingState message="Connecting to Supabase vector repository and loading authorized institutional documents..." />
      ) : fetchError ? (
        <div className="space-y-4">
          <ErrorState
            title="Unable to Connect to Document Store"
            message={`An error occurred while communicating with the RAG repository: ${fetchError}`}
            onRetry={loadDocuments}
          />
          {fetchError.toLowerCase().includes('sign in') && (
            <div className="flex justify-center -mt-2">
              <Button
                variant="emerald"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Sign In Again
              </Button>
            </div>
          )}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          title="No Institutional Documents Found"
          description="The live Supabase vector store currently contains zero policy documents. Upload an institutional policy, regulatory standard, or credit framework to enable Fin AI semantic retrieval and source citations."
          actionLabel={isPrivilegedRole ? 'Upload First Document' : undefined}
          onAction={isPrivilegedRole ? () => setIsUploadModalOpen(true) : undefined}
          icon={<FileText className="w-7 h-7 text-[#0d5941]" />}
        />
      ) : filteredDocuments.length === 0 ? (
        <div className="bg-white border border-[#ece7dc] rounded-2xl p-8 text-center">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h4 className="font-semibold text-sm text-slate-800">No matching documents</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            No policy documents match your search query "{searchQuery}" or selected filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
              setSelectedStatus('All');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {filteredDocuments.map((doc) => {
            const isReindexingThis = reindexingDocId === doc.id;
            const canDeleteThis =
              isAdmin || (isPrivilegedRole && doc.uploaded_by && doc.uploaded_by === currentUser?.id);

            return (
              <div
                key={doc.id}
                className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:shadow-md hover:border-[#0d5941]/30 transition-all group"
              >
                <div>
                  {/* Category & Status Header */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                      {doc.category || 'Institutional Policy'}
                    </span>
                    {renderStatusBadge(doc.status)}
                  </div>

                  {/* Document Title */}
                  <h3 className="font-heading font-semibold text-base text-[#092b1e] mb-2 leading-snug group-hover:text-[#0d5941] transition-colors">
                    {doc.title}
                  </h3>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 mb-3">
                    <span className="font-mono font-medium text-slate-600">v{doc.version || '1.0'}</span>
                    <span>·</span>
                    <span>{doc.total_pages || 1} {doc.total_pages === 1 ? 'page' : 'pages'}</span>
                    <span>·</span>
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {doc.chunk_count || 0} chunks
                    </span>
                    <span>·</span>
                    <span className="uppercase text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      {doc.file_extension || 'TXT'}
                    </span>
                    <span>·</span>
                    <span>{formatFileSize(doc.file_size_bytes)}</span>
                  </div>

                  {/* Description if present */}
                  {doc.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                      {doc.description}
                    </p>
                  )}

                  {/* Role Clearance Pill */}
                  <div className="mb-4 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-medium text-slate-400">Clearance:</span>
                    {Array.isArray(doc.allowed_roles) && doc.allowed_roles.length > 0 ? (
                      doc.allowed_roles.map((r, rIdx) => (
                        <span
                          key={rIdx}
                          className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                            r === 'customer'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : r === 'risk_analyst'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : r === 'business_analyst'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-purple-50 text-purple-700 border border-purple-200'
                          }`}
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-slate-400">All Roles</span>
                    )}
                  </div>

                  {/* Error Notification if failed */}
                  {doc.status === 'failed' && doc.error_message && (
                    <div className="mb-4 p-2.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-800 flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{doc.error_message}</span>
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-[#f5f2ea] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>Updated {formatDate(doc.updated_at || doc.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Re-index Button (Privileged only) */}
                    {isPrivilegedRole && (
                      <button
                        type="button"
                        onClick={() => handleReindex(doc.id, doc.title)}
                        disabled={isReindexingThis}
                        title="Re-extract, re-embed, and sync vector chunks"
                        className="p-1.5 text-slate-400 hover:text-[#0d5941] hover:bg-[#ecfdf5] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        aria-label="Re-index document"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReindexingThis ? 'animate-spin text-[#0d5941]' : ''}`} />
                      </button>
                    )}

                    {/* Delete Button (Admin or Uploader) */}
                    {canDeleteThis && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmDoc(doc)}
                        title="Delete document and vector embeddings"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Inspect Policy Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenInspection(doc)}
                      rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    >
                      Inspect Policy
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* UPLOAD DOCUMENT MODAL */}
      {/* ========================================================================= */}
      {isUploadModalOpen && (
        <UploadDocumentModal
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={async () => {
            setIsUploadModalOpen(false);
            setNotification({
              type: 'success',
              message: 'Document successfully uploaded, embedded, and indexed for Fin AI RAG semantic grounding.'
            });
            await loadDocuments();
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* INSPECT POLICY MODAL / DETAIL DRAWER */}
      {/* ========================================================================= */}
      {inspectDocId && (
        <InspectPolicyModal
          docId={inspectDocId}
          details={inspectionData}
          isLoading={isInspectionLoading}
          onClose={handleCloseInspection}
          onReindex={(id, title) => handleReindex(id, title)}
          isReindexing={reindexingDocId === inspectDocId}
          canManage={isPrivilegedRole}
        />
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteConfirmDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#ece7dc] rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <h3 className="font-heading font-semibold text-lg text-slate-900 mb-2">
              Delete Institutional Document
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-semibold">"{deleteConfirmDoc.title}"</strong>?
            </p>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-800 mb-5 leading-relaxed">
              <strong>RAG Retrieval Notice:</strong> Deleting this document will permanently purge its {deleteConfirmDoc.chunk_count || 0} vector chunks and embeddings from the Supabase pgvector store. Fin AI will no longer be able to cite or ground answers in this policy.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirmDoc(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting Chunks...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

// =============================================================================
// SUB-COMPONENT: UploadDocumentModal
// =============================================================================
interface UploadDocumentModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>('Compliance Policy');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [version, setVersion] = useState<string>('1.0');
  const [description, setDescription] = useState<string>('');
  const [allowedRoles, setAllowedRoles] = useState<string[]>([
    'admin',
    'business_analyst',
    'risk_analyst',
    'customer'
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (selected: File | null) => {
    if (!selected) {
      setFile(null);
      return;
    }

    const ext = selected.name.split('.').pop()?.toLowerCase() || '';
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setErrorMessage(
        `Unsupported file format: .${ext}. FinSight AI RAG accepts PDF, DOCX, TXT, and Markdown files.`
      );
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage(
        `File size (${(selected.size / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB.`
      );
      setFile(null);
      return;
    }

    setErrorMessage(null);
    setFile(selected);
    // Autofill title if empty
    if (!title) {
      const baseName = selected.name.replace(/\.[^/.]+$/, '');
      setTitle(baseName.replace(/[-_]/g, ' '));
    }
  };

  const toggleRole = (role: string) => {
    setAllowedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select a document file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Document title is required.');
      return;
    }
    if (allowedRoles.length === 0) {
      setErrorMessage('Please grant clearance to at least one role.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setUploadProgress('Validating file signature and magic bytes...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('category', category === 'Custom' ? customCategory.trim() || 'General Policy' : category);
      formData.append('version', version.trim() || '1.0');
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('allowedRoles', JSON.stringify(allowedRoles));

      setUploadProgress('Uploading binary to private storage & extracting text...');
      const timeoutId = setTimeout(() => {
        setUploadProgress('Generating 768-dim Gemini embeddings & indexing pgvector...');
      }, 1500);

      await ragService.uploadDocument(formData);
      clearTimeout(timeoutId);

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setErrorMessage(msg);
      setUploadProgress(null);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#ece7dc] rounded-2xl max-w-lg w-full shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ece7dc] flex items-center justify-between bg-[#faf8f4]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#0d5941]">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-base text-[#092b1e]">
                Upload Institutional Policy
              </h3>
              <p className="text-[11px] text-slate-500">
                PDF, DOCX, TXT, or Markdown up to 10 MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* File Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Document File <span className="text-red-500">*</span>
            </label>
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${
                file
                  ? 'border-[#0d5941] bg-[#f0f8f4]'
                  : 'border-[#ded8cb] hover:border-[#0d5941]/50 bg-[#faf8f4]'
              }`}
            >
              <input
                type="file"
                id="rag-file-input"
                className="hidden"
                accept=".pdf,.docx,.txt,.md,.markdown"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                disabled={isSubmitting}
              />
              <label
                htmlFor="rag-file-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                {file ? (
                  <div className="flex items-center gap-3 text-left">
                    <FileCheck className="w-7 h-7 text-[#0d5941] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-[#092b1e] truncate max-w-[280px]">
                        {file.name}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {formatFileSize(file.size)} · Click to change file
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mb-1.5" />
                    <span className="text-xs font-medium text-slate-700">
                      Click to choose or drag & drop document
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      Strictly supports PDF, DOCX, TXT, and Markdown (Max 10 MB)
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Retail Lending Underwriting Guidelines 2026"
              required
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 bg-[#faf8f4] border border-[#e5dfd2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0d5941] text-slate-800"
            />
          </div>

          {/* Category & Version */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isSubmitting}
                className="w-full text-xs px-2.5 py-2 bg-[#faf8f4] border border-[#e5dfd2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0d5941] text-slate-800 cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Custom">Custom Category...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Version
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0"
                disabled={isSubmitting}
                className="w-full text-xs px-3 py-2 bg-[#faf8f4] border border-[#e5dfd2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0d5941] text-slate-800 font-mono"
              />
            </div>
          </div>

          {category === 'Custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specify Custom Category
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="e.g. Treasury Operations"
                disabled={isSubmitting}
                className="w-full text-xs px-3 py-2 bg-[#faf8f4] border border-[#e5dfd2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0d5941] text-slate-800"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of policy scope and institutional regulatory applicability..."
              rows={2}
              disabled={isSubmitting}
              className="w-full text-xs px-3 py-2 bg-[#faf8f4] border border-[#e5dfd2] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0d5941] text-slate-800"
            />
          </div>

          {/* Role Clearances */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Access Clearance / Permitted Roles <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs bg-[#faf8f4] p-2.5 rounded-xl border border-[#e5dfd2]">
              {[
                { role: 'admin', label: 'Platform Admin' },
                { role: 'business_analyst', label: 'Business Analyst' },
                { role: 'risk_analyst', label: 'Risk & Fraud' },
                { role: 'customer', label: 'Customer Client' }
              ].map(({ role, label }) => (
                <label key={role} className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={allowedRoles.includes(role)}
                    onChange={() => toggleRole(role)}
                    disabled={isSubmitting}
                    className="accent-[#0d5941] rounded w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="text-[11px] font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Progress Indicator */}
          {uploadProgress && (
            <div className="p-3 bg-[#f0f8f4] border border-[#aee3cb] rounded-xl text-xs text-[#0d5941] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Submit & Cancel Buttons */}
          <div className="pt-3 border-t border-[#f5f2ea] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="emerald"
              size="sm"
              disabled={isSubmitting || !file}
              leftIcon={<Upload className="w-3.5 h-3.5" />}
            >
              {isSubmitting ? 'Ingesting Document...' : 'Upload & Index'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// SUB-COMPONENT: InspectPolicyModal
// =============================================================================
interface InspectPolicyModalProps {
  docId: string;
  details: DocumentInspectionDetails | null;
  isLoading: boolean;
  onClose: () => void;
  onReindex: (id: string, title: string) => void;
  isReindexing: boolean;
  canManage: boolean;
}

const InspectPolicyModal: React.FC<InspectPolicyModalProps> = ({
  docId,
  details,
  isLoading,
  onClose,
  onReindex,
  isReindexing,
  canManage
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'chunks'>('overview');

  const doc = details?.document;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#ece7dc] rounded-2xl max-w-2xl w-full shadow-2xl my-8 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#ece7dc] flex items-center justify-between bg-[#faf8f4] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#0d5941]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  {doc?.category || 'Policy Document'}
                </span>
                <span className="text-[10px] font-mono text-[#0d5941] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  v{doc?.version || '1.0'}
                </span>
              </div>
              <h3 className="font-heading font-semibold text-base text-[#092b1e] truncate max-w-md">
                {doc?.title || 'Policy Inspection'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 border-b border-[#ece7dc] bg-[#faf8f4] flex items-center gap-4 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#0d5941] text-[#0d5941] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Document Metadata
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chunks')}
            className={`py-2.5 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chunks'
                ? 'border-[#0d5941] text-[#0d5941] font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Vector Chunks</span>
            <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full">
              {details?.chunks?.length ?? doc?.chunk_count ?? 0}
            </span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {isLoading ? (
            <LoadingState message="Retrieving document metadata and chunk index from Supabase..." />
          ) : !doc ? (
            <ErrorState title="Document Not Found" message={`Could not locate document with ID ${docId}`} />
          ) : activeTab === 'overview' ? (
            <div className="space-y-4">
              {/* Failure Error Banner if any */}
              {doc.status === 'failed' && doc.error_message && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-red-900">Ingestion Failure Notice</h5>
                    <p className="mt-0.5">{doc.error_message}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              {doc.description && (
                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl text-xs text-slate-700 leading-relaxed">
                  <span className="font-semibold text-slate-900">Description: </span>
                  {doc.description}
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">DOCUMENT ID</span>
                  <span className="font-mono font-medium text-slate-800 text-[11px] select-all truncate block">
                    {doc.id}
                  </span>
                </div>

                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">INDEXING STATUS</span>
                  <span className="font-semibold text-slate-800">
                    {doc.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">ORIGINAL FILENAME</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {doc.filename}
                  </span>
                </div>

                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">FILE SIZE & EXTENSION</span>
                  <span className="font-medium text-slate-800">
                    {formatFileSize(doc.file_size_bytes)} · {doc.file_extension?.toUpperCase()}
                  </span>
                </div>

                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">PAGES & VECTOR CHUNKS</span>
                  <span className="font-medium text-slate-800">
                    {doc.total_pages || 1} pages · {doc.chunk_count || 0} vector chunks (768-dim)
                  </span>
                </div>

                <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 block mb-0.5">INDEXED AT</span>
                  <span className="font-medium text-slate-800">
                    {formatDate(doc.indexed_at || doc.updated_at)}
                  </span>
                </div>
              </div>

              {/* SHA-256 Fingerprint */}
              <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl text-xs">
                <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                  DEDUPLICATION SHA-256 FINGERPRINT
                </span>
                <span className="font-mono text-[11px] text-slate-700 select-all break-all">
                  {doc.file_hash_sha256}
                </span>
              </div>

              {/* Allowed Roles */}
              <div className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl text-xs">
                <span className="text-[10px] font-mono text-slate-400 block mb-1">
                  ROLE-BASED RETRIEVAL CLEARANCE
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {Array.isArray(doc.allowed_roles) && doc.allowed_roles.map((r, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-mono font-semibold bg-white border border-[#ded8cb] px-2 py-0.5 rounded text-slate-800"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-[11px] text-slate-500 flex items-center justify-between pb-1 border-b border-[#ece7dc]">
                <span>Showing parsed semantic chunks used for cosine vector retrieval</span>
                <span className="font-mono text-[10px] text-[#0d5941] font-semibold">
                  Embedding: gemini-embedding-2-preview (768d)
                </span>
              </div>

              {(!details?.chunks || details.chunks.length === 0) ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-[#faf8f4] rounded-xl border border-[#ece7dc]">
                  No vector chunk previews available for this document.
                </div>
              ) : (
                details.chunks.map((chk, idx) => (
                  <div
                    key={chk.id || idx}
                    className="p-3 bg-[#faf8f4] border border-[#ece7dc] rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="font-semibold text-slate-700">
                        Chunk #{chk.chunk_index + 1}
                      </span>
                      <span>
                        Page {chk.page_number || 1} · {chk.char_count} chars · ~{chk.token_estimate} tokens
                      </span>
                    </div>
                    <p className="text-slate-800 text-[11px] leading-relaxed italic bg-white p-2 rounded-lg border border-[#f0ebd9]">
                      "{chk.snippet}"
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-[#ece7dc] bg-[#faf8f4] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400">
            Document ID: <span className="font-mono">{doc?.id ? doc.id.slice(0, 8) + '...' : ''}</span>
          </div>

          <div className="flex items-center gap-2">
            {canManage && doc && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReindex(doc.id, doc.title)}
                disabled={isReindexing}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />}
              >
                {isReindexing ? 'Re-indexing...' : 'Re-index Policy'}
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
