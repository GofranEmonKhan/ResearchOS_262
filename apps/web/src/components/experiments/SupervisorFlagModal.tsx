import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import {
  Experiment,
  ExperimentFlagType,
  CreateExperimentFlagDto,
} from '@researchos/shared-types';

interface SupervisorFlagModalProps {
  isOpen: boolean;
  onClose: () => void;
  experiment: Experiment;
  onSubmitFlag: (dto: CreateExperimentFlagDto) => Promise<void>;
}

export const SupervisorFlagModal: React.FC<SupervisorFlagModalProps> = ({
  isOpen,
  onClose,
  experiment,
  onSubmitFlag,
}) => {
  const [flagType, setFlagType] = useState<ExperimentFlagType>('NeedsRerun');
  const [note, setNote] = useState('');
  const [createRevisionTask, setCreateRevisionTask] = useState(true);
  const [taskTitle, setTaskTitle] = useState(`[Revision] Re-run Experiment: ${experiment.name}`);
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Please provide a note explaining why this experiment needs a rerun or review.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmitFlag({
        type: flagType,
        note: note.trim(),
        createRevisionTask,
        taskTitle: createRevisionTask ? taskTitle.trim() : undefined,
        taskDueDate: createRevisionTask ? taskDueDate : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to flag experiment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111319] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#0d0e12]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Flag Experiment Run</h2>
              <p className="text-xs text-slate-400 truncate max-w-[280px]">
                {experiment.name}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Flag Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Issue Category <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFlagType('NeedsRerun')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  flagType === 'NeedsRerun'
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-[#171922] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold">Needs Rerun</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Parameters, stochastic seed, or environment need repeat execution.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setFlagType('NotReproducible')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  flagType === 'NotReproducible'
                    ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30'
                    : 'bg-[#171922] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span className="text-xs font-bold">Not Reproducible</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Reported metrics deviate significantly from baseline verification.
                </p>
              </button>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Supervisor Notes & Guidance <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detail specifically what should be altered (e.g. fixed random seed, different batch size, loss curve anomaly)..."
              className="w-full bg-[#171922] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Auto Revision Task Option */}
          <div className="p-4 bg-[#0d0e12] rounded-xl border border-slate-800 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createRevisionTask}
                onChange={(e) => setCreateRevisionTask(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-200">
                Automatically generate revision task in project
              </span>
            </label>

            {createRevisionTask && (
              <div className="space-y-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Task Title
                  </label>
                  <input
                    type="text"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-[#171922] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-400/10 transition-all disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isSubmitting ? 'Flagging...' : 'Issue Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
