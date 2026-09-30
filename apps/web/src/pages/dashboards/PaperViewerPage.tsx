import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { Paper, PaperAnnotation, ReadingStatus, READING_STATUSES, Project } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { PdfViewer } from '../../components/literature/PdfViewer.js';
import { AnnotationList } from '../../components/literature/AnnotationList.js';
import { SmartResearchSidebar } from '../../components/literature/SmartResearchSidebar.js';
import { SharePaperModal } from '../../components/literature/SharePaperModal.js';
import {
  ArrowLeft,
  Download,
  Share2,
  Bookmark,
  ChevronDown,
  Loader2,
  AlertTriangle,
  PanelLeft,
  PanelRight,
} from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Panel Visibilities
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Status & Sharing
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Load paper, signed URL, and annotations
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paperData, signedUrlData, annotationsData, projectsData] = await Promise.all([
        api.getPaper(paperId),
        api.getPaperDownloadUrl(paperId),
        api.getAnnotations(paperId),
        api.getProjects().catch(() => []),
      ]);

      const resolvedPdfUrl = signedUrlData?.signedUrl || (signedUrlData as any)?.url;
      if (!resolvedPdfUrl) {
        throw new Error('Could not resolve signed download URL for PDF document.');
      }

      setPaper(paperData);
      setPdfUrl(resolvedPdfUrl);
      setAnnotations(annotationsData);
      setProjects(projectsData);
    } catch (err: any) {
      console.error('Failed to load paper viewer:', err);
      setError(err.message || 'Failed to load paper details');
    } finally {
      setIsLoading(false);
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
    setIsStatusDropdownOpen(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07070C] flex flex-col items-center justify-center text-slate-300 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <p className="text-xs font-mono text-slate-500">Loading academic document & annotations...</p>
      </div>
    );
  }

  if (error || !paper || !pdfUrl) {
    let errorMessage = error;
    if (!errorMessage) {
      if (!paper) errorMessage = 'Paper not found or access denied.';
      else if (!pdfUrl) errorMessage = 'PDF document could not be loaded.';
      else errorMessage = 'Failed to load publication details.';
    }

    return (
      <div className="min-h-screen bg-[#07070C] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">Unable to Open Publication</h2>
        <p className="text-xs text-slate-400 max-w-sm">{errorMessage}</p>
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
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
            title="Return to Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <h1 className="text-xs font-bold text-white truncate max-w-md sm:max-w-xl">
              {paper.title}
            </h1>
            <p className="text-[10px] text-slate-400 truncate">
              {(paper.authors || []).join(', ')} {paper.year ? `(${paper.year})` : ''}
            </p>
          </div>
        </div>

        {/* Center/Right: Reading Status, Badges & Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {paper.isRequiredReading && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-[10px] font-medium text-amber-300">
              <Bookmark className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>Required</span>
            </span>
          )}

          {/* Reading Status Pill Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-2 border border-white/10 hover:border-violet-500/40 text-slate-200 transition-all"
            >
              <span>{paper.readingStatus || 'Unread'}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-surface-2 border border-white/10 shadow-2xl z-50 py-1 text-xs">
                {(Object.keys(READING_STATUSES) as ReadingStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  >
                    {st === 'DeeplyAnalysed' ? 'Deeply Analysed' : st}
                  </button>
                ))}
              </div>
            )}
          </div>

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

        {/* Center: PDF Viewer Canvas */}
        <PdfViewer
          paper={paper}
          pdfUrl={pdfUrl}
          annotations={annotations}
          currentPage={currentPage}
          onPageChange={(p) => setCurrentPage(p)}
          onAnnotationCreated={refreshAnnotations}
        />

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
