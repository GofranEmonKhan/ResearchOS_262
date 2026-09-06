import React from 'react';
import { UploadCloud, Activity, CheckCircle2, Send, ArrowRight } from 'lucide-react';

export const LifecycleTimeline: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: UploadCloud,
      title: 'Ingest & Analyze',
      color: 'from-purple-500 to-indigo-500',
      badge: 'Literature & Gaps',
      description:
        'Upload papers (PDF) or import DOIs. Automatic metadata extraction instantly populates title, authors, DOI, and fills the Smart Research Sidebar with research gaps and limitations.',
    },
    {
      num: '02',
      icon: Activity,
      title: 'Experiment & Validate',
      color: 'from-indigo-500 to-sky-500',
      badge: 'Reproducibility',
      description:
        'Log hyperparameter JSON configs, model weights, dataset hashes, and execution metrics. Compare runs side-by-side with synchronized loss curves and diff tables.',
    },
    {
      num: '03',
      icon: CheckCircle2,
      title: 'Review & Supervise',
      color: 'from-sky-500 to-emerald-500',
      badge: 'Faculty Sign-Off',
      description:
        'Submit deliverables directly to your PI. The supervisor reviews submitted evidence, requests revisions with structured notes, or approves and locks milestones.',
    },
    {
      num: '04',
      icon: Send,
      title: 'Draft & Publish',
      color: 'from-emerald-500 to-purple-500',
      badge: 'Manuscript Studio',
      description:
        'Collaboratively write manuscripts with live LaTeX math, resolve inline peer-review comments, and export complete, verified BibTeX bibliographies.',
    },
  ];

  return (
    <section id="literature" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-3">
          End-to-End Scientific Workflow
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight mb-4">
          From First Hypothesis to{' '}
          <span className="text-gradient-cyan-violet italic">Final Publication</span>.
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          ResearchOS supports every phase of the scholarly lifecycle with precision governance and seamless collaboration.
        </p>
      </div>

      {/* 4-Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="card-glass rounded-2xl sm:rounded-3xl p-6 flex flex-col justify-between border border-white/[0.08] hover:border-purple-500/30 transition-all duration-300 relative group"
            >
              <div>
                {/* Step number and icon */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-bold font-serif text-slate-500 group-hover:text-purple-400 transition-colors">
                    {step.num}
                  </span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${step.color} p-0.5 shadow-lg flex items-center justify-center`}>
                    <div className="w-full h-full bg-[#0D0C18] rounded-[10px] flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>

                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.04] border border-white/[0.08] text-purple-300 mb-2">
                  {step.badge}
                </span>

                <h3 className="text-lg font-bold text-white font-serif mb-2.5">
                  {step.title}
                </h3>

                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-20 text-purple-500/40">
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
