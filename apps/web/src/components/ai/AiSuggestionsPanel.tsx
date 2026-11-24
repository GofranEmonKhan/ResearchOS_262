import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import {
  api,
  AiSuggestion,
  PaperSidebarFields,
} from '../../lib/api.js';
import { AiSuggestionCard } from './AiSuggestionCard.js';

interface AiSuggestionsPanelProps {
  paperId: string;
  currentSidebarFields?: PaperSidebarFields | null;
  onFieldUpdated?: () => void;
  isReadOnly?: boolean;
}

type FilterTab = 'pending' | 'all';

export const AiSuggestionsPanel: React.FC<AiSuggestionsPanelProps> = ({
  paperId,
  currentSidebarFields,
  onFieldUpdated,
  isReadOnly = false,
}) => {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');

  const loadSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getAiSuggestions({
        targetType: 'PaperSidebarFields',
        targetId: paperId,
        limit: 50,
      });
      setSuggestions(res.suggestions || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [paperId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await api.generateSidebarSuggestions(paperId);
      // Prepend/replace suggestions with fresh results
      if (res.suggestions && res.suggestions.length > 0) {
        setSuggestions((prev) => {
          const map = new Map<string, AiSuggestion>();
          res.suggestions.forEach((s) => map.set(s.id, s));
          prev.forEach((s) => {
            if (!map.has(s.id)) map.set(s.id, s);
          });
          return Array.from(map.values());
        });
      } else {
        await loadSuggestions();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate suggestions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = async (suggestion: AiSuggestion) => {
    try {
      await api.acceptAiSuggestion(suggestion.id);
      // Update local status
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestion.id ? { ...s, status: 'Accepted' } : s))
      );
      onFieldUpdated?.();
    } catch (err: any) {
      alert(err.message || 'Failed to accept suggestion');
    }
  };

  const handleReject = async (suggestion: AiSuggestion) => {
    try {
      await api.rejectAiSuggestion(suggestion.id);
      // Update local status
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestion.id ? { ...s, status: 'Rejected' } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to dismiss suggestion');
    }
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === 'Pending');
  const displayedSuggestions =
    filterTab === 'pending' ? pendingSuggestions : suggestions;

  const getCurrentValueForField = (fieldName: string): string | null => {
    if (!currentSidebarFields) return null;
    return (currentSidebarFields as any)[fieldName] || null;
  };

  return (
    <div className="space-y-4">
      {/* Top Action & Filter Controls */}
      <div className="space-y-2">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isReadOnly}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-900/20 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Paper & Extracting...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-violet-200" />
              <span>Extract Structured Insights</span>
            </>
          )}
        </button>

        {/* Filter bar */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/40 border border-white/[0.06] text-[11px]">
            <button
              onClick={() => setFilterTab('pending')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterTab === 'pending'
                  ? 'bg-violet-600/40 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingSuggestions.length})
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterTab === 'all'
                  ? 'bg-violet-600/40 text-white font-medium'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All History ({suggestions.length})
            </button>
          </div>

          <button
            onClick={loadSuggestions}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Suggestion Cards List */}
      <div className="space-y-3">
        {isLoading && suggestions.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
            <span className="text-xs">Loading suggestions...</span>
          </div>
        ) : displayedSuggestions.length > 0 ? (
          displayedSuggestions.map((suggestion) => (
            <AiSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              currentValue={getCurrentValueForField(suggestion.fieldName)}
              onAccept={handleAccept}
              onReject={handleReject}
              isReadOnly={isReadOnly}
            />
          ))
        ) : (
          <div className="p-6 rounded-xl border border-dashed border-white/[0.08] text-center space-y-2">
            <Lightbulb className="w-6 h-6 text-slate-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-300">
                {filterTab === 'pending' ? 'No pending suggestions' : 'No suggestion history yet'}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Click <span className="text-slate-300 font-medium">Extract Structured Insights</span> to have Gemini read the PDF and suggest Research Gap, Methodology, and Limitations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
