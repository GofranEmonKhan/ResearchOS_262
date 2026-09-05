import React, { useState, useEffect } from 'react';
import {
  Paper,
  PaperSidebarFields,
  CitationPurpose,
  CitationPurposeType,
  CITATION_PURPOSE_TYPES,
  PaperComment,
} from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import {
  Sparkles,
  Lock,
  MessageSquare,
  Check,
  Send,
  Loader2,
  Trash2,
  Plus,
  X,
  Eye,
} from 'lucide-react';

interface SmartResearchSidebarProps {
  paper: Paper;
  currentUserId?: string;
  onClose?: () => void;
}

type SidebarTab = 'analysis' | 'notes' | 'citations' | 'discussion';

export const SmartResearchSidebar: React.FC<SmartResearchSidebarProps> = ({
  paper,
  currentUserId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('analysis');

  // Sidebar Fields State
  const [sidebarData, setSidebarData] = useState<PaperSidebarFields | null>(null);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(true);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  // Editable analysis fields
  const [researchGap, setResearchGap] = useState('');
  const [methodology, setMethodology] = useState('');
  const [results, setResults] = useState('');
  const [limitation, setLimitation] = useState('');
  const [futureWork, setFutureWork] = useState('');
  const [datasetUsed, setDatasetUsed] = useState('');

  // Personal Notes State
  const [personalNotes, setPersonalNotes] = useState('');
  const [personalNotesVisible, setPersonalNotesVisible] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Citations State
  const [citations, setCitations] = useState<CitationPurpose[]>([]);
  const [isAddingCitation, setIsAddingCitation] = useState(false);
  const [newCitationPurpose, setNewCitationPurpose] = useState<CitationPurposeType>('Motivation');
  const [newCitationNote, setNewCitationNote] = useState('');
  const [isSubmittingCitation, setIsSubmittingCitation] = useState(false);

  // Comments State
  const [comments, setComments] = useState<PaperComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  const isUploader = paper.uploaderId === currentUserId;

  // Load sidebar data
  const loadSidebar = async () => {
    setIsLoadingSidebar(true);
    try {
      const data = await api.getSidebar(paper.id);
      setSidebarData(data);
      setResearchGap(data.researchGap || '');
      setMethodology(data.methodology || '');
      setResults(data.results || '');
      setLimitation(data.limitation || '');
      setFutureWork(data.futureWork || '');
      setDatasetUsed(data.datasetUsed || '');
      setPersonalNotes(data.personalNotes || '');
      setPersonalNotesVisible(data.personalNotesVisible);
    } catch (err: any) {
      console.error('Failed to load sidebar fields:', err);
    } finally {
      setIsLoadingSidebar(false);
    }
  };

  // Load citations
  const loadCitations = async () => {
    try {
      const list = await api.getCitations(paper.id);
      setCitations(list);
    } catch (err: any) {
      console.error('Failed to load citations:', err);
    }
  };

  // Load comments (if shared)
  const loadComments = async () => {
    if (!paper.projectId) return;
    try {
      const list = await api.getComments(paper.id);
      setComments(list);
    } catch (err: any) {
      console.error('Failed to load comments:', err);
    }
  };

  useEffect(() => {
    loadSidebar();
    loadCitations();
    loadComments();
  }, [paper.id]);

  // Save Structured Analysis
  const handleSaveAnalysis = async () => {
    setIsSavingAnalysis(true);
    try {
      const updated = await api.updateSidebar(paper.id, {
        researchGap: researchGap.trim() || null,
        methodology: methodology.trim() || null,
        results: results.trim() || null,
        limitation: limitation.trim() || null,
        futureWork: futureWork.trim() || null,
        datasetUsed: datasetUsed.trim() || null,
      });
      setSidebarData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to save analysis');
    } finally {
      setIsSavingAnalysis(false);
    }
  };

  // Save Personal Notes (Uploader Only)
  const handleSaveNotes = async () => {
    if (!isUploader) return;
    setIsSavingNotes(true);
    try {
      const updated = await api.updateSidebar(paper.id, {
        personalNotes: personalNotes.trim() || null,
        personalNotesVisible,
      });
      setSidebarData(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to save personal notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle Personal Notes Visibility (Uploader Only)
  const handleToggleVisibility = async (newVal: boolean) => {
    if (!isUploader) return;
    setPersonalNotesVisible(newVal);
    try {
      await api.updateSidebar(paper.id, {
        personalNotesVisible: newVal,
      });
    } catch (err: any) {
      setPersonalNotesVisible(!newVal);
      alert(err.message || 'Failed to toggle visibility');
    }
  };

  // Add Citation Purpose
  const handleAddCitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCitation(true);
    try {
      await api.addCitation(paper.id, {
        paperId: paper.id,
        purpose: newCitationPurpose,
        note: newCitationNote.trim() || undefined,
      });
      setNewCitationNote('');
      setIsAddingCitation(false);
      loadCitations();
    } catch (err: any) {
      alert(err.message || 'Failed to add citation purpose');
    } finally {
      setIsSubmittingCitation(false);
    }
  };

  const handleDeleteCitation = async (citationId: string) => {
    try {
      await api.deleteCitation(citationId);
      loadCitations();
    } catch (err: any) {
      alert(err.message || 'Failed to delete citation');
    }
  };

  // Add Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setIsPostingComment(true);
    try {
      await api.addComment(paper.id, { body: newCommentText.trim() });
      setNewCommentText('');
      loadComments();
    } catch (err: any) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <aside className="w-96 shrink-0 h-full flex flex-col bg-surface-1 border-l border-white/[0.08] select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Smart Research Sidebar
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center p-1.5 bg-surface-2/60 border-b border-white/[0.06] gap-1 text-[11px] font-medium">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'analysis'
              ? 'bg-violet-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Analysis
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
            activeTab === 'notes'
              ? 'bg-violet-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {isUploader && personalNotesVisible ? (
            <Eye className="w-3 h-3 text-emerald-400" />
          ) : (
            <Lock className="w-3 h-3 text-amber-400" />
          )}
          <span>Notes</span>
        </button>
        <button
          onClick={() => setActiveTab('citations')}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeTab === 'citations'
              ? 'bg-violet-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Citations
        </button>
        {paper.projectId && (
          <button
            onClick={() => setActiveTab('discussion')}
            className={`flex-1 py-1.5 rounded-lg transition-all ${
              activeTab === 'discussion'
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Discussion
          </button>
        )}
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoadingSidebar ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            <span className="text-xs">Loading structured analysis...</span>
          </div>
        ) : (
          <>
            {/* TAB 1: STRUCTURED ANALYSIS */}
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Structured Synthesis
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAnalysis}
                    disabled={isSavingAnalysis}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50"
                  >
                    {isSavingAnalysis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Save Analysis</span>
                  </button>
                </div>

                {/* Field 1: Research Gap */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    Research Gap Addressed
                  </label>
                  <textarea
                    rows={3}
                    value={researchGap}
                    onChange={(e) => setResearchGap(e.target.value)}
                    placeholder="What unresolved scholarly question does this paper tackle?"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Field 2: Methodology */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Methodology & Approach</label>
                  <textarea
                    rows={3}
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    placeholder="Architectures, mathematical formulations, or experiments..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Field 3: Results */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-emerald-300">Key Results & Findings</label>
                  <textarea
                    rows={3}
                    value={results}
                    onChange={(e) => setResults(e.target.value)}
                    placeholder="Quantitative benchmarks, state-of-the-art metrics, speedups..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Field 4: Limitations */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-amber-300">Known Limitations</label>
                  <textarea
                    rows={2}
                    value={limitation}
                    onChange={(e) => setLimitation(e.target.value)}
                    placeholder="Assumptions, compute requirements, dataset constraints..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Field 5: Future Work */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-blue-300">Future Directions</label>
                  <textarea
                    rows={2}
                    value={futureWork}
                    onChange={(e) => setFutureWork(e.target.value)}
                    placeholder="Potential extensions, theoretical generalizations..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Field 6: Dataset Used */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Datasets & Benchmarks</label>
                  <textarea
                    rows={2}
                    value={datasetUsed}
                    onChange={(e) => setDatasetUsed(e.target.value)}
                    placeholder="e.g. WMT 2014 English-to-German, GLUE, SQuAD..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: PERSONAL NOTES (OPTION A PRIVACY MASKING) */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {isUploader ? (
                  <>
                    {/* Privacy Visibility Controls */}
                    <div className="p-3 rounded-xl bg-surface-2 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {personalNotesVisible ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          Visibility to Collaborators
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(!personalNotesVisible)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                            personalNotesVisible
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {personalNotesVisible ? 'Shared with Project' : 'Private to Me'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {personalNotesVisible
                          ? 'All project members can read your personal notes.'
                          : 'Option A Dynamic Privacy: Masked to NULL for all other collaborators.'}
                      </p>
                    </div>

                    {/* Editor */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-200">
                        Personal Study Notes
                      </label>
                      <textarea
                        rows={10}
                        value={personalNotes}
                        onChange={(e) => setPersonalNotes(e.target.value)}
                        placeholder="Private reflections, questions for supervisor, thesis citations..."
                        className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50"
                      >
                        {isSavingNotes ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Save Notes</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Non-Uploader Viewer View */
                  <>
                    {sidebarData?.personalNotes !== null && sidebarData?.personalNotes !== undefined ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Uploader Notes (Shared)</span>
                        </div>
                        <div className="p-4 rounded-xl bg-surface-2 border border-white/10 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {sidebarData.personalNotes}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-surface-2/40 border border-white/[0.06] space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
                          <Lock className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-slate-200">Notes Private</h4>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                            The uploader has restricted personal reflections. Only structured analysis
                            is collaborative.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB 3: CITATION PURPOSES */}
            {activeTab === 'citations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Citation Roles ({citations.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCitation(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-2 hover:bg-surface-3 border border-white/10 text-slate-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Role</span>
                  </button>
                </div>

                {isAddingCitation && (
                  <form
                    onSubmit={handleAddCitation}
                    className="p-3 rounded-xl bg-surface-2 border border-violet-500/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Add Citation Role</span>
                      <button
                        type="button"
                        onClick={() => setIsAddingCitation(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Purpose Type</label>
                      <select
                        value={newCitationPurpose}
                        onChange={(e) => setNewCitationPurpose(e.target.value as CitationPurposeType)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      >
                        {(Object.keys(CITATION_PURPOSE_TYPES) as CitationPurposeType[]).map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400">Context / Note</label>
                      <input
                        type="text"
                        value={newCitationNote}
                        onChange={(e) => setNewCitationNote(e.target.value)}
                        placeholder="e.g. Baseline model in Table 2"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface-1 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsAddingCitation(false)}
                        className="px-2.5 py-1 rounded-lg text-xs text-slate-400"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingCitation}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {citations.length === 0 && !isAddingCitation ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No citation purposes categorized yet.
                    </div>
                  ) : (
                    citations.map((cp) => (
                      <div
                        key={cp.id}
                        className="p-3 rounded-xl bg-surface-2/70 border border-white/[0.06] space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/20 text-violet-300 font-semibold">
                            {cp.purpose}
                          </span>
                          <button
                            onClick={() => handleDeleteCitation(cp.id)}
                            className="text-slate-500 opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {cp.note && <p className="text-xs text-slate-300 leading-snug">{cp.note}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DISCUSSION THREAD */}
            {activeTab === 'discussion' && (
              <div className="flex flex-col h-full space-y-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Project Discussion ({comments.length})
                </span>

                {/* Comments List */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 max-h-96">
                  {comments.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500 space-y-1">
                      <MessageSquare className="w-6 h-6 text-slate-600 mx-auto mb-2" />
                      <p>No discussion comments yet.</p>
                      <p className="text-[11px] text-slate-600">
                        Start a discussion with project co-authors.
                      </p>
                    </div>
                  ) : (
                    comments.map((comm) => (
                      <div
                        key={comm.id}
                        className="p-3 rounded-xl bg-surface-2/70 border border-white/[0.06] space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-200">
                            {comm.author?.fullName || 'Collaborator'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(comm.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{comm.body}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handlePostComment} className="pt-2 border-t border-white/[0.08] flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 px-3 py-2 rounded-xl bg-surface-2 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="submit"
                    disabled={isPostingComment || !newCommentText.trim()}
                    className="px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 flex items-center justify-center transition-colors"
                  >
                    {isPostingComment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
