import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Trophy,
  Sliders,
  BarChart2,
  Lock,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  Eye,
  Filter,
} from 'lucide-react';
import {
  Experiment,
  ExperimentComparisonResponse,
  AlignedParameterRow,
  ExperimentPurpose,
} from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { ExperimentGraphicalVisualizer } from './ExperimentGraphicalVisualizer.js';

interface ExperimentComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  experimentIds: string[];
  onSelectExperiment?: (experiment: Experiment) => void;
  onNavigateToManuscript?: () => void;
}

const PURPOSE_STYLES: Record<ExperimentPurpose, { label: string; badge: string }> = {
  Baseline: {
    label: 'Baseline',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
  ModelTesting: {
    label: 'Model Testing',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  HyperparameterTuning: {
    label: 'Hyperparameter Tuning',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
  DatasetComparison: {
    label: 'Dataset Comparison',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  PerformanceEvaluation: {
    label: 'Performance Eval',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  Final: {
    label: 'Final Benchmark',
    badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
};

const GROUP_LABELS: Record<AlignedParameterRow['group'], string> = {
  model: 'Model Architecture',
  hyperparameter: 'Hyperparameters',
  dataset: 'Dataset & Split',
  hardware: 'Hardware & Compute',
  codeCommit: 'Code & Versioning',
  environment: 'Environment & Runtime',
};

export const ExperimentComparisonModal: React.FC<ExperimentComparisonModalProps> = ({
  isOpen,
  onClose,
  experimentIds,
  onSelectExperiment,
  onNavigateToManuscript,
}) => {
  const [data, setData] = useState<ExperimentComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // View mode switcher: Matrix Table vs Graphical Visualizer
  const [activeView, setActiveView] = useState<'matrix' | 'visualizer'>('matrix');

  // Filters & State
  const [diffsOnly, setDiffsOnly] = useState<boolean>(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState<boolean>(false);

  // Fetch comparison data
  const loadComparison = useCallback(async () => {
    if (!experimentIds || experimentIds.length < 2) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.compareExperiments(experimentIds);
      setData(res);
    } catch (err: any) {
      console.error('Failed to compare experiments:', err);
      setError(err?.message || 'Failed to generate comparison matrix');
    } finally {
      setIsLoading(false);
    }
  }, [experimentIds]);

  useEffect(() => {
    if (isOpen && experimentIds.length >= 2) {
      loadComparison();
    }
  }, [isOpen, experimentIds, loadComparison]);

  // Filtered parameters
  const displayedParameters = useMemo(() => {
    if (!data?.parameterMatrix) return [];
    if (diffsOnly) {
      return data.parameterMatrix.filter((row) => !row.isIdentical);
    }
    return data.parameterMatrix;
  }, [data, diffsOnly]);

  // Grouped parameters
  const groupedParameters = useMemo(() => {
    const groups: Record<string, AlignedParameterRow[]> = {};
    displayedParameters.forEach((param) => {
      const groupKey = param.group || 'hyperparameter';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(param);
    });
    return groups;
  }, [displayedParameters]);

  // CSV Export
  const handleExportCsv = () => {
    if (!data) return;
    const { experiments, parameterMatrix, metricMatrix } = data;

    const headers = ['Category', 'Key', 'Is Diff', ...experiments.map((e) => `"${e.name.replace(/"/g, '""')}"`)];
    const rows: string[] = [];

    // Header row
    rows.push(headers.join(','));

    // Status Row
    rows.push(['Metadata', 'Status', '', ...experiments.map((e) => `"${e.status}"`)].join(','));
    // Purpose Row
    rows.push(['Metadata', 'Purpose', '', ...experiments.map((e) => `"${e.purpose}"`)].join(','));
    // Date Row
    rows.push(['Metadata', 'Date', '', ...experiments.map((e) => `"${e.date}"`)].join(','));

    // Parameter rows
    parameterMatrix.forEach((param) => {
      const row = [
        `"Param: ${GROUP_LABELS[param.group] || param.group}"`,
        `"${param.parameterKey}"`,
        param.isIdentical ? 'No' : 'Yes',
        ...experiments.map((e) => {
          const val = param.values[e.id];
          return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : '""';
        }),
      ];
      rows.push(row.join(','));
    });

    // Metric rows
    metricMatrix.forEach((m) => {
      const row = [
        '"Metric"',
        `"${m.metricKey}"`,
        '',
        ...experiments.map((e) => {
          const val = m.values[e.id];
          return val !== null && val !== undefined ? `"${String(val).replace(/"/g, '""')}"` : '""';
        }),
      ];
      rows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `experiment_comparison_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Markdown Table
  const handleCopyMarkdown = async () => {
    if (!data) return;
    const { experiments, parameterMatrix, metricMatrix } = data;

    const headers = ['Dimension', ...experiments.map((e) => e.name)];
    const sep = headers.map(() => '---');

    const lines: string[] = [
      `### Experiment Tracker Comparison (${experiments.length} runs)`,
      '',
      `| ${headers.join(' | ')} |`,
      `| ${sep.join(' | ')} |`,
      `| **Status** | ${experiments.map((e) => e.status).join(' | ')} |`,
      `| **Purpose** | ${experiments.map((e) => e.purpose).join(' | ')} |`,
      `| **Date** | ${experiments.map((e) => e.date).join(' | ')} |`,
    ];

    // Metrics
    if (metricMatrix.length > 0) {
      lines.push(`| **--- METRICS ---** | ${experiments.map(() => '---').join(' | ')} |`);
      metricMatrix.forEach((m) => {
        const vals = experiments.map((e) => {
          const v = m.values[e.id];
          const isBest = m.bestExperimentId === e.id;
          return `${v ?? '—'}${isBest ? ' 🏆' : ''}`;
        });
        lines.push(`| **${m.metricKey}** | ${vals.join(' | ')} |`);
      });
    }

    // Parameters
    if (parameterMatrix.length > 0) {
      lines.push(`| **--- PARAMETERS ---** | ${experiments.map(() => '---').join(' | ')} |`);
      parameterMatrix.forEach((p) => {
        const vals = experiments.map((e) => {
          const v = p.values[e.id];
          return v !== null && v !== undefined ? String(v) : '—';
        });
        const diffFlag = !p.isIdentical ? ' *(diff)*' : '';
        lines.push(`| ${p.parameterKey}${diffFlag} | ${vals.join(' | ')} |`);
      });
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-7xl max-h-[92vh] bg-surface-1 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-surface-2/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white tracking-tight">Multi-Run Comparison Matrix</h2>
                {data && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                    {data.experiments.length} Runs Selected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Side-by-side comparative analysis of hyperparameters, metrics, and outcomes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold mr-1">
              <button
                onClick={() => setActiveView('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'matrix'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Matrix Table</span>
              </button>
              <button
                onClick={() => setActiveView('visualizer')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeView === 'visualizer'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Graphical Visualizer</span>
              </button>
            </div>

            {/* Matrix Only Controls */}
            {activeView === 'matrix' && (
              <>
                {/* Diff Filter Toggle */}
                <button
                  onClick={() => setDiffsOnly(!diffsOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                    diffsOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                      : 'bg-surface-3 hover:bg-surface-4 text-slate-300 border-white/10'
                  }`}
                  title="Show only parameters that differ across compared runs"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Diffs Only</span>
                  {data && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-mono">
                      {data.summary.differingParametersCount}
                    </span>
                  )}
                </button>

                {/* Copy Markdown */}
                <button
                  onClick={handleCopyMarkdown}
                  disabled={!data || isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-3 hover:bg-surface-4 border border-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                  title="Copy comparison table as Markdown"
                >
                  {copiedMarkdown ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Markdown</span>
                    </>
                  )}
                </button>

                {/* Export CSV */}
                <button
                  onClick={handleExportCsv}
                  disabled={!data || isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-3 hover:bg-surface-4 border border-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
                  title="Download CSV spreadsheet"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>CSV</span>
                </button>
              </>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-6 space-y-8">
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
              <p className="text-sm font-medium">Aligning hyperparameters and performance metrics...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Unable to generate comparison</h4>
                <p className="text-xs text-rose-300/80 mt-1">{error}</p>
                <button
                  onClick={loadComparison}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {data && !isLoading && activeView === 'visualizer' && (
            <ExperimentGraphicalVisualizer
              experiments={data.experiments}
              metricMatrix={data.metricMatrix}
              onNavigateToManuscript={onNavigateToManuscript}
            />
          )}

          {data && !isLoading && activeView === 'matrix' && (
            <>
              {/* Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-surface-2/80 border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Compared Runs</span>
                  <span className="text-lg font-bold text-white mt-1 block">{data.summary.totalCompared} Experiments</span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-2/80 border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Parameter Variances</span>
                  <span className="text-lg font-bold text-amber-400 mt-1 block">
                    {data.summary.differingParametersCount} <span className="text-xs font-normal text-slate-400">diffs</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-2/80 border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Common Parameters</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {data.summary.commonParametersCount} <span className="text-xs font-normal text-slate-400">matched</span>
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-surface-2/80 border border-white/[0.06]">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">Dataset Consistency</span>
                  <span className="text-xs font-mono text-indigo-300 mt-1.5 block truncate">
                    {data.summary.commonDataset || 'Multiple / Unspecified'}
                  </span>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="border border-white/[0.08] rounded-2xl overflow-hidden bg-surface-2/40 shadow-inner">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.08] bg-surface-2/90 sticky top-0 z-20">
                        {/* Sticky left attribute column */}
                        <th className="p-4 font-semibold text-slate-300 w-64 min-w-[220px] bg-surface-2/90 sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          Experiment Attributes
                        </th>
                        {/* Experiment columns */}
                        {data.experiments.map((exp) => {
                          const purposeStyle = PURPOSE_STYLES[exp.purpose] || PURPOSE_STYLES.ModelTesting;
                          return (
                            <th
                              key={exp.id}
                              className="p-4 font-semibold text-slate-200 min-w-[240px] max-w-[320px] border-l border-white/[0.06] align-top"
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${purposeStyle.badge}`}>
                                    {purposeStyle.label}
                                  </span>
                                  {exp.status === 'Final' ? (
                                    <span className="flex items-center gap-1 text-[10px] text-cyan-400 font-mono">
                                      <Lock className="w-3 h-3" />
                                      <span>Final</span>
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-mono">Draft</span>
                                  )}
                                </div>

                                <div className="font-bold text-sm text-white line-clamp-1" title={exp.name}>
                                  {exp.name}
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 text-slate-500" />
                                    <span className="truncate max-w-[120px]">{exp.ownerName || 'Researcher'}</span>
                                  </span>
                                  <span className="flex items-center gap-1 font-mono text-[10px]">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    <span>{new Date(exp.date).toLocaleDateString()}</span>
                                  </span>
                                </div>

                                {onSelectExperiment && (
                                  <button
                                    onClick={() => onSelectExperiment(exp)}
                                    className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-surface-3 hover:bg-surface-4 text-[11px] font-medium text-slate-300 hover:text-white border border-white/5 transition-colors"
                                  >
                                    <Eye className="w-3 h-3 text-indigo-400" />
                                    <span>Inspect Run</span>
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/[0.04]">
                      {/* ---------------- SECTION: QUANTITATIVE METRICS ---------------- */}
                      <tr className="bg-indigo-950/20 font-bold text-indigo-300">
                        <td
                          colSpan={data.experiments.length + 1}
                          className="py-2.5 px-4 text-[11px] uppercase tracking-wider flex items-center gap-2"
                        >
                          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Quantitative Metrics & Evaluation</span>
                        </td>
                      </tr>

                      {data.metricMatrix.length === 0 ? (
                        <tr>
                          <td colSpan={data.experiments.length + 1} className="p-4 text-center text-slate-500 italic">
                            No numeric or scalar metrics reported in selected experiments.
                          </td>
                        </tr>
                      ) : (
                        data.metricMatrix.map((metric) => {
                          return (
                            <tr key={metric.metricKey} className="hover:bg-white/[0.02] transition-colors">
                              {/* Sticky metric name */}
                              <td className="p-3.5 font-medium text-slate-200 bg-surface-2/50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-white">{metric.metricKey}</span>
                                  {metric.isNumeric && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-3 text-slate-400 font-mono">
                                      numeric
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Values per experiment */}
                              {data.experiments.map((exp) => {
                                const val = metric.values[exp.id];
                                const isBest = metric.bestExperimentId === exp.id;
                                const isNum = typeof val === 'number';

                                // Calculate relative percentage bar if numeric and min/max exist
                                let percentage = 50;
                                if (isNum && metric.min !== undefined && metric.max !== undefined && metric.max > metric.min) {
                                  percentage = Math.max(10, Math.min(100, ((val - metric.min) / (metric.max - metric.min)) * 100));
                                }

                                return (
                                  <td
                                    key={exp.id}
                                    className={`p-3.5 border-l border-white/[0.06] ${
                                      isBest ? 'bg-emerald-500/[0.07]' : ''
                                    }`}
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <span
                                          className={`font-mono font-bold text-sm ${
                                            isBest ? 'text-emerald-400' : 'text-slate-200'
                                          }`}
                                        >
                                          {val !== null && val !== undefined
                                            ? isNum
                                              ? val.toFixed(4)
                                              : String(val)
                                            : '—'}
                                        </span>

                                        {isBest && (
                                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            <Trophy className="w-2.5 h-2.5 text-emerald-400" />
                                            <span>Best</span>
                                          </span>
                                        )}
                                      </div>

                                      {/* Relative visual bar for numeric metrics */}
                                      {isNum && metric.max !== undefined && metric.min !== undefined && metric.max > metric.min && (
                                        <div className="w-full h-1.5 bg-surface-3 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              isBest ? 'bg-emerald-400' : 'bg-indigo-400/70'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })
                      )}

                      {/* ---------------- SECTION: PARAMETERS BY GROUP ---------------- */}
                      {Object.entries(groupedParameters).map(([groupKey, params]) => {
                        const groupLabel = GROUP_LABELS[groupKey as AlignedParameterRow['group']] || groupKey;

                        return (
                          <React.Fragment key={groupKey}>
                            <tr className="bg-surface-3/40 font-bold text-slate-300">
                              <td
                                colSpan={data.experiments.length + 1}
                                className="py-2 px-4 text-[10px] uppercase tracking-wider text-slate-400"
                              >
                                {groupLabel}
                              </td>
                            </tr>

                            {params.map((param) => {
                              const isDiff = !param.isIdentical;

                              return (
                                <tr
                                  key={param.parameterKey}
                                  className={`transition-colors ${
                                    isDiff
                                      ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.07]'
                                      : 'hover:bg-white/[0.02]'
                                  }`}
                                >
                                  {/* Sticky Parameter Key Column */}
                                  <td
                                    className={`p-3.5 font-medium bg-surface-2/50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)] ${
                                      isDiff ? 'border-l-2 border-amber-400 text-amber-200' : 'text-slate-300'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono text-xs">{param.parameterKey}</span>
                                      {isDiff && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                          DIFF
                                        </span>
                                      )}
                                    </div>
                                  </td>

                                  {/* Values across experiments */}
                                  {data.experiments.map((exp) => {
                                    const val = param.values[exp.id];

                                    return (
                                      <td
                                        key={exp.id}
                                        className={`p-3.5 border-l border-white/[0.06] font-mono text-xs ${
                                          isDiff ? 'text-amber-100 font-semibold' : 'text-slate-300'
                                        }`}
                                      >
                                        {val !== null && val !== undefined && val !== '' ? (
                                          typeof val === 'boolean' ? (
                                            <span
                                              className={`px-2 py-0.5 rounded text-[10px] ${
                                                val
                                                  ? 'bg-emerald-500/20 text-emerald-300'
                                                  : 'bg-slate-700/50 text-slate-400'
                                              }`}
                                            >
                                              {String(val)}
                                            </span>
                                          ) : (
                                            <span className="break-all">{String(val)}</span>
                                          )
                                        ) : (
                                          <span className="text-slate-600">—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}

                      {/* ---------------- SECTION: QUALITATIVE OBSERVATIONS ---------------- */}
                      <tr className="bg-surface-3/40 font-bold text-slate-300">
                        <td
                          colSpan={data.experiments.length + 1}
                          className="py-2 px-4 text-[10px] uppercase tracking-wider text-slate-400"
                        >
                          Qualitative Notes & Observations
                        </td>
                      </tr>
                      <tr className="hover:bg-white/[0.02]">
                        <td className="p-3.5 font-medium text-slate-300 bg-surface-2/50 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">
                          Observation
                        </td>
                        {data.experiments.map((exp) => (
                          <td
                            key={exp.id}
                            className="p-3.5 border-l border-white/[0.06] text-xs text-slate-300 italic align-top"
                          >
                            {exp.observation || <span className="text-slate-600">No observation logged</span>}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-white/[0.08] flex items-center justify-between bg-surface-2/60 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Divergent Hyperparameters</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Optimal Metric Benchmark</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-3 hover:bg-surface-4 text-white font-medium transition-colors"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
