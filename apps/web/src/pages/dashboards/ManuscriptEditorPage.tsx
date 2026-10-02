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
  Pin,
  Copy,
  Check,
  Image as ImageIcon,
  HelpCircle,
  Bot,
  Wand2,
  X,
  ChevronDown,
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
  WritingAssistAction,
} from '@researchos/shared-types';
import { CitationSearchModal } from '../../components/manuscripts/CitationSearchModal.js';
import { WhyDidICiteThisModal } from '../../components/manuscripts/WhyDidICiteThisModal.js';
import { ReviewCommentDrawer } from '../../components/manuscripts/ReviewCommentDrawer.js';
import { SubmissionChecklistCard } from '../../components/manuscripts/SubmissionChecklistCard.js';
import { AssignReviewerModal } from '../../components/manuscripts/AssignReviewerModal.js';
import { VersionHistoryModal } from '../../components/manuscripts/VersionHistoryModal.js';
import { NoticeModal } from '../../components/common/NoticeModal.js';
import { ConfirmDeleteDialog } from '../../components/common/ConfirmDeleteDialog.js';
import { LatexPaperPreview } from '../../components/manuscripts/LatexPaperPreview.js';
import { InsertFigureModal } from '../../components/manuscripts/InsertFigureModal.js';
import { ManuscriptGuidelinesModal } from '../../components/manuscripts/ManuscriptGuidelinesModal.js';
import { AiWritingAssistModal } from '../../components/ai/index.js';

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
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');

  // Right Drawer Tab: 'citations' | 'reviews' | 'checklist'
  const [rightTab, setRightTab] = useState<'citations' | 'reviews' | 'checklist'>('citations');

  // Section Sidebar Hover & Pin State (Like Main AppSidebar)
  const [isSectionSidebarHovered, setIsSectionSidebarHovered] = useState(false);
  const [isSectionSidebarPinned, setIsSectionSidebarPinned] = useState(false);
  const isSectionSidebarExpanded = isSectionSidebarPinned || isSectionSidebarHovered;

  // Resizable Editor & Preview Split (Overleaf Style)
  const [editorWidthPercent, setEditorWidthPercent] = useState<number>(50);
  const [isDraggingEditorSplit, setIsDraggingEditorSplit] = useState(false);
  const splitAreaRef = useRef<HTMLDivElement>(null);

  // Resizable Right Context Drawer
  const [rightDrawerWidth, setRightDrawerWidth] = useState<number>(340);
  const [isDraggingRightDrawer, setIsDraggingRightDrawer] = useState(false);

  // Drag handler for Editor & Preview split (Overleaf Style)
  const startDraggingEditorSplit = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingEditorSplit(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!splitAreaRef.current) return;
      const rect = splitAreaRef.current.getBoundingClientRect();
      const offset = moveEvent.clientX - rect.left;
      const pct = (offset / rect.width) * 100;
      const clamped = Math.max(20, Math.min(80, pct));
      setEditorWidthPercent(clamped);
    };

    const onMouseUp = () => {
      setIsDraggingEditorSplit(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Drag handler for Right Context Drawer
  const startDraggingRightDrawer = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRightDrawer(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const newWidth = windowWidth - moveEvent.clientX;
      const clamped = Math.max(260, Math.min(600, newWidth));
      setRightDrawerWidth(clamped);
    };

    const onMouseUp = () => {
      setIsDraggingRightDrawer(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  // Modals
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [whyCiteKey, setWhyCiteKey] = useState<string | null>(null);
  const [copiedCitationKey, setCopiedCitationKey] = useState<string | null>(null);
  const [isFigureModalOpen, setIsFigureModalOpen] = useState(false);
  const [isGuidelinesModalOpen, setIsGuidelinesModalOpen] = useState(false);
  const [isAssignReviewerOpen, setIsAssignReviewerOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isDeletingSection, setIsDeletingSection] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Interactive Export Dropdown State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleExportMouseEnter = useCallback(() => {
    if (exportCloseTimerRef.current) {
      clearTimeout(exportCloseTimerRef.current);
      exportCloseTimerRef.current = null;
    }
    setIsExportOpen(true);
  }, []);

  const handleExportMouseLeave = useCallback(() => {
    if (exportCloseTimerRef.current) {
      clearTimeout(exportCloseTimerRef.current);
    }
    exportCloseTimerRef.current = setTimeout(() => {
      setIsExportOpen(false);
    }, 150);
  }, []);

  // Selected Text Snippet for Review Anchor
  const [selectedSnippet, setSelectedSnippet] = useState<string | null>(null);

  // AI Writing Assist State
  const [isCallingAiAssist, setIsCallingAiAssist] = useState(false);
  const [aiAssistModalData, setAiAssistModalData] = useState<{
    isOpen: boolean;
    action: WritingAssistAction;
    originalText?: string;
    suggestedText: string;
    suggestionId: string;
  } | null>(null);

  // Manuscript Figure Assets Store: maps clean paths ('figures/plot.png') to image data
  const [figureAssets, setFigureAssets] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!manuscriptId) return;
    try {
      const stored = localStorage.getItem(`researchos_figures_${manuscriptId}`);
      if (stored) {
        setFigureAssets(JSON.parse(stored));
      } else {
        setFigureAssets({});
      }
    } catch (err) {
      console.warn('Failed to parse manuscript figures from localStorage', err);
    }
  }, [manuscriptId]);

  const registerFigureAsset = useCallback(
    (path: string, dataUrl: string) => {
      setFigureAssets((prev) => {
        const updated = { ...prev, [path]: dataUrl };
        const altKey = path.startsWith('figures/') ? path.replace('figures/', '') : `figures/${path}`;
        updated[altKey] = dataUrl;
        try {
          localStorage.setItem(`researchos_figures_${manuscriptId}`, JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed to save figure asset to localStorage', err);
        }
        return updated;
      });
    },
    [manuscriptId]
  );

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

  // Global Keyboard Shortcuts (Ctrl+Shift+F for Figures, Ctrl+/ for Guidelines)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
        e.preventDefault();
        setIsFigureModalOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsGuidelinesModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  // Snippet insertion helper for Figures, Guidelines, Equations, etc.
  const insertSnippetAtCursor = (snippet: string) => {
    const textarea = document.getElementById('manuscript-editor-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      handleEditorChange(activeContent ? `${activeContent}\n\n${snippet}` : snippet);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;

    const before = current.substring(0, start);
    const after = current.substring(end);
    const prefix = before.length > 0 && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const suffix = after.length > 0 && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';

    const updated = before + prefix + snippet + suffix + after;
    handleEditorChange(updated);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + prefix.length + snippet.length;
      textarea.setSelectionRange(newPos, newPos);
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

  // Base64 Image Detection & Automatic / One-Click Cleanup into LaTeX Figures
  const hasRawBase64Images = /data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]{80,}/.test(activeContent);

  const cleanUpRawBase64Images = useCallback(() => {
    let updatedContent = activeContent;
    const newAssets: Record<string, string> = {};
    let convertedCount = 0;

    // Pattern 1: \includegraphics[...]{data:image/...} (supports optional whitespace/newlines before {)
    const includegraphicsRegex = /\\includegraphics(?:\[[^\]]*\])?\s*\{(data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+)\}/g;
    let match: RegExpExecArray | null;

    const matches: Array<{ fullMatch: string; dataUrl: string; index: number }> = [];
    while ((match = includegraphicsRegex.exec(activeContent)) !== null) {
      matches.push({
        fullMatch: match[0],
        dataUrl: match[1],
        index: match.index,
      });
    }

    for (const item of matches) {
      convertedCount++;
      // Search for enclosing \begin{figure} ... \end{figure} block
      const figureBlockStart = activeContent.lastIndexOf('\\begin{figure}', item.index);
      const figureBlockEnd = activeContent.indexOf('\\end{figure}', item.index);
      let labelName = `figure_${convertedCount}`;
      if (figureBlockStart !== -1 && figureBlockEnd !== -1 && figureBlockEnd > figureBlockStart) {
        const figureBlock = activeContent.slice(figureBlockStart, figureBlockEnd + 12);
        const labelMatch = figureBlock.match(/\\label\{fig:([a-zA-Z0-9_-]+)\}/);
        if (labelMatch) {
          labelName = labelMatch[1];
        }
      }

      const cleanPath = `figures/${labelName}.png`;
      newAssets[cleanPath] = item.dataUrl;
      newAssets[`${labelName}.png`] = item.dataUrl;

      updatedContent = updatedContent.replace(item.dataUrl, cleanPath);
    }

    // Pattern 2: Markdown image ![caption](data:image/...)
    const mdRegex = /!\[([^\]]*)\]\((data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+)\)/g;
    while ((match = mdRegex.exec(activeContent)) !== null) {
      convertedCount++;
      const captionText = match[1] || `figure_${convertedCount}`;
      const cleanName = captionText.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 30) || `figure_${convertedCount}`;
      const cleanPath = `figures/${cleanName}.png`;

      newAssets[cleanPath] = match[2];
      newAssets[`${cleanName}.png`] = match[2];

      updatedContent = updatedContent.replace(match[2], cleanPath);
    }

    // Pattern 3: Any leftover generic {data:image/png;base64,...}
    const genericRegex = /\{data:image\/[a-zA-Z0-9+]+;base64,[A-Za-z0-9+/=]+\}/g;
    updatedContent = updatedContent.replace(genericRegex, (raw) => {
      convertedCount++;
      const dataUrl = raw.slice(1, -1);
      const cleanPath = `figures/figure_${convertedCount}.png`;
      newAssets[cleanPath] = dataUrl;
      newAssets[`figure_${convertedCount}.png`] = dataUrl;
      return `{${cleanPath}}`;
    });

    if (convertedCount > 0) {
      setFigureAssets((prev) => {
        const merged = { ...prev, ...newAssets };
        try {
          localStorage.setItem(`researchos_figures_${manuscriptId}`, JSON.stringify(merged));
        } catch (err) {
          console.warn('Failed to save cleaned figures to localStorage', err);
        }
        return merged;
      });

      handleEditorChange(updatedContent);
    }
  }, [activeContent, manuscriptId, handleEditorChange]);

  // AI Writing Assist Actions (Paraphrase, Fix Grammar, Section Outline)
  const handleTriggerWritingAssist = async (action: WritingAssistAction) => {
    if (!activeSectionId || !manuscriptId) return;
    const activeSec = sections.find((s) => s.id === activeSectionId);

    const textToProcess = selectedSnippet || (action === 'outline' ? undefined : activeContent);
    if ((action === 'paraphrase' || action === 'grammar') && (!textToProcess || textToProcess.trim().length === 0)) {
      alert(`Please select or highlight text in the editor to ${action === 'paraphrase' ? 'paraphrase' : 'fix grammar'}.`);
      return;
    }

    setIsCallingAiAssist(true);
    try {
      const res = await api.writingAssist(manuscriptId, {
        action,
        selectedText: textToProcess,
        sectionType: activeSec?.sectionType,
        sectionId: activeSectionId,
      });

      setAiAssistModalData({
        isOpen: true,
        action,
        originalText: textToProcess,
        suggestedText: res.suggestion.suggestedValue,
        suggestionId: res.suggestion.id,
      });
    } catch (err: any) {
      alert(err.message || 'AI writing assistance failed');
    } finally {
      setIsCallingAiAssist(false);
    }
  };

  const handleApplyAiSuggestion = async (suggestedText: string, suggestionId: string) => {
    try {
      // 1. Accept server-side: marks suggestion Accepted and updates manuscript_sections.is_ai_assisted = true
      await api.acceptAiSuggestion(suggestionId);

      // 2. Update local editor content
      if (aiAssistModalData?.originalText && activeContent.includes(aiAssistModalData.originalText)) {
        // Replace selected snippet in active buffer
        const updated = activeContent.replace(aiAssistModalData.originalText, suggestedText);
        handleEditorChange(updated);
      } else if (aiAssistModalData?.action === 'outline') {
        // Append outline to section
        const updated = activeContent ? `${activeContent}\n\n${suggestedText}` : suggestedText;
        handleEditorChange(updated);
      } else {
        // Fallback: replace section content
        handleEditorChange(suggestedText);
      }

      // 3. Update section locally to display AI-assisted badge
      setSections((prev) =>
        prev.map((s) => (s.id === activeSectionId ? { ...s, isAiAssisted: true } : s))
      );

      // Clear selection
      setSelectedSnippet(null);
    } catch (err: any) {
      alert(err.message || 'Failed to apply AI suggestion');
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
      setErrorNotice(err.message || 'Failed to add section');
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
      setErrorNotice(err.message || 'Failed to reorder sections');
      await fetchManuscriptData();
    }
  };

  // Section Management: Delete Section
  const handleDeleteSection = (sectionId: string, sectionTitle: string) => {
    setSectionToDelete({ id: sectionId, title: sectionTitle });
  };

  const handleConfirmDeleteSection = async () => {
    if (!sectionToDelete) return;
    setIsDeletingSection(true);
    try {
      await api.deleteManuscriptSection(manuscriptId, sectionToDelete.id);
      const remaining = sections.filter((s) => s.id !== sectionToDelete.id);
      setSections(remaining);
      if (activeSectionId === sectionToDelete.id) {
        if (remaining.length > 0) {
          setActiveSectionId(remaining[0].id);
          setActiveContent(remaining[0].contentMarkdown || '');
        } else {
          setActiveSectionId(null);
          setActiveContent('');
        }
      }
      setSectionToDelete(null);
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to delete section');
    } finally {
      setIsDeletingSection(false);
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold border border-slate-700 transition-colors cursor-pointer"
            title="View snapshot versions"
          >
            <History className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Versions</span>
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">{versions.length}</span>
          </button>

          {/* Manuscript Writing Guidelines */}
          <button
            onClick={() => setIsGuidelinesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-semibold border border-amber-500/30 transition-colors cursor-pointer"
            title="Manuscript Writing Guidelines & Cheatsheet [Ctrl+/]"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Guidelines</span>
          </button>

          {/* Supervisor Assign Reviewer */}
          {userAccess.isSupervisor && (
            <button
              onClick={() => setIsAssignReviewerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 text-xs sm:text-sm font-semibold border border-violet-500/30 transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Assign Reviewer</span>
            </button>
          )}

          {/* Interactive Export Dropdown */}
          <div
            className="relative inline-block"
            onMouseEnter={handleExportMouseEnter}
            onMouseLeave={handleExportMouseLeave}
          >
            <button
              type="button"
              onClick={() => setIsExportOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 text-xs sm:text-sm font-semibold border border-slate-700 transition-colors cursor-pointer shadow-sm"
              title="Export Manuscript as Markdown, LaTeX, or BibTeX"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-[#0C101A] border border-slate-800 shadow-2xl shadow-black/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 border-b border-slate-800/80 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Export Formats</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('markdown');
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">Markdown Document</span>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">.md</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('latex');
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">LaTeX Article</span>
                  <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">.tex</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport('bibtex');
                    setIsExportOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="font-medium">BibTeX Citations</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">.bib</span>
                </button>
              </div>
            )}
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
        {/* ── COLUMN 1: IMRAD Section Navigator (Hover-expandable & Pinnable) ── */}
        <aside
          onMouseEnter={() => setIsSectionSidebarHovered(true)}
          onMouseLeave={() => setIsSectionSidebarHovered(false)}
          className={`border-r border-slate-800/80 bg-[#080B12] flex flex-col shrink-0 select-none transition-all duration-300 ease-in-out ${
            isSectionSidebarExpanded ? 'w-80' : 'w-[72px]'
          }`}
          aria-label="Manuscript Sections Navigator"
        >
          {/* Header */}
          <div
            className={`border-b border-slate-800/80 transition-all ${
              isSectionSidebarExpanded
                ? 'px-4 py-3 flex items-center justify-between bg-[#0A0F1A]/80 backdrop-blur-sm'
                : 'p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-[#080B12]'
            }`}
            onClick={!isSectionSidebarExpanded ? () => setIsSectionSidebarPinned(true) : undefined}
            title={!isSectionSidebarExpanded ? 'Sections Navigator — Click to pin open' : undefined}
          >
            {isSectionSidebarExpanded ? (
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Sections
                    </span>
                    <span className="text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      {sections.length}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {(userAccess.isAuthor || userAccess.isSupervisor) && (
                    <button
                      onClick={handleAddSection}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Add Section"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsSectionSidebarPinned(!isSectionSidebarPinned)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      isSectionSidebarPinned
                        ? 'text-amber-300 bg-amber-500/20 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={isSectionSidebarPinned ? 'Unpin sidebar (auto-collapse on hover leave)' : 'Pin sidebar open'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
                <span className="text-xs font-mono text-amber-300 font-bold bg-amber-500/15 px-1.5 py-0.5 rounded-md border border-amber-500/30">
                  {sections.length}
                </span>
              </>
            )}
          </div>

          {/* Section Items */}
          <div className={`flex-1 overflow-y-auto space-y-1 ${
            isSectionSidebarExpanded ? 'p-3' : 'p-2 flex flex-col items-center gap-1.5'
          }`}>
            {sections.map((sec, index) => {
              const isActive = sec.id === activeSectionId;
              return (
                <div
                  key={sec.id}
                  className={`group relative rounded-xl transition-all ${
                    isSectionSidebarExpanded
                      ? `px-3 py-2 flex items-center justify-between border ${
                          isActive
                            ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/35 text-white shadow-sm shadow-amber-950/20'
                            : 'border-transparent hover:border-slate-800 hover:bg-slate-800/40 text-slate-300'
                        }`
                      : 'w-full flex justify-center py-0.5'
                  }`}
                >
                  {/* Active Left Glow Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-r shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                  )}

                  {isSectionSidebarExpanded ? (
                    <>
                      <button
                        onClick={() => handleSelectSection(sec)}
                        className="flex items-center gap-2.5 text-left flex-1 min-w-0 pr-1 cursor-pointer"
                        title={`${index + 1}. ${sec.title} (${(sec.wordCount || 0).toLocaleString()} words)`}
                      >
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                            : 'text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800/80'
                        }`}>
                          {index + 1}
                        </span>
                        <span className={`text-sm tracking-tight truncate flex-1 min-w-0 ${
                          isActive ? 'text-white font-bold' : 'text-slate-200 font-medium group-hover:text-white'
                        }`}>
                          {sec.title}
                        </span>
                        {sec.isAiAssisted && (
                          <span title="AI-assisted section — reviewed by author">
                            <Bot className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                          </span>
                        )}
                      </button>

                      <div className="flex items-center gap-1 shrink-0 relative">
                        {/* Word count badge */}
                        <span className={`text-xs font-mono px-2 py-0.5 rounded-md transition-opacity duration-150 ${
                          userAccess.isAuthor || userAccess.isSupervisor ? 'group-hover:opacity-0' : ''
                        } ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}>
                          {(sec.wordCount || 0).toLocaleString()}w
                        </span>

                        {/* Reorder / Delete tools on hover */}
                        {(userAccess.isAuthor || userAccess.isSupervisor) && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150 bg-slate-900/95 rounded-lg p-0.5 border border-slate-700/80 shadow-md">
                            {index > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveSection(index, 'up');
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Move Section Up"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            )}
                            {index < sections.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveSection(index, 'down');
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Move Section Down"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSection(sec.id, sec.title);
                              }}
                              className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Delete Section"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => handleSelectSection(sec)}
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all relative group cursor-pointer ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-500/20'
                          : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700'
                      }`}
                      title={`${index + 1}. ${sec.title} (${(sec.wordCount || 0).toLocaleString()} words)`}
                    >
                      <span className="font-mono text-xs font-bold">{index + 1}</span>
                      <span className="text-[9px] font-mono opacity-60 text-slate-400 group-hover:text-slate-300">
                        {sec.wordCount ? `${Math.round(sec.wordCount / 100) / 10}k` : '0w'}
                      </span>
                      {isActive && (
                        <div className="absolute -left-1 top-2.5 bottom-2.5 w-1 bg-amber-400 rounded-r shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Word Count Footer */}
          {isSectionSidebarExpanded ? (
            <div className="p-3.5 border-t border-slate-800/80 bg-[#0A0F1A]/90 flex items-center justify-between text-xs">
              <div className="flex flex-col space-y-0.5">
                <span className="text-slate-300 font-semibold text-xs">Total Manuscript</span>
                <span className="text-[11px] text-slate-400 font-medium">
                  ~{Math.max(1, Math.ceil(sections.reduce((acc, s) => acc + (s.wordCount || 0), 0) / 220))} min read · {sections.length} sections
                </span>
              </div>
              <span className="font-mono font-bold text-amber-300 text-xs sm:text-sm bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20 shadow-sm">
                {sections.reduce((acc, s) => acc + (s.wordCount || 0), 0).toLocaleString()} words
              </span>
            </div>
          ) : (
            <div
              className="p-2.5 border-t border-slate-800/80 flex flex-col items-center justify-center text-xs font-mono cursor-pointer hover:bg-slate-900/50 transition-colors"
              title={`Total manuscript words: ${sections.reduce((acc, s) => acc + (s.wordCount || 0), 0).toLocaleString()}`}
              onClick={() => setIsSectionSidebarPinned(true)}
            >
              <span className="text-amber-400 font-bold text-xs">
                {sections.reduce((acc, s) => acc + (s.wordCount || 0), 0).toLocaleString()}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-slate-500">words</span>
            </div>
          )}
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-medium border border-amber-500/25 transition-colors"
                      title="Insert in-text citation [@key]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Cite</span>
                    </button>
                  )}

                  {/* Insert Figure Button */}
                  {(userAccess.isAuthor || userAccess.isSupervisor) && (
                    <button
                      onClick={() => setIsFigureModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
                      title="Insert Scientific Figure / Media (\begin{figure}...) [Ctrl+Shift+F]"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Figure</span>
                    </button>
                  )}

                  {/* Editor Guidelines & Cheatsheet */}
                  <button
                    onClick={() => setIsGuidelinesModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700 transition-colors"
                    title="Editor Guidelines & Cheatsheet [Ctrl+/]"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Guide</span>
                  </button>

                  {/* AI Writing Assist Tools */}
                  {(userAccess.isAuthor || userAccess.isSupervisor) && (
                    <div className="flex items-center gap-1 ml-1">
                      <div className="flex items-center rounded-lg bg-violet-950/40 border border-violet-800/50 p-0.5 shadow-sm">
                        <button
                          type="button"
                          disabled={isCallingAiAssist}
                          onClick={() => handleTriggerWritingAssist('paraphrase')}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-violet-300 hover:text-white hover:bg-violet-800/60 disabled:opacity-50 transition-colors"
                          title="Paraphrase active section or selected text with AI"
                        >
                          <Wand2 className="w-3 h-3 text-violet-400" />
                          <span>Paraphrase</span>
                        </button>
                        <button
                          type="button"
                          disabled={isCallingAiAssist}
                          onClick={() => handleTriggerWritingAssist('grammar')}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-violet-300 hover:text-white hover:bg-violet-800/60 disabled:opacity-50 transition-colors"
                          title="Fix grammar & academic tone with AI"
                        >
                          <span>Grammar</span>
                        </button>
                        <button
                          type="button"
                          disabled={isCallingAiAssist}
                          onClick={() => handleTriggerWritingAssist('outline')}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-violet-300 hover:text-white hover:bg-violet-800/60 disabled:opacity-50 transition-colors"
                          title="Suggest section outline & structure with AI"
                        >
                          <span>Outline</span>
                        </button>
                      </div>
                      {isCallingAiAssist && (
                        <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin ml-1" />
                      )}
                    </div>
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

              {/* Editor / Preview Area with Overleaf-style Draggable Split Resizer */}
              <div ref={splitAreaRef} className="flex-1 flex overflow-hidden relative">
                {/* Editor Textarea */}
                {(viewMode === 'edit' || viewMode === 'split') && (
                  <div
                    style={viewMode === 'split' ? { width: `${editorWidthPercent}%` } : undefined}
                    className={`flex flex-col p-6 overflow-hidden ${
                      viewMode === 'edit' ? 'flex-1' : 'min-w-[240px]'
                    }`}
                  >
                    {/* Unwanted Raw Base64 Detection & One-Click Cleanup Banner */}
                    {hasRawBase64Images && (
                      <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in duration-200">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-amber-200 flex items-center gap-1.5">
                              Large Raw Base64 Image String Detected
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300">
                                Clutters LaTeX Code
                              </span>
                            </p>
                            <p className="text-slate-300 text-[11px] truncate">
                              Convert raw base64 data to clean standard LaTeX paths (<code className="font-mono text-amber-300">\includegraphics&#123;figures/...&#125;</code>) to eliminate editor lag and restore clean formatting.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={cleanUpRawBase64Images}
                          className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                          title="Extract base64 to manuscript asset store and replace with clean figures/... path"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Clean Up Figure Path</span>
                        </button>
                      </div>
                    )}

                    <textarea
                      id="manuscript-editor-textarea"
                      value={activeContent}
                      onChange={(e) => handleEditorChange(e.target.value)}
                      onMouseUp={handleEditorMouseUp}
                      placeholder="Draft your scholarly section text in Markdown & LaTeX. Use [@CitationKey] to anchor citations, \begin{figure} for images, and $$ for display math equations..."
                      disabled={!userAccess.isAuthor && !userAccess.isSupervisor}
                      className="w-full flex-1 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none resize-none font-serif text-[15px] sm:text-base leading-[1.8] selection:bg-amber-500/25 selection:text-amber-100"
                      spellCheck
                    />

                    {/* Editor Bottom Keyboard Hint Bar */}
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-800/60 select-none">
                      <div className="flex items-center gap-3">
                        <span>Figure: <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">Ctrl+Shift+F</kbd></span>
                        <span>Guide: <kbd className="px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">Ctrl+/</kbd></span>
                      </div>
                      <span>{(activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0).toLocaleString()} section words</span>
                    </div>

                    {/* Floating / Contextual selection toolbar for AI and Review comments */}
                    {selectedSnippet && (
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-xl flex flex-wrap items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-[11px] font-semibold text-slate-400 shrink-0">Selected:</span>
                          <span className="text-xs text-slate-200 italic font-mono truncate bg-slate-950/70 px-2 py-0.5 rounded border border-slate-800">
                            "{selectedSnippet}"
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(userAccess.isAuthor || userAccess.isSupervisor) && (
                            <>
                              <button
                                type="button"
                                disabled={isCallingAiAssist}
                                onClick={() => handleTriggerWritingAssist('paraphrase')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 text-xs font-medium transition-all cursor-pointer"
                                title="Paraphrase selected text with AI"
                              >
                                <Wand2 className="w-3 h-3 text-violet-400" />
                                <span>Paraphrase</span>
                              </button>
                              <button
                                type="button"
                                disabled={isCallingAiAssist}
                                onClick={() => handleTriggerWritingAssist('grammar')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-violet-200 border border-violet-500/40 text-xs font-medium transition-all cursor-pointer"
                                title="Fix grammar on selected text with AI"
                              >
                                <span>Fix Grammar</span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => setRightTab('reviews')}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-medium transition-colors cursor-pointer"
                          >
                            Anchor Review
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedSnippet(null)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Clear selection"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Overleaf-style Draggable Resizer Handle between Editor & Preview */}
                {viewMode === 'split' && (
                  <div
                    onMouseDown={startDraggingEditorSplit}
                    onDoubleClick={() => setEditorWidthPercent(50)}
                    className={`w-2 hover:w-2.5 bg-slate-800/90 hover:bg-amber-500/70 active:bg-amber-500 cursor-col-resize transition-all shrink-0 flex items-center justify-center group z-20 select-none ${
                      isDraggingEditorSplit ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : ''
                    }`}
                    title="Drag to resize Editor and Preview (Double click to reset to 50%)"
                  >
                    <div className={`w-0.5 h-8 rounded-full transition-colors ${
                      isDraggingEditorSplit ? 'bg-black' : 'bg-slate-600 group-hover:bg-black'
                    }`} />
                  </div>
                )}

                {/* Scholarly LaTeX Paper Preview */}
                {(viewMode === 'preview' || viewMode === 'split') && (
                  <div
                    style={viewMode === 'split' ? { width: `${100 - editorWidthPercent}%` } : undefined}
                    className={`flex flex-col min-w-0 overflow-hidden ${
                      viewMode === 'preview' ? 'flex-1' : 'min-w-[280px]'
                    }`}
                  >
                    <LatexPaperPreview
                      manuscript={manuscript}
                      sections={sections}
                      activeSectionId={activeSectionId}
                      activeSectionContent={activeContent}
                      citations={citations}
                      figureAssets={figureAssets}
                      onCitationClick={(citKey) => setWhyCiteKey(citKey)}
                    />
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

        {/* Draggable Resizer Handle between Center Workspace & Right Context Drawer */}
        <div
          onMouseDown={startDraggingRightDrawer}
          onDoubleClick={() => setRightDrawerWidth(340)}
          className={`w-2 hover:w-2.5 bg-slate-800/90 hover:bg-amber-500/70 active:bg-amber-500 cursor-col-resize transition-all shrink-0 flex items-center justify-center group z-20 select-none ${
            isDraggingRightDrawer ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : ''
          }`}
          title="Drag to resize Context Drawer (Double click to reset to 340px)"
        >
          <div className={`w-0.5 h-8 rounded-full transition-colors ${
            isDraggingRightDrawer ? 'bg-black' : 'bg-slate-600 group-hover:bg-black'
          }`} />
        </div>

        {/* ── COLUMN 3: Right Context & Governance Drawer (Resizable) ── */}
        <aside
          style={{ width: `${rightDrawerWidth}px` }}
          className="border-l border-slate-800 bg-[#090D16] flex flex-col shrink-0 select-none overflow-hidden"
        >
          {/* Tabs - responsive at compact drawer widths */}
          <div className="flex border-b border-slate-800 bg-[#080B12] text-xs">
            <button
              onClick={() => setRightTab('citations')}
              className={`flex-1 py-2.5 px-1 min-w-0 font-semibold flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer ${
                rightTab === 'citations'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title={`Linked Citations (${citations.length})`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                {rightDrawerWidth < 300 ? `Cites (${citations.length})` : `Citations (${citations.length})`}
              </span>
            </button>

            <button
              onClick={() => setRightTab('reviews')}
              className={`flex-1 py-2.5 px-1 min-w-0 font-semibold flex items-center justify-center gap-1 border-b-2 transition-all relative cursor-pointer ${
                rightTab === 'reviews'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="Peer Reviews & Feedback"
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">Reviews</span>
              {unresolvedMajorCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5 shrink-0" />
              )}
            </button>

            <button
              onClick={() => setRightTab('checklist')}
              className={`flex-1 py-2.5 px-1 min-w-0 font-semibold flex items-center justify-center gap-1 border-b-2 transition-all cursor-pointer ${
                rightTab === 'checklist'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
              title="Governance & Submission Checklist"
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">Governance</span>
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-hidden">
            {/* TAB 1: Citations & Why Did I Cite This */}
            {rightTab === 'citations' && (
              <div className={`flex flex-col h-full overflow-hidden ${
                rightDrawerWidth < 320 ? 'p-2.5 space-y-2.5' : 'p-3.5 space-y-3'
              }`}>
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Linked Literature ({citations.length})
                  </span>
                  {(userAccess.isAuthor || userAccess.isSupervisor) && (
                    <button
                      onClick={() => setIsCitationModalOpen(true)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors shrink-0 cursor-pointer"
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
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2 hover:border-slate-700/80 transition-colors"
                      >
                        {/* Header: Key & Why Cited Button (Wraps cleanly on compact sizes without pushing off-screen) */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                          <div className="flex items-center gap-1 min-w-0 max-w-full">
                            <span
                              className="text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 truncate max-w-[170px]"
                              title={`In-text citation marker: [@${cit.citationKey}]`}
                            >
                              @{cit.citationKey}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`[@${cit.citationKey}]`);
                                setCopiedCitationKey(cit.citationKey);
                                setTimeout(() => setCopiedCitationKey(null), 2000);
                              }}
                              className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-amber-400 transition-colors shrink-0 cursor-pointer"
                              title="Copy in-text marker [@key]"
                            >
                              {copiedCitationKey === cit.citationKey ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <button
                            onClick={() => setWhyCiteKey(cit.citationKey)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300 hover:text-white px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 transition-all shrink-0 ml-auto cursor-pointer"
                            title="Open 'Why Did I Cite This?' contextual intelligence"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Why Cited?</span>
                          </button>
                        </div>

                        {/* In-text label if custom */}
                        {cit.inTextLabel && cit.inTextLabel !== `[@${cit.citationKey}]` && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <span className="text-slate-500">Label:</span>
                            <span className="text-slate-300 truncate">{cit.inTextLabel}</span>
                          </div>
                        )}

                        {/* Paper Title with Word Breaking */}
                        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug break-words">
                          {cit.paper?.title || 'Unknown Title'}
                        </h4>

                        {/* Authors & Year */}
                        <div className="text-[11px] text-slate-400 break-words flex items-center justify-between">
                          <span className="truncate mr-1">
                            {cit.paper?.authors?.[0] ? `${cit.paper.authors[0]} et al.` : 'Authors'} · {cit.paper?.year || 'n.d.'}
                          </span>
                          {cit.paper?.venue && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[110px]" title={cit.paper.venue}>
                              {cit.paper.venue}
                            </span>
                          )}
                        </div>

                        {/* Context Note */}
                        {cit.contextNote && (
                          <p className="text-[11px] text-slate-400 italic border-l-2 border-amber-500/50 pl-2 leading-relaxed break-words bg-slate-950/40 py-1 pr-1.5 rounded-r">
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

      {/* Insert Scientific Figure / Media Modal */}
      <InsertFigureModal
        isOpen={isFigureModalOpen}
        onClose={() => setIsFigureModalOpen(false)}
        onInsertFigure={(snippet, asset) => {
          if (asset) {
            registerFigureAsset(asset.path, asset.dataUrl);
          }
          insertSnippetAtCursor(snippet);
        }}
      />

      {/* Manuscript Guidelines & Cheatsheet Modal */}
      <ManuscriptGuidelinesModal
        isOpen={isGuidelinesModalOpen}
        onClose={() => setIsGuidelinesModalOpen(false)}
        onInsertSnippet={(snippet) => insertSnippetAtCursor(snippet)}
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

      {/* Confirm Delete Section Dialog */}
      <ConfirmDeleteDialog
        isOpen={!!sectionToDelete}
        title="Delete Manuscript Section"
        message={`Are you sure you want to permanently delete "${sectionToDelete?.title}"? Any uncommitted draft text in this section will be lost.`}
        confirmText="Delete Section"
        isDeleting={isDeletingSection}
        onConfirm={handleConfirmDeleteSection}
        onClose={() => setSectionToDelete(null)}
      />

      {/* Error / Warning Notice Modal */}
      <NoticeModal
        isOpen={!!errorNotice}
        type="error"
        title="Manuscript Action Error"
        message={errorNotice || 'An unexpected error occurred.'}
        primaryActionText="Acknowledge"
        onClose={() => setErrorNotice(null)}
      />

      {/* AI Writing Assist Diff & Preview Modal */}
      {aiAssistModalData && (
        <AiWritingAssistModal
          isOpen={aiAssistModalData.isOpen}
          onClose={() => setAiAssistModalData(null)}
          action={aiAssistModalData.action}
          originalText={aiAssistModalData.originalText}
          suggestedText={aiAssistModalData.suggestedText}
          suggestionId={aiAssistModalData.suggestionId}
          onApply={handleApplyAiSuggestion}
        />
      )}
    </div>
  );
};
