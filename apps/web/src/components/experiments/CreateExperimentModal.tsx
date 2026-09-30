import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Cpu,
  Database,
  Lock,
  Layers,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import {
  ExperimentPurpose,
  EXPERIMENT_PURPOSES,
  CreateExperimentDto,
  Project,
} from '@researchos/shared-types';

interface CreateExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId?: string;
  onCreate: (projectId: string, dto: CreateExperimentDto) => Promise<void>;
}

export const CreateExperimentModal: React.FC<CreateExperimentModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onCreate,
}) => {
  const [projectId, setProjectId] = useState<string>(activeProjectId || projects[0]?.id || '');
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState<ExperimentPurpose>('ModelTesting');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hypothesis, setHypothesis] = useState('');
  const [model, setModel] = useState('');
  const [dataset, setDataset] = useState('');
  const [hardware, setHardware] = useState('');
  const [codeCommit, setCodeCommit] = useState('');
  const [environmentNotes, setEnvironmentNotes] = useState('');
  const [observation, setObservation] = useState('');

  // Dynamic Hyperparameters rows
  const [hyperparameters, setHyperparameters] = useState<{ key: string; value: string }[]>([
    { key: 'learning_rate', value: '0.001' },
    { key: 'batch_size', value: '32' },
  ]);

  // Dynamic Metrics rows
  const [metrics, setMetrics] = useState<{ key: string; value: string }[]>([
    { key: 'accuracy', value: '0.925' },
    { key: 'loss', value: '0.21' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddHyperparameter = () => {
    setHyperparameters([...hyperparameters, { key: '', value: '' }]);
  };

  const handleRemoveHyperparameter = (index: number) => {
    setHyperparameters(hyperparameters.filter((_, i) => i !== index));
  };

  const handleHyperparameterChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...hyperparameters];
    updated[index][field] = val;
    setHyperparameters(updated);
  };

  const handleAddMetric = () => {
    setMetrics([...metrics, { key: '', value: '' }]);
  };

  const handleRemoveMetric = (index: number) => {
    setMetrics(metrics.filter((_, i) => i !== index));
  };

  const handleMetricChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...metrics];
    updated[index][field] = val;
    setMetrics(updated);
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
      // Build hyperparameter object
      const parsedHyperparameters: Record<string, any> = {};
      for (const row of hyperparameters) {
        if (row.key.trim()) {
          const num = Number(row.value);
          if (!isNaN(num) && row.value.trim() !== '') {
            parsedHyperparameters[row.key.trim()] = num;
          } else if (row.value.toLowerCase() === 'true' || row.value.toLowerCase() === 'false') {
            parsedHyperparameters[row.key.trim()] = row.value.toLowerCase() === 'true';
          } else {
            parsedHyperparameters[row.key.trim()] = row.value.trim();
          }
        }
      }

      // Build metrics object
      const parsedMetrics: Record<string, any> = {};
      for (const row of metrics) {
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
          model: model.trim() || undefined,
          dataset: dataset.trim() || undefined,
          hardware: hardware.trim() || undefined,
          codeCommit: codeCommit.trim() || undefined,
          environmentNotes: environmentNotes.trim() || undefined,
          hyperparameters: parsedHyperparameters,
        },
        metrics: parsedMetrics,
        observation: observation.trim() || undefined,
        status: statusToSet,
      };

      await onCreate(projectId, dto);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#111319] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0d0e12]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Log New Experiment Run</h2>
              <p className="text-xs text-slate-400">Record hyperparameters, metrics, and reproducibility details</p>
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
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Project & Run Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Project <span className="text-rose-400">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} {p.isPersonal ? '(Personal)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Experiment Run Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fine-tuned RoBERTa on SQuAD 2.0"
                className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Purpose & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Experiment Purpose
              </label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as ExperimentPurpose)}
                className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {Object.values(EXPERIMENT_PURPOSES).map((p) => (
                  <option key={p} value={p}>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Date of Run</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Hypothesis */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Hypothesis / Goal</label>
            <textarea
              rows={2}
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="What expectation or question does this experiment test?"
              className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Configuration & Environment Fields */}
          <div className="p-4 bg-[#0d0e12] rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Core Architecture & Hardware
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Model Architecture</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. RoBERTa-large, ResNet-50"
                  className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Dataset</label>
                <input
                  type="text"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  placeholder="e.g. SQuAD 2.0, ImageNet-1K"
                  className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Hardware Setup</label>
                <input
                  type="text"
                  value={hardware}
                  onChange={(e) => setHardware(e.target.value)}
                  placeholder="e.g. 2x NVIDIA A100 80GB"
                  className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Code Commit Hash / Branch</label>
                <input
                  type="text"
                  value={codeCommit}
                  onChange={(e) => setCodeCommit(e.target.value)}
                  placeholder="e.g. git commit hash or v1.0.2"
                  className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Environment Notes</label>
              <input
                type="text"
                value={environmentNotes}
                onChange={(e) => setEnvironmentNotes(e.target.value)}
                placeholder="e.g. Python 3.11, PyTorch 2.4, CUDA 12.2"
                className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Dynamic Hyperparameters Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Hyperparameters
              </label>
              <button
                type="button"
                onClick={handleAddHyperparameter}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Parameter
              </button>
            </div>

            <div className="space-y-2">
              {hyperparameters.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => handleHyperparameterChange(idx, 'key', e.target.value)}
                    placeholder="Parameter (e.g. learning_rate)"
                    className="flex-1 bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => handleHyperparameterChange(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. 0.0001)"
                    className="flex-1 bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveHyperparameter(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Dynamic Metrics Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                Logged Metrics
              </label>
              <button
                type="button"
                onClick={handleAddMetric}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Metric
              </button>
            </div>

            <div className="space-y-2">
              {metrics.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => handleMetricChange(idx, 'key', e.target.value)}
                    placeholder="Metric Name (e.g. accuracy, loss, f1)"
                    className="flex-1 bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => handleMetricChange(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. 0.942)"
                    className="flex-1 bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveMetric(idx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Observations & Findings */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Observations & Findings
            </label>
            <textarea
              rows={3}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Record any scientific takeaways, anomalies, or performance characteristics observed during the run..."
              className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800/80 flex items-center justify-between bg-[#0d0e12] gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('Draft')}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors disabled:opacity-50"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit('Final')}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              Save & Finalize (Lock)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
