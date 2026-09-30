import React from 'react';
import {
  Lock,
  AlertTriangle,
  Calendar,
  Cpu,
  Database,
  GitCommit,
  User,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  Experiment,
  ExperimentPurpose,
} from '@researchos/shared-types';

interface ExperimentCardProps {
  experiment: Experiment;
  isSelectedForCompare?: boolean;
  isCompareMode?: boolean;
  onToggleCompare?: (experiment: Experiment) => void;
  onClick?: (experiment: Experiment) => void;
}

const PURPOSE_STYLES: Record<ExperimentPurpose, { label: string; badge: string; border: string }> = {
  Baseline: {
    label: 'Baseline',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    border: 'border-emerald-500/20',
  },
  ModelTesting: {
    label: 'Model Testing',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    border: 'border-purple-500/20',
  },
  HyperparameterTuning: {
    label: 'Hyperparameter Tuning',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    border: 'border-amber-500/20',
  },
  DatasetComparison: {
    label: 'Dataset Comparison',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    border: 'border-blue-500/20',
  },
  PerformanceEvaluation: {
    label: 'Performance Eval',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    border: 'border-rose-500/20',
  },
  Final: {
    label: 'Final Benchmark',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    border: 'border-cyan-500/20',
  },
};

export const ExperimentCard: React.FC<ExperimentCardProps> = ({
  experiment,
  isSelectedForCompare = false,
  isCompareMode = false,
  onToggleCompare,
  onClick,
}) => {
  const purposeConfig = PURPOSE_STYLES[experiment.purpose] || PURPOSE_STYLES.ModelTesting;
  const isFinal = experiment.status === 'Final';
  const unresolvedFlags = (experiment.flags || []).filter((f) => !f.resolvedAt);
  const hasFlag = unresolvedFlags.length > 0;

  // Extract top 3 metrics to show as badges
  const metricEntries = Object.entries(experiment.metrics || {}).slice(0, 3);

  const handleCardClick = (e: React.MouseEvent) => {
    // If clicking the compare checkbox, don't open drawer
    if ((e.target as HTMLElement).closest('.compare-checkbox')) {
      return;
    }
    if (isCompareMode && onToggleCompare) {
      onToggleCompare(experiment);
    } else {
      onClick?.(experiment);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative group bg-[#111319] rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
        isSelectedForCompare
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
          : 'border-slate-800/80 hover:border-slate-700 hover:bg-[#141720]'
      }`}
    >
      {/* Top Accent Line */}
      <div
        className={`h-1 w-full ${
          isFinal
            ? 'bg-gradient-to-r from-cyan-500 to-indigo-500'
            : hasFlag
            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
            : 'bg-gradient-to-r from-slate-700 to-slate-800'
        }`}
      />

      <div className="p-5 flex-1 flex flex-col">
        {/* Header: Purpose Badge + Status/Compare Selector */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${purposeConfig.badge}`}
            >
              {purposeConfig.label}
            </span>

            {isFinal ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                <Lock className="w-3 h-3" />
                Finalized
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700/60 rounded-full">
                Draft
              </span>
            )}
          </div>

          {/* Comparison Checkbox */}
          {(isCompareMode || isSelectedForCompare) && (
            <button
              type="button"
              className="compare-checkbox flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare?.(experiment);
              }}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-colors border ${
                  isSelectedForCompare
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                {isSelectedForCompare && <Check className="w-3 h-3" />}
              </div>
              <span className={isSelectedForCompare ? 'text-indigo-400' : 'text-slate-400'}>
                Compare
              </span>
            </button>
          )}
        </div>

        {/* Experiment Run Name */}
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
          {experiment.name}
        </h3>

        {/* Hypothesis or Observation excerpt */}
        {experiment.hypothesis && (
          <p className="text-xs text-slate-400 line-clamp-2 italic mb-3">
            "{experiment.hypothesis}"
          </p>
        )}

        {/* Configuration Metadata Tags */}
        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mb-4 mt-auto">
          {experiment.config.model && (
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
              <Cpu className="w-3 h-3 text-slate-400" />
              <span>{experiment.config.model}</span>
            </div>
          )}

          {experiment.config.dataset && (
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
              <Database className="w-3 h-3 text-slate-400" />
              <span>{experiment.config.dataset}</span>
            </div>
          )}

          {experiment.config.codeCommit && (
            <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
              <GitCommit className="w-3 h-3 text-slate-400" />
              <span className="font-mono">{experiment.config.codeCommit.slice(0, 7)}</span>
            </div>
          )}
        </div>

        {/* Unresolved Flag Warning Banner */}
        {hasFlag && (
          <div className="flex items-center gap-2 p-2.5 mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="truncate">
              <span className="font-medium">
                {unresolvedFlags[0].type === 'NeedsRerun' ? 'Needs Rerun: ' : 'Reproducibility Issue: '}
              </span>
              <span className="text-amber-200/80">{unresolvedFlags[0].note}</span>
            </div>
          </div>
        )}

        {/* Metrics Grid Scorecards */}
        {metricEntries.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80">
            {metricEntries.map(([k, v]) => {
              const formattedVal =
                typeof v === 'number'
                  ? v < 1 && v > 0
                    ? `${(v * 100).toFixed(2)}%`
                    : Number.isInteger(v)
                    ? v.toString()
                    : v.toFixed(3)
                  : String(v);

              return (
                <div
                  key={k}
                  className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 text-center"
                >
                  <div className="text-[10px] uppercase font-semibold text-slate-400 truncate mb-0.5">
                    {k.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs font-bold text-slate-200 truncate font-mono">
                    {formattedVal}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer: Date, Owner & Actions */}
      <div className="px-5 py-3 bg-[#0d0e12] border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px]">
            <Calendar className="w-3 h-3 text-slate-400" />
            {experiment.date}
          </span>
          {experiment.ownerName && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <User className="w-3 h-3" />
              {experiment.ownerName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-indigo-400 group-hover:translate-x-0.5 transition-transform text-[11px] font-medium">
          <span>Inspect</span>
          <ChevronRight className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
};
