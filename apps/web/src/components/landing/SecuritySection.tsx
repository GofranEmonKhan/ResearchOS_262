import React from 'react';
import { ShieldCheck, Lock, Key, Database, FileCheck } from 'lucide-react';

export const SecuritySection: React.FC = () => {
  const securityPillars = [
    {
      icon: Lock,
      title: 'Ownership Beats Role',
      desc: 'Inside a project, researchers can only edit their own notes and experiments. Private paper summaries and drafts remain completely confidential to authors until explicitly shared.',
    },
    {
      icon: Database,
      title: 'PostgreSQL Row-Level Security (RLS)',
      desc: 'Enforced at the database engine level via Supabase Postgres. No client-side bypasses or direct unsecured table queries.',
    },
    {
      icon: Key,
      title: 'Dual-Layer JWT & Profile RBAC',
      desc: 'Verified JWT session authentication combined with live profile lookup in Express. Admin IT cannot snoop into private research content or draft papers.',
    },
    {
      icon: FileCheck,
      title: 'Auditable State Integrity',
      desc: 'Every task submission, supervisor approval, milestone lock, and experiment diff is tracked in an immutable, timestamped audit log.',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="card-glass rounded-3xl p-8 sm:p-12 border border-purple-500/20 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              Academic Privacy & Security Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-serif text-white tracking-tight mb-4">
              Your Research IP & Unpublished Data Remain{' '}
              <span className="text-gradient-cyan-violet italic">100% Confidential</span>.
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Designed from the ground up for academic rigor, departmental compliance, and intellectual property protection.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {securityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="p-6 rounded-2xl bg-surface-1/90 border border-white/[0.06] hover:border-purple-500/30 transition flex items-start gap-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0 mt-1">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans mb-1.5 flex items-center gap-2">
                      <span>{pillar.title}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {pillar.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
