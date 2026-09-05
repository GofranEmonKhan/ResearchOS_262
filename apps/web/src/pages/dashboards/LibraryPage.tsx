import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { CollectionSidebar } from '../../components/literature/CollectionSidebar.js';
import { PaperCard } from '../../components/literature/PaperCard.js';
import { UploadPaperModal } from '../../components/literature/UploadPaperModal.js';
import { PaperMetadataModal } from '../../components/literature/PaperMetadataModal.js';
import { SharePaperModal } from '../../components/literature/SharePaperModal.js';
import { api } from '../../lib/api.js';
import {
  Paper,
  Collection,
  Project,
  ReadingStatus,
  READING_STATUSES,
} from '@researchos/shared-types';
import {
  BookOpen,
  Search,
  Plus,
  Download,
  Filter,
  ChevronDown,
  Loader2,
  X,
  FileQuestion,
} from 'lucide-react';

interface LibraryPageProps {
  onNavigate: (route: string) => void;
}

export const LibraryPage: React.FC<LibraryPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();

  // Active Library View: 'personal' vs 'project'
  const [activeLibraryTab, setActiveLibraryTab] = useState<'personal' | 'project'>('personal');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // Collections State
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isRequiredFilter, setIsRequiredFilter] = useState(false);

  // Papers State
  const [papers, setPapers] = useState<Paper[]>([]);
  const [totalPapers, setTotalPapers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | ''>('');
  const [yearFilter, setYearFilter] = useState<string>('');

  // Export dropdown
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<Paper | null>(null);
  const [sharingPaper, setSharingPaper] = useState<Paper | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Projects and Collections
  const loadProjectsAndCollections = useCallback(async () => {
    try {
      const [projList, colList] = await Promise.all([
        api.getProjects().catch(() => []),
        api.getCollections().catch(() => []),
      ]);
      setProjects(projList);
      if (projList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projList[0].id);
      }
      setCollections(colList);
    } catch (err: any) {
      console.error('Failed to load initial library metadata:', err);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    loadProjectsAndCollections();
  }, [loadProjectsAndCollections]);

  // Fetch Papers
  const fetchPapers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        limit: 50,
      };

      if (debouncedSearch.trim()) {
        params.q = debouncedSearch.trim();
      }

      if (statusFilter) {
        params.readingStatus = statusFilter;
      }

      if (yearFilter) {
        params.year = parseInt(yearFilter);
      }

      if (isRequiredFilter) {
        params.isRequiredReading = true;
      }

      if (selectedCollectionId) {
        params.collectionId = selectedCollectionId;
      }

      if (activeLibraryTab === 'project' && selectedProjectId) {
        params.projectId = selectedProjectId;
      }

      const res = await api.getPapers(params);
      setPapers(res.papers);
      setTotalPapers(res.total);
    } catch (err: any) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    debouncedSearch,
    statusFilter,
    yearFilter,
    isRequiredFilter,
    selectedCollectionId,
    activeLibraryTab,
    selectedProjectId,
  ]);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  // Export handlers
  const handleExport = async (format: 'bibtex' | 'ris') => {
    setIsExportOpen(false);
    setIsExporting(true);
    try {
      await api.exportPapers(format, {
        projectId: activeLibraryTab === 'project' ? selectedProjectId : undefined,
        collectionId: selectedCollectionId || undefined,
      });
    } catch (err: any) {
      alert(err.message || 'Failed to export papers');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!window.confirm('Delete this paper from your library and storage? This cannot be undone.')) {
      return;
    }
    try {
      await api.deletePaper(paperId);
      fetchPapers();
      loadProjectsAndCollections();
    } catch (err: any) {
      alert(err.message || 'Failed to delete paper');
    }
  };

  const handleOpenViewer = (paperId: string) => {
    // Navigate to viewer route or notify
    onNavigate(`/papers/${paperId}`);
  };

  // Required count
  const requiredCount = papers.filter((p) => p.isRequiredReading).length;

  return (
    <WorkspaceLayout
      activeTab="literature"
      onTabChange={(tab) => {
        if (tab === 'dashboard' || tab === 'kanban' || tab === 'calendar') {
          onNavigate('/dashboard');
        }
      }}
      onNavigate={onNavigate}
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Page Title & Top Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
              <BookOpen className="w-5 h-5 text-violet-400" />
              <span>Literature Discovery & Library</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Curate, review, and annotate scholarly publications with automated metadata extraction
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                disabled={isExporting || papers.length === 0}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-white/10 text-slate-200 transition-colors disabled:opacity-50"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Export Citations</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {isExportOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-surface-2 border border-white/10 shadow-2xl z-30 py-1 text-xs">
                  <button
                    onClick={() => handleExport('bibtex')}
                    className="w-full text-left px-3.5 py-2 hover:bg-white/[0.06] text-slate-200 flex items-center justify-between"
                  >
                    <span>BibTeX (.bib)</span>
                    <span className="text-[10px] text-slate-500 font-mono">LaTeX</span>
                  </button>
                  <button
                    onClick={() => handleExport('ris')}
                    className="w-full text-left px-3.5 py-2 hover:bg-white/[0.06] text-slate-200 flex items-center justify-between"
                  >
                    <span>RIS (.ris)</span>
                    <span className="text-[10px] text-slate-500 font-mono">EndNote</span>
                  </button>
                </div>
              )}
            </div>

            {/* Add Paper Button */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Paper</span>
            </button>
          </div>
        </div>

        {/* Library Scope Selector & Filters Bar */}
        <div className="p-4 rounded-2xl bg-surface-1/90 border border-white/[0.08] shadow-md space-y-3">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Library Mode Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-surface-2 border border-white/[0.06]">
              <button
                onClick={() => {
                  setActiveLibraryTab('personal');
                  setSelectedCollectionId(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeLibraryTab === 'personal'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                My Library
              </button>
              <button
                onClick={() => {
                  setActiveLibraryTab('project');
                  setSelectedCollectionId(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeLibraryTab === 'project'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Project Library
              </button>
            </div>

            {/* If in project mode: project dropdown */}
            {activeLibraryTab === 'project' && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Project:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, authors, venue..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filters: Reading Status & Year */}
          <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-white/[0.04] text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3 text-slate-500" />
              Filter:
            </span>

            {/* Reading Status Pill Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReadingStatus | '')}
              className="px-2.5 py-1 rounded-lg bg-surface-2 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-violet-500"
            >
              <option value="">All Reading Statuses</option>
              {(Object.keys(READING_STATUSES) as ReadingStatus[]).map((st) => (
                <option key={st} value={st}>
                  {st === 'DeeplyAnalysed' ? 'Deeply Analysed' : st}
                </option>
              ))}
            </select>

            {/* Year Input */}
            <input
              type="number"
              min="1900"
              max="2100"
              placeholder="Filter by Year"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-28 px-2.5 py-1 rounded-lg bg-surface-2 border border-white/10 text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
            />

            {(statusFilter || yearFilter || debouncedSearch) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setYearFilter('');
                  setSearchQuery('');
                }}
                className="text-[11px] text-violet-400 hover:text-violet-300 underline ml-2"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Two-Pane Body */}
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Left Pane: Collection Sidebar */}
          <CollectionSidebar
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            isRequiredFilter={isRequiredFilter}
            totalPapersCount={totalPapers}
            requiredCount={requiredCount}
            onSelectCollection={(colId) => setSelectedCollectionId(colId)}
            onToggleRequired={(req) => setIsRequiredFilter(req)}
            onRefreshCollections={loadProjectsAndCollections}
          />

          {/* Right Pane: Paper Grid */}
          <div className="flex-1 min-w-0 w-full space-y-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <p className="text-xs">Loading scholarly publications...</p>
              </div>
            ) : papers.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center p-8 rounded-2xl bg-surface-1/50 border border-white/[0.06] text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <FileQuestion className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">No papers found</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    {debouncedSearch || statusFilter || isRequiredFilter || selectedCollectionId
                      ? 'No publications match your active filter criteria. Try clearing filters.'
                      : 'Your library is empty. Upload your first research paper to begin reviewing.'}
                  </p>
                </div>
                {!debouncedSearch && !statusFilter && !selectedCollectionId && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/25 transition-all"
                  >
                    Upload Paper PDF
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {papers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    currentUserId={user?.id}
                    collections={collections}
                    onOpenViewer={handleOpenViewer}
                    onEditMetadata={(p) => setEditingPaper(p)}
                    onShareToProject={(p) => setSharingPaper(p)}
                    onDeletePaper={handleDeletePaper}
                    onPaperUpdated={() => {
                      fetchPapers();
                      loadProjectsAndCollections();
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <UploadPaperModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onPaperCreated={() => {
          fetchPapers();
          loadProjectsAndCollections();
        }}
        collections={collections}
        projects={projects}
        currentUserId={user?.id || ''}
      />

      <PaperMetadataModal
        paper={editingPaper}
        isOpen={!!editingPaper}
        onClose={() => setEditingPaper(null)}
        onPaperUpdated={() => {
          fetchPapers();
          loadProjectsAndCollections();
        }}
        currentUserId={user?.id}
      />

      <SharePaperModal
        paper={sharingPaper}
        isOpen={!!sharingPaper}
        onClose={() => setSharingPaper(null)}
        onPaperShared={() => {
          fetchPapers();
          loadProjectsAndCollections();
        }}
        projects={projects}
      />
    </WorkspaceLayout>
  );
};
export default LibraryPage;
