import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditorComponent, { OnMount } from '@monaco-editor/react';

const Editor: any =
  typeof MonacoEditorComponent === 'function'
    ? MonacoEditorComponent
    : (MonacoEditorComponent as any)?.default || MonacoEditorComponent;
import {
  Play,
  RotateCcw,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Sparkles,
  BarChart2,
  History,
  Copy,
  Check,
  Code2,
  FileCode,
  Info,
  AlertTriangle,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Project, UserRole, Experiment } from '@researchos/shared-types';
import { SaveRunAsExperimentModal } from './SaveRunAsExperimentModal';

export interface RunRecord {
  id: string;
  timestamp: string;
  code: string;
  language: 'python';
  stdout: string;
  stderr: string;
  exitCode: number;
  metrics: Record<string, number>;
  durationMs: number;
}

export interface CodePlaygroundProps {
  projects: Project[];
  activeProjectId?: string;
  currentUserRole: UserRole;
  onExperimentSaved?: (experiment?: Experiment) => void;
  onSaveRunRequest?: (run: RunRecord) => void;
  readOnly?: boolean;
}

const STARTER_TEMPLATES: { id: string; name: string; description: string; code: string }[] = [
  {
    id: 'model-evaluation',
    name: 'Model Evaluation & Metrics',
    description: 'Calculates precision, recall, F1, and logs JSON metrics for auto-extraction.',
    code: `# ResearchOS Python Playground — Model Evaluation
# Tip: Output a JSON dictionary on the final stdout line to auto-extract experiment metrics!
import json
import math

def calculate_metrics(tp, fp, fn, tn):
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    accuracy = (tp + tn) / (tp + tn + fp + fn)
    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "loss": round(0.1428 + 0.02 * math.sin(f1), 4)
    }

print("Running baseline classification evaluation...")
results = calculate_metrics(tp=84, fp=12, fn=16, tn=188)

print("Evaluation completed successfully.")
print(f"Metrics Summary: Accuracy={results['accuracy']}, F1={results['f1_score']}")
print(json.dumps(results))
`,
  },
  {
    id: 'hyperparameter-tuning',
    name: 'Hyperparameter Tuning Simulation',
    description: 'Simulates grid search across learning rates and batch sizes.',
    code: `# Hyperparameter Optimization Simulation
import json

experiments = [
    {"lr": 0.001, "batch_size": 32, "val_acc": 0.912, "val_loss": 0.231},
    {"lr": 0.0005, "batch_size": 64, "val_acc": 0.938, "val_loss": 0.178},
    {"lr": 0.0001, "batch_size": 128, "val_acc": 0.895, "val_loss": 0.294},
]

print("Iterating over hyperparameter search space:")
best_exp = max(experiments, key=lambda x: x["val_acc"])

for i, exp in enumerate(experiments, 1):
    print(f"Trial #{i}: lr={exp['lr']} | batch={exp['batch_size']} -> Val Acc: {exp['val_acc']*100:.1f}%")

print(f"\\nOptimal Configuration: lr={best_exp['lr']}, batch_size={best_exp['batch_size']}")

# Emit optimal metrics for auto-extraction
metrics = {
    "best_val_accuracy": best_exp["val_acc"],
    "best_val_loss": best_exp["val_loss"],
    "learning_rate": best_exp["lr"],
    "batch_size": best_exp["batch_size"]
}
print(json.dumps(metrics))
`,
  },
  {
    id: 'statistical-test',
    name: 'Statistical Hypothesis Testing',
    description: 'Calculates mean, variance, and two-sample t-statistic.',
    code: `# Statistical Hypothesis Analysis
import json
import math

group_control = [23.4, 24.1, 22.8, 25.0, 23.9, 24.5, 23.1, 24.8]
group_treatment = [26.2, 27.1, 25.8, 28.0, 26.9, 27.5, 26.1, 27.8]

def mean(arr):
    return sum(arr) / len(arr)

def variance(arr, m):
    return sum((x - m) ** 2 for x in arr) / (len(arr) - 1)

m_c, m_t = mean(group_control), mean(group_treatment)
v_c, v_t = variance(group_control, m_c), variance(group_treatment, m_t)
n = len(group_control)

# Pooled standard error
se_diff = math.sqrt((v_c / n) + (v_t / n))
t_stat = (m_t - m_c) / se_diff

print(f"Control Mean: {m_c:.3f} (Var: {v_c:.3f})")
print(f"Treatment Mean: {m_t:.3f} (Var: {v_t:.3f})")
print(f"Calculated t-statistic: {t_stat:.4f}")

metrics = {
    "control_mean": round(m_c, 3),
    "treatment_mean": round(m_t, 3),
    "effect_size": round(m_t - m_c, 3),
    "t_statistic": round(t_stat, 4)
}
print(json.dumps(metrics))
`,
  },
];

// Global singleton for Pyodide loader
declare global {
  interface Window {
    loadPyodide?: (config: { indexURL?: string }) => Promise<any>;
    __pyodideInstancePromise?: Promise<any>;
  }
}

const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

function getPyodideInstance(): Promise<any> {
  if (window.__pyodideInstancePromise) {
    return window.__pyodideInstancePromise;
  }

  window.__pyodideInstancePromise = new Promise((resolve, reject) => {
    // Check if script tag already exists
    if (window.loadPyodide) {
      window.loadPyodide({ indexURL: PYODIDE_INDEX_URL })
        .then(resolve)
        .catch(reject);
      return;
    }

    const script = document.createElement('script');
    script.src = PYODIDE_CDN_URL;
    script.async = true;
    script.onload = () => {
      if (window.loadPyodide) {
        window.loadPyodide({ indexURL: PYODIDE_INDEX_URL })
          .then(resolve)
          .catch(reject);
      } else {
        reject(new Error('Pyodide script loaded but window.loadPyodide is not available.'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Pyodide WASM runtime from CDN. Check your internet connection.'));
    };
    document.head.appendChild(script);
  });

  return window.__pyodideInstancePromise;
}

/**
 * Extracts key-value numeric metrics from the last valid JSON line of stdout
 */
function extractMetricsFromStdout(stdout: string): Record<string, number> {
  if (!stdout) return {};
  const lines = stdout.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const parsed = JSON.parse(line);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const validMetrics: Record<string, number> = {};
          let hasNumeric = false;
          for (const [k, v] of Object.entries(parsed)) {
            const numVal = typeof v === 'number' ? v : Number(v);
            if (!Number.isNaN(numVal) && typeof numVal === 'number') {
              validMetrics[k] = numVal;
              hasNumeric = true;
            }
          }
          if (hasNumeric) {
            return validMetrics;
          }
        }
      } catch {
        // Not valid JSON, continue searching upwards
      }
    }
  }
  return {};
}

export const CodePlayground: React.FC<CodePlaygroundProps> = ({
  projects,
  activeProjectId,
  currentUserRole,
  onExperimentSaved,
  onSaveRunRequest,
  readOnly = false,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>(STARTER_TEMPLATES[0].id);
  const [code, setCode] = useState<string>(STARTER_TEMPLATES[0].code);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [pyodideStatus, setPyodideStatus] = useState<'unloaded' | 'loading' | 'ready' | 'error'>('unloaded');
  const [pyodideError, setPyodideError] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<RunRecord[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [outputTab, setOutputTab] = useState<'console' | 'metrics' | 'history'>('console');
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [runToSave, setRunToSave] = useState<RunRecord | null>(null);

  const editorRef = useRef<any>(null);
  const isSupervisor = currentUserRole === 'Supervisor';
  const canExecute = !readOnly && !isSupervisor;

  const activeRun = runHistory.find((r) => r.id === activeRunId) || runHistory[0] || null;

  const handleOpenSaveModal = (run: RunRecord) => {
    if (onSaveRunRequest) {
      onSaveRunRequest(run);
    } else {
      setRunToSave(run);
      setIsSaveModalOpen(true);
    }
  };

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleTemplateChange = (templateId: string) => {
    const template = STARTER_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setCode(template.code);
      if (editorRef.current) {
        editorRef.current.setValue(template.code);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetCode = () => {
    const template = STARTER_TEMPLATES.find((t) => t.id === selectedTemplate) || STARTER_TEMPLATES[0];
    setCode(template.code);
    if (editorRef.current) {
      editorRef.current.setValue(template.code);
    }
  };

  const executeCode = useCallback(async () => {
    if (isRunning || !canExecute) return;

    setIsRunning(true);
    setOutputTab('console');
    const startTime = performance.now();
    let stdoutBuffer = '';
    let stderrBuffer = '';
    let exitCode = 0;

    try {
      if (pyodideStatus !== 'ready') {
        setPyodideStatus('loading');
      }

      const pyodide = await getPyodideInstance();
      setPyodideStatus('ready');
      setPyodideError(null);

      // Redirect stdout and stderr using Python sys module redirection
      pyodide.setStdout({
        batched: (text: string) => {
          stdoutBuffer += text + '\n';
        },
      });

      pyodide.setStderr({
        batched: (text: string) => {
          stderrBuffer += text + '\n';
        },
      });

      // Execute Python code with a 30-second timeout guard
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Execution timed out after 30 seconds.')), 30000)
      );

      await Promise.race([
        pyodide.runPythonAsync(code),
        timeoutPromise,
      ]);
    } catch (err: any) {
      exitCode = 1;
      const errorMsg = err?.message || String(err);
      stderrBuffer += (stderrBuffer ? '\n' : '') + errorMsg;
      if (pyodideStatus === 'loading') {
        setPyodideStatus('error');
        setPyodideError(errorMsg);
      }
    } finally {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      const metrics = extractMetricsFromStdout(stdoutBuffer);

      const newRun: RunRecord = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        code,
        language: 'python',
        stdout: stdoutBuffer,
        stderr: stderrBuffer,
        exitCode,
        metrics,
        durationMs,
      };

      setRunHistory((prev) => [newRun, ...prev]);
      setActiveRunId(newRun.id);
      setIsRunning(false);

      if (Object.keys(metrics).length > 0 && exitCode === 0) {
        setOutputTab('metrics');
      }
    }
  }, [code, isRunning, canExecute, pyodideStatus]);

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter to run
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        executeCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeCode]);

  return (
    <div
      className={`flex flex-col bg-surface-1 border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 rounded-2xl border-indigo-500/30' : 'h-[780px] w-full'
      }`}
    >
      {/* Top Header / Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-surface-2/80 border-b border-white/[0.08] backdrop-blur-md gap-3">
        {/* Left: Engine & Template Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Code2 className="w-4 h-4 text-indigo-400" />
            <span>Python 3.12 (WASM Engine)</span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Template:</span>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="bg-surface-3 border border-white/10 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500/50 hover:border-white/20 transition-colors cursor-pointer"
            >
              {STARTER_TEMPLATES.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.id} className="bg-surface-2 text-slate-200">
                  {tmpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyCode}
            title="Copy Code"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-surface-3/60 hover:bg-surface-3 border border-white/10 rounded-lg transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleResetCode}
            title="Reset to Template"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-surface-3/60 hover:bg-surface-3 border border-white/10 rounded-lg transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Reset</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 text-slate-300 hover:text-white bg-surface-3/60 hover:bg-surface-3 border border-white/10 rounded-lg transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {canExecute ? (
            <button
              onClick={executeCode}
              disabled={isRunning}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition-all duration-200 ${
                isRunning
                  ? 'bg-indigo-600/50 text-indigo-200 cursor-not-allowed border border-indigo-400/30'
                  : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white border border-indigo-400/40 hover:shadow-indigo-500/20 active:scale-[0.98]'
              }`}
            >
              {isRunning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Code</span>
                  <span className="hidden xl:inline text-[10px] opacity-70 bg-indigo-700/50 px-1 rounded">⌘↵</span>
                </>
              )}
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-xs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>Supervisor View Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Workspace (Split Grid) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
        {/* Left Side: Monaco Code Editor (7 cols) */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#1e1e1e]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-white/[0.06] text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-200 font-mono text-[11px]">experiment.py</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Pyodide Browser WASM Sandbox • In-Memory
            </div>
          </div>

          <div className="flex-1 min-h-[300px] relative">
            {typeof window === 'undefined' ? (
              <textarea
                readOnly
                value={code}
                className="w-full h-full bg-[#1e1e1e] text-slate-200 font-mono text-xs p-4 resize-none focus:outline-none"
              />
            ) : (
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={(value: string | undefined) => setCode(value || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  fontSize: 13.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', 'Consolas', monospace",
                  fontLigatures: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  glyphMargin: false,
                  folding: true,
                  lineDecorationsWidth: 10,
                  lineNumbersMinChars: 3,
                  renderLineHighlight: 'all',
                  automaticLayout: true,
                  tabSize: 4,
                  cursorBlinking: 'smooth',
                  smoothScrolling: true,
                  padding: { top: 12, bottom: 12 },
                  readOnly: isRunning,
                }}
              />
            )}

            {/* Quick helper badge overlay */}
            <div className="absolute bottom-3 right-4 pointer-events-none bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 text-[10px] text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Emit JSON on last line for auto-metrics</span>
            </div>
          </div>
        </div>

        {/* Right Side: Execution Output, Metrics & History (5 cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-surface-2/40">
          {/* Output Tabs Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2/90 border-b border-white/[0.08] backdrop-blur-md">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOutputTab('console')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  outputTab === 'console'
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
                onClick={() => setOutputTab('metrics')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  outputTab === 'metrics'
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
                onClick={() => setOutputTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  outputTab === 'history'
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

            {/* Save Run button */}
            {activeRun && canExecute && (
              <button
                onClick={() => handleOpenSaveModal(activeRun)}
                className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save as Exp</span>
              </button>
            )}
          </div>

          {/* Active Run Status Bar */}
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
              <span className="text-[11px] text-slate-500">
                {new Date(activeRun.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}

          {/* Output Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 font-mono text-xs">
            {/* Pyodide Loading / Error Banner */}
            {pyodideStatus === 'loading' && (
              <div className="mb-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                <div>
                  <div className="font-semibold text-xs">Initializing Pyodide WASM...</div>
                  <div className="text-[11px] text-indigo-400/80">Downloading Python standard libraries (~10MB CDN)</div>
                </div>
              </div>
            )}

            {pyodideStatus === 'error' && (
              <div className="mb-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs">Pyodide Engine Error</div>
                  <div className="text-[11px] text-rose-400/80">{pyodideError}</div>
                </div>
              </div>
            )}

            {/* TAB: CONSOLE */}
            {outputTab === 'console' && (
              <div className="space-y-3">
                {!activeRun && !isRunning && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-16 text-slate-500 font-sans">
                    <Terminal className="w-10 h-10 text-slate-600 mb-3 stroke-[1.5]" />
                    <p className="text-sm font-medium text-slate-400">
                      {canExecute ? 'Ready to execute code' : 'Supervisor Mode Active'}
                    </p>
                    <p className="text-xs text-slate-600 max-w-xs mt-1">
                      {canExecute ? (
                        <>
                          Press <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-slate-300 border border-white/10 font-mono text-[11px]">Run</kbd> or <kbd className="px-1.5 py-0.5 bg-surface-3 rounded text-slate-300 border border-white/10 font-mono text-[11px]">Ctrl+Enter</kbd> to run your script in the browser WASM sandbox.
                        </>
                      ) : (
                        'In-browser execution is restricted to active project researchers.'
                      )}
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
            {outputTab === 'metrics' && (
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

                    {canExecute && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleOpenSaveModal(activeRun)}
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
                      Print a JSON dictionary with numeric metrics on the final line (e.g. <code className="text-indigo-400">print(json.dumps(&#123;"accuracy": 0.94&#125;))</code>) to auto-extract metrics.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: HISTORY */}
            {outputTab === 'history' && (
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
                          setActiveRunId(run.id);
                          setOutputTab('console');
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
      </div>

      {/* Save Run as Experiment Modal */}
      {isSaveModalOpen && runToSave && (
        <SaveRunAsExperimentModal
          isOpen={isSaveModalOpen}
          onClose={() => {
            setIsSaveModalOpen(false);
            setRunToSave(null);
          }}
          run={runToSave}
          projects={projects}
          activeProjectId={activeProjectId}
          onSaved={(savedExp) => {
            onExperimentSaved?.(savedExp);
          }}
        />
      )}
    </div>
  );
};
