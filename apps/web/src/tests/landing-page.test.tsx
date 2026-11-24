import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

// Components
import { LandingPage } from '../pages/LandingPage';
import { Navbar } from '../components/landing/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { BentoGrid } from '../components/landing/BentoGrid';
import { RoleSwitcher } from '../components/landing/RoleSwitcher';
import { LifecycleTimeline } from '../components/landing/LifecycleTimeline';
import { PricingSection } from '../components/landing/PricingSection';
import { BlogsSection, BLOG_POSTS } from '../components/landing/BlogsSection';
import { BlogModal } from '../components/landing/BlogModal';
import { DoiPreviewModal } from '../components/landing/DoiPreviewModal';
import { ResearchWorkbenchDemo } from '../components/landing/ResearchWorkbenchDemo';
import { SecuritySection } from '../components/landing/SecuritySection';
import { TestimonialsSection } from '../components/landing/TestimonialsSection';
import { FooterCTA } from '../components/landing/FooterCTA';

describe('ResearchOS Landing Page Comprehensive Test Suite', () => {

  it('1. should render the complete LandingPage without errors and contain all critical sections', () => {
    const html = renderToString(<LandingPage />);
    assert.ok(html.length > 5000, 'Landing page HTML should be substantial');

    // Section Anchors
    assert.ok(html.includes('id="features"'), 'Must contain features section anchor');
    assert.ok(html.includes('id="supervision"'), 'Must contain supervision section anchor');
    assert.ok(html.includes('id="literature"'), 'Must contain literature anchor');
    assert.ok(html.includes('id="experiments"'), 'Must contain experiments anchor');
    assert.ok(html.includes('id="pricing"'), 'Must contain pricing section anchor');
    assert.ok(html.includes('id="blogs"'), 'Must contain blogs section anchor');

    // Section ordering verification: Features must appear before Supervision
    const featuresIndex = html.indexOf('id="features"');
    const supervisionIndex = html.indexOf('id="supervision"');
    assert.ok(
      featuresIndex < supervisionIndex,
      'Features section must be placed before Supervision section in the DOM'
    );
  });

  it('2. should render Navbar with brand identity and all 6 navigation links', () => {
    const html = renderToString(<Navbar />);
    assert.ok(html.includes('Research'), 'Navbar must have brand text');
    assert.ok(html.includes('Features'), 'Navbar must have Features link');
    assert.ok(html.includes('Supervision'), 'Navbar must have Supervision link');
    assert.ok(html.includes('Literature'), 'Navbar must have Literature link');
    assert.ok(html.includes('Experiments'), 'Navbar must have Experiments link');
    assert.ok(html.includes('Pricing'), 'Navbar must have Pricing link');
    assert.ok(html.includes('Blogs'), 'Navbar must have Blogs link');
    assert.ok(html.includes('Sign In'), 'Navbar must have Sign In CTA');
    assert.ok(html.includes('Get Started'), 'Navbar must have Get Started CTA');
  });

  it('3. should render HeroSection with high-impact serif headline and DOI search pill', () => {
    const html = renderToString(<HeroSection onOpenDoiModal={() => {}} />);
    assert.ok(html.includes('Accelerate Discovery'), 'Hero must contain primary headline');
    assert.ok(html.includes('Literature Review'), 'Hero must contain Literature Review highlight');
    assert.ok(html.includes('Peer-Reviewed Publication'), 'Hero must contain Publication highlight');
    assert.ok(html.includes('Attention Is All You Need'), 'Hero must have demo DOI sample chip');
    assert.ok(html.includes('AlphaFold (Nature)'), 'Hero must have AlphaFold sample chip');
    assert.ok(html.includes('Explore Smart Extraction'), 'Hero must have smart extraction button');
  });

  it('4. should render Live Research Workbench Simulator with all 3 interactive columns', () => {
    const html = renderToString(<ResearchWorkbenchDemo />);
    // Column 1: Supervisor Loop
    assert.ok(html.includes('Supervisor Approval Loop'), 'Workbench must have Supervisor Approval Loop');
    assert.ok(html.includes('Request Revision'), 'Workbench must have Request Revision action');
    assert.ok(html.includes('Approve (Sign Off)'), 'Workbench must have Approve action');

    // Column 2: Smart Paper Reader
    assert.ok(html.includes('Smart Paper Reader'), 'Workbench must have Smart Paper Reader');
    assert.ok(html.includes('Identified Research Gap'), 'Workbench must have research gap tab');
    assert.ok(html.includes('Vaswani et al.'), 'Workbench must have paper excerpt');

    // Column 3: Telemetry & Loss Curves
    assert.ok(html.includes('Experiment Telemetry'), 'Workbench must have Experiment Telemetry');
    assert.ok(html.includes('RTX 4090'), 'Workbench must have GPU telemetry');
    assert.ok(html.includes('Loss Trajectory'), 'Workbench must have loss curve section');
  });

  it('5. should render BentoGrid with all 6 core module cards', () => {
    const html = renderToString(<BentoGrid onOpenDoiModal={() => {}} />);
    assert.ok(html.includes('Smart Literature Manager &amp; Citation Store') || html.includes('Smart Literature Manager & Citation Store'), 'Card 1: Smart Literature');
    assert.ok(html.includes('Supervisor Approval Loop'), 'Card 2: Supervisor Approval Loop');
    assert.ok(html.includes('Experiment &amp; Parameter Diff') || html.includes('Experiment & Parameter Diff'), 'Card 3: Experiment Diff');
    assert.ok(html.includes('Manuscript Studio &amp; Review') || html.includes('Manuscript Studio & Review'), 'Card 4: Manuscript Studio');
    assert.ok(html.includes('Lab Resource Marketplace'), 'Card 5: Lab Marketplace');
    assert.ok(html.includes('AI Research Assistant &amp; pgvector Index') || html.includes('AI Research Assistant & pgvector Index'), 'Card 6: AI pgvector');
  });

  it('6. should render RoleSwitcher with Researcher and Supervisor personas', () => {
    const html = renderToString(<RoleSwitcher />);
    assert.ok(html.includes('For Researchers &amp; PhDs') || html.includes('For Researchers & PhDs'), 'RoleSwitcher must have Researcher toggle');
    assert.ok(html.includes('For Supervisors &amp; Faculty PIs') || html.includes('For Supervisors & Faculty PIs'), 'RoleSwitcher must have Supervisor toggle');
    assert.ok(html.includes('Private Smart Literature Notes'), 'RoleSwitcher must mention private notes');
    assert.ok(html.includes('Reproducible Run Logging'), 'RoleSwitcher must mention run logging');
  });

  it('7. should render LifecycleTimeline with all 4 sequential stages', () => {
    const html = renderToString(<LifecycleTimeline />);
    assert.ok(html.includes('Ingest &amp; Analyze') || html.includes('Ingest & Analyze'), 'Stage 1: Ingest');
    assert.ok(html.includes('Experiment &amp; Validate') || html.includes('Experiment & Validate'), 'Stage 2: Experiment');
    assert.ok(html.includes('Review &amp; Supervise') || html.includes('Review & Supervise'), 'Stage 3: Supervise');
    assert.ok(html.includes('Draft &amp; Publish') || html.includes('Draft & Publish'), 'Stage 4: Publish');
  });

  it('8. should render PricingSection with 3 subscription tiers and billing toggle', () => {
    const html = renderToString(<PricingSection />);
    assert.ok(html.includes('Scholar'), 'Plan 1: Scholar Plan');
    assert.ok(html.includes('Lab Group'), 'Plan 2: Lab Group Plan');
    assert.ok(html.includes('Department'), 'Plan 3: Department Plan');
    assert.ok(html.includes('Monthly Billing'), 'Must have Monthly billing option');
    assert.ok(html.includes('Annual Billing'), 'Must have Annual billing option');
    assert.ok(html.includes('Save 20%'), 'Must have 20% savings badge');
    assert.ok(html.includes('MOST POPULAR FOR LABS'), 'Lab Group must be highlighted');
  });

  it('9. should render BlogsSection with all 3 methodology articles', () => {
    const html = renderToString(<BlogsSection />);
    assert.ok(html.includes('Dr. Elena Rostova'), 'Blog 1 author must be present');
    assert.ok(html.includes('Structured Citation Purposes'), 'Blog 1 title must be present');
    assert.ok(html.includes('Marcus Vance, PhD'), 'Blog 2 author must be present');
    assert.ok(html.includes('Works on My Machine'), 'Blog 2 title must be present');
    assert.ok(html.includes('Prof. Julian Thorne'), 'Blog 3 author must be present');
    assert.ok(html.includes('Supervisor Approval Loop'), 'Blog 3 title must be present');
  });

  it('10. should render BlogModal when active with full article content', () => {
    const firstPost = BLOG_POSTS[0];
    const html = renderToString(<BlogModal post={firstPost} isOpen={true} onClose={() => {}} />);
    assert.ok(html.includes(firstPost.title), 'Modal must render article title');
    assert.ok(html.includes(firstPost.author), 'Modal must render author name');
    assert.ok(html.includes('Executive Takeaway'), 'Modal must have key takeaway callout');
    assert.ok(html.includes(firstPost.keyTakeaway), 'Modal must render key takeaway text');
    assert.ok(html.includes('Close Article'), 'Modal must have close button');
  });

  it('11. should render DoiPreviewModal with extracted research gap, citation purpose, and BibTeX', () => {
    const html = renderToString(
      <DoiPreviewModal
        initialQuery="10.48550/arXiv.1706.03762"
        isOpen={true}
        onClose={() => {}}
      />
    );
    assert.ok(html.includes('Attention Is All You Need'), 'Modal must render paper title');
    assert.ok(html.includes('Identified Research Gap'), 'Modal must have Research Gap section');
    assert.ok(html.includes('Citation Purpose (Why I Cited This)'), 'Modal must have Citation Purpose section');
    assert.ok(html.includes('Formatted BibTeX'), 'Modal must have BibTeX section');
    assert.ok(html.includes('Copy BibTeX'), 'Modal must have Copy BibTeX button');
  });

  it('12. should render SecuritySection, TestimonialsSection, and FooterCTA', () => {
    const secHtml = renderToString(<SecuritySection />);
    assert.ok(secHtml.includes('Ownership Beats Role'), 'Security must mention Ownership Beats Role');
    assert.ok(secHtml.includes('PostgreSQL Row-Level Security'), 'Security must mention PostgreSQL RLS');

    const testHtml = renderToString(<TestimonialsSection />);
    assert.ok(testHtml.includes('100%'), 'Testimonials must have 100% Data Isolation metric');
    assert.ok(testHtml.includes('4.5x'), 'Testimonials must have 4.5x synthesis metric');
    assert.ok(testHtml.includes('Prof. Sarah Vance'), 'Testimonials must include faculty quotes');

    const footerHtml = renderToString(<FooterCTA />);
    assert.ok(footerHtml.includes('Launch Workspace'), 'Footer must have Launch Workspace button');
    assert.ok(footerHtml.includes('Free 14-Day Lab Trial'), 'Footer must have trial badge');
  });
});
