import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Loader2,
  ExternalLink,
  AlertCircle,
  HelpCircle,
  X,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api.js';
import type { SemanticSearchResult, Project } from '@researchos/shared-types';
import { AiUsageIndicator } from './AiUsageIndicator.js';
import { HoverSelect } from '../common/HoverSelect.js';

interface SemanticSearchPanelProps {
  projects?: Project[];
  onOpenPaper?: (paperId: string) => void;
  className?: string;
}

const EXAMPLE_QUERIES = [
  'Which papers evaluate transformer models on genomic datasets?',
  'Methodologies addressing adversarial robustness or domain shift',
  'Studies measuring zero-shot classification performance',
  'What benchmark datasets were used for protein folding?',
];

export const SemanticSearchPanel: React.FC<SemanticSearchPanelProps> = ({
  projects = [],
  onOpenPaper,
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [topK, setTopK] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SemanticSearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSearch = async (e?: React.FormEvent, directQuery?: string) => {
    if (e) e.preventDefault();
    const queryToSearch = (directQuery ?? query).trim();
    if (!queryToSearch) return;

    setIsLoading(true);
    setError(null);

    const scope =
      selectedProjectId && selectedProjectId !== 'all'
        ? { projects: [selectedProjectId] }
        : undefined;

    try {
      const res = await api.searchSemantic(queryToSearch, topK, scope);
      setResults(res.data ?? (res as any).results ?? []);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || 'Semantic search failed. Please try a different query.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExample = (example: string) => {
    setQuery(example);
    handleSearch(undefined, example);
  };

  const getScoreBadge = (similarity: number) => {
    const percent = Math.round(similarity * 100);
    if (percent >= 80) {
      return (
        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold">
          {percent}% Match
        </span>
      );
    }
    if (percent >= 60) {
      return (
        <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-semibold">
          {percent}% Match
        </span>
      );
    }
    return (
      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-slate-300 font-semibold">
        {percent}% Match
      </span>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search Header & Input Bar */}
      <div className="p-6 rounded-2xl bg-surface-1/95 border border-white/10 shadow-xl space-y-4 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-white tracking-wide">
                AI Semantic Literature Search
              </h2>
            </div>
            <p className="text-sm text-slate-300 mt-1.5">
              Ask natural-language questions to discover concepts and passages indexed in your library via pgvector.
            </p>
          </div>

          <AiUsageIndicator variant="badge" refreshTrigger={refreshTrigger} />
        </div>

        {/* Input form */}
        <form onSubmit={handleSearch} className="space-y-3.5">
          <div className="relative flex items-center rounded-xl bg-black/40 border border-white/15 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/30 transition-all">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Which paper used a genomics dataset with more than 500 samples?"
              className="w-full pl-10 pr-24 py-3.5 bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white mr-2 hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50 transition-all shadow-md shadow-violet-600/30 flex items-center gap-1.5"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Search</span>
            </button>
          </div>

          {/* Scope Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Project Scope:</span>
              <HoverSelect
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                options={[
                  { value: 'all', label: 'All Authorized Papers' },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: p.title,
                  })),
                ]}
                buttonClassName="px-3 py-1.5 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Results limit:</span>
              <HoverSelect
                value={topK}
                onChange={(val) => setTopK(Number(val))}
                options={[
                  { value: 5, label: 'Top 5 matches' },
                  { value: 10, label: 'Top 10 matches' },
                  { value: 20, label: 'Top 20 matches' },
                ]}
                buttonClassName="px-3 py-1.5 text-xs font-medium"
              />
            </div>
          </div>
        </form>

        {/* Example prompts */}
        {!results && !isLoading && (
          <div className="pt-2.5 border-t border-white/[0.08] space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-violet-400" />
              Suggested Queries
            </span>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectExample(example)}
                  className="text-left text-xs font-medium text-slate-200 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  "{example}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="py-16 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
          <p className="text-sm text-slate-300 font-medium">
            Generating vector embeddings & scanning research library...
          </p>
        </div>
      )}

      {/* Results List */}
      {results && !isLoading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-semibold text-slate-200">
              Found {results.length} relevant match{results.length === 1 ? '' : 'es'}
            </span>
            <button
              onClick={() => {
                setResults(null);
                setQuery('');
              }}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Clear Results
            </button>
          </div>

          {results.length === 0 ? (
            <div className="p-8 rounded-2xl border border-dashed border-white/15 text-center space-y-2 bg-surface-1/50">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">No matching passages found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No indexed paper chunks met the similarity threshold. Ensure papers have completed text extraction and embedding generation.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {results.map((result, idx) => (
                <div
                  key={`${result.sourceId}-${idx}`}
                  className="group p-5 rounded-2xl border border-white/10 bg-surface-1/95 hover:bg-surface-2 hover:border-violet-500/40 transition-all space-y-3 shadow-md"
                >
                  {/* Top card metadata */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-violet-300 px-2 py-0.5 rounded bg-violet-600/15 border border-violet-500/30 font-semibold">
                          {result.sourceType}
                        </span>
                        {getScoreBadge(result.similarity)}
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-violet-200 transition-colors">
                        {result.title || 'Untitled Document'}
                      </h3>
                    </div>

                    {result.sourceType === 'Paper' && onOpenPaper && (
                      <button
                        onClick={() => onOpenPaper(result.sourceId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-300 hover:text-white bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-all shrink-0"
                      >
                        <span>Open Paper</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Matched Snippet */}
                  {result.snippet && (
                    <div className="text-sm text-slate-200 font-sans leading-relaxed bg-black/40 p-4 rounded-xl border border-white/10 italic">
                      "...{result.snippet}..."
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
