import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { AiSuggestion } from '../../lib/api.js';

interface AiSuggestionCardProps {
  suggestion: AiSuggestion;
  currentValue?: string | null;
  onAccept: (suggestion: AiSuggestion) => Promise<void>;
  onReject: (suggestion: AiSuggestion) => Promise<void>;
  isReadOnly?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  researchGap: 'Research Gap',
  methodology: 'Methodology',
  results: 'Key Findings & Results',
  limitation: 'Limitation',
  futureWork: 'Future Directions',
  datasetUsed: 'Dataset & Benchmarks',
};

export const AiSuggestionCard: React.FC<AiSuggestionCardProps> = ({
  suggestion,
  currentValue,
  onAccept,
  onReject,
  isReadOnly = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const fieldTitle = FIELD_LABELS[suggestion.fieldName] || suggestion.fieldName;
  const isPending = suggestion.status === 'Pending';
  const hasExistingValue = Boolean(currentValue && currentValue.trim().length > 0);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(suggestion);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject(suggestion);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="group rounded-xl border border-white/[0.08] bg-white/[0.02] hover:border-violet-500/30 hover:bg-white/[0.035] transition-all p-3.5 space-y-3">
      {/* Header with field tag and status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          <span className="text-[11px] font-semibold text-violet-300 tracking-wide uppercase">
            {fieldTitle}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {hasExistingValue && isPending && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              {showDiff ? 'Hide Current' : 'Compare'}
            </button>
          )}

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              suggestion.status === 'Accepted'
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : suggestion.status === 'Rejected'
                ? 'text-slate-400 bg-white/[0.04] border-white/10'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            }`}
          >
            {suggestion.status}
          </span>
        </div>
      </div>

      {/* Suggested Value / Content */}
      <div className="space-y-2">
        {showDiff && hasExistingValue && (
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider">Current Value</span>
            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              {currentValue}
            </p>
          </div>
        )}

        <div className="text-xs text-slate-200 leading-relaxed font-sans bg-black/20 p-2.5 rounded-lg border border-white/[0.04]">
          {suggestion.suggestedValue}
        </div>
      </div>

      {/* Action Controls */}
      {isPending && !isReadOnly && (
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/[0.04]">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" />
            <span>Dismiss</span>
          </button>

          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 transition-all shadow-sm shadow-violet-600/20 disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Apply to Field</span>
          </button>
        </div>
      )}
    </div>
  );
};
