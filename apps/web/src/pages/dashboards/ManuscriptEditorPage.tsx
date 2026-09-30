import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  ChevronLeft,
  Download,
  Plus,
  BookOpen,
  MessageSquare,
  CheckSquare,
  History,
  UserCheck,
  Building,
  Sparkles,
  Layers,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Edit3,
  Columns,
  Code,
  Quote,
  Bold,
  Italic,
  Heading2,
  Calculator,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import {
  Manuscript,
  ManuscriptSection,
  ManuscriptCitation,
  ManuscriptVersion,
  ManuscriptChecklistItem,
  ReviewComment,
  ManuscriptStatus,
} from '@researchos/shared-types';
import { CitationSearchModal } from '../../components/manuscripts/CitationSearchModal.js';
import { WhyDidICiteThisModal } from '../../components/manuscripts/WhyDidICiteThisModal.js';
import { ReviewCommentDrawer } from '../../components/manuscripts/ReviewCommentDrawer.js';
import { SubmissionChecklistCard } from '../../components/manuscripts/SubmissionChecklistCard.js';
import { AssignReviewerModal } from '../../components/manuscripts/AssignReviewerModal.js';
import { VersionHistoryModal } from '../../components/manuscripts/VersionHistoryModal.js';

interface ManuscriptEditorPageProps {
  manuscriptId: string;
  onNavigate: (route: string) => void;
}

export const ManuscriptEditorPage: React.FC<ManuscriptEditorPageProps> = ({
  manuscriptId,
  onNavigate,
}) => {
  const { user } = useAuth();

  // Primary Data State
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [sections, setSections] = useState<ManuscriptSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [citations, setCitations] = useState<ManuscriptCitation[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [checklistItems, setChecklistItems] = useState<ManuscriptChecklistItem[]>([]);
  const [versions, setVersions] = useState<ManuscriptVersion[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);

  // Access Roles
  const [userAccess, setUserAccess] = useState<{
    isAuthor: boolean;
    isSupervisor: boolean;
    isReviewer: boolean;
    isReader: boolean;
  }>({ isAuthor: false, isSupervisor: false, isReviewer: false, isReader: false });

  // Editor Active Section Buffer & Autosave
  const [activeContent, setActiveContent] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Editor View Mode: 'edit' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');

  // Right Drawer Tab: 'citations' | 'reviews' | 'checklist'
  const [rightTab, setRightTab] = useState<'citations' | 'reviews' | 'checklist'>('citations');

  // Modals
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [whyCiteKey, setWhyCiteKey] = useState<string | null>(null);
  const [isAssignReviewerOpen, setIsAssignReviewerOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);

  // Selected Text Snippet for Review Anchor
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch full manuscript details
  const fetchManuscriptData = useCallback(async () => {
    try {
      const data = await api.getManuscript(manuscriptId);
      setManuscript(data);
      const sortedSections = (data.sections || []).sort((a, b) => a.orderIndex - b.orderIndex);
      setSections(sortedSections);
      setCitations(data.citations || []);
      setComments(data.comments || []);
      setChecklistItems(data.checklistItems || []);
      setVersions(data.versions || []);

      if (data.userAccess) {
        setUserAccess(data.userAccess);
      }

      // Default active section if none selected
      if (!activeSectionId && sortedSections.length > 0) {
        setActiveSectionId(sortedSections[0].id);
        setActiveContent(sortedSections[0].contentMarkdown || '');
      }

      // Fetch project members for reviewer assignment
      if (data.projectId) {
        try {
          const membersRes = await fetch(`/projects/${data.projectId}/members`, {
            headers: {
              Authorization: `Bearer ${(await api.getMe()).id}`,
            },
          });
          if (membersRes.ok) {
            setProjectMembers(await membersRes.json());
          }
        } catch {
          // Non-blocking
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load academic manuscript');
    } finally {
      setLoading(false);
    }
  }, [manuscriptId, activeSectionId]);

  useEffect(() => {
    fetchManuscriptData();
  }, [fetchManuscriptData]);

  // Sync editor buffer when active section changes
  const handleSelectSection = (section: ManuscriptSection) => {
    // Flush pending save for previous section if any
    if (activeSectionId && saveStatus === 'unsaved') {
      performSave(activeSectionId, activeContent);
    }

    setActiveSectionId(section.id);
    setActiveContent(section.contentMarkdown || '');
    setSaveStatus('saved');
  };

  // Debounced Autosave (800ms)
  const performSave = async (secId: string, content: string) => {
    if (!userAccess.isAuthor && !userAccess.isSupervisor) return;

    setSaveStatus('saving');
    try {
      const updated = await api.updateManuscriptSection(manuscriptId, secId, {
        contentMarkdown: content,
      });

      // Update local section array
      setSections((prev) =>
        prev.map((s) => (s.id === secId ? { ...s, contentMarkdown: content, wordCount: updated.wordCount } : s))
      );
      setSaveStatus('saved');
      setLastSavedTime(new Date());
    } catch (err) {
      console.error('Autosave failed:', err);
      setSaveStatus('unsaved');
    }
  };

  const handleEditorChange = (newVal: string) => {
    setActiveContent(newVal);
    setSaveStatus('unsaved');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    if (activeSectionId) {
      autosaveTimerRef.current = setTimeout(() => {
        performSave(activeSectionId, newVal);
      }, 800);
    }
  };

  // Formatting Toolbar Helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('manuscript-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end);

    const replacement = `${prefix}${selected || 'text'}${suffix}`;
    const updated = current.substring(0, start) + replacement + current.substring(end);

    handleEditorChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 4));
    }, 50);
  };

  // Text selection handler to capture review comments snippet
  const handleEditorMouseUp = () => {
    const textarea = document.getElementById('manuscript-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start !== end) {
      const snippet = textarea.value.substring(start, end);
      if (snippet.trim().length > 3) {
        setSelectedSnippet(snippet.trim());
      }
    }
  };

  // Section Management: Create Section
  const handleAddSection = async () => {
    const title = prompt('Enter new section title (e.g., Ablation Studies, Ethical Declarations):');
    if (!title || !title.trim()) return;

    try {
      const newSec = await api.createManuscriptSection(manuscriptId, {
        title: title.trim(),
        sectionType: 'Custom',
        orderIndex: sections.length,
        contentMarkdown: '',
      });
      const updatedList = [...sections, newSec];
      setSections(updatedList);
      setActiveSectionId(newSec.id);
      setActiveContent('');
    } catch (err: any) {
      alert(err.message || 'Failed to add section');
    }
  };

  // Section Management: Reorder Section
  const handleMoveSection = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const reordered = [...sections];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((sec, idx) => ({
      sectionId: sec.id,
      orderIndex: idx,
    }));

    setSections(reordered);
    try {
      await api.reorderManuscriptSections(manuscriptId, { sectionOrders: payload });
    } catch (err: any) {
      alert(err.message || 'Failed to reorder sections');
      await fetchManuscriptData();
    }
  };

  // Section Management: Delete Section
  const handleDeleteSection = async (sectionId: string, sectionTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${sectionTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await api.deleteManuscriptSection(manuscriptId, sectionId);
      const remaining = sections.filter((s) => s.id !== sectionId);
      setSections(remaining);
      if (activeSectionId === sectionId) {
        if (remaining.length > 0) {
          setActiveSectionId(remaining[0].id);
          setActiveContent(remaining[0].contentMarkdown || '');
        } else {
          setActiveSectionId(null);
          setActiveContent('');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete section');
    }
  };

  // Export handlers
  const handleExport = (format: 'markdown' | 'latex' | 'bibtex') => {
    if (!manuscript) return;

    let content = '';
    let fileName = `${manuscript.title.replace(/[^a-zA-Z0-9]/g, '_')}`;

    if (format === 'markdown') {
      content = `# ${manuscript.title}\n\n`;
      if (manuscript.abstract) {
        content += `> **Abstract**: ${manuscript.abstract}\n\n`;
      }
      sections.forEach((sec) => {
        content += `## ${sec.title}\n\n${sec.contentMarkdown || ''}\n\n`;
      });
      fileName += '.md';
    } else if (format === 'latex') {
      content = `\\documentclass{article}\n\\title{${manuscript.title}}\n\\begin{document}\n\\maketitle\n\n`;
      if (manuscript.abstract) {
        content += `\\begin{abstract}\n${manuscript.abstract}\n\\end{abstract}\n\n`;
      }
      sections.forEach((sec) => {
        content += `\\section{${sec.title}}\n${sec.contentMarkdown || ''}\n\n`;
      });
      content += `\\end{document}\n`;
      fileName += '.tex';
    } else if (format === 'bibtex') {
      citations.forEach((cit) => {
        content += `@article{${cit.citationKey},\n  title={${cit.paper?.title || 'Unknown'}},\n  author={${cit.paper?.authors?.join(' and ') || 'Unknown'}},\n  year={${cit.paper?.year || ''}},\n  doi={${cit.paper?.doi || ''}}\n}\n\n`;
      });
      fileName += '.bib';
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Status badge styling
  const getStatusBadge = (status: ManuscriptStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            Draft
          </span>
        );
      case 'UnderInternalReview':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
            Under Internal Review
          </span>
        );
      case 'Revising':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Author Revisions
          </span>
        );
      case 'ReadyForSubmission':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Ready for Submission
          </span>
        );
      case 'Submitted':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/30">
            Submitted to Venue
          </span>
        );
      case 'Published':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/30">
            Published
          </span>
        );
    }
  };

  // Computations
  const activeSection = sections.find((s) => s.id === activeSectionId);
  const totalWords = sections.reduce((sum, s) => sum + (s.wordCount || 0), 0);
  const unresolvedMajorCount = comments.filter(
    (c) => (c.severity === 'CriticalFlaw' || c.severity === 'MajorScientific') && c.status !== 'Resolved'
  ).length;
  const openCommentsCount = comments.filter((c) => c.status !== 'Resolved').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
        <p className="text-xs font-mono">Loading Scholarly Manuscript Editor...</p>
      </div>
    );
  }

  if (error || !manuscript) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-white mb-2">Failed to Access Manuscript</h2>
        <p className="text-xs text-slate-400 max-w-md mb-6">{error || 'Manuscript not found or unauthorized'}</p>
        <button
          onClick={() => onNavigate('/dashboard')}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#070A11] text-slate-100 overflow-hidden font-sans">
      {/* ─────────────────────────────────────────────────────────────
          TOPBAR: Title, Venue, Status, Autosave, Governance Actions
      ───────────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-800 bg-[#090D16]/95 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back & Title info */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            onClick={() => onNavigate(`/projects/${manuscript.projectId}`)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Back to Project Workspace"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2.5 min-w-0">
            <h1 className="text-sm font-bold text-white truncate max-w-md">
              {manuscript.title}
            </h1>
            {getStatusBadge(manuscript.status)}
            {manuscript.targetVenue && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                <Building className="w-3 h-3 text-amber-400" />
                {manuscript.targetVenue}
              </span>
            )}
          </div>
        </div>

        {/* Center: Autosave Status Indicator */}
        <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {lastSavedTime ? `Saved ${lastSavedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Saved'}
              </span>
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="flex items-center gap-1.5 text-rose-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Unsaved changes</span>
            </span>
          )}
          <span className="text-slate-600">|</span>
          <span className="font-mono text-slate-300">{totalWords.toLocaleString()} words</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Version Snapshots */}
          <button
            onClick={() => setIsVersionHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
            title="View snapshot versions"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Versions</span>
            <span className="text-[10px] px-1 rounded bg-slate-900 text-slate-400">{versions.length}</span>
          </button>

          {/* Supervisor Assign Reviewer */}
          {userAccess.isSupervisor && (
            <button
              onClick={() => setIsAssignReviewerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold border border-violet-500/30 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Assign Reviewer</span>
            </button>
          )}

          {/* Export Dropdown */}
          <div className="relative group">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-[#0F1420] border border-slate-800 shadow-2xl py-1 hidden group-hover:block z-50">
              <button
                onClick={() => handleExport('markdown')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center justify-between"
              >
                <span>Markdown (.md)</span>
              </button>
              <button
                onClick={() => handleExport('latex')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center justify-between"
              >
                <span>LaTeX (.tex)</span>
              </button>
              <button
                onClick={() => handleExport('bibtex')}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors flex items-center justify-between"
              >
                <span>BibTeX References (.bib)</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3-COLUMN BODY:
          1. Left: Section Navigator
          2. Center: Scholarly Editor & Toolbar
          3. Right: Context & Review Drawer
      ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── COLUMN 1: IMRAD Section Navigator ── */}
        <aside className="w-64 border-r border-slate-800 bg-[#080B12] flex flex-col shrink-0 select-none">
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Sections ({sections.length})
              </span>
            </div>
            {(userAccess.isAuthor || userAccess.isSupervisor) && (
              <button
                onClick={handleAddSection}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Add Section"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sections.map((sec, index) => {
              const isActive = sec.id === activeSectionId;
              return (
                <div
                  key={sec.id}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/30 text-white font-medium shadow-sm'
                      : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <button
                    onClick={() => handleSelectSection(sec)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0"
                  >
                    <span className="text-[10px] font-mono text-slate-500 shrink-0 w-4">
                      {index + 1}.
                    </span>
                    <span className="text-xs truncate">{sec.title}</span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {sec.wordCount || 0}w
                    </span>

                    {/* Reorder / Delete tools on hover */}
                    {(userAccess.isAuthor || userAccess.isSupervisor) && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center ml-1 transition-opacity">
                        {index > 0 && (
                          <button
                            onClick={() => handleMoveSection(index, 'up')}
                            className="p-0.5 text-slate-500 hover:text-white"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                        )}
                        {index < sections.length - 1 && (
                          <button
                            onClick={() => handleMoveSection(index, 'down')}
                            className="p-0.5 text-slate-500 hover:text-white"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSection(sec.id, sec.title)}
                          className="p-0.5 text-slate-500 hover:text-rose-400 ml-0.5"
                          title="Delete Section"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── COLUMN 2: Center Scholarly Markdown/LaTeX Editor ── */}
        <main className="flex-1 flex flex-col bg-[#070A11] min-w-0 overflow-hidden relative">
          {activeSection ? (
            <>
              {/* Section Header & Formatting Toolbar */}
              <div className="border-b border-slate-800 bg-[#090D16]/70 px-4 py-2 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-tight">
                    {activeSection.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                    {activeSection.sectionType}
                  </span>
                </div>

                {/* Toolbar */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Bold (**text**)"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Italic (*text*)"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting('## ')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Heading (## )"
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting('$$ ', ' $$')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="LaTeX Equation ($$ E=mc^2 $$)"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting('```\n', '\n```')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Code Block"
                  >
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => insertFormatting('> ')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    title="Blockquote"
                  >
                    <Quote className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-800 mx-1" />

                  {/* Insert Citation Button */}
                  {(userAccess.isAuthor || userAccess.isSupervisor) && (
                    <button
                      onClick={() => setIsCitationModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/20 transition-colors"
                      title="Insert in-text citation [@key]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cite Literature</span>
                    </button>
                  )}

                  {/* View Mode Switcher */}
                  <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 ml-2">
                    <button
                      onClick={() => setViewMode('edit')}
                      className={`p-1 rounded ${viewMode === 'edit' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                      title="Editor View"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      className={`p-1 rounded ${viewMode === 'split' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                      title="Split View"
                    >
                      <Columns className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('preview')}
                      className={`p-1 rounded ${viewMode === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                      title="Preview View"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Editor / Preview Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Editor Textarea */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                  <div className={`flex-1 flex flex-col p-6 overflow-hidden ${viewMode === 'split' ? 'border-r border-slate-800' : ''}`}>
                    <textarea
                      id="manuscript-editor-textarea"
                      value={activeContent}
                      onChange={(e) => handleEditorChange(e.target.value)}
                      onMouseUp={handleEditorMouseUp}
                      placeholder="Draft your scholarly section text in Markdown & LaTeX. Use [@CitationKey] to anchor citations..."
                      disabled={!userAccess.isAuthor && !userAccess.isSupervisor}
                      className="w-full flex-1 bg-transparent text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-serif text-base leading-relaxed selection:bg-amber-500/20 selection:text-amber-200"
                      spellCheck
                    />

                    {/* Quick helper for selected snippet review anchoring */}
                    {selectedSnippet && (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                        <span className="text-xs text-amber-300 italic truncate mr-2">
                          Selected snippet: "{selectedSnippet}"
                        </span>
                        <button
                          onClick={() => setRightTab('reviews')}
                          className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors shrink-0"
                        >
                          Anchor Review Comment
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Preview View */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
                    <div className="prose prose-invert prose-amber max-w-none font-serif text-sm leading-relaxed space-y-4">
                      {activeContent ? (
                        activeContent.split('\n\n').map((para, i) => {
                          // Render headings
                          if (para.startsWith('### ')) {
                            return <h3 key={i} className="text-base font-bold text-white mt-4">{para.replace('### ', '')}</h3>;
                          }
                          if (para.startsWith('## ')) {
                            return <h2 key={i} className="text-lg font-bold text-white mt-5">{para.replace('## ', '')}</h2>;
                          }
                          if (para.startsWith('# ')) {
                            return <h1 key={i} className="text-xl font-bold text-white mt-6">{para.replace('# ', '')}</h1>;
                          }
                          if (para.startsWith('> ')) {
                            return (
                              <blockquote key={i} className="border-l-2 border-amber-500 pl-4 italic text-slate-300">
                                {para.replace('> ', '')}
                              </blockquote>
                            );
                          }

                          // Replace citation patterns [@Key] with interactive clickable badge
                          const parts = para.split(/(\[@[\w-]+\])/g);
                          return (
                            <p key={i} className="text-slate-300 leading-relaxed">
                              {parts.map((part, pIdx) => {
                                if (part.startsWith('[@') && part.endsWith(']')) {
                                  const citKey = part.slice(2, -1);
                                  return (
                                    <button
                                      key={pIdx}
                                      onClick={() => setWhyCiteKey(citKey)}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold cursor-pointer transition-colors mx-0.5"
                                      title="Click to view 'Why Did I Cite This?'"
                                    >
                                      <span>@{citKey}</span>
                                    </button>
                                  );
                                }
                                return part;
                              })}
                            </p>
                          );
                        })
                      ) : (
                        <p className="text-slate-600 italic">Section is currently empty.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <FileText className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-xs font-medium">Select or create a section to begin writing</p>
            </div>
          )}
        </main>

        {/* ── COLUMN 3: Right Context & Governance Drawer ── */}
        <aside className="w-80 border-l border-slate-800 bg-[#090D16] flex flex-col shrink-0 select-none overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 bg-[#080B12] text-xs">
            <button
              onClick={() => setRightTab('citations')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                rightTab === 'citations'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Citations ({citations.length})</span>
            </button>

            <button
              onClick={() => setRightTab('reviews')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all relative ${
                rightTab === 'reviews'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Reviews</span>
              {unresolvedMajorCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setRightTab('checklist')}
              className={`flex-1 py-3 font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                rightTab === 'checklist'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Governance</span>
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-hidden">
            {/* TAB 1: Citations & Why Did I Cite This */}
            {rightTab === 'citations' && (
              <div className="flex flex-col h-full overflow-hidden p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Linked Literature ({citations.length})
                  </span>
                  {(userAccess.isAuthor || userAccess.isSupervisor) && (
                    <button
                      onClick={() => setIsCitationModalOpen(true)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors"
                      title="Insert New Citation"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {citations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
                      <BookOpen className="w-8 h-8 mb-2 opacity-30" />
                      <p className="text-xs font-medium text-slate-400">No citations inserted</p>
                      <p className="text-[11px] text-slate-600 mt-1 max-w-xs">
                        Insert papers from your project literature repository to anchor evidence
                      </p>
                    </div>
                  ) : (
                    citations.map((cit) => (
                      <div
                        key={cit.id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            @{cit.citationKey}
                          </span>
                          <button
                            onClick={() => setWhyCiteKey(cit.citationKey)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Why Cited?</span>
                          </button>
                        </div>

                        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug">
                          {cit.paper?.title || 'Unknown Title'}
                        </h4>

                        <div className="text-[11px] text-slate-500">
                          {cit.paper?.authors?.[0] ? `${cit.paper.authors[0]} et al.` : 'Authors'} · {cit.paper?.year || ''}
                        </div>

                        {cit.contextNote && (
                          <p className="text-[11px] text-slate-400 italic border-l border-amber-500/50 pl-2">
                            "{cit.contextNote}"
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Peer Review Drawer */}
            {rightTab === 'reviews' && (
              <ReviewCommentDrawer
                manuscriptId={manuscriptId}
                comments={comments}
                sections={sections}
                activeSectionId={activeSectionId}
                isAuthor={userAccess.isAuthor}
                isSupervisor={userAccess.isSupervisor}
                isReviewer={userAccess.isReviewer}
                currentUserId={user?.id}
                onRefreshComments={fetchManuscriptData}
                selectedTextSnippet={selectedSnippet}
                onClearSnippet={() => setSelectedSnippet(null)}
              />
            )}

            {/* TAB 3: Governance & Submission Checklist */}
            {rightTab === 'checklist' && (
              <SubmissionChecklistCard
                manuscript={manuscript}
                checklistItems={checklistItems}
                isAuthor={userAccess.isAuthor}
                isSupervisor={userAccess.isSupervisor}
                unresolvedMajorCount={unresolvedMajorCount}
                openCommentsCount={openCommentsCount}
                onRefreshManuscript={fetchManuscriptData}
              />
            )}
          </div>
        </aside>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALS
      ───────────────────────────────────────────────────────────── */}
      {/* Insert Citation Modal */}
      <CitationSearchModal
        isOpen={isCitationModalOpen}
        onClose={() => setIsCitationModalOpen(false)}
        projectId={manuscript.projectId}
        sectionId={activeSectionId}
        onInsertCitation={async (dto) => {
          await api.insertCitation(manuscriptId, dto);
          // Insert in-text marker into active section content
          insertFormatting(dto.inTextLabel || `[@${dto.citationKey}]`);
          await fetchManuscriptData();
        }}
      />

      {/* Why Did I Cite This Modal */}
      {whyCiteKey && (
        <WhyDidICiteThisModal
          isOpen={Boolean(whyCiteKey)}
          onClose={() => setWhyCiteKey(null)}
          manuscriptId={manuscriptId}
          citationKey={whyCiteKey}
          onOpenPaper={(paperId) => onNavigate(`/papers/${paperId}`)}
        />
      )}

      {/* Supervisor Assign Reviewer Modal */}
      <AssignReviewerModal
        isOpen={isAssignReviewerOpen}
        onClose={() => setIsAssignReviewerOpen(false)}
        manuscriptId={manuscriptId}
        projectMembers={projectMembers}
        onReviewerAssigned={fetchManuscriptData}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        manuscriptId={manuscriptId}
        versions={versions}
        canEdit={userAccess.isAuthor || userAccess.isSupervisor}
        onRefreshVersions={fetchManuscriptData}
        onVersionRestored={fetchManuscriptData}
      />
    </div>
  );
};
