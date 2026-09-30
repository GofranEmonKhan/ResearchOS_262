# Landing Page Design Specifications — ResearchOS

> **PAGE SCOPE:** Public Marketing, Pricing & Insights Landing Page (`/` or `/landing`)
> **MASTER INHERITANCE:** Inherits from `design-system/researchos/MASTER.md` with page-specific overrides detailed below.

---

## Page Identity & Aesthetic Goals

- **Objective:** Convert faculty supervisors, academic researchers, and lab directors by demonstrating the power, speed, and elegance of an all-in-one research operating system.
- **Visual Vibe:** Deep Cosmic Obsidian (`#07070C`), ambient violet aura glow, interactive citation constellation mesh, floating glassmorphic product simulation, high-prestige editorial typography, and modular Bento & Pricing cards.

---

## Section-by-Section Blueprint

### 1. Floating Glass Pill Header (`Navbar`)
- **Position:** Fixed top, centered floating pill with `top-5 z-50`.
- **Styling:** `backdrop-blur-xl bg-[#0D0C18]/80 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-full px-6 py-2.5 max-w-5xl mx-auto flex items-center justify-between`.
- **Navigation Links:**
  - `Features` (Scroll to Bento Grid)
  - `Supervision` (Scroll to Role/Workbench)
  - `Literature` (Scroll to Paper Reader)
  - `Experiments` (Scroll to Lab Tracker)
  - `Pricing` (Scroll to Subscription Tiers)
  - `Blogs` (Scroll to Research Insights)
- **Actions:**
  - `Sign In` (Ghost glass pill).
  - `Get Started Free →` (Electric violet gradient pill with hover glow).

---

### 2. Hero Section: "The Thesis"
- **Atmosphere:** Deep obsidian canvas with centered radial violet glow (`radial-gradient(circle at 50% 10%, rgba(139, 92, 246, 0.18) 0%, transparent 60%)`) and interactive constellation particle mesh.
- **Eyebrow:** Cosmic pill badge with pulsing icon:
  `✦ THE NEXT-GENERATION RESEARCH OPERATING SYSTEM`
- **Headline (Crimson Pro / Instrument Serif + Plus Jakarta Sans):**
  *"Accelerate Discovery from Literature Review to Peer-Reviewed Publication."*
  - Keyphrase *"Literature Review to Peer-Reviewed Publication"* styled in high-impact cyan-to-violet gradient (`bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent`).
- **Subtitle:**
  *"An integrated workspace uniting Faculty Supervision, Smart Literature Extraction, Reproducible Lab Experiments, and AI-Augmented Manuscript Review."*
- **Interactive Action Pill (Inspiration 01 style):**
  - Pill input container: `[ 📄 Enter a DOI (e.g. 10.1038/s41586-023) or Search Topic... ]`
  - Embedded button: `[ Explore Smart Extraction ✨ ]`
- **Social Proof Strip:**
  *"Empowering researchers and lab groups across top universities and institutes worldwide."*

---

### 3. Interactive Hero Live Simulator ("The Research Workbench")
A high-fidelity floating 3D/glassmorphic mockup showcasing real-time interaction across 3 core pillars:
1. **Left: Supervisor Approval Queue**
   - Active student submission: `"Alex Chen submitted: Transformer Latency Benchmark"`.
   - Supervisor action buttons: `[ Request Revision ]` & `[ Approve & Unlock Milestone (✓) ]`.
   - Pulsing emerald status badge: `Status: In Review (Supervisor Queue)`.
2. **Center: Smart Literature Reader**
   - PDF viewport showing paper title *"Attention Is All You Need"*.
   - In-situ Smart Sidebar with live extraction cards:
     - 🎯 **Research Gap:** *"Recurrent models cannot parallelize across long sequences."*
     - ⚡ **Methodology:** *"Self-attention mechanisms replacing recurrence."*
     - 💡 **Citation Purpose:** *"Comparison Baseline for Section 4."*
3. **Right: Experiment Telemetry & Comparison**
   - Mini loss curve / validation accuracy line chart with violet/cyan traces.
   - Hyperparameter badge: `lr: 1e-4 | batch: 64 | GPU: RTX 4090 (94% util)`.

---

### 4. Interactive Persona Switcher (Researcher vs. Supervisor)
Segmented glass tab bar allowing visitors to view the platform tailored to their academic role:
- **Tab 1: 🎓 For Researchers (PhDs, Postdocs, RAs)**
  - Fast DOI literature ingestion & private annotation sidebar.
  - Automatic hyperparameter and experiment run logging.
  - Distraction-free manuscript editor with live LaTeX math and BibTeX autocompletion.
  - Personal milestone & deliverable submissions.
- **Tab 2: 🏛️ For Supervisors (PIs, Faculty, Lab Directors)**
  - Centralized multi-project governance dashboard.
  - 1-click deliverable approval with structured revision feedback notes.
  - "Required Reading" push to student libraries.
  - Real-time student progress heatmap & milestone velocity tracking.

---

### 5. Bento Grid Feature Showcase
A 6-card modular glassmorphic grid:
- **Card 1 (Span 2x2 - Smart Literature Manager):**
  Interactive PDF preview + CrossRef metadata extraction + BibTeX export + "Why did I cite this?" citation purpose engine.
- **Card 2 (Span 1x1 - Supervisor Governance):**
  Role-Based Access Control, milestone locking, and auditable approval state machine.
- **Card 3 (Span 1x1 - Experiment Tracker):**
  JSON hyperparameter diff table + loss curve charts + run reproducibility verification tags.
- **Card 4 (Span 1x1 - Manuscript Studio):**
  Distraction-free Markdown/LaTeX writing with inline peer reviewer commentary threads.
- **Card 5 (Span 1x1 - Lab Resource Marketplace):**
  GPU cluster rentals, lab bench scheduling, and dataset sharing with escrow protection.
- **Card 6 (Span 2x1 - AI Research Copilot):**
  `pgvector` semantic paper search, literature gap synthesizer, and LaTeX formula assistant.

---

### 6. The Research Lifecycle (Sequential Visual Walkthrough)
A clean 4-step progressive timeline illustrating how ResearchOS guides a project from hypothesis to publication:
1. `01. Ingest & Analyze`: Bulk PDF upload, automated metadata extraction, and research gap identification.
2. `02. Experiment & Validate`: Track parameter configs, log output metrics, and verify reproducibility.
3. `03. Review & Supervise`: Submit deliverables, resolve supervisor revision notes, and pass milestones.
4. `04. Draft & Publish`: Collaborative manuscript drafting with inline reviewer sign-off and BibTeX export.

---

### 7. Pricing & Subscription Plans (3 Tiers)
- **Eyebrow:** `✦ TRANSPARENT ACADEMIC PLANS`
- **Headline:** *"Predictable Plans for Independent Scholars, Research Labs & Entire Departments."*
- **Billing Toggle:** `Monthly` / `Annual (Save 20%)` with pill switcher.
- **The 3 Plan Cards**:
  1. **Scholar Plan ($0 / Free Forever)**:
     - *Target*: Individual PhD students and independent scholars.
     - *Includes*: 2 Personal projects, 500 MB PDF storage, CrossRef DOI fetch, manual Smart Sidebar notes, basic experiment logger (10 runs), community forum access.
     - *CTA*: `[ Get Started Free ]` (Glass outline pill).
  2. **Lab Group / Pro ($29 / month per lab seat - Highlighted)**:
     - *Badge*: `✦ RECOMMENDED FOR LABS & PIS` (Glowing violet pill).
     - *Target*: Faculty, PIs, PhD cohorts, and funded research groups.
     - *Card Styling*: `border-purple-500/40 shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)] bg-[#15132A]/80`.
     - *Includes*: Unlimited supervised projects, complete Supervisor Approval Workflow, unlimited literature library sync, Citation Purpose store ("Why did I cite this?"), experiment diff & loss visualizer, LaTeX manuscript studio with inline review, and AI Research Copilot.
     - *CTA*: `[ Launch Lab Group → ]` (Electric violet gradient pill).
  3. **Department & Institutional (Custom / Annual)**:
     - *Target*: University departments, research institutes, and enterprise R&D.
     - *Includes*: Dedicated Department Admin Console, Institutional SSO / SAML (EduGAIN, Shibboleth, Okta), private GPU cluster integrations, audit trail compliance exports, and dedicated SLA.
     - *CTA*: `[ Contact Department Sales ]` (Ghost glass pill).

---

### 8. Blogs & Academic Research Insights
- **Eyebrow:** `✦ SCHOLARLY METHODOLOGY & INSIGHTS`
- **Headline:** *"Latest Thinking on Academic Workflows, Lab Productivity & AI in Science."*
- **3-Article Glass Grid**:
  1. **Article 1 (Methodology)**:
     - *Badge*: `METHODOLOGY` (Violet badge) • `5 min read`
     - *Title*: *"How Structured Citation Purposes Prevent Literature Gaps During Peer Review"*
     - *Excerpt*: *"Why recording the exact reason for citing a paper at the moment of reading saves weeks during manuscript drafting."*
     - *Author*: `Dr. Elena Rostova` • `Aug 12, 2026`
  2. **Article 2 (Lab Productivity)**:
     - *Badge*: `LAB PRODUCTIVITY` (Cyan badge) • `7 min read`
     - *Title*: *"Eliminating the 'Works on My Machine' Crisis in Deep Learning Research"*
     - *Excerpt*: *"A practical framework for hyperparameter tracking, dataset hashing, and reproducible experiment diffs."*
     - *Author*: `Marcus Vance, PhD` • `Jul 28, 2026`
  3. **Article 3 (Supervision & Advising)**:
     - *Badge*: `SUPERVISION` (Amber badge) • `4 min read`
     - *Title*: *"The Supervisor Approval Loop: Scaling Thesis Advising Without Email Fatigue"*
     - *Excerpt*: *"How structured deliverable transitions between 'Submitted', 'Under Review', and 'Revision Requested' save PI hours."*
     - *Author*: `Prof. Julian Thorne` • `Jul 15, 2026`
- **Action**: `[ Explore All Research Articles → ]` link with arrow hover.

---

### 9. Security, Privacy & Data Isolation Architecture
- **Ownership Beats Role:** Private notes and unpublished drafts remain confidential to authors.
- **Enterprise Isolation:** Supabase Postgres Row-Level Security (RLS) & verified JWT RBAC.
- **Audit Logs:** Full traceability of project changes, submissions, and approvals.

---

### 10. High-Conversion Footer CTA & Minimalist Footer
- **CTA Banner:** Curved electric gradient border card with deep violet background and glowing starry particles.
- **Copy:** *"Transform how your lab conducts, tracks, and publishes scientific research."*
- **Action:** Floating pill input for instant onboarding: `[ Enter institutional email... ] -> [ Launch Workspace → ]`
- **Footer Navigation:** Product, Supervision, Literature, Experiments, Pricing, Blogs, Security & Compliance, Academic Community, Copyright © 2026 ResearchOS.
