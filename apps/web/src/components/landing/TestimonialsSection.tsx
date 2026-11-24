import React from 'react';
import { Quote, Award } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const metrics = [
    { label: 'Data Isolation', value: '100%', subtext: 'PostgreSQL RLS Protected' },
    { label: 'Literature Synthesis', value: '4.5x', subtext: 'Faster Gap Extraction' },
    { label: 'Untracked Configs', value: '0', subtext: 'Strict Reproducibility' },
    { label: 'PI Advising Hours Saved', value: '4+ hrs', subtext: 'Per Week Per Lab Seat' },
  ];

  const testimonials = [
    {
      quote:
        'The Supervisor Approval Loop transformed my lab. Instead of drowning in 40+ chaotic email threads and fragmented drafts, I have a clear queue of submitted deliverables with structured feedback notes.',
      name: 'Prof. Sarah Vance',
      role: 'Principal Investigator & Faculty PI',
      institution: 'Stanford AI & Neural Systems Lab',
      avatarBg: 'from-purple-600 to-indigo-600',
    },
    {
      quote:
        'Being able to log hyperparameter configs, dataset hashes, and output loss curves directly into my project tasks gave me complete peace of mind when writing my doctoral thesis.',
      name: 'Alex Chen',
      role: 'PhD Candidate in Machine Learning',
      institution: 'MIT Computer Science & AI Lab (CSAIL)',
      avatarBg: 'from-indigo-600 to-sky-600',
    },
    {
      quote:
        'The Citation Purpose feature is revolutionary. When I open my manuscript editor, I can immediately see why I cited each paper six months ago. No more guessing why a reference was added.',
      name: 'Dr. Marcus Thorne',
      role: 'Postdoctoral Research Fellow',
      institution: 'Oxford Department of Robotics',
      avatarBg: 'from-sky-600 to-emerald-600',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-20">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="card-glass rounded-2xl p-5 sm:p-6 text-center border border-white/[0.08]"
          >
            <div className="text-3xl sm:text-4xl font-extrabold font-sans text-gradient-cyan-violet mb-1">
              {metric.value}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-white mb-0.5">{metric.label}</div>
            <div className="text-[11px] font-mono text-slate-400">{metric.subtext}</div>
          </div>
        ))}
      </div>

      {/* Testimonials Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-3">
          <Award className="w-3.5 h-3.5 text-purple-400" />
          Academic Community Trust
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight mb-4">
          Trusted by <span className="text-gradient-cyan-violet italic">Leading Labs</span> & Academic PIs.
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Hear how ResearchOS empowers laboratories to publish higher quality research with less administrative burden.
        </p>
      </div>

      {/* 3-Column Testimonials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {testimonials.map((t) => (
          <div
            key={t.name}
            className="card-glass-interactive rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-white/[0.08]"
          >
            <div>
              <Quote className="w-8 h-8 text-purple-400/40 mb-4" />
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed italic mb-6">
                "{t.quote}"
              </p>
            </div>

            <div className="pt-4 border-t border-white/[0.06] flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-tr ${t.avatarBg} flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-md`}>
                {t.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-bold text-white">{t.name}</div>
                <div className="text-[11px] text-purple-300 font-medium">{t.role}</div>
                <div className="text-[10px] text-slate-400 font-mono">{t.institution}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
