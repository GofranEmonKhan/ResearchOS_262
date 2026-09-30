# ResearchOS — Project Structure

```
ResearchOS/
├── .env.example
├── .gitignore
├── .npmrc
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
│
├── apps/
│   ├── api/                                    # Express + TypeScript Backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts                        # API Server Entrypoint
│   │       ├── supabase.ts                     # Backend Supabase Service Client
│   │       ├── middleware/
│   │       │   ├── auth.ts                     # JWT & RBAC Authorization Middleware
│   │       │   ├── forumGuards.ts              # Forum Post, Answer & Verification Access Guards
│   │       │   ├── paperGuards.ts              # Literature & Paper Ownership Guards
│   │       │   └── workspaceGuards.ts          # Project & Membership Access Guards
│   │       ├── routes/
│   │       │   ├── admin.routes.ts             # Admin Operations & Platform Settings
│   │       │   ├── collection.routes.ts        # Literature Collections & Folders
│   │       │   ├── community.routes.ts         # Profiles, Leaderboards & Tag Discovery
│   │       │   ├── directMessage.routes.ts     # AC-13 Encrypted Direct Messaging & Blocks
│   │       │   ├── forum.routes.ts             # Questions, Answers, Multi-Reactions & Comments
│   │       │   ├── invite.routes.ts            # Project Invites & Links
│   │       │   ├── message.routes.ts           # Workspace Real-Time Chat & Messages
│   │       │   ├── milestone.routes.ts         # Research Milestones & Tracking
│   │       │   ├── notification.routes.ts      # User Alerts & Mentions
│   │       │   ├── paper.routes.ts             # Paper Ingestion, Metadata & Sharing
│   │       │   ├── profile.routes.ts           # User Profiles & Academic Details
│   │       │   ├── project.routes.ts           # Research Projects CRUD
│   │       │   ├── supervisor.routes.ts        # Supervisor Oversight & Review Queues
│   │       │   └── task.routes.ts              # Project Tasks & State Transitions
│   │       ├── services/
│   │       │   ├── annotation.service.ts       # PDF Highlights & Annotation Layers
│   │       │   ├── audit.service.ts            # Security & Compliance Audit Logging
│   │       │   ├── citationPurpose.service.ts  # AI/Smart Citation Categorization
│   │       │   ├── collection.service.ts       # Collection Organization Logic
│   │       │   ├── comment.service.ts          # Review & Thread Discussion Service
│   │       │   ├── communityProfile.service.ts # Reputation Points & Dynamic Badge Calculation
│   │       │   ├── directMessage.service.ts    # Participant-Only Private Messaging & User Blocks
│   │       │   ├── export.service.ts           # BibTeX / Citation Export Service
│   │       │   ├── fileAsset.service.ts        # Supabase Storage Integration
│   │       │   ├── forumAnswer.service.ts      # Solutions, Accepted Badges & Supervisor Seals
│   │       │   ├── forumComment.service.ts     # Lightweight Discussion Comments
│   │       │   ├── forumPost.service.ts        # Academic Questions & Community Discussion Posts
│   │       │   ├── forumReport.service.ts      # Content Moderation Queue & Admin Actions
│   │       │   ├── forumVote.service.ts        # LinkedIn 6-State Multi-Reactions & Voting Engine
│   │       │   ├── invite.service.ts           # Project Invitation Dispatch & Claims
│   │       │   ├── message.service.ts          # Project Channel Messaging
│   │       │   ├── milestone.service.ts        # Project Deliverables & Due Dates
│   │       │   ├── notification.service.ts     # In-App Notification Engine
│   │       │   ├── paper.service.ts            # Paper Indexing & Full-Text Search
│   │       │   ├── project.service.ts          # Project Membership & Lifecycle Logic
│   │       │   ├── sidebar.service.ts          # Literature Sidebar Counts & Queries
│   │       │   ├── tagFollow.service.ts        # Research Topic & Tag Subscriptions
│   │       │   ├── task.service.ts             # Kanban & Task State Machine
│   │       │   └── metadata/
│   │       │       ├── crossref.provider.ts    # CrossRef DOI Metadata Provider
│   │       │       ├── openalex.provider.ts    # OpenAlex API Metadata Provider
│   │       │       ├── pdfExtraction.service.ts# PDF Metadata & Content Extraction
│   │       │       ├── metadata.service.ts     # Unified Paper Metadata Aggregator
│   │       │       └── types.ts                # Metadata Parser Types
│   │       ├── scripts/
│   │       │   └── seed.ts                     # Database Seeding Utility
│   │       ├── tests/
│   │       │   ├── auth-rbac.test.ts           # Authentication & Permission Tests
│   │       │   ├── forum-community-contracts.test.ts # Module 06 Types & Contract Tests
│   │       │   ├── forum-community.test.ts     # Module 06 Full 16-AC End-to-End Test Suite
│   │       │   ├── literature.test.ts          # Literature API Integration Tests
│   │       │   ├── literature-rls.test.ts      # Row-Level Security Verification Tests
│   │       │   └── workspace.test.ts           # Project & Task Workflow Tests
│   │       └── types/
│   │           └── express.d.ts                # Express Authenticated Request Extensions
│   │
│   └── web/                                    # React + Vite + Tailwind Frontend
│       ├── index.html                          # SPA Entry HTML
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       └── src/
│           ├── App.tsx                         # React Router & Core Route Shell
│           ├── index.css                       # Global Tailwind CSS & Theme Tokens
│           ├── main.tsx                        # Frontend Mounting Script
│           ├── supabase.ts                     # Frontend Supabase Client (Auth/Storage)
│           ├── vite-env.d.ts                   # Vite Environment Definitions
│           ├── context/
│           │   └── AuthContext.tsx             # Supabase Auth & Session Provider
│           ├── lib/
│           │   └── api.ts                      # Axios/Fetch API Client Layer
│           ├── components/
│           │   ├── brand/
│           │   │   └── Logo.tsx                # Brand Icon & Logo
│           │   ├── common/
│           │   │   ├── HoverSelect.tsx         # Accessible Custom Select Dropdown
│           │   │   └── UserAvatar.tsx          # Dynamic User Initials / Photo Avatar
│           │   ├── community/
│           │   │   ├── AdminModerationModal.tsx # AC-13 Compliant Admin Report Moderation Queue
│           │   │   ├── CommunityProfileModal.tsx # Reputation Badges, Stats & Rank Inspector
│           │   │   ├── CreatePostModal.tsx     # Rich Question & Discussion Post Composer
│           │   │   ├── DirectMessagesPanel.tsx # AC-13 Private Split-Pane Chat & User Blocking
│           │   │   ├── PostCard.tsx            # Community Feed Card with Reactions & Tags
│           │   │   ├── PostDetailModal.tsx     # Full Discussion Thread, Answers & Verification
│           │   │   ├── ReactionDetailModal.tsx # Reactor Breakdown by Emoji Tabs
│           │   │   └── ReactionPicker.tsx      # LinkedIn-Style Floating Multi-Reaction Bar
│           │   ├── effects/
│           │   │   └── NeuralGalaxyBackground.tsx # Interactive Canvas Starfield Effect
│           │   ├── landing/
│           │   │   ├── BentoGrid.tsx           # Product Feature Bento Grid
│           │   │   ├── BlogModal.tsx           # Blog Detail Reader Modal
│           │   │   ├── BlogsSection.tsx        # Research & Insights Section
│           │   │   ├── ConstellationCanvas.tsx # Animated Connected Constellation Graph
│           │   │   ├── DoiPreviewModal.tsx     # DOI Lookup Interactive Preview
│           │   │   ├── FooterCTA.tsx           # Bottom Call-To-Action & Links
│           │   │   ├── HeroSection.tsx         # Modern Hero Header & Highlights
│           │   │   ├── LifecycleTimeline.tsx   # Research Lifecycle Workflow Step Timeline
│           │   │   ├── Navbar.tsx              # Landing Page Navigation Bar
│           │   │   ├── PricingSection.tsx      # Tiered Subscription & Plan Matrix
│           │   │   ├── ResearchWorkbenchDemo.tsx# Interactive Live Workbench Mockup
│           │   │   ├── RoleSwitcher.tsx        # Researcher / Supervisor Persona Switcher
│           │   │   ├── SecuritySection.tsx     # Compliance, Security & Encryption Badge
│           │   │   └── TestimonialsSection.tsx # Academic & Lab User Endorsements
│           │   ├── layout/
│           │   │   ├── AppSidebar.tsx          # Collapsible Workspace & Literature Navigation
│           │   │   ├── NotificationBell.tsx    # Live Notification Dropdown Bell
│           │   │   ├── TopHeader.tsx           # Breadcrumbs, Quick Actions & Profile Menu
│           │   │   └── WorkspaceLayout.tsx     # Main Dashboard App Shell Container
│           │   ├── literature/
│           │   │   ├── AnnotationList.tsx      # PDF Highlight Cards & Notes Panel
│           │   │   ├── CollectionSidebar.tsx   # Folders, Tags & Shared Library Filter
│           │   │   ├── HighlightPopover.tsx    # Text Selection Highlight & Annotation Tool
│           │   │   ├── PaperCard.tsx           # Literature List Item Card
│           │   │   ├── PaperMetadataModal.tsx  # Edit DOI, Title & Authors Modal
│           │   │   ├── PdfViewer.tsx           # Integrated PDF Canvas & Document Reader
│           │   │   ├── SharePaperModal.tsx     # Paper Sharing & Project Permission Modal
│           │   │   ├── SmartResearchSidebar.tsx# AI Assistant, Citations & Paper Sidebar
│           │   │   └── UploadPaperModal.tsx    # File Drag-and-Drop / DOI Ingestion Modal
│           │   └── workspace/
│           │       ├── ExitWorkspaceModal.tsx  # Leave Project Confirmation
│           │       ├── JoinProjectModal.tsx    # Invite Code Acceptance Modal
│           │       ├── KanbanBoard.tsx         # Drag-and-Drop Task Management Board
│           │       ├── MilestoneTimeline.tsx   # Project Milestones & Progress Tracker
│           │       ├── NewMilestoneModal.tsx   # Milestone Creation Dialog
│           │       ├── NewProjectModal.tsx     # Research Project Setup Wizard
│           │       ├── NewTaskModal.tsx        # Task Creation & Assignee Picker
│           │       ├── ProjectChatDrawer.tsx   # Realtime Project Discussion Drawer
│           │       ├── ProjectMembersModal.tsx # Member Roster & Role Assignment
│           │       ├── SupervisorReviewModal.tsx# Supervisor Task Approval & Feedback Dialog
│           │       ├── TaskDetailModal.tsx     # Task Inspection, Status & Activity Log
│           │       └── WorkspaceCalendar.tsx   # Deadlines, Schedules & Calendar Grid
│           ├── pages/
│           │   ├── LandingPage.tsx             # Public Product Marketing Page
│           │   ├── auth/
│           │   │   ├── CompleteProfilePage.tsx # First-Time Onboarding & University Profile
│           │   │   ├── ForgotPasswordPage.tsx  # Password Recovery Request Page
│           │   │   ├── LoginPage.tsx           # Account Authentication Page
│           │   │   ├── ResetPasswordPage.tsx   # New Password Entry Form
│           │   │   └── SignupPage.tsx          # New Account Registration Page
│           │   └── dashboards/
│           │       ├── AdminConsolePage.tsx    # System Administrator Metrics & Management
│           │       ├── CommunityPage.tsx       # Discussion Forum, Q&A, DMs & Reputation Hub
│           │       ├── DashboardRouter.tsx     # Role-Based Dashboard Redirection Engine
│           │       ├── LibraryPage.tsx         # Literature & Paper Management Hub
│           │       ├── NotificationsPage.tsx   # Centralized Notification Center
│           │       ├── PaperViewerPage.tsx     # Distraction-Free PDF Reader & Annotation Screen
│           │       ├── ProfilePage.tsx         # Researcher Profile & Account Settings
│           │       ├── ResearcherWorkspacePage.tsx # Researcher Kanban, Milestones & Chat
│           │       └── SupervisorDashboardPage.tsx # Supervisor Cross-Project Oversight Board
│           └── tests/
│               ├── auth-rbac-ui.test.tsx       # Auth Flow & Role Rendering UI Tests
│               ├── community-ui.test.tsx       # Discussion Forum & Community UI Tests
│               ├── landing-page.test.tsx       # Public Landing Page Component Tests
│               ├── literature-ui.test.tsx      # Literature & PDF Viewer Component Tests
│               └── workspace-layout.test.tsx   # Layout Shell & Navigation Tests
│
├── packages/
│   ├── config/                                 # Shared TypeScript & Tooling Configurations
│   │   ├── package.json
│   │   ├── tsconfig.base.json
│   │   ├── tsconfig.node.json
│   │   └── tsconfig.react.json
│   │
│   └── shared-types/                           # Shared Domain Interfaces & Type Contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts                        # Unified Data Models, Enums & DTOs
│
└── supabase/                                   # Database & Migrations
    ├── config.toml                             # Supabase CLI Local Configuration
    ├── seed.sql                                # Initial Development Seed Data
    └── migrations/
        ├── 20260814000000_enable_pgvector.sql            # Vector Extension Migration
        ├── 20260815000000_auth_and_profiles.sql          # User Profiles & RBAC Tables
        ├── 20260816000000_research_workspace.sql         # Projects, Tasks, Milestones & Chat
        ├── 20260817000000_project_invite_roles.sql       # Project Invitation Schema
        ├── 20260903000000_literature_manager.sql         # Papers, Collections & Annotations
        ├── 20260903000001_papers_storage_policies.sql    # Supabase Storage RLS Policies
        ├── 20260903000002_fix_rls_circular_recursion.sql # Security Policy Optimizations
        └── 20260905000000_forum_community.sql            # Discussion Forum, Reactions & Badges
```

---

## 🛠️ Frameworks & Technology Stack Used

ResearchOS is built as a production-grade, modular **TypeScript Monorepo** managed with **pnpm Workspaces**. Below is the comprehensive breakdown of all frameworks, libraries, runtime environments, and tools used across each layer of the application:

---

### 1. 🖥️ Frontend Frameworks & Libraries (`apps/web`)

* **React 18 (`react`, `react-dom`)**:
  * **Role**: Core UI library for building component-driven, declarative user interfaces.
  * **Key Features Used**: Functional components, React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`), React Context API for global authentication and workspace state.

* **Vite (`vite`, `@vitejs/plugin-react`)**:
  * **Role**: Next-generation frontend build tool and development server.
  * **Key Features Used**: Ultra-fast Hot Module Replacement (HMR), optimized Rollup production bundling, dynamic asset handling, and fast ES module resolution.

* **Tailwind CSS (`tailwindcss`, `postcss`, `autoprefixer`)**:
  * **Role**: Utility-first CSS styling framework.
  * **Key Features Used**: Custom dark academic theme (`#07070C` cosmic obsidian palette), glassmorphic backdrop filters, custom CSS variables, responsive breakpoint grid/flexbox layouts.

* **Lucide React (`lucide-react`)**:
  * **Role**: Unified, accessible icon system.
  * **Key Features Used**: Crisp vector icons used throughout the sidebar, modals, Kanban board, paper library, and admin consoles.

* **Canvas-Confetti (`canvas-confetti`)**:
  * **Role**: Visual celebration effects.
  * **Key Features Used**: Triggers celebratory particles when milestones or critical research tasks are marked as completed.

---

### 2. ⚙️ Backend Frameworks & Server Runtime (`apps/api`)

* **Node.js (v18+ / v20+)**:
  * **Role**: Asynchronous, event-driven JavaScript runtime powering the backend server.

* **Express.js (`express`)**:
  * **Role**: Minimalist web application framework for building RESTful APIs.
  * **Key Features Used**: Modular routing (`Router`), JSON body parsing, error handling middleware, composable authorization pipelines (`authenticate`, `requireRole`, `requireStatus`, `requireProjectMember`).

* **TypeScript (`typescript`, `tsx`, `@types/node`, `@types/express`)**:
  * **Role**: Static type checking across all controllers, services, routes, and middleware.
  * **Key Features Used**: Strict type enforcement, shared DTO interfaces from `@researchos/shared-types`, request augmentation for typed `req.user` and `req.projectAccess`.

* **CORS (`cors`, `@types/cors`)**:
  * **Role**: Cross-Origin Resource Sharing middleware enabling secure API communication between the React frontend (`http://localhost:5173`) and Express backend (`http://localhost:3001`).

* **Dotenv (`dotenv`)**:
  * **Role**: Zero-dependency environment variable manager loading configurations from `.env` files.

---

### 3. 🗄️ Database, Authentication & Cloud Architecture (`supabase`)

* **Supabase (Backend-as-a-Service / BaaS)**:
  * **Role**: Cloud database, authentication, object storage, and real-time messaging platform.

* **PostgreSQL 15+**:
  * **Role**: Primary relational database engine.
  * **Key Features Used**: Custom PostgreSQL Enums (`user_role`, `user_status`, `verification_status`), table relationships with foreign key cascades, automatic timestamp triggers, stored procedures (`handle_new_user`), and Row Level Security (RLS).

* **`pgvector` Extension**:
  * **Role**: PostgreSQL vector similarity search extension.
  * **Key Features Used**: Stores 1536-dimensional paper chunk embeddings in `public.paper_embeddings` to power AI-driven semantic literature discovery and similarity matching.

* **Supabase Auth (GoTrue Engine)**:
  * **Role**: User identity and session management.
  * **Key Features Used**: Secure password hashing (bcrypt), asymmetric JSON Web Token (JWT) issuance, email verification, password reset flows, and Google Cloud OAuth 2.0 Single Sign-On (SSO).

* **Supabase Storage**:
  * **Role**: S3-compatible cloud object storage.
  * **Key Features Used**: Dedicated `papers` and `verification-documents` storage buckets protected by storage RLS policies.

* **Supabase Realtime**:
  * **Role**: WebSocket-based database change broadcasting.
  * **Key Features Used**: Realtime event subscriptions for live project chat (`project_messages`) and notification delivery.

* **`@supabase/supabase-js`**:
  * **Role**: Official JavaScript/TypeScript client library.
  * **Key Features Used**: Dual-client setup — **Secret Key** client on Express backend for administrative queries and **Publishable Key** client on React frontend for Auth and Realtime listeners.

---

### 4. 🔒 Security & Cryptography Frameworks

* **`jose`**:
  * **Role**: Comprehensive JavaScript Object Signing and Encryption (JOSE) library.
  * **Key Features Used**: Remote JSON Web Key Set (`createRemoteJWKSet`) fetching and in-memory key caching for sub-millisecond cryptographic JWT signature verification on the Express backend without database overhead.

---

### 5. 📦 Monorepo & Package Management

* **pnpm Workspaces (`pnpm`)**:
  * **Role**: Fast, disk-efficient package manager and monorepo workspace orchestrator.
  * **Key Features Used**: Workspace protocol (`workspace:*`) linking `apps/web` and `apps/api` with `packages/shared-types` and `packages/config`, parallel command execution (`pnpm -r --parallel dev`).

---

### 6. 🧪 Testing Frameworks

* **Vitest (`vitest`)**:
  * **Role**: High-performance, Vite-native testing framework.
  * **Key Features Used**: Unit and integration testing for business logic, services, and authorization guards.

* **React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)**:
  * **Role**: User-centric UI component testing.
  * **Key Features Used**: Testing React components, role-based conditional rendering, and form submission flows.

* **Supertest (`supertest`, `@types/supertest`)**:
  * **Role**: HTTP assertion library for automated end-to-end testing of Express REST API endpoints.
