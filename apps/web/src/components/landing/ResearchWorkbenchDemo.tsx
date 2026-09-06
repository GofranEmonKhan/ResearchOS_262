import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  BookOpen, 
  Cpu, 
  Activity, 
  UserCheck
} from 'lucide-react';

export const ResearchWorkbenchDemo: React.FC = () => {
  // Supervisor interactive state
  const [taskStatus, setTaskStatus] = useState<'submitted' | 'under_review' | 'approved' | 'revision'>('under_review');
  const [supervisorNote, setSupervisorNote] = useState<string>(
    'Benchmark looks solid on small batch sizes, but check memory overhead for sequence lengths > 2048 before final thesis inclusion.'
  );

  // Literature active tab state
  const [activeTab, setActiveTab] = useState<'gap' | 'methodology' | 'citation' | 'notes'>('gap');

  // Experiment run selector
  const [activeRun, setActiveRun] = useState<'run1' | 'run2' | 'run3'>('run3');

  const runs = {
    run1: { name: 'Run 01 (Baseline RNN)', loss: '0.412', accuracy: '82.4%', latency: '48ms', color: '#EF4444' },
    run2: { name: 'Run 02 (LSTM + Attention)', loss: '0.245', accuracy: '89.1%', latency: '32ms', color: '#38BDF8' },
    run3: { name: 'Run 03 (Self-Attention Transformer)', loss: '0.108', accuracy: '96.8%', latency: '11ms', color: '#8B5CF6' },
  };

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl card-glass border border-purple-500/25 p-4 sm:p-6 lg:p-8 shadow-[0_0_80px_-20px_rgba(139,92,246,0.3)] overflow-hidden">
      {/* Ambient background glows inside workbench */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Workbench Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>Interactive Live Simulation</span>
          </div>
          <span className="hidden sm:inline text-xs text-slate-400 font-mono">
            Project: <strong className="text-white font-medium">Neural Architecture Scaling (PI: Prof. Vance)</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden md:inline">Role View:</span>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <UserCheck className="w-3 h-3" />
            Supervisor & Lead Researcher Sync
          </span>
        </div>
      </div>

      {/* 3-Column Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5 relative z-10">
        
        {/* COLUMN 1: SUPERVISOR APPROVAL QUEUE */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-surface-1/80 border border-white/[0.07] p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Supervisor Approval Loop
                </h4>
              </div>
              {taskStatus === 'approved' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              )}
              {taskStatus === 'under_review' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Under Review
                </span>
              )}
              {taskStatus === 'revision' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Revision Req.
                </span>
              )}
            </div>

            {/* Task submission card */}
            <div className="p-3 rounded-lg bg-surface-2/90 border border-white/[0.06] mb-3">
              <div className="text-[11px] font-mono text-purple-300 mb-1">
                Milestone 02: Transformer Benchmarking
              </div>
              <div className="text-xs font-semibold text-white mb-2">
                Task: Memory Footprint vs. Recurrent Baselines
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span>Submitted by: <strong>Alex Chen (RA)</strong></span>
              </div>
            </div>

            {/* Supervisor note editor simulation */}
            <div className="p-3 rounded-lg bg-black/40 border border-white/[0.06] mb-3">
              <div className="text-[10px] uppercase font-mono text-slate-400 mb-1 flex items-center justify-between">
                <span>Supervisor Structured Feedback Note</span>
                <span className="text-purple-400">Audited</span>
              </div>
              <p className="text-xs text-slate-300 italic leading-relaxed">
                "{supervisorNote}"
              </p>
            </div>
          </div>

          {/* Interactive Action Buttons */}
          <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
            <button
              onClick={() => {
                setTaskStatus('revision');
                setSupervisorNote('Please re-run ablation on sequence length 4096 and attach VRAM usage plot.');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                taskStatus === 'revision'
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                  : 'bg-white/[0.04] hover:bg-rose-500/10 text-slate-300 hover:text-rose-300 border border-white/10'
              }`}
            >
              <RotateCcw className="w-3 h-3" />
              Request Revision
            </button>
            <button
              onClick={() => {
                setTaskStatus('approved');
                setSupervisorNote('Verified and approved. Milestone unlocked for manuscript drafting.');
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer ${
                taskStatus === 'approved'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'btn-electric-pill'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Approve (Sign Off)
            </button>
          </div>
        </div>

        {/* COLUMN 2: SMART LITERATURE READER */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-surface-1/80 border border-white/[0.07] p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Smart Paper Reader
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400">
                PDF Sync Active
              </span>
            </div>

            {/* Reading Viewport Excerpt */}
            <div className="p-3 rounded-lg bg-surface-2/90 border border-white/[0.06] mb-3">
              <div className="text-[10px] font-mono text-slate-400 mb-1">
                NeurIPS 2017 • Vaswani et al.
              </div>
              <div className="text-xs font-bold text-white mb-2 leading-snug">
                Attention Is All You Need
              </div>
              <div className="p-2 rounded bg-purple-900/20 border-l-2 border-l-purple-400 text-xs text-slate-200 leading-relaxed font-serif">
                "...we propose the Transformer, a model architecture eschewing recurrence and relying entirely on an attention mechanism to draw global dependencies..."
              </div>
            </div>

            {/* Smart Sidebar Interactive Tabs */}
            <div className="flex items-center gap-1 mb-2 bg-black/40 p-1 rounded-lg border border-white/[0.06]">
              <button
                onClick={() => setActiveTab('gap')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                  activeTab === 'gap' ? 'bg-purple-600/40 text-purple-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gap
              </button>
              <button
                onClick={() => setActiveTab('methodology')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                  activeTab === 'methodology' ? 'bg-purple-600/40 text-purple-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Method
              </button>
              <button
                onClick={() => setActiveTab('citation')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                  activeTab === 'citation' ? 'bg-purple-600/40 text-purple-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Why Cite?
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex-1 py-1 text-[11px] font-medium rounded transition cursor-pointer ${
                  activeTab === 'notes' ? 'bg-purple-600/40 text-purple-200' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Notes 🔒
              </button>
            </div>

            {/* Smart Field Display */}
            <div className="p-3 rounded-lg bg-surface-2 border border-white/[0.06] min-h-[90px] text-xs">
              {activeTab === 'gap' && (
                <div>
                  <div className="text-[10px] uppercase font-mono text-purple-400 mb-1">Identified Research Gap</div>
                  <p className="text-slate-300 leading-relaxed">
                    Recurrent architectures preclude parallelization within training examples, creating severe compute limits for large context sizes.
                  </p>
                </div>
              )}
              {activeTab === 'methodology' && (
                <div>
                  <div className="text-[10px] uppercase font-mono text-indigo-400 mb-1">Methodology Core</div>
                  <p className="text-slate-300 leading-relaxed">
                    Scaled dot-product attention computed in parallel across multi-head projections with positional encodings.
                  </p>
                </div>
              )}
              {activeTab === 'citation' && (
                <div>
                  <div className="text-[10px] uppercase font-mono text-sky-400 mb-1">Citation Purpose (Why I Cited This)</div>
                  <p className="text-slate-300 leading-relaxed">
                    Baseline architecture for Section 3 comparison benchmark against our proposed Sparse Attention variant.
                  </p>
                </div>
              )}
              {activeTab === 'notes' && (
                <div>
                  <div className="text-[10px] uppercase font-mono text-emerald-400 mb-1">Private Personal Notes (Confidential)</div>
                  <p className="text-slate-300 leading-relaxed">
                    Need to verify if their dropout rate of 0.1 transfers cleanly to our biomedical NLP dataset without overfitting.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>Sidebar extraction synced</span>
            <span className="text-purple-400 font-mono">1-Click BibTeX Export</span>
          </div>
        </div>

        {/* COLUMN 3: EXPERIMENT TELEMETRY & LOSS CURVES */}
        <div className="lg:col-span-4 flex flex-col justify-between rounded-xl bg-surface-1/80 border border-white/[0.07] p-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Experiment Telemetry
                </h4>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <Cpu className="w-3 h-3 text-purple-400" />
                <span>RTX 4090 (94%)</span>
              </div>
            </div>

            {/* Run Selection Pills */}
            <div className="flex items-center gap-1.5 mb-3">
              {(['run1', 'run2', 'run3'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveRun(key)}
                  className={`flex-1 py-1 px-1.5 rounded text-[10px] font-mono transition text-center truncate cursor-pointer ${
                    activeRun === key
                      ? 'bg-purple-600/30 border border-purple-500/50 text-white font-bold'
                      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
                  }`}
                >
                  {runs[key].name.split(' ')[0] + ' ' + runs[key].name.split(' ')[1]}
                </button>
              ))}
            </div>

            {/* Animated SVG Loss / Accuracy Curve */}
            <div className="p-3 rounded-lg bg-surface-2/90 border border-white/[0.06] mb-3">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                <span>Loss Trajectory (50 Epochs)</span>
                <span style={{ color: runs[activeRun].color }} className="font-semibold">
                  Final Loss: {runs[activeRun].loss}
                </span>
              </div>

              {/* Dynamic SVG Sparkline */}
              <div className="h-20 w-full flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
                  <defs>
                    <linearGradient id="grad-glow" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={runs[activeRun].color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={runs[activeRun].color} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="15" x2="200" y2="15" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="0" y1="35" x2="200" y2="35" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                  <line x1="0" y1="55" x2="200" y2="55" stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />

                  {/* Curve based on active run */}
                  {activeRun === 'run1' && (
                    <path
                      d="M 0,10 Q 50,30 100,38 T 200,42"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2.5"
                    />
                  )}
                  {activeRun === 'run2' && (
                    <path
                      d="M 0,8 Q 50,25 100,42 T 200,50"
                      fill="none"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                    />
                  )}
                  {activeRun === 'run3' && (
                    <path
                      d="M 0,5 Q 40,30 90,52 T 200,56"
                      fill="none"
                      stroke="#8B5CF6"
                      strokeWidth="3"
                    />
                  )}
                </svg>
              </div>
            </div>

            {/* Run Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded bg-black/40 border border-white/[0.06]">
                <div className="text-[10px] text-slate-400 font-mono">Validation Accuracy</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">{runs[activeRun].accuracy}</div>
              </div>
              <div className="p-2 rounded bg-black/40 border border-white/[0.06]">
                <div className="text-[10px] text-slate-400 font-mono">Inference Latency</div>
                <div className="text-sm font-bold text-sky-400 font-mono">{runs[activeRun].latency}</div>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>Diff vs Baseline: <strong className="text-emerald-400">+14.4%</strong></span>
            <span className="text-purple-400 font-mono">Audit Hash Locked</span>
          </div>
        </div>

      </div>
    </div>
  );
};
