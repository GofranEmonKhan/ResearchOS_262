import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Paper, PaperAnnotation, ReadingStatus, Project } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { PdfViewer } from '../../components/literature/PdfViewer.js';
import { AnnotationList } from '../../components/literature/AnnotationList.js';
import { SmartResearchSidebar } from '../../components/literature/SmartResearchSidebar.js';
import { SharePaperModal } from '../../components/literature/SharePaperModal.js';
import { ContextualLoader } from '../../components/common/ContextualLoader.js';
import { HoverSelect } from '../../components/common/HoverSelect.js';
import {
  ArrowLeft,
  Download,
  Share2,
  Bookmark,
  AlertTriangle,
  PanelLeft,
  PanelRight,
} from 'lucide-react';

const READING_STATUS_OPTIONS = [
  { value: 'Unread', label: 'Unread', badge: '⚪' },
  { value: 'Reading', label: 'Reading', badge: '🔵' },
  { value: 'Completed', label: 'Completed', badge: '🟢' },
  { value: 'DeeplyAnalysed', label: 'Deeply Analysed', badge: '🟣' },
];

interface PaperViewerPageProps {
  paperId: string;
  onNavigate: (route: string) => void;
}

export const PaperViewerPage: React.FC<PaperViewerPageProps> = ({ paperId, onNavigate }) => {
  const { user } = useAuth();

  const [paper, setPaper] = useState<Paper | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PaperAnnotation[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState<boolean>(true);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Panel Visibilities
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Status & Sharing
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Progressive load: Paper metadata renders immediately, then stream PDF & annotations
  const loadData = useCallback(async () => {
    setIsLoadingMetadata(true);
    setIsPdfLoading(true);
    setError(null);
    setPdfError(null);

    // Concurrently trigger all promises
    const paperPromise = api.getPaper(paperId);
    const projectsPromise = api.getProjects().catch(() => []);
    const annotationsPromise = api.getAnnotations(paperId).catch(() => []);
    const downloadUrlPromise = api.getPaperDownloadUrl(paperId);

    // 1. Resolve Paper metadata first to render header & sidebars immediately
    try {
      const paperData = await paperPromise;
      setPaper(paperData);
      setIsLoadingMetadata(false);

      // Concurrently populate annotations and projects
      annotationsPromise.then((anns) => setAnnotations(anns));
      projectsPromise.then((projs) => setProjects(projs));

      // 2. Resolve signed PDF stream for the viewport
      try {
        const signedUrlData = await downloadUrlPromise;
        const resolvedPdfUrl = signedUrlData?.signedUrl || (signedUrlData as any)?.url;
        if (!resolvedPdfUrl) {
          throw new Error('Could not resolve signed download URL for PDF document.');
        }
        setPdfUrl(resolvedPdfUrl);
      } catch (dlErr: any) {
        console.error('Failed to load PDF download URL:', dlErr);
        setPdfError(dlErr.message || 'Failed to resolve PDF document stream');
      } finally {
        setIsPdfLoading(false);
      }
    } catch (err: any) {
      console.error('Failed to load paper details:', err);
      setError(err.message || 'Failed to load paper details');
      setIsLoadingMetadata(false);
      setIsPdfLoading(false);
    }
  }, [paperId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh Annotations
  const refreshAnnotations = async () => {
    try {
      const list = await api.getAnnotations(paperId);
      setAnnotations(list);
    } catch (err: any) {
      console.error('Failed to refresh annotations:', err);
    }
  };

  // Change Reading Status
  const handleStatusChange = async (status: ReadingStatus) => {
    if (!paper) return;
    try {
      const updated = await api.updatePaper(paper.id, { readingStatus: status });
      setPaper(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update reading status');
    }
  };

  // Download PDF
  const handleDownload = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  // Full-screen loader only for initial metadata resolution
  if (isLoadingMetadata) {
    return (
      <ContextualLoader
        context="paper"
        title="Opening Academic Publication"
        subtitle="Resolving verified paper record and collaborative annotations..."
        itemTitle={paper?.title}
        onCancel={() => onNavigate('/literature')}
        cancelLabel="Return to Library"
        onRetry={loadData}
      />
    );
  }

  // Critical Error: Paper record not found or inaccessible
  if (error || !paper) {
    return (
      <div className="min-h-screen bg-[#07070C] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Unable to Open Publication</h2>
        <p className="text-xs text-slate-400 max-w-sm">{error || 'Paper not found or access denied.'}</p>
        <button
          onClick={() => onNavigate('/literature')}
          className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const isUploader = paper.uploaderId === user?.id;

  return (
    <div className="h-screen w-screen bg-[#07070C] text-slate-100 flex flex-col overflow-hidden">
      {/* Top Academic Navigation Bar */}
      <header className="h-14 px-4 bg-surface-1/95 border-b border-white/[0.08] flex items-center justify-between z-40 shrink-0 select-none">
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onNavigate('/literature')}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            title="Return to Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-md sm:max-w-xl tracking-tight">
              {paper.title}
            </h1>
            <p className="text-xs text-slate-300 font-medium truncate">
              {(paper.authors || []).join(', ')} {paper.year ? `(${paper.year})` : ''}
            </p>
          </div>
        </div>

        {/* Center/Right: Reading Status, Badges & Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {paper.isRequiredReading && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-xs font-semibold text-amber-300">
              <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Required</span>
            </span>
          )}

          {/* Reading Status Selector via Interactive HoverSelect */}
          <HoverSelect
            value={paper.readingStatus || 'Unread'}
            onChange={(val) => handleStatusChange(val as ReadingStatus)}
            options={READING_STATUS_OPTIONS}
            buttonClassName="px-2.5 py-1 text-xs font-semibold bg-surface-2 border border-white/10 hover:border-violet-500/40 text-slate-200"
            align="right"
          />

          {/* Share to project button */}
          {isUploader && !paper.projectId && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              title="Share to Project"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Share</span>
            </button>
          )}

          {/* Download Original PDF */}
          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Download PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1 hidden sm:block" />

          {/* Panel Toggles */}
          <button
            onClick={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isLeftPanelOpen
                ? 'text-violet-400 bg-violet-600/15'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Toggle Annotations Panel"
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`p-1.5 rounded-lg transition-colors ${
              isRightPanelOpen
                ? 'text-violet-400 bg-violet-600/15'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            title="Toggle Smart Research Sidebar"
          >
            <PanelRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Three-Panel Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Panel: Annotation List */}
        {isLeftPanelOpen && (
          <AnnotationList
            annotations={annotations}
            currentUserId={user?.id}
            currentPage={currentPage}
            onJumpToPage={(p) => setCurrentPage(p)}
            onAnnotationDeleted={refreshAnnotations}
            onClose={() => setIsLeftPanelOpen(false)}
          />
        )}

        {/* Center: PDF Viewer Canvas with Progressive Loader */}
        {isPdfLoading || !pdfUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#07070C] text-slate-300">
            {pdfError ? (
              <div className="text-center space-y-3 p-6 rounded-2xl bg-surface-2 border border-red-500/20 max-w-md shadow-2xl">
                <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">PDF Document Unavailable</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{pdfError}</p>
                <button
                  type="button"
                  onClick={loadData}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white transition-all shadow-md active:scale-95"
                >
                  Retry Stream
                </button>
              </div>
            ) : (
              <ContextualLoader
                fullScreen={false}
                size="md"
                context="paper"
                title="Rendering Academic Document"
                subtitle="Resolving secure PDF stream and initializing local PDF.js WebAssembly worker..."
              />
            )}
          </div>
        ) : (
          <PdfViewer
            paper={paper}
            pdfUrl={pdfUrl}
            annotations={annotations}
            currentPage={currentPage}
            onPageChange={(p) => setCurrentPage(p)}
            onAnnotationCreated={refreshAnnotations}
          />
        )}

        {/* Right Panel: Smart Research Sidebar */}
        {isRightPanelOpen && (
          <SmartResearchSidebar
            paper={paper}
            currentUserId={user?.id}
            onClose={() => setIsRightPanelOpen(false)}
          />
        )}
      </div>

      {/* Share Modal */}
      <SharePaperModal
        paper={paper}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onPaperShared={loadData}
        projects={projects}
      />
    </div>
  );
};
export default PaperViewerPage;
