import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Search,
  ExternalLink,
  FolderPlus,
  Check,
  Loader2,
  Calendar,
  Flame,
  FileText,
  Lightbulb,
  Layers,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Compass,
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import type {
  DiscoveredPaper,
  LiteratureDiscoveryResponse,
  Project,
} from '@researchos/shared-types';
import { AiUsageIndicator } from '../AiUsageIndicator.js';
import { HoverSelect } from '../../common/HoverSelect.js';

interface LiteratureDiscoveryViewProps {
  projects: Project[];
  onOpenPaper?: (paperId: string) => void;
  className?: string;
}

const POPULAR_RESEARCH_TOPICS = [
  'Green computing & carbon efficiency in LLM training',
  'Spiking neural networks for low-power edge robotics',
  'CRISPR-Cas9 off-target mitigation with machine learning',
  'Post-quantum lattice cryptography for healthcare data',
  'Multi-modal diffusion models in medical pathology imaging',
];

export const LiteratureDiscoveryView: React.FC<LiteratureDiscoveryViewProps> = ({
  projects,
  onOpenPaper,
  className = '',
}) => {
  const [topic, setTopic] = useState('');
  const [limit, setLimit] = useState(10);
  const [yearFrom, setYearFrom] = useState<number | undefined>(undefined);
  const [yearTo, setYearTo] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [response, setResponse] = useState<LiteratureDiscoveryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importingPaperId, setImportingPaperId] = useState<string | null>(null);
  const [importedMap, setImportedMap] = useState<Record<string, { paperId: string; projectName: string }>>({});
  const [activeProjectDropdown, setActiveProjectDropdown] = useState<string | null>(null);
  const [expandedAbstracts, setExpandedAbstracts] = useState<Record<string, boolean>>({});
  const [highlightedPaperIndex, setHighlightedPaperIndex] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const paperRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const handleSearch = async (e?: React.FormEvent, customTopic?: string) => {
    if (e) e.preventDefault();
    const queryTopic = (customTopic ?? topic).trim();
    if (!queryTopic) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setHighlightedPaperIndex(null);

    // Step indicators for delightful research UX
    setLoadingStep('Decomposing scholarly query & keywords...');
    const t1 = setTimeout(() => setLoadingStep('Scanning 250M+ peer-reviewed works via OpenAlex...'), 1200);
    const t2 = setTimeout(() => setLoadingStep('Reconstructing abstracts & evaluating citation impact...'), 2800);
    const t3 = setTimeout(() => setLoadingStep('Synthesizing academic consensus & research gaps with Gemini...'), 4500);

    try {
      const yearRange = yearFrom || yearTo ? { from: yearFrom, to: yearTo } : undefined;
      const res = await api.discoverLiterature(queryTopic, limit, yearRange);
      setResponse(res);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Literature discovery failed. Please try a different topic.');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleImportToProject = async (paper: DiscoveredPaper, targetProject: Project) => {
    setImportingPaperId(paper.id);
    setActiveProjectDropdown(null);
    setError(null);

    try {
      const res = await api.importDiscoveredPaper({
        projectId: targetProject.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        doi: paper.doi,
        abstract: paper.abstract,
        pdfUrl: paper.pdfUrl,
      });

      setImportedMap((prev) => ({
        ...prev,
        [paper.id]: {
          paperId: res.paperId,
          projectName: targetProject.title,
        },
      }));
    } catch (err: any) {
      setError(`Failed to import "${paper.title}": ${err.message}`);
    } finally {
      setImportingPaperId(null);
    }
  };

  const scrollToPaper = (index: number) => {
    setHighlightedPaperIndex(index);
    const el = paperRefs.current[index];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const toggleAbstract = (paperId: string) => {
    setExpandedAbstracts((prev) => ({
      ...prev,
      [paperId]: !prev[paperId],
    }));
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Search Hero Card ────────────────────────────────────────────── */}
      <div className="p-6 rounded-2xl bg-surface-1/95 border border-white/10 shadow-2xl space-y-5 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2.5">
                  <span>AI Literature Discovery & Review</span>
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                    250M+ Works
                  </span>
                </h2>
                <p className="text-sm text-slate-300 mt-0.5">
                  Search globally across peer-reviewed publications. AI synthesizes state-of-the-art consensus and unaddressed research gaps.
                </p>
              </div>
            </div>
          </div>

          <AiUsageIndicator variant="badge" refreshTrigger={refreshTrigger} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSearch} className="space-y-3.5">
          <div className="relative flex items-center rounded-xl bg-black/40 border border-white/15 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/30 transition-all">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Energy-efficient LLM training and inference methods on edge hardware..."
              className="w-full pl-10 pr-28 py-3.5 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
            />
            {topic && (
              <button
                type="button"
                onClick={() => setTopic('')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white mr-2 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="absolute right-2 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all shadow-md shadow-violet-600/30 flex items-center gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Discover</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1.5 border-t border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold uppercase tracking-wider">Year Range:</span>
                <input
                  type="number"
                  placeholder="From (e.g. 2020)"
                  value={yearFrom ?? ''}
                  onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-28 px-2.5 py-1 rounded-lg bg-surface-2 border border-white/15 text-xs font-medium text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500 font-mono"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="To (e.g. 2026)"
                  value={yearTo ?? ''}
                  onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-28 px-2.5 py-1 rounded-lg bg-surface-2 border border-white/15 text-xs font-medium text-slate-200 placeholder-slate-400 focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Literature limit:</span>
              <HoverSelect
                value={limit}
                onChange={(val) => setLimit(Number(val))}
                options={[
                  { value: 5, label: 'Top 5 papers' },
                  { value: 10, label: 'Top 10 papers' },
                  { value: 15, label: 'Top 15 papers' },
                ]}
                buttonClassName="px-3 py-1 text-xs font-medium"
              />
            </div>
          </div>
        </form>

        {/* Suggested Topic Chips */}
        {!response && !isLoading && (
          <div className="pt-2.5 border-t border-white/[0.08] space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
              Suggested Scholarly Inquiries
            </span>
            <div className="flex flex-wrap gap-2">
              {POPULAR_RESEARCH_TOPICS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTopic(sample);
                    handleSearch(undefined, sample);
                  }}
                  className="text-left text-xs font-medium text-slate-200 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/40 transition-all"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Error Banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* ── Loading Animation with Stage Progress ───────────────────────── */}
      {isLoading && (
        <div className="p-12 rounded-2xl bg-surface-1/60 border border-white/[0.06] text-center space-y-4">
          <div className="relative w-12 h-12 mx-auto">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20 animate-ping" />
            <div className="w-12 h-12 rounded-full border-2 border-violet-500 border-t-transparent animate-spin flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">Synthesizing Literature Landscape</h3>
            <p className="text-xs text-violet-300 font-mono animate-pulse">{loadingStep}</p>
          </div>
        </div>
      )}

      {/* ── Results Container ───────────────────────────────────────────── */}
      {response && !isLoading && (
        <div className="space-y-6">
          {/* Perplexity-Style Search Strategy & Query Decomposition Card */}
          {response.queryPlan && (
            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/25 shadow-md backdrop-blur-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-300">
                  <Compass className="w-4 h-4 text-violet-400" />
                  <span>Scholarly Search Strategy</span>
                  <span className="text-white/40">•</span>
                  <span className="text-slate-300">{response.queryPlan.academicDomain}</span>
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {response.papers.length} peer-reviewed works retrieved
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-0.5 text-xs">
                <span className="text-slate-400 shrink-0 font-medium">Understood Topic:</span>
                <span className="text-white font-semibold px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                  {response.queryPlan.normalizedTopic}
                </span>
              </div>

              {response.queryPlan.searchQueries.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                  <span className="text-slate-400 shrink-0 font-medium">Targeted Academic Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {response.queryPlan.searchQueries.map((q, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-200 font-mono text-[11px]"
                      >
                        <Search className="w-2.5 h-2.5 text-violet-400" />
                        "{q}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Perplexity-Style Synthesis Card */}
          <div className="p-6 rounded-2xl bg-surface-1/95 border border-white/10 shadow-xl space-y-5 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-violet-400" />
                <h3 className="text-base font-bold text-white tracking-wide">
                  Literature Review Synthesis
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-300">
                Grounding {response.papers.length} scholarly works
              </span>
            </div>

            {/* Executive Summary with inline citations */}
            <div className="space-y-3">
              <div className="text-sm text-slate-100 leading-relaxed font-sans space-y-2.5">
                {response.synthesis.summary.split('\n\n').map((paragraph, pIdx) => {
                  // Replace [1], [2], [3] with clickable styled badges
                  const parts = paragraph.split(/(\[\d+\])/g);
                  return (
                    <p key={pIdx}>
                      {parts.map((part, i) => {
                        const match = part.match(/\[(\d+)\]/);
                        if (match) {
                          const paperNum = Number(match[1]);
                          return (
                            <button
                              key={i}
                              onClick={() => scrollToPaper(paperNum)}
                              className="inline-flex items-center justify-center px-2 py-0.5 mx-1 text-xs font-mono font-bold text-violet-200 hover:text-white bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 rounded-md transition-all cursor-pointer shadow-sm"
                              title={`Jump to paper #${paperNum}`}
                            >
                              [{paperNum}]
                            </button>
                          );
                        }
                        return part;
                      })}
                    </p>
                  );
                })}
              </div>
            </div>

            {/* Academic Consensus Box */}
            {response.synthesis.consensus && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-sm text-emerald-100 flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 block mb-0.5">Academic Consensus:</span>
                  <span className="leading-relaxed">{response.synthesis.consensus}</span>
                </div>
              </div>
            )}

            {/* Thematic Approaches & Research Gaps Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Key Themes */}
              {response.synthesis.keyThemes.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-2/80 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-violet-400" />
                    Key Methodological Themes
                  </h4>
                  <div className="space-y-2.5">
                    {response.synthesis.keyThemes.map((theme, tIdx) => (
                      <div key={tIdx} className="text-xs space-y-1">
                        <span className="font-semibold text-violet-300">{theme.title}: </span>
                        <span className="text-slate-200">{theme.description}</span>
                        {theme.paperIndices?.length > 0 && (
                          <div className="inline-flex items-center gap-1 ml-1.5">
                            {theme.paperIndices.map((pNum) => (
                              <button
                                key={pNum}
                                onClick={() => scrollToPaper(pNum)}
                                className="text-xs font-mono font-bold text-violet-200 hover:text-white px-1.5 py-0.5 rounded bg-violet-600/35 border border-violet-500/30"
                              >
                                #{pNum}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research Gaps */}
              {response.synthesis.researchGaps.length > 0 && (
                <div className="p-4 rounded-xl bg-surface-2/80 border border-white/10 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    Unaddressed Research Gaps
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-200 list-disc list-inside">
                    {response.synthesis.researchGaps.map((gap, gIdx) => (
                      <li key={gIdx} className="leading-relaxed">
                        <span className="text-slate-200">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── Discovered Papers Matrix ─────────────────────────────────── */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                Peer-Reviewed Literature Matrix ({response.papers.length})
              </h3>
              <span className="text-xs text-slate-400">
                Sorted by relevance & citation impact
              </span>
            </div>

            <div className="space-y-3.5">
              {response.papers.map((paper, idx) => {
                const paperNumber = idx + 1;
                const isImported = paper.isImported || Boolean(importedMap[paper.id]);
                const importedInfo = importedMap[paper.id];
                const isExpanded = Boolean(expandedAbstracts[paper.id]);
                const isHighlighted = highlightedPaperIndex === paperNumber;
                const isImporting = importingPaperId === paper.id;

                return (
                  <div
                    key={paper.id}
                    ref={(el) => {
                      paperRefs.current[paperNumber] = el;
                    }}
                    className={`p-5 rounded-2xl border transition-all duration-300 space-y-3.5 shadow-md ${
                      isHighlighted
                        ? 'bg-violet-900/25 border-violet-500/70 shadow-lg shadow-violet-500/15 ring-1 ring-violet-500/50'
                        : 'bg-surface-1/95 border-white/10 hover:border-violet-500/40'
                    }`}
                  >
                    {/* Top Row: Citation Index, Title, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-md font-mono font-bold text-xs bg-violet-600/25 text-violet-200 border border-violet-500/40 shadow-sm">
                            #{paperNumber}
                          </span>
                          {paper.year && (
                            <span className="text-xs text-slate-300 font-semibold font-mono">
                              {paper.year}
                            </span>
                          )}
                          {paper.venue && (
                            <span className="text-xs text-slate-400 font-medium truncate max-w-xs">
                              • {paper.venue}
                            </span>
                          )}
                          {paper.citationCount > 0 && (
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center gap-1 font-semibold">
                              <Flame className="w-3.5 h-3.5 text-amber-400" />
                              {paper.citationCount} citation{paper.citationCount === 1 ? '' : 's'}
                            </span>
                          )}
                          {paper.isOpenAccess && (
                            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
                              Open Access
                            </span>
                          )}
                        </div>

                        <h4 className="text-[15px] font-bold text-white hover:text-violet-200 transition-colors leading-snug">
                          {paper.title}
                        </h4>

                        <p className="text-xs font-medium text-slate-300">
                          {paper.authors.join(', ') || 'Unknown authors'}
                        </p>
                      </div>

                      {/* Action Buttons: Add to Project & External Links */}
                      <div className="flex items-center gap-2 shrink-0">
                        {paper.pdfUrl && (
                          <a
                            href={paper.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all shadow-sm"
                            title="Open direct PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-300" />
                            <span>PDF</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {paper.doi && (
                          <a
                            href={`https://doi.org/${paper.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all shadow-sm"
                            title="Open DOI resolver"
                          >
                            <span>DOI</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {/* Ingestion Button / Status */}
                        {isImported ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{importedInfo ? `In ${importedInfo.projectName}` : 'In Library'}</span>
                            </span>
                            {importedInfo && onOpenPaper && (
                              <button
                                onClick={() => onOpenPaper(importedInfo.paperId)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-violet-200 hover:text-white bg-violet-600/25 hover:bg-violet-600/45 border border-violet-500/40 transition-all shadow-sm"
                              >
                                Open
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (projects.length === 1) {
                                  handleImportToProject(paper, projects[0]);
                                } else {
                                  setActiveProjectDropdown(activeProjectDropdown === paper.id ? null : paper.id);
                                }
                              }}
                              disabled={isImporting || projects.length === 0}
                              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all shadow-md shadow-violet-600/30"
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Importing...</span>
                                </>
                              ) : (
                                <>
                                  <FolderPlus className="w-3.5 h-3.5" />
                                  <span>Add to Project</span>
                                  {projects.length > 1 && <ChevronDown className="w-3.5 h-3.5" />}
                                </>
                              )}
                            </button>

                            {/* Project selector dropdown */}
                            {activeProjectDropdown === paper.id && projects.length > 1 && (
                              <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-xl bg-surface-2 border border-white/15 shadow-2xl z-30 space-y-1">
                                <span className="text-xs font-bold text-slate-300 px-3 py-1.5 block uppercase tracking-wider">
                                  Select Project Library
                                </span>
                                {projects.map((proj) => (
                                  <button
                                    key={proj.id}
                                    onClick={() => handleImportToProject(paper, proj)}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium text-slate-200 hover:text-white hover:bg-violet-600/25 transition-all flex items-center justify-between"
                                  >
                                    <span className="truncate">{proj.title}</span>
                                    <FolderPlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* AI TL;DR Highlight */}
                    {paper.tldr && (
                      <div className="p-3.5 rounded-xl bg-violet-950/40 border border-violet-500/30 text-xs sm:text-sm text-violet-100 flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-violet-300">Key Finding: </span>
                          <span className="leading-relaxed">{paper.tldr}</span>
                        </div>
                      </div>
                    )}

                    {/* Abstract Drawer */}
                    {paper.abstract && (
                      <div className="space-y-1.5 pt-1">
                        <button
                          onClick={() => toggleAbstract(paper.id)}
                          className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5" />
                              <span>Hide Abstract</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5" />
                              <span>Read Abstract</span>
                            </>
                          )}
                        </button>
                        {isExpanded && (
                          <div className="text-sm text-slate-200 font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/10">
                            {paper.abstract}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
