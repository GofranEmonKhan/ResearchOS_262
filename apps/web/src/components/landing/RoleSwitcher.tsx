import React, { useState } from 'react';
import { 
  GraduationCap, 
  Building2, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  Lock, 
  FileText, 
  ArrowRight,
  Activity,
  Users
} from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const [activeRole, setActiveRole] = useState<'researcher' | 'supervisor'>('researcher');

  return (
    <section id="supervision" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto scroll-mt-28">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-3">
          <Users className="w-3.5 h-3.5 text-purple-400" />
          Role-Tailored Intelligence
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight mb-4">
          Architected for Both{' '}
          <span className="text-gradient-cyan-violet italic">Researchers</span> &{' '}
          <span className="text-gradient-violet italic">Supervisors</span>.
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Clear role boundaries: Supervisors govern milestones and approve submissions. Researchers focus on deep literature analysis, experiment tracking, and manuscript drafting.
        </p>
      </div>

      {/* Role Toggle Switcher */}
      <div className="flex justify-center mb-10">
        <div className="p-1.5 rounded-full card-glass border border-purple-500/25 flex items-center gap-2 shadow-glow-sm">
          <button
            onClick={() => setActiveRole('researcher')}
            className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeRole === 'researcher'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>For Researchers & PhDs</span>
          </button>
          <button
            onClick={() => setActiveRole('supervisor')}
            className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeRole === 'supervisor'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>For Supervisors & Faculty PIs</span>
          </button>
        </div>
      </div>

      {/* Active Role Content Card */}
      <div className="card-glass rounded-2xl sm:rounded-3xl border border-purple-500/20 p-6 sm:p-10 shadow-2xl relative overflow-hidden transition-all duration-300">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {activeRole === 'researcher' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Description */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-mono border border-sky-500/20">
                <GraduationCap className="w-4 h-4" />
                <span>Researcher & Graduate Student Flow</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white font-serif">
                Execute Research Without Administrative Friction
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Focus on high-impact scholarship. Upload papers to get automated metadata, annotate in-situ with structured gap fields, log hyperparameter runs, and submit deliverables directly to your PI.
              </p>

              <div className="space-y-3 text-xs sm:text-sm text-slate-200">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-1/60 border border-white/[0.06]">
                  <BookOpen className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Private Smart Literature Notes</strong>
                    <span>Your personal research notes remain strictly private by default until you choose to push them to the team.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-1/60 border border-white/[0.06]">
                  <Layers className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Reproducible Run Logging</strong>
                    <span>Store model configs, hyperparameter JSONs, and loss curves attached directly to project tasks.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-1/60 border border-white/[0.06]">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">LaTeX Drafting with Citation Purpose</strong>
                    <span>Auto-complete BibTeX citations with instant reminders of why you cited each paper.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup */}
            <div className="lg:col-span-6 rounded-2xl bg-surface-1 border border-white/[0.08] p-5 shadow-inner space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-xs font-mono text-purple-300">Researcher Dashboard: Alex Chen</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  Active RA
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-2 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Current Task: Benchmark Scaled Attention</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">
                    Ready to Submit
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Deliverable: Attached 3 experiment runs, validation plots, and 2 literature comparison notes.
                </p>
                <div className="pt-2 flex items-center justify-end">
                  <button className="btn-electric-pill px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer">
                    <span>Submit for PI Approval</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2/70 border border-white/[0.06]">
                <div className="text-xs font-semibold text-slate-200 mb-1">Required Reading from Supervisor:</div>
                <div className="flex items-center justify-between text-xs text-slate-300 bg-black/30 p-2 rounded-lg">
                  <span className="truncate">"Scaling Laws for Neural Language Models"</span>
                  <span className="text-[10px] font-mono text-purple-400 shrink-0 ml-2">Due in 3 days</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Description */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-mono border border-purple-500/20">
                <Building2 className="w-4 h-4" />
                <span>Faculty & Principal Investigator Governance</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white font-serif">
                Multi-Project Lab Governance with 1-Click Approvals
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Oversee graduate students, research assistants, and postdocs across multiple funded projects. Assign tasks, lock milestones upon completion, and maintain full oversight of experiment reproducibility.
              </p>

              <div className="space-y-3 text-xs sm:text-sm text-slate-200">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-1/60 border border-white/[0.06]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Supervisor Approval Queue</strong>
                    <span>Review student deliverables with structured feedback notes and 1-click Approve or Request Revision.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-1/60 border border-white/[0.06]">
                  <Lock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Milestone Locking & Integrity</strong>
                    <span>Lock project milestones once finalized so underlying deliverable tasks cannot be altered.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-xl bg-surface-1/60 border border-white/[0.06]">
                  <Activity className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">Lab Velocity Heatmap</strong>
                    <span>Real-time tracking of student reading pace, experiment counts, and milestone completion percentages.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Interactive Mockup */}
            <div className="lg:col-span-6 rounded-2xl bg-surface-1 border border-white/[0.08] p-5 shadow-inner space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="text-xs font-mono text-purple-300">PI Supervision Console: Prof. Sarah Vance</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300">
                  4 Active Grants
                </span>
              </div>
              
              <div className="p-3.5 rounded-xl bg-surface-2 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Pending Approval: 2 Deliverables</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-200">Alex Chen • Transformer Benchmark</div>
                    <div className="text-[10px] text-slate-400">Attached: 3 runs, validation plot, notebook</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-purple-600/30 text-purple-300 text-[10px] font-mono">
                    Review
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2/70 border border-white/[0.06]">
                <div className="text-xs font-semibold text-slate-200 mb-2">Supervised Students Progress:</div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Alex Chen (PhD Year 2)</span>
                    <span className="text-emerald-400 font-bold">88% Milestone 2</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <span>Maria Santos (Postdoc)</span>
                    <span className="text-sky-400 font-bold">95% Draft Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
