import React, { useEffect, useState } from 'react';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { api, AiUsageSummary } from '../../lib/api.js';

interface AiUsageIndicatorProps {
  variant?: 'compact' | 'full' | 'badge' | 'icon';
  className?: string;
  refreshTrigger?: number;
}

export const AiUsageIndicator: React.FC<AiUsageIndicatorProps> = ({
  variant = 'compact',
  className = '',
  refreshTrigger,
}) => {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getAiUsage();
      setUsage(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load AI quota');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [refreshTrigger]);

  if (error && variant === 'compact') {
    return null;
  }

  const percent = usage ? Math.min(100, Math.round(usage.percentUsed || 0)) : 0;
  const isWarning = percent >= 75 && percent < 90;
  const isCritical = percent >= 90;

  const barColor = isCritical
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-gradient-to-r from-violet-500 to-indigo-500';

  const badgeBg = isCritical
    ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    : isWarning
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : 'text-violet-400 bg-violet-500/10 border-violet-500/20';

  const formatTokens = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}k`;
    return val.toLocaleString();
  };

  if (variant === 'icon') {
    return (
      <div
        className={`p-2 rounded-xl flex items-center justify-center border transition-transform hover:scale-105 cursor-pointer ${badgeBg} ${className}`}
        title={`AI Usage: ${percent}% used (${usage ? `${formatTokens(usage.tokensUsedThisMonth)}/${formatTokens(usage.monthlyLimit)}` : 'Loading...'})`}
      >
        <Sparkles className="w-4 h-4" />
      </div>
    );
  }

  if (variant === 'badge') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border ${badgeBg} ${className}`}
        title={`AI Usage: ${percent}% used`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{usage ? `${percent}% AI Quota` : 'AI Quota'}</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`p-2.5 rounded-xl bg-[#0E0F1D]/80 border border-slate-800/90 shadow-sm ${className}`}>
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-slate-100 font-semibold">
            <div className="p-0.5 rounded bg-violet-500/15 border border-violet-500/30 text-violet-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>AI Token Quota</span>
          </div>
          <span className="font-mono text-xs text-violet-200 font-medium px-2 py-0.5 rounded bg-violet-500/15 border border-violet-500/30">
            {usage ? `${formatTokens(usage.tokensUsedThisMonth)} / ${formatTokens(usage.monthlyLimit)}` : '...'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-slate-800/80">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {isCritical && (
          <div className="flex items-center gap-1 text-xs text-rose-400 mt-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Quota almost exhausted ({percent}%)</span>
          </div>
        )}
      </div>
    );
  }

  // Full variant (detailed panel/settings)
  return (
    <div className={`p-4 rounded-xl bg-surface-2 border border-white/[0.08] ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">AI Resource Utilization</h4>
            <p className="text-xs text-slate-300">Monthly token balance and limits</p>
          </div>
        </div>
        <button
          onClick={fetchUsage}
          disabled={isLoading}
          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          title="Refresh Quota"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-baseline text-sm">
          <span className="text-slate-300">Tokens consumed this cycle</span>
          <span className="font-mono font-medium text-white">
            {usage ? `${usage.tokensUsedThisMonth.toLocaleString()} / ${usage.monthlyLimit.toLocaleString()}` : '—'}
          </span>
        </div>

        <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-400 pt-0.5">
          <span>{percent}% utilized</span>
          <span>Resets on the 1st of every month</span>
        </div>
      </div>
    </div>
  );
};
