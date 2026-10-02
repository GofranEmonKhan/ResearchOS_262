import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Clock,
  Terminal,
  FileCode,
  Layers,
} from 'lucide-react';
import {
  ExperimentPurpose,
  EXPERIMENT_PURPOSES,
  CreateExperimentDto,
  Project,
  Experiment,
} from '@researchos/shared-types';
import { RunRecord } from './CodePlayground';
import { api } from '../../lib/api';

interface SaveRunAsExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  run: RunRecord | null;
  projects: Project[];
  activeProjectId?: string;
  onSaved?: (experiment: Experiment) => void;
}

export const SaveRunAsExperimentModal: React.FC<SaveRunAsExperimentModalProps> = ({
  isOpen,
  onClose,
  run,
  projects,
  activeProjectId,
  onSaved,
}) => {
  const [projectId, setProjectId] = useState<string>(activeProjectId || projects[0]?.id || '');
  const [name, setName] = useState<string>(() => {
    if (run) {
      const now = new Date();
      return `Python Run — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    }
    return '';
  });
  const [purpose, setPurpose] = useState<ExperimentPurpose>('ModelTesting');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [hypothesis, setHypothesis] = useState('');
  const [model, setModel] = useState('');
  const [dataset, setDataset] = useState('');
  const [hardware, setHardware] = useState('Browser WASM Sandbox');
  const [environment, setEnvironment] = useState<string>(() =>
    run ? `Browser / Pyodide 0.26.4 (${run.durationMs}ms)` : 'Browser / Pyodide 0.26.4'
  );
  const [observation, setObservation] = useState<string>(() =>
    run?.stdout ? run.stdout.trim().slice(0, 500) : ''
  );
  const [showCodePreview, setShowCodePreview] = useState(false);

  // Dynamic Metrics rows
  const [metricsRows, setMetricsRows] = useState<{ key: string; value: string }[]>(() => {
    if (run?.metrics && Object.keys(run.metrics).length > 0) {
      return Object.entries(run.metrics).map(([k, v]) => ({ key: k, value: String(v) }));
    }
    return [{ key: '', value: '' }];
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (run && isOpen) {
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setName(`Python Run — ${formattedDate}`);
      setDate(now.toISOString().split('T')[0]);
      setProjectId(activeProjectId || projects[0]?.id || '');
      setObservation(run.stdout ? run.stdout.trim().slice(0, 500) : '');
      setEnvironment(`Browser / Pyodide 0.26.4 (${run.durationMs}ms)`);

      // Convert run.metrics to rows
      const extractedEntries = Object.entries(run.metrics || {});
      if (extractedEntries.length > 0) {
        setMetricsRows(extractedEntries.map(([k, v]) => ({ key: k, value: String(v) })));
      } else {
        setMetricsRows([{ key: '', value: '' }]);
      }
      setError(null);
    }
  }, [run, isOpen, activeProjectId, projects]);

  if (!isOpen || !run) return null;

  const handleAddMetric = () => {
    setMetricsRows([...metricsRows, { key: '', value: '' }]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetricsRows(metricsRows.filter((_, i) => i !== index));
  };

  const handleMetricChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...metricsRows];
    updated[index][field] = val;
    setMetricsRows(updated);
  };

  const handleSubmit = async (statusToSet: 'Draft' | 'Final') => {
    if (!name.trim()) {
      setError('Experiment name is required.');
      return;
    }
    if (!projectId) {
      setError('Please select a project for this experiment.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Build metrics object
      const parsedMetrics: Record<string, any> = {};
      for (const row of metricsRows) {
        if (row.key.trim()) {
          const num = Number(row.value);
          parsedMetrics[row.key.trim()] = !isNaN(num) && row.value.trim() !== '' ? num : row.value.trim();
        }
      }

      const dto: CreateExperimentDto = {
        name: name.trim(),
        purpose,
        date,
        hypothesis: hypothesis.trim() || undefined,
        config: {
          source: 'playground',
          language: 'python',
          codeSnippet: run.code,
          environment: environment.trim() || 'Browser / Pyodide',
          model: model.trim() || undefined,
          dataset: dataset.trim() || undefined,
          hardware: hardware.trim() || 'Browser WASM',
          environmentNotes: `Executed in Pyodide WASM sandbox (${run.durationMs}ms duration, exit code ${run.exitCode})`,
        },
        metrics: parsedMetrics,
        observation: observation.trim() || undefined,
        status: statusToSet,
        outputFileIds: [],
      };

      const result = await api.createExperiment(projectId, dto);
      onSaved?.(result as any);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save experiment run');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111319] border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0d0e12]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Save Run as Experiment</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono">
                  Python WASM
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Turn your playground execution into a tracked research experiment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Run Summary Badge */}
          <div className="p-3.5 bg-surface-2 border border-white/[0.08] rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Duration: <strong className="text-slate-200">{`${run.durationMs}ms`}</strong></span>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Exit: <strong className={run.exitCode === 0 ? 'text-emerald-400' : 'text-rose-400'}>{`Code ${run.exitCode}`}</strong></span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowCodePreview(!showCodePreview)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>{showCodePreview ? 'Hide Code' : 'View Code'}</span>
            </button>
          </div>

          {/* Code snippet expandable preview */}
          {showCodePreview && (
            <div className="p-3 bg-[#1e1e1e] border border-white/10 rounded-xl font-mono text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre leading-relaxed">
              {run.code}
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project <span className="text-rose-400">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#181a20]">
                    {p.title} {p.isPersonal ? '(Personal)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Experiment Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ResNet-50 Pyodide Baseline"
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Experiment Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as ExperimentPurpose)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              >
                {Object.values(EXPERIMENT_PURPOSES).map((p) => (
                  <option key={p} value={p} className="bg-[#181a20]">
                    {p === 'ModelTesting' && 'Model Testing'}
                    {p === 'HyperparameterTuning' && 'Hyperparameter Tuning'}
                    {p === 'DatasetComparison' && 'Dataset Comparison'}
                    {p === 'PerformanceEvaluation' && 'Performance Evaluation'}
                    {p === 'Baseline' && 'Baseline'}
                    {p === 'Final' && 'Final Benchmark'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-3 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Hypothesis */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Hypothesis (Optional)
            </label>
            <input
              type="text"
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="e.g. Lower learning rate will stabilize loss convergence"
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {/* Config & Environment Parameters */}
          <div className="p-4 bg-surface-2/60 border border-white/[0.06] rounded-xl space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Experiment Configuration & Environment</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Model Architecture</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. Pyodide-WASM-Custom"
                  className="w-full bg-surface-3 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Dataset</label>
                <input
                  type="text"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  placeholder="e.g. In-Memory Synthetic"
                  className="w-full bg-surface-3 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hardware / Runtime</label>
                <input
                  type="text"
                  value={hardware}
                  onChange={(e) => setHardware(e.target.value)}
                  className="w-full bg-surface-3 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
          </div>

          {/* Extracted / Custom Metrics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Tracked Experiment Metrics</span>
              </label>
              <button
                type="button"
                onClick={handleAddMetric}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>
            </div>

            <div className="space-y-2">
              {metricsRows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => handleMetricChange(idx, 'key', e.target.value)}
                    placeholder="Metric key (e.g. accuracy)"
                    className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => handleMetricChange(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. 0.942)"
                    className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                  {metricsRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMetric(idx)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observations / Output Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Observations / Execution Notes
            </label>
            <textarea
              rows={3}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Key takeaways or summary observations..."
              className="w-full bg-surface-3 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-between bg-[#0d0e12]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('Draft')}
              className="px-4 py-2 bg-surface-3 hover:bg-surface-3/80 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('Final')}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save as Final Experiment'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
