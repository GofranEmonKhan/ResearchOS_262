import React, { useState, useRef, useMemo } from 'react';
import {
  BarChart2,
  TrendingUp,
  Download,
  Check,
  BookmarkPlus,
  ArrowUpRight,
  ArrowDownRight,
  FileCode,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { Experiment, AlignedMetricRow } from '@researchos/shared-types';
import { saveExperimentFigure, svgToPngDataUrl } from '../../lib/figureStorage.js';
import { HoverSelect } from '../common/HoverSelect.js';

interface ExperimentGraphicalVisualizerProps {
  experiments: Experiment[];
  metricMatrix: AlignedMetricRow[];
  onNavigateToManuscript?: () => void;
}

const EXPERIMENT_PALETTES = [
  { name: 'Royal Indigo', color: '#6366F1', fill: 'rgba(99, 102, 241, 0.8)', stroke: '#818CF8' },
  { name: 'Emerald Benchmark', color: '#10B981', fill: 'rgba(16, 185, 129, 0.8)', stroke: '#34D399' },
  { name: 'Amber Novelty', color: '#F59E0B', fill: 'rgba(245, 158, 11, 0.8)', stroke: '#FBBF24' },
  { name: 'Coral Rose', color: '#F43F5E', fill: 'rgba(244, 63, 94, 0.8)', stroke: '#FB7185' },
  { name: 'Electric Cyan', color: '#06B6D4', fill: 'rgba(6, 182, 212, 0.8)', stroke: '#22D3EE' },
];

export const ExperimentGraphicalVisualizer: React.FC<ExperimentGraphicalVisualizerProps> = ({
  experiments,
  metricMatrix,
  onNavigateToManuscript,
}) => {
  const [chartMode, setChartMode] = useState<'grouped-bar' | 'radar' | 'delta'>('grouped-bar');
  const [baselineExpId, setBaselineExpId] = useState<string>(
    experiments.find((e) => e.purpose === 'Baseline')?.id || experiments[0]?.id || ''
  );

  const baselineOptions = useMemo(() => {
    return experiments.map((e) => ({
      value: e.id,
      label: e.name,
      badge: e.purpose === 'Baseline' ? 'Baseline' : undefined,
    }));
  }, [experiments]);

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(() =>
    metricMatrix.filter((m) => m.isNumeric).map((m) => m.metricKey)
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessToast, setSavedSuccessToast] = useState<{ id: string; title: string } | null>(null);
  const [copiedLatex, setCopiedLatex] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // Filtered numeric metrics
  const activeMetrics = useMemo(() => {
    return metricMatrix.filter((m) => m.isNumeric && selectedMetrics.includes(m.metricKey));
  }, [metricMatrix, selectedMetrics]);

  // Toggle metric selection
  const handleToggleMetric = (key: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Export High-Res PNG
  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      const dataUrl = await svgToPngDataUrl(svgRef.current, 3);
      const link = document.createElement('a');
      link.download = `experiment_benchmark_chart_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export chart PNG:', err);
    }
  };

  // Export Vector SVG
  const handleExportSvg = () => {
    if (!svgRef.current) return;
    try {
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgRef.current);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `experiment_benchmark_chart_${Date.now()}.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export SVG:', err);
    }
  };

  // Save directly to Paper Figures
  const handleSaveToPaperFigures = async () => {
    if (!svgRef.current) return;
    setIsSaving(true);
    try {
      const dataUrl = await svgToPngDataUrl(svgRef.current, 2);
      const expNames = experiments.map((e) => e.name);
      const metricNames = activeMetrics.map((m) => m.metricKey);

      const title = `Comparative Benchmark: ${expNames.slice(0, 2).join(' vs ')}${expNames.length > 2 ? ` (+${expNames.length - 2})` : ''}`;
      const caption = `Figure: Quantitative benchmark comparison across ${expNames.join(', ')} evaluating ${metricNames.join(', ')}. Data generated via ResearchOS Experiment Tracker.`;
      const label = `fig:exp_benchmark_${Date.now().toString().slice(-4)}`;
      const safeTitle = expNames[0].toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20);
      const relativePath = `figures/exp_comparison_${safeTitle}_${Date.now().toString().slice(-4)}.png`;

      const saved = saveExperimentFigure({
        title,
        experimentIds: experiments.map((e) => e.id),
        experimentNames: expNames,
        metrics: metricNames,
        dataUrl,
        suggestedCaption: caption,
        suggestedLabel: label,
        relativePath,
        chartType: chartMode,
      });

      setSavedSuccessToast({ id: saved.id, title: saved.title });
      setTimeout(() => setSavedSuccessToast(null), 5000);
    } catch (err) {
      console.error('Failed to save figure to paper store:', err);
      alert('Failed to save figure snapshot.');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy LaTeX Table Code
  const handleCopyLatexTable = () => {
    const colAlign = 'l' + 'c'.repeat(experiments.length);
    const expHeaders = experiments.map((e) => `\\textbf{${e.name}}`).join(' & ');
    const metricRows = activeMetrics.map((m) => {
      const vals = experiments.map((e) => {
        const v = m.values[e.id];
        const isBest = m.bestExperimentId === e.id;
        const formatted = typeof v === 'number' ? v.toFixed(4) : v ?? '—';
        return isBest ? `\\textbf{${formatted}}` : `${formatted}`;
      });
      return `    \\textbf{${m.metricKey}} & ${vals.join(' & ')} \\\\`;
    });

    const latex = `\\begin{table}[htbp]
  \\centering
  \\caption{Comparative experimental metrics across evaluated runs.}
  \\label{tab:experiment_benchmark_matrix}
  \\begin{tabular}{${colAlign}}
    \\hline
    \\textbf{Metric} & ${expHeaders} \\\\
    \\hline
${metricRows.join('\n')}
    \\hline
  \\end{tabular}
\\end{table}`;

    navigator.clipboard.writeText(latex);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2500);
  };

  // Dimensions for Chart Rendering
  const width = 840;
  const height = 440;
  const margin = { top: 40, right: 40, bottom: 60, left: 90 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Render Grouped Bar Chart
  const renderGroupedBarChart = () => {
    if (activeMetrics.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[340px] text-slate-400">
          <BarChart2 className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No numeric metrics selected to visualize.</p>
        </div>
      );
    }

    const groupWidth = innerWidth / activeMetrics.length;
    const barWidth = Math.min(36, (groupWidth * 0.75) / experiments.length);
    const groupPadding = (groupWidth - barWidth * experiments.length) / 2;

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[460px] bg-[#0A091A] rounded-2xl border border-white/10 shadow-2xl select-none"
      >
        {/* Background Grid & Axes */}
        <defs>
          <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1E1B4B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0B0A1E" stopOpacity="0.8" />
          </linearGradient>
          {experiments.map((_, idx) => {
            const p = EXPERIMENT_PALETTES[idx % EXPERIMENT_PALETTES.length];
            return (
              <linearGradient key={idx} id={`barGrad-${idx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={p.color} stopOpacity="0.95" />
                <stop offset="100%" stopColor={p.color} stopOpacity="0.65" />
              </linearGradient>
            );
          })}
        </defs>

        <rect width={width} height={height} fill="#0C0B1F" rx="16" />

        {/* Chart Title Header in SVG */}
        <text x={margin.left} y={24} fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif">
          Multi-Experiment Metric Comparison Matrix
        </text>
        <text x={width - margin.right} y={24} textAnchor="end" fill="#94A3B8" fontSize="10" fontFamily="monospace">
          ResearchOS Benchmark Visualizer
        </text>

        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
          const yPos = margin.top + innerHeight * (1 - ratio);
          return (
            <g key={idx}>
              <line
                x1={margin.left}
                y1={yPos}
                x2={width - margin.right}
                y2={yPos}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={margin.left - 10}
                y={yPos + 3}
                textAnchor="end"
                fill="#64748B"
                fontSize="10"
                fontFamily="monospace"
              >
                {(ratio * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}

        {/* Baseline Reference Axis */}
        <line
          x1={margin.left}
          y1={margin.top + innerHeight}
          x2={width - margin.right}
          y2={margin.top + innerHeight}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
        />

        {/* Groups of Bars */}
        {activeMetrics.map((metric, gIdx) => {
          const gX = margin.left + gIdx * groupWidth;
          const maxVal = metric.max || 1;
          const minVal = Math.min(0, metric.min || 0);
          const range = maxVal - minVal || 1;

          return (
            <g key={metric.metricKey} transform={`translate(${gX}, 0)`}>
              {/* Group Label */}
              <text
                x={groupWidth / 2}
                y={margin.top + innerHeight + 24}
                textAnchor="middle"
                fill="#E2E8F0"
                fontSize="11"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {metric.metricKey}
              </text>

              {/* Bars per experiment */}
              {experiments.map((exp, eIdx) => {
                const rawVal = metric.values[exp.id];
                const numVal = typeof rawVal === 'number' ? rawVal : 0;
                const normRatio = Math.max(0.04, Math.min(1, (numVal - minVal) / range));
                const barHeight = innerHeight * normRatio;
                const bX = groupPadding + eIdx * barWidth;
                const bY = margin.top + innerHeight - barHeight;
                const isBest = metric.bestExperimentId === exp.id;
                const palette = EXPERIMENT_PALETTES[eIdx % EXPERIMENT_PALETTES.length];

                return (
                  <g key={exp.id} className="cursor-pointer group">
                    {/* Bar Rectangle */}
                    <rect
                      x={bX}
                      y={bY}
                      width={barWidth - 4}
                      height={barHeight}
                      fill={`url(#barGrad-${eIdx})`}
                      stroke={isBest ? '#FCD34D' : palette.stroke}
                      strokeWidth={isBest ? 1.5 : 0.8}
                      rx="4"
                    />

                    {/* Numeric Value Label above bar */}
                    <text
                      x={bX + (barWidth - 4) / 2}
                      y={bY - 6}
                      textAnchor="middle"
                      fill={isBest ? '#FCD34D' : '#E2E8F0'}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {numVal.toFixed(2)}
                    </text>

                    {/* Trophy Icon on Best Benchmark */}
                    {isBest && (
                      <g transform={`translate(${bX + (barWidth - 4) / 2 - 5}, ${bY - 20})`}>
                        <circle cx="5" cy="5" r="7" fill="#F59E0B" />
                        <text x="5" y="8" textAnchor="middle" fontSize="8" fill="#000">★</text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${margin.left}, ${margin.top + innerHeight + 46})`}>
          {experiments.map((exp, idx) => {
            const palette = EXPERIMENT_PALETTES[idx % EXPERIMENT_PALETTES.length];
            const xOffset = idx * (innerWidth / experiments.length);

            return (
              <g key={exp.id} transform={`translate(${xOffset}, 0)`}>
                <rect width="10" height="10" rx="2" fill={palette.color} />
                <text x="15" y="9" fill="#CBD5E1" fontSize="10" fontWeight="medium" fontFamily="sans-serif">
                  {exp.name.length > 18 ? `${exp.name.slice(0, 16)}...` : exp.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

  // Render Delta Performance View
  const renderDeltaView = () => {
    const baseline = experiments.find((e) => e.id === baselineExpId) || experiments[0];
    const candidates = experiments.filter((e) => e.id !== baseline?.id);

    if (!baseline || candidates.length === 0) {
      return (
        <div className="p-8 text-center text-slate-400 bg-surface-2/40 rounded-2xl">
          <p className="text-sm font-medium">Select at least 2 distinct experiments to compare deltas.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Baseline Reference:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold">
              {baseline.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium text-xs">Change Baseline:</span>
            <HoverSelect
              value={baselineExpId}
              options={baselineOptions}
              onChange={(val) => setBaselineExpId(val)}
              className="w-48 sm:w-56"
              buttonClassName="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
              size="sm"
              placement="bottom"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {candidates.map((cand, cIdx) => {
            const palette = EXPERIMENT_PALETTES[(cIdx + 1) % EXPERIMENT_PALETTES.length];

            return (
              <div
                key={cand.id}
                className="p-4 bg-surface-2/60 border border-white/10 rounded-2xl space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: palette.color }} />
                    <h4 className="text-sm font-bold text-white">{cand.name}</h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
                    vs {baseline.name}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {activeMetrics.map((m) => {
                    const baseVal = m.values[baseline.id];
                    const candVal = m.values[cand.id];

                    if (typeof baseVal !== 'number' || typeof candVal !== 'number' || baseVal === 0) {
                      return null;
                    }

                    const delta = candVal - baseVal;
                    const pctDelta = ((delta / Math.abs(baseVal)) * 100);
                    const isPositive = delta > 0;
                    const isNeutral = delta === 0;

                    return (
                      <div
                        key={m.metricKey}
                        className="flex items-center justify-between p-2.5 bg-surface-3/50 border border-white/5 rounded-xl text-xs"
                      >
                        <span className="font-medium text-slate-300">{m.metricKey}</span>
                        <div className="flex items-center gap-3 font-mono">
                          <span className="text-slate-400 text-[11px]">{candVal.toFixed(3)}</span>
                          <span
                            className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isNeutral
                                ? 'bg-slate-700/50 text-slate-300'
                                : isPositive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : isNeutral ? null : <ArrowDownRight className="w-3 h-3" />}
                            {pctDelta > 0 ? `+${pctDelta.toFixed(1)}%` : `${pctDelta.toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Visualizer Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface-2/80 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-2">
          {/* Chart Type Tabs */}
          <div className="flex items-center p-1 bg-black/40 border border-white/10 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setChartMode('grouped-bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                chartMode === 'grouped-bar'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Grouped Bar</span>
            </button>
            <button
              onClick={() => setChartMode('delta')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                chartMode === 'delta'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Delta vs Baseline</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* LaTeX Table Copy */}
          <button
            onClick={handleCopyLatexTable}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-3 hover:bg-surface-4 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Copy LaTeX table representation for research paper"
          >
            {copiedLatex ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">LaTeX Copied!</span>
              </>
            ) : (
              <>
                <FileCode className="w-3.5 h-3.5 text-slate-400" />
                <span>LaTeX Table</span>
              </>
            )}
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-3 hover:bg-surface-4 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Download high-resolution PNG for paper submission"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export PNG</span>
          </button>

          {/* Export Vector SVG */}
          <button
            onClick={handleExportSvg}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-surface-3 hover:bg-surface-4 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Download scalable SVG vector"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>SVG</span>
          </button>

          {/* Save to Paper Figures Action */}
          <button
            onClick={handleSaveToPaperFigures}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Save this chart snapshot so it can be inserted into manuscripts under Figure button"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save to Paper Figures'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {savedSuccessToast && (
        <div className="flex items-center justify-between p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-xs text-emerald-200 shadow-2xl animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Figure Saved for Manuscript Writing!</p>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Saved as clean figure in your project store. You can now insert it directly in the Manuscript Editor under <strong>Figure → Saved Experiment Figures</strong>.
              </p>
            </div>
          </div>

          {onNavigateToManuscript && (
            <button
              onClick={onNavigateToManuscript}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-all"
            >
              <span>Open Manuscript Editor</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Metric Filter Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Active Metrics:
        </span>
        {metricMatrix
          .filter((m) => m.isNumeric)
          .map((m) => {
            const isSelected = selectedMetrics.includes(m.metricKey);
            return (
              <button
                key={m.metricKey}
                onClick={() => handleToggleMetric(m.metricKey)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                    : 'bg-surface-3 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                <span>{m.metricKey}</span>
              </button>
            );
          })}
      </div>

      {/* Main Chart Canvas Area */}
      <div className="w-full">
        {chartMode === 'grouped-bar' ? renderGroupedBarChart() : renderDeltaView()}
      </div>
    </div>
  );
};
