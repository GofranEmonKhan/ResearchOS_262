import React, { useState } from 'react';
import {
  Sparkles,
  Check,
  X,
  Loader2,
  Copy,
  Bot,
  FileText,
} from 'lucide-react';
import { WritingAssistAction } from '@researchos/shared-types';

interface AiWritingAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: WritingAssistAction;
  originalText?: string;
  suggestedText: string;
  suggestionId: string;
  onApply: (suggestedText: string, suggestionId: string) => Promise<void>;
}

export const AiWritingAssistModal: React.FC<AiWritingAssistModalProps> = ({
  isOpen,
  onClose,
  action,
  originalText,
  suggestedText,
  suggestionId,
  onApply,
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getActionTitle = () => {
    switch (action) {
      case 'paraphrase':
        return 'Academic Paraphrase Suggestion';
      case 'grammar':
        return 'Grammar & Clarity Enhancement';
      case 'outline':
        return 'Structured Section Outline';
      default:
        return 'AI Writing Assistant';
    }
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApply(suggestedText, suggestionId);
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(suggestedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-[#090D16] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-wide">
                {getActionTitle()}
              </h3>
              <p className="text-[11px] text-slate-400">
                Review suggested revisions before replacing or inserting into section
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 font-semibold">
              AI-Assisted
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {originalText && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                Original Text
              </span>
              <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-slate-400 font-serif leading-relaxed select-text">
                {originalText}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-violet-300 font-semibold tracking-wider flex items-center gap-1.5">
                <Bot className="w-3 h-3 text-violet-400" />
                <span>Suggested Revision</span>
              </span>

              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs sm:text-[13px] text-slate-100 font-serif leading-relaxed select-text shadow-inner">
              {suggestedText}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-slate-400 flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>
              Applying this revision will mark this manuscript section as{' '}
              <strong className="text-slate-200">AI-assisted</strong> for academic attribution.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-end gap-2.5 bg-white/[0.01]">
          <button
            onClick={onClose}
            disabled={isApplying}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-50"
          >
            Dismiss
          </button>

          <button
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-900/30 disabled:opacity-50"
          >
            {isApplying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>
              {action === 'outline' ? 'Insert Outline into Section' : 'Replace Selected Text'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
