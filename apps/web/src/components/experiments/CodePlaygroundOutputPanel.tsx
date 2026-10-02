import React, { useState } from 'react';
import {
  Terminal,
  BarChart2,
  History,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { RunRecord } from './CodePlayground';

export interface CodePlaygroundOutputPanelProps {
  runHistory: RunRecord[];
  activeRunId: string | null;
  onSelectRun: (id: string) => void;
  onSaveRun?: (run: RunRecord) => void;
  isRunning?: boolean;
  canSave?: boolean;
}

export const CodePlaygroundOutputPanel: React.FC<CodePlaygroundOutputPanelProps> = ({
  runHistory,
  activeRunId,
  onSelectRun,
  onSaveRun,
  isRunning = false,
  canSave = true,
}) => {
  const [activeTab, setActiveTab] = useState<'console' | 'metrics' | 'history'>('console');
  const activeRun = runHistory.find((r) => r.id === activeRunId) || runHistory[0] || null;

  return (
    <div className="flex flex-col h-full bg-surface-2/40">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/90 border-b border-white/[0.08] backdrop-blur-md">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('console')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'console'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console</span>
            {activeRun && (
              <span
                className={`w-2 h-2 rounded-full ml-1 ${
                  activeRun.exitCode === 0 ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'metrics'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Metrics</span>
            {activeRun && Object.keys(activeRun.metrics).length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px]">
                {Object.keys(activeRun.metrics).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            {runHistory.length > 0 && (
              <span className="px-1.5 py-0.2 bg-surface-3 text-slate-300 rounded-full text-[10px]">
                {runHistory.length}
              </span>
            )}
          </button>
        </div>

        {/* Save Run Action */}
        {activeRun && canSave && onSaveRun && (
          <button
            onClick={() => onSaveRun(activeRun)}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save as Exp</span>
          </button>
        )}
      </div>

      {/* Active Run Status Indicator */}
      {activeRun && (
        <div className="flex items-center justify-between px-4 py-2 bg-surface-3/50 border-b border-white/[0.06] text-xs">
          <div className="flex items-center gap-2">
            {activeRun.exitCode === 0 ? (
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Success</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <XCircle className="w-3.5 h-3.5" />
                <span>Error (Exit {activeRun.exitCode})</span>
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{activeRun.durationMs}ms</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            {new Date(activeRun.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs">
        {/* TAB: CONSOLE */}
        {activeTab === 'console' && (
          <div className="space-y-3">
            {!activeRun && !isRunning && (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500 font-sans">
                <Terminal className="w-10 h-10 text-slate-600 mb-3 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-400">Ready to execute code</p>
                <p className="text-xs text-slate-600 max-w-xs mt-1">
                  Run your Python script to inspect stdout, stderr, and auto-extracted metrics.
                </p>
              </div>
            )}

            {isRunning && (
              <div className="flex items-center gap-2.5 text-indigo-300 py-6 justify-center">
                <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                <span className="font-sans text-xs">Executing Python code...</span>
              </div>
            )}

            {activeRun && (
              <>
                {activeRun.stdout && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-sans font-semibold">
                      STDOUT
                    </div>
                    <div className="p-3 bg-black/40 border border-white/[0.06] rounded-xl text-emerald-300/90 whitespace-pre-wrap leading-relaxed select-text font-mono">
                      {activeRun.stdout}
                    </div>
                  </div>
                )}

                {activeRun.stderr && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-rose-400 font-sans font-semibold">
                      STDERR / Traceback
                    </div>
                    <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl text-rose-300 whitespace-pre-wrap leading-relaxed select-text font-mono">
                      {activeRun.stderr}
                    </div>
                  </div>
                )}

                {!activeRun.stdout && !activeRun.stderr && (
                  <div className="text-slate-500 italic py-4 text-center font-sans">
                    Program executed with no console output.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB: METRICS */}
        {activeTab === 'metrics' && (
          <div className="space-y-4 font-sans">
            {activeRun && Object.keys(activeRun.metrics).length > 0 ? (
              <>
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-semibold text-slate-200">
                        Auto-Extracted Metrics ({Object.keys(activeRun.metrics).length})
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Detected from JSON payload on stdout. Ready to save as Experiment.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {Object.entries(activeRun.metrics).map(([key, val]) => (
                    <div
                      key={key}
                      className="p-3 bg-surface-3/60 border border-white/10 rounded-xl flex flex-col justify-between hover:border-indigo-500/30 transition-colors"
                    >
                      <span className="text-[11px] text-slate-400 font-medium truncate" title={key}>
                        {key}
                      </span>
                      <span className="text-lg font-bold text-white font-mono mt-1">
                        {typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 4 }) : val}
                      </span>
                    </div>
                  ))}
                </div>

                {canSave && onSaveRun && (
                  <div className="pt-2">
                    <button
                      onClick={() => onSaveRun(activeRun)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.99]"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save This Run as Experiment</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <BarChart2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">No metrics extracted</p>
                <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1">
                  Print a JSON dictionary on the final stdout line to auto-extract metrics.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-2 font-sans">
            {runHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <History className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-400">No runs in this session</p>
                <p className="text-xs text-slate-600">
                  Execute code to build up your session run history.
                </p>
              </div>
            ) : (
              runHistory.map((run, idx) => {
                const isSelected = run.id === activeRunId;
                const metricCount = Object.keys(run.metrics).length;
                return (
                  <div
                    key={run.id}
                    onClick={() => {
                      onSelectRun(run.id);
                      setActiveTab('console');
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                        : 'bg-surface-3/40 border-white/[0.06] hover:bg-surface-3/80 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {run.exitCode === 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-rose-400" />
                        )}
                        <span className="text-xs font-semibold text-slate-200">
                          Run #{runHistory.length - idx}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(run.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{run.durationMs}ms</span>
                      </span>

                      {metricCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-medium">
                          {metricCount} metric{metricCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
