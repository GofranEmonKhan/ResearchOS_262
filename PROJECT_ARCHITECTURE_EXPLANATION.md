# ResearchOS — Architecture, Database, Authentication & RBAC Defense Guide

> **Purpose**: This document provides an in-depth, technical explanation of how **Database Connectivity**, **Table Creation/Migrations**, **Authentication**, **Google Cloud OAuth**, and **Role-Based Access Control (RBAC)** are architected and implemented in ResearchOS. It includes exact code references, architectural flowcharts, and a defense Q&A guide for presentations/evaluations.

---

## 🛠️ 1. Technology Stack Overview

| Layer | Technology | Rationale & Responsibility |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Fast SPA rendering, component modularity, type safety |
| **Styling & UI** | Tailwind CSS, Lucide Icons | Responsive modern UI, custom dark academic theme |
| **Backend API** | Node.js, Express, TypeScript | Thin controllers, robust service layer, strict server-side RBAC & ownership enforcement |
| **Database** | Supabase (PostgreSQL 15+) | Relational integrity, `pgvector` for semantic search, Row Level Security (RLS) |
| **Authentication** | Supabase Auth (GoTrue) + Google OAuth 2.0 | Asymmetric JWT issuance, secure session lifecycle, third-party identity federation |
| **Cryptographic Verification** | `jose` (JWKS key set caching) | In-memory validation of Supabase JWTs without database roundtrips on every request |
| **Database Client** | `@supabase/supabase-js` | Direct PostgreSQL data access without ORM overhead |
| **Workspace Architecture** | pnpm Monorepo (`apps/web`, `apps/api`, `packages/shared-types`) | Shared types, strict modular separation of concerns |

---

## 🔌 2. How the Database Connection Was Established

ResearchOS uses a **dual-client security architecture** to ensure security while maintaining real-time capabilities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (apps/web)                            │
│  Uses: VITE_SUPABASE_PUBLISHABLE_KEY (Safe for browser)                │
│  Scope: Supabase Auth (Sign-in/Sign-up/OAuth) + Realtime & Storage     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ HTTP Authorization: Bearer <JWT>
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS API (apps/api)                          │
│  Uses: SUPABASE_SECRET_KEY (Service Role - Never sent to browser)      │
│  Scope: All business logic, CRUD, RBAC verification, ownership checks  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ SQL over HTTPS / Connection Pool
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE POSTGRESQL DATABASE                      │
│  PostgreSQL Tables + Triggers + pgvector + Row Level Security          │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Server-Side Database Connection (Backend)
* **File Location**: [`apps/api/src/supabase.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/supabase.ts)
* **Explanation**: The Express server uses the **Supabase Secret (Service Role) Key**. This key has full administrative rights to execute queries, transactions, and bypass RLS for server-verified operations.
```typescript
// apps/api/src/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in server environment.');
}

export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
```

### 2. Client-Side Database Connection (Frontend)
* **File Location**: [`apps/web/src/supabase.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/supabase.ts)
* **Explanation**: The browser client uses the **Publishable Key**. Per project architecture rules, the frontend is strictly prohibited from running direct business CRUD queries; it is only permitted to handle Auth sessions, direct storage uploads, and Realtime listeners.
```typescript
// apps/web/src/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

---

## 🗄️ 3. How Database Tables Were Created (Schema & Migrations)

Rather than manually clicking in a GUI dashboard, database tables are managed via **declarative, version-controlled SQL migrations** under `supabase/migrations/`.

### Migration History & Table Structure:

```
supabase/migrations/
├── 20260814000000_enable_pgvector.sql            ──> Enables pgvector extension
├── 20260815000000_auth_and_profiles.sql          ──> Custom Enums, Profiles, Verification, Audit Logs
├── 20260816000000_research_workspace.sql        ──> Projects, Members, Milestones, Tasks, Messages
├── 20260817000000_project_invite_roles.sql       ──> Role-based invitations
├── 20260903000000_literature_manager.sql         ──> Papers, Authors, Collections, Notes, Embeddings
└── 20260903000001_papers_storage_policies.sql    ──> Supabase Storage bucket access policies
```

### Key Schema Implementation Highlights:

#### 1. Custom PostgreSQL Enums & Profiles Table
* **File Location**: [`supabase/migrations/20260815000000_auth_and_profiles.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20260815000000_auth_and_profiles.sql)
* **Code Highlight**:
```sql
create type user_role as enum ('Admin', 'Supervisor', 'Researcher');
create type user_status as enum ('Active', 'PendingVerification', 'Suspended');
create type verification_status as enum ('Pending', 'Approved', 'Rejected');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'Researcher',
  status user_status not null default 'Active',
  institution text not null default '',
  department text not null default '',
  research_field_tags text[] not null default '{}',
  reputation_points integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### 2. Automatic Profile Creation via PostgreSQL Trigger
When a user signs up (via Email or Google), Supabase Auth inserts a row into `auth.users`. A PostgreSQL trigger automatically creates a corresponding row in `public.profiles`:
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, status, institution, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'fullName', new.raw_user_meta_data->>'name', ''),
    coalesce((new.raw_user_meta_data->>'roleRequest')::user_role, 'Researcher'),
    case 
      when (new.raw_user_meta_data->>'roleRequest') = 'Supervisor' then 'PendingVerification'::user_status
      else 'Active'::user_status
    end,
    coalesce(new.raw_user_meta_data->>'institution', ''),
    coalesce(new.raw_user_meta_data->>'department', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

#### 3. AI Vector Embeddings (`pgvector`)
* **File Location**: [`supabase/migrations/20260814000000_enable_pgvector.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20260814000000_enable_pgvector.sql) and [`20260903000000_literature_manager.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20260903000000_literature_manager.sql)
```sql
create extension if not exists vector with schema extensions;

create table if not exists public.paper_embeddings (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  chunk_index integer not null,
  chunk_text text not null,
  embedding extensions.vector(1536), -- Vector embeddings for AI literature search
  created_at timestamptz not null default now()
);
```

---

## 🔐 4. How Authentication Was Implemented

ResearchOS uses **Supabase Auth (GoTrue engine)** with asymmetric JWT tokens.

```
┌──────────────┐                  ┌──────────────────┐                  ┌──────────────────┐
│ User Browser │                  │  Supabase Auth   │                  │ Express Backend  │
└──────┬───────┘                  └────────┬─────────┘                  └────────┬─────────┘
       │                                   │                                     │
       │ 1. signInWithPassword(email, pass)│                                     │
       ├──────────────────────────────────►│                                     │
       │                                   │                                     │
       │ 2. Returns Session + JWT Token    │                                     │
       │◄──────────────────────────────────┤                                     │
       │                                                                         │
       │ 3. API Request with Header: "Authorization: Bearer <JWT>"               │
       ├────────────────────────────────────────────────────────────────────────►│
       │                                                                         │ 4. Verify JWT via
       │                                                                         │    Cached JWKS keys
       │                                                                         │ 5. Lookup profile
       │                                                                         │    in public.profiles
       │                                                                         │ 6. Run RBAC checks
       │ 7. JSON Response                                                        │
       │◄────────────────────────────────────────────────────────────────────────┤
```

### 1. Frontend Auth Context & State Lifecycle
* **File Location**: [`apps/web/src/context/AuthContext.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/context/AuthContext.tsx)
* **How it works**:
  1. `supabase.auth.getSession()` checks for an existing active session on page load.
  2. `supabase.auth.onAuthStateChange()` listens for sign-in, sign-out, and automatic token refresh events.
  3. `fetchProfile()` calls the Express API (`/profiles/me`) to load the user's role and status.

```typescript
// apps/web/src/context/AuthContext.tsx
const signIn = async (email: string, password: string) => {
  setLoading(true);
  const { error, data } = await supabase.auth.signInWithPassword({ email, password });
  if (!error && data.session) {
    setSession(data.session);
    setUser(data.user);
    await fetchProfile();
  }
  setLoading(false);
  return { error };
};
```

---

## 🌐 5. How Google Cloud-Based OAuth Was Implemented

Google OAuth enables passwordless, institutional single sign-on (SSO).

### 1. Frontend OAuth Trigger
* **File Location**: [`apps/web/src/context/AuthContext.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/context/AuthContext.tsx#L114-L132) and [`apps/web/src/pages/auth/LoginPage.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/pages/auth/LoginPage.tsx#L178-L211)
```typescript
// apps/web/src/context/AuthContext.tsx
const signInWithGoogle = async () => {
  const redirectUrl = `${window.location.origin}/complete-profile`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  return { error };
};
```

### 2. How the Google OAuth Flow Works Step-by-Step:
1. **User clicks "Sign in with Google"** on the Login Page.
2. The browser redirects to Google's OAuth 2.0 Consent Screen (`accounts.google.com`).
3. Google authenticates the user and redirects back to the **Supabase Auth callback URL** with an authorization code.
4. Supabase exchanges the code for Google user details (Email, Full Name, Profile Picture) and generates a Supabase JWT.
5. The PostgreSQL trigger (`on_auth_user_created`) provisions a `public.profiles` entry with initial role `'Researcher'` and status `'Active'`.
6. If the user requested a Supervisor role, they complete their institutional verification workflow.

---

## 🛡️ 6. How Role-Based Access Control (RBAC) Was Implemented

ResearchOS enforces **server-side RBAC** with an architectural rule: **"Never trust client claims; ownership beats role."**

### 1. Cryptographic JWT Verification (JWKS Caching)
* **File Location**: [`apps/api/src/middleware/auth.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/auth.ts)
* **How it works**:
  * The Express server does **not** make a database or HTTP request to verify every token.
  * It uses the `jose` library with `createRemoteJWKSet()` to download and cache Supabase's public JSON Web Key Set (JWKS).
  * It cryptographically verifies the token signature in sub-millisecond time.
  * It extracts the authenticated user ID (`sub`).

```typescript
// apps/api/src/middleware/auth.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const jwksUrl = `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(jwksUrl));

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // 1. Cryptographic token verification
    const { payload } = await jwtVerify(token, JWKS);
    const userId = payload.sub;

    // 2. Live profile lookup — single source of truth for Role and Status
    const { data: dbProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!dbProfile || dbProfile.status === 'Suspended') {
      return res.status(403).json({ error: 'Account suspended or profile missing' });
    }

    req.user = mapDbProfileToProfile(dbProfile);
    req.userId = userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired JWT token' });
  }
}
```

### 2. Role & Account Status Guards
* **File Location**: [`apps/api/src/middleware/auth.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/auth.ts#L117-L156)
* **Role hierarchy & statuses**:
  * **Roles**: `Admin`, `Supervisor`, `Researcher`
  * **Statuses**: `Active`, `PendingVerification`, `Suspended`

```typescript
// Require specific account statuses (e.g. only 'Active' users can publish or create projects)
export function requireStatus(...allowedStatuses: UserStatus[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedStatuses.includes(req.user.status)) {
      return res.status(403).json({ error: `Forbidden. Status: ${req.user.status}` });
    }
    next();
  };
}

// Require specific application roles
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Requires one of [${allowedRoles.join(', ')}] role` });
    }
    next();
  };
}
```

### 3. Ownership & Scope Guards ("Ownership Beats Role")
* **File Location**: [`apps/api/src/middleware/workspaceGuards.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/workspaceGuards.ts) and [`paperGuards.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/paperGuards.ts)
* **Why this is critical**: A user having the role `Supervisor` cannot arbitrarily read or edit a private research project belonging to another supervisor or researcher unless they are explicitly added as an **Owner**, **CoSupervisor**, or **Member**.

```typescript
// apps/api/src/middleware/workspaceGuards.ts
export function requireProjectMember(paramName: string = 'projectId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const projectId = req.params[paramName] || req.body.projectId;

    // Check direct ownership
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id, owner_id')
      .eq('id', projectId)
      .single();

    if (project && project.owner_id === userId) {
      return next(); // Direct Project Owner authorized
    }

    // Check project membership table
    const { data: member } = await supabaseAdmin
      .from('project_members')
      .select('project_role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return res.status(403).json({ error: 'You do not have access to this project' });
    }

    next();
  };
}
```

### 4. Applied Route Examples
* **Admin-Only Routes** ([`apps/api/src/routes/admin.routes.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/routes/admin.routes.ts#L15-L18)):
```typescript
router.use(authenticate);
router.use(requireStatus('Active'));
router.use(requireRole('Admin')); // Only Admins can approve supervisor verifications or manage platform users
```
* **Project Routes** ([`apps/api/src/routes/project.routes.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/routes/project.routes.ts)):
```typescript
router.get('/:projectId', authenticate, requireProjectMember(), getProjectDetails);
router.delete('/:projectId', authenticate, requireProjectOwner(), deleteProject);
```

---

## 🎯 7. Teacher / Defense Q&A Preparation Cheat Sheet

When presenting your project, you can answer questions using these structured explanations:

### Q1: "How did you connect your database and why didn't you use an ORM like Prisma or Mongoose?"
> **Answer**:  
> *"We connected to Supabase PostgreSQL using `@supabase/supabase-js` with a dual-client pattern. We avoided an ORM because:  
> 1. Supabase provides type-safe query building and connection pooling natively over PostgreSQL.  
> 2. We use declarative SQL migrations (`supabase/migrations/*.sql`) as our single source of truth, enabling advanced Postgres features like `pgvector` for AI literature embeddings, native triggers, and PostgreSQL custom enums without ORM abstraction limitations.  
> 3. The backend runs with the secure Service Role key while the frontend client is strictly restricted to Auth and Realtime subscriptions."*

---

### Q2: "How did you create the database tables?"
> **Answer**:  
> *"All tables, custom enums (`user_role`, `user_status`), indexes, vector columns, foreign key cascades, and RLS policies are version-controlled in modular SQL migration files inside `supabase/migrations/`. When migrations are applied, tables such as `profiles`, `projects`, `tasks`, and `papers` are provisioned, and database triggers automatically synchronize user signups with profile entries."*

---

### Q3: "How does Authentication work under the hood?"
> **Answer**:  
> *"We implemented Supabase Auth with asymmetric JSON Web Tokens (JWT). When a user registers or logs in with email/password or Google OAuth:  
> 1. Supabase signs an RSA/ECC JWT containing the user ID (`sub`).  
> 2. The client attaches this token to HTTP requests in the `Authorization: Bearer <token>` header.  
> 3. Our Express backend uses the `jose` library to verify the token signature against Supabase's cached JWKS keys in memory.  
> 4. We then perform a live lookup against the `public.profiles` table to fetch the real-time role and account status."*

---

### Q4: "How does Google Cloud Authentication (OAuth) work in this project?"
> **Answer**:  
> *"We integrated Google Cloud OAuth 2.0 via Supabase's authentication provider. The frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })`, which opens Google's OAuth consent screen. Upon user approval, Google redirects back to Supabase's OAuth endpoint, which validates credentials, creates the user identity in `auth.users`, triggers profile creation in `public.profiles`, and redirects back to our React application with an active session."*

---

### Q5: "How did you implement Role-Based Access Control (RBAC) and Security?"
> **Answer**:  
> *"RBAC is strictly enforced on the server in Express using composable middleware layers:  
> 1. `authenticate`: Cryptographically validates the JWT and loads live profile status from the DB.  
> 2. `requireStatus('Active')`: Rejects suspended or pending accounts.  
> 3. `requireRole('Admin' | 'Supervisor' | 'Researcher')`: Blocks access to unauthorized routes (like `/admin/*`).  
> 4. **Ownership Guards** (`requireProjectMember`, `requirePaperOwner`): Enforce that even a Supervisor cannot view or modify a private project unless they own it or are an assigned collaborator. This ensures 'Ownership beats Role'."*

---

## 📁 Key File Index for Quick Reference

| Feature | Primary Code Files |
| :--- | :--- |
| **Database Connection** | [`apps/api/src/supabase.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/supabase.ts) (Backend)<br>[`apps/web/src/supabase.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/supabase.ts) (Frontend) |
| **SQL Migrations & Schema** | [`supabase/migrations/20260815000000_auth_and_profiles.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20260815000000_auth_and_profiles.sql)<br>[`supabase/migrations/20260816000000_research_workspace.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20260816000000_research_workspace.sql)<br>[`supabase/migrations/20260903000000_literature_manager.sql`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/supabase/migrations/20260903000000_literature_manager.sql) |
| **Auth & Google OAuth** | [`apps/web/src/context/AuthContext.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/context/AuthContext.tsx)<br>[`apps/web/src/pages/auth/LoginPage.tsx`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/web/src/pages/auth/LoginPage.tsx) |
| **RBAC & Middleware** | [`apps/api/src/middleware/auth.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/auth.ts)<br>[`apps/api/src/middleware/workspaceGuards.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/workspaceGuards.ts)<br>[`apps/api/src/middleware/paperGuards.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/middleware/paperGuards.ts) |
| **Protected Routes** | [`apps/api/src/routes/admin.routes.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/routes/admin.routes.ts)<br>[`apps/api/src/routes/project.routes.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/routes/project.routes.ts)<br>[`apps/api/src/routes/paper.routes.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/apps/api/src/routes/paper.routes.ts) |
| **Shared Type Definitions** | [`packages/shared-types/src/index.ts`](file:///c:/Users/Abdul%20Gofran%20Emon/ResearchOS/packages/shared-types/src/index.ts) |
