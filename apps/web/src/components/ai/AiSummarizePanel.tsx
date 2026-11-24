import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  FileText,
  Layers,
  FlaskConical,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api, SummarizeMode, SummarizeResponse } from '../../lib/api.js';

interface AiSummarizePanelProps {
  paperId: string;
  onSummaryGenerated?: () => void;
}

interface ModeOption {
  id: SummarizeMode;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeOption[] = [
  {
    id: 'short',
    label: 'Executive',
    desc: '3-sentence key takeaway',
    icon: Sparkles,
  },
  {
    id: 'detailed',
    label: 'Synthesis',
    desc: 'Complete overview',
    icon: Layers,
  },
  {
    id: 'method-focused',
    label: 'Methodology',
    desc: 'Setup & benchmarks',
    icon: FlaskConical,
  },
];

export const AiSummarizePanel: React.FC<AiSummarizePanelProps> = ({
  paperId,
  onSummaryGenerated,
}) => {
  const [selectedMode, setSelectedMode] = useState<SummarizeMode>('short');
  const [isLoading, setIsLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<SummarizeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (modeToRun: SummarizeMode = selectedMode) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.summarizePaper(paperId, modeToRun);
      setSummaryData(res);
      onSummaryGenerated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize paper summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summaryData?.summary) return;
    try {
      await navigator.clipboard.writeText(summaryData.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy summary to clipboard', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Selector Segmented Controls */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Synthesis Scope
        </label>
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08]">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = selectedMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode.id);
                  // If we already have a summary for another mode, user can run this mode
                }}
                disabled={isLoading}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-lg transition-all text-center ${
                  isSelected
                    ? 'bg-violet-600/30 text-white border border-violet-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 mb-1 ${isSelected ? 'text-violet-300' : 'text-slate-400'}`} />
                <span className="text-[11px] font-medium leading-none">{mode.label}</span>
                <span className="text-[9px] text-slate-500 mt-0.5 leading-tight">{mode.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate / Action Button */}
      <button
        onClick={() => handleGenerate(selectedMode)}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-900/20 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Analyzing & Synthesizing...</span>
          </>
        ) : summaryData ? (
          <>
            <RefreshCw className="w-4 h-4 text-white" />
            <span>Regenerate ({MODES.find((m) => m.id === selectedMode)?.label})</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-violet-200" />
            <span>Generate Synthesis</span>
          </>
        )}
      </button>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Output Card */}
      {summaryData && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-semibold">
                {summaryData.mode} synthesis
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {summaryData.tokensUsed} tokens
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          <div className="text-xs text-slate-200 leading-relaxed font-sans space-y-2 select-text">
            {summaryData.summary.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>
      )}

      {/* Empty State Help */}
      {!summaryData && !isLoading && !error && (
        <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-center space-y-1.5">
          <FileText className="w-5 h-5 text-slate-500 mx-auto" />
          <p className="text-xs font-medium text-slate-300">Instant AI Paper Synthesis</p>
          <p className="text-[11px] text-slate-500 leading-normal max-w-xs mx-auto">
            Extract key scientific conclusions and experimental setups directly from the uploaded PDF text.
          </p>
        </div>
      )}
    </div>
  );
};
