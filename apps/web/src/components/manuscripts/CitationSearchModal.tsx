import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  ExternalLink,
  Plus,
  Loader2,
  X,
  FileText,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import { Paper, InsertCitationDto } from '@researchos/shared-types';

interface CitationSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  sectionId?: string | null;
  onInsertCitation: (dto: InsertCitationDto) => Promise<void>;
}

export const CitationSearchModal: React.FC<CitationSearchModalProps> = ({
  isOpen,
  onClose,
  projectId,
  sectionId,
  onInsertCitation,
}) => {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [citationKey, setCitationKey] = useState('');
  const [inTextLabel, setInTextLabel] = useState('');
  const [contextNote, setContextNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search literature papers from project
  useEffect(() => {
    if (!isOpen || !projectId) return;

    let isMounted = true;
    const searchTimer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await api.searchLiteratureForCitation(projectId, query);
        if (isMounted) {
          setPapers(results);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to search project literature');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(searchTimer);
    };
  }, [isOpen, projectId, query]);

  // When a paper is selected, automatically generate a clean scholarly citation key
  const handleSelectPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    const firstAuthor = paper.authors?.[0]?.split(' ').pop()?.replace(/[^a-zA-Z]/g, '') || 'Author';
    const year = paper.year || new Date().getFullYear();
    const cleanTitle = paper.title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(' ')
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');

    const generatedKey = `${firstAuthor}${year}${cleanTitle}`;
    setCitationKey(generatedKey);
    setInTextLabel(`[@${generatedKey}]`);
    setContextNote('');
  };

  const handleInsert = async () => {
    if (!selectedPaper || !citationKey.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await onInsertCitation({
        paperId: selectedPaper.id,
        citationKey: citationKey.trim(),
        sectionId: sectionId || undefined,
        inTextLabel: inTextLabel.trim() || `[@${citationKey.trim()}]`,
        contextNote: contextNote.trim() || undefined,
      });
      onClose();
      // Reset state
      setSelectedPaper(null);
      setCitationKey('');
      setInTextLabel('');
      setContextNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to insert citation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[#0C101A] border border-slate-800 shadow-2xl shadow-black/80 overflow-hidden text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-search-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 id="citation-search-title" className="text-base font-bold text-white tracking-tight">
                Insert Literature Citation
              </h2>
              <p className="text-xs text-slate-400">
                Select verified literature from this research project to insert citations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close citation search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content: Search + Split view */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Search & Paper List */}
          <div className="w-full md:w-1/2 border-r border-slate-800 flex flex-col p-4 space-y-3 overflow-hidden">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, author, DOI, or keyword..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-colors"
                autoFocus
              />
            </div>

            {/* Papers List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {loading && papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mb-2 text-amber-500/60" />
                  <span className="text-xs">Searching project literature index...</span>
                </div>
              ) : papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4 text-slate-500">
                  <FileText className="w-8 h-8 mb-2 opacity-40 text-amber-400" />
                  <p className="text-xs font-medium text-slate-300">
                    {query ? `No papers match "${query}"` : 'No literature in this project yet'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                    {query
                      ? 'Try different keywords or check spelling.'
                      : 'Upload or link papers to this project in Literature Review (M03) to cite them.'}
                  </p>
                </div>
              ) : (
                papers.map((paper) => {
                  const isSelected = selectedPaper?.id === paper.id;
                  return (
                    <button
                      key={paper.id}
                      onClick={() => handleSelectPaper(paper)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                          : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-200 line-clamp-2 leading-snug">
                          {paper.title}
                        </h4>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                        <span className="truncate max-w-[140px]">
                          {paper.authors?.[0] ? `${paper.authors[0]} et al.` : 'Unknown Authors'}
                        </span>
                        {paper.year && (
                          <span className="flex items-center gap-0.5 text-slate-500 shrink-0">
                            <Calendar className="w-3 h-3" />
                            {paper.year}
                          </span>
                        )}
                        {paper.venue && (
                          <span className="truncate max-w-[120px] text-slate-500 italic">
                            {paper.venue}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Citation Configuration */}
          <div className="w-full md:w-1/2 p-5 flex flex-col justify-between overflow-y-auto bg-slate-950/40">
            {selectedPaper ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    Selected Publication
                  </span>
                  <h3 className="text-xs font-semibold text-white leading-relaxed">
                    {selectedPaper.title}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedPaper.authors?.join(', ')}
                  </p>
                  {selectedPaper.doi && (
                    <a
                      href={`https://doi.org/${selectedPaper.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono"
                    >
                      <span>doi:{selectedPaper.doi}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Citation Key Config */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      BibTeX / In-Text Citation Key <span className="text-amber-400">*</span>
                    </label>
                    <div className="relative">
                      <Tag className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={citationKey}
                        onChange={(e) => {
                          setCitationKey(e.target.value);
                          setInTextLabel(`[@${e.target.value}]`);
                        }}
                        placeholder="e.g. Vaswani2017Attention"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Unique alphanumeric key for markdown & LaTeX references
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      In-Text Marker Label
                    </label>
                    <input
                      type="text"
                      value={inTextLabel}
                      onChange={(e) => setInTextLabel(e.target.value)}
                      placeholder="[@CitationKey]"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Citation Context & Rationale ("Why Did I Cite This?")
                    </label>
                    <textarea
                      value={contextNote}
                      onChange={(e) => setContextNote(e.target.value)}
                      rows={3}
                      placeholder="e.g., Used as baseline model for ablation experiments; motivates high learning rate choice..."
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Surfaced during peer review and drafting to explain why this work was cited
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <BookOpen className="w-10 h-10 mb-3 text-slate-700" />
                <p className="text-xs font-medium text-slate-300">Select a paper to configure citation</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                  Choose from your project's literature repository on the left to generate citation keys and contextual notes
                </p>
              </div>
            )}

            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!selectedPaper || !citationKey.trim() || submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:pointer-events-none text-xs font-semibold text-white shadow-lg shadow-amber-600/20 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Inserting...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Insert into Section</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
