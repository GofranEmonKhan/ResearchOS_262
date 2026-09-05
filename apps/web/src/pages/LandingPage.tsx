import React, { useState } from 'react';
import { ConstellationCanvas } from '../components/landing/ConstellationCanvas';
import { Navbar } from '../components/landing/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { BentoGrid } from '../components/landing/BentoGrid';
import { RoleSwitcher } from '../components/landing/RoleSwitcher';
import { LifecycleTimeline } from '../components/landing/LifecycleTimeline';
import { PricingSection } from '../components/landing/PricingSection';
import { BlogsSection } from '../components/landing/BlogsSection';
import { SecuritySection } from '../components/landing/SecuritySection';
import { TestimonialsSection } from '../components/landing/TestimonialsSection';
import { FooterCTA } from '../components/landing/FooterCTA';
import { DoiPreviewModal } from '../components/landing/DoiPreviewModal';

interface LandingPageProps {
  onNavigateToApp?: () => void;
  onNavigate?: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToApp, onNavigate }) => {
  const [doiModalOpen, setDoiModalOpen] = useState(false);
  const [selectedDoi, setSelectedDoi] = useState('10.48550/arXiv.1706.03762');

  const handleOpenDoiModal = (doi?: string) => {
    if (doi) setSelectedDoi(doi);
    setDoiModalOpen(true);
  };

  const handleSignIn = () => {
    if (onNavigate) {
      onNavigate('/login');
    } else if (onNavigateToApp) {
      onNavigateToApp();
    }
  };

  const handleGetStarted = () => {
    if (onNavigate) {
      onNavigate('/signup');
    } else if (onNavigateToApp) {
      onNavigateToApp();
    } else {
      const pricingEl = document.getElementById('pricing');
      pricingEl?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#07070C] text-slate-100 selection:bg-purple-500/30 selection:text-purple-200 overflow-x-hidden font-sans">
      {/* Interactive Constellation Knowledge Graph Canvas */}
      <ConstellationCanvas />

      {/* Floating Glass Pill Navigation Bar */}
      <Navbar
        onSignInClick={handleSignIn}
        onGetStartedClick={handleGetStarted}
      />

      {/* Main Content Sections */}
      <main className="relative z-10 space-y-8 sm:space-y-12">
        {/* 1. Atmospheric Hero with Live Workbench Simulator */}
        <HeroSection
          onOpenDoiModal={handleOpenDoiModal}
          onGetStartedClick={handleGetStarted}
        />

        {/* 2. Bento Grid Core Modules Showcase (Features) */}
        <BentoGrid onOpenDoiModal={() => handleOpenDoiModal()} />

        {/* 3. Interactive Role Switcher: Faculty Supervision & Researcher Governance */}
        <RoleSwitcher />

        {/* 4. The 4-Stage Research Lifecycle Timeline */}
        <LifecycleTimeline />

        {/* 5. Pricing & Subscription Plans (3 Tiers) */}
        <PricingSection onSelectPlan={() => handleGetStarted()} />

        {/* 6. Blogs & Scholarly Insights Section */}
        <BlogsSection />

        {/* 7. Security, RLS & Ownership Architecture */}
        <SecuritySection />

        {/* 8. Academic Community Testimonials & Impact Metrics */}
        <TestimonialsSection />

        {/* 9. High-Conversion Footer CTA & Navigation */}
        <FooterCTA onLaunchWorkspace={handleGetStarted} />
      </main>

      {/* Interactive Literature Extraction Preview Modal */}
      <DoiPreviewModal
        initialQuery={selectedDoi}
        isOpen={doiModalOpen}
        onClose={() => setDoiModalOpen(false)}
        onLaunchWorkspace={handleGetStarted}
      />
    </div>
  );
};

export default LandingPage;
