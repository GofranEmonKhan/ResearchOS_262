import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface PricingSectionProps {
  onSelectPlan?: (planName: string) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onSelectPlan }) => {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: 'Scholar',
      badge: 'Individual Scholars',
      priceMonthly: '$0',
      priceAnnual: '$0',
      period: 'forever',
      description: 'Ideal for independent researchers, undergraduate theses, and individual scholars.',
      highlighted: false,
      ctaText: 'Get Started Free',
      ctaStyle: 'btn-ghost-glass',
      features: [
        'Up to 2 Personal Research Projects',
        '500 MB PDF Literature Storage',
        'Automatic CrossRef DOI Metadata Fetch',
        'Smart Research Sidebar (Manual Notes)',
        'Basic Experiment Logger (10 runs / project)',
        'Community Q&A Forum Access',
      ],
    },
    {
      name: 'Lab Group',
      badge: '✦ MOST POPULAR FOR LABS & PIS',
      priceMonthly: '$29',
      priceAnnual: '$24',
      period: 'per seat / month',
      description: 'Complete research governance and collaboration for faculty, PIs, postdocs, and PhD cohorts.',
      highlighted: true,
      ctaText: 'Launch Lab Group →',
      ctaStyle: 'btn-electric-pill',
      features: [
        'Unlimited Supervised & Collaborative Projects',
        'Full Supervisor Approval Engine & Sign-Offs',
        'Unlimited PDF Storage & In-Browser Annotation',
        'Smart Citation Purpose Store ("Why I Cited This")',
        'Experiment Diff & Live Loss Trajectory Studio',
        'Manuscript Studio with Live LaTeX & Inline Review',
        'AI Research Copilot (Literature Gap Synthesizer)',
        'Role-Based Deliverable Submission Workflows',
      ],
    },
    {
      name: 'Department',
      badge: 'Institutes & Universities',
      priceMonthly: 'Custom',
      priceAnnual: 'Custom',
      period: 'annual institutional license',
      description: 'Tailored deployment for university departments, academic centers, and enterprise R&D.',
      highlighted: false,
      ctaText: 'Contact Department Sales',
      ctaStyle: 'btn-ghost-glass',
      features: [
        'Everything in Lab Group Plan',
        'Dedicated Department Admin Console',
        'Institutional SSO / SAML (EduGAIN, Shibboleth)',
        'Custom Storage Buckets & Local GPU Clusters',
        'Auditable Compliance & Submission Logs',
        'Custom Data Retention & Privacy Policies',
        'Dedicated Academic Success Manager & 24/7 SLA',
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono mb-3">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          Transparent Academic Plans
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white tracking-tight mb-4">
          Simple, Predictable Plans for{' '}
          <span className="text-gradient-cyan-violet italic">Every Stage</span> of Research.
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
          Start for free as an individual scholar, or empower your entire laboratory with faculty supervision and AI-accelerated workflows.
        </p>

        {/* Billing Switcher */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-xs sm:text-sm font-medium ${!annual ? 'text-white' : 'text-slate-400'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setAnnual(!annual)}
            className="w-12 h-6 rounded-full bg-surface-2 border border-purple-500/40 p-0.5 relative transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
            aria-label="Toggle annual billing"
          >
            <div
              className={`w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-transform ${
                annual ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-xs sm:text-sm font-medium flex items-center gap-1.5 ${annual ? 'text-white' : 'text-slate-400'}`}>
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* 3-Tier Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative ${
              plan.highlighted
                ? 'bg-[#131126]/90 border-2 border-purple-500/50 shadow-[0_0_50px_-10px_rgba(139,92,246,0.35)] md:-translate-y-2'
                : 'card-glass border border-white/[0.08] hover:border-purple-500/30'
            }`}
          >
            {/* Ambient inner glow for highlighted card */}
            {plan.highlighted && (
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
            )}

            <div>
              {/* Plan Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">{plan.name}</h3>
                <span
                  className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full ${
                    plan.highlighted
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold'
                      : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                  }`}
                >
                  {plan.badge}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                {plan.description}
              </p>

              {/* Price Display */}
              <div className="flex items-baseline gap-1.5 pb-6 mb-6 border-b border-white/[0.08]">
                <span className="text-4xl sm:text-5xl font-extrabold font-sans text-white">
                  {annual ? plan.priceAnnual : plan.priceMonthly}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {plan.priceMonthly !== 'Custom' ? `/ ${plan.period}` : plan.period}
                </span>
              </div>

              {/* Features List */}
              <div className="space-y-3 mb-8">
                <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                  Included Features:
                </div>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                    <Check className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => onSelectPlan?.(plan.name)}
              className={`w-full py-3 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition ${plan.ctaStyle}`}
            >
              <span>{plan.ctaText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Reassurance Footer */}
      <div className="mt-12 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>No credit card required to start free. Academic email verification enabled.</span>
      </div>
    </section>
  );
};
