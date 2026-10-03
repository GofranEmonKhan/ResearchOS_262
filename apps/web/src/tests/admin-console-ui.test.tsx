import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

import { AdminConsolePage } from '../pages/dashboards/AdminConsolePage.js';
import { 
  AdminOverviewTab, 
  AdminUserDirectoryTab, 
  AdminVerificationsTab, 
  AdminAuditLogsTab, 
  AdminGovernanceTab, 
  AdminSystemHealthTab,
  UserDetailModal,
  UserActionModal
} from '../components/admin/index.js';
import { AuthProvider } from '../context/AuthContext.js';
import { AdminPlatformOverview } from '@researchos/shared-types';

describe('Spec 09 — Frontend Admin Console & Governance Command Center UI Suite', () => {
  it('1. AdminConsolePage renders header, admin badge, and all 7 command center tabs', () => {
    const html = renderToString(
      <AuthProvider>
        <AdminConsolePage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Platform Governance Command Center'), 'Must render Admin Command Center header');
    assert.ok(html.includes('Administrator Active'), 'Must render Administrator Active badge');
    assert.ok(html.includes('Platform Overview'), 'Must render Tab 1: Platform Overview');
    assert.ok(html.includes('User Directory &amp; RBAC') || html.includes('User Directory & RBAC'), 'Must render Tab 2: User Directory & RBAC');
    assert.ok(html.includes('Supervisor Queue'), 'Must render Tab 3: Supervisor Queue');
    assert.ok(html.includes('Audit Log Explorer'), 'Must render Tab 4: Audit Log Explorer');
    assert.ok(html.includes('Governance &amp; Deletions') || html.includes('Governance & Deletions'), 'Must render Tab 5: Governance & Deletions');
    assert.ok(html.includes('System Health &amp; Storage') || html.includes('System Health & Storage'), 'Must render Tab 6: System Health & Storage');
    assert.ok(html.includes('AI Platform Config'), 'Must render Tab 7: AI Platform Config');
  });

  it('2. AdminOverviewTab renders high-impact KPI cards and moderation queues', () => {
    const mockOverview: AdminPlatformOverview = {
      users: { total: 120, admin: 3, supervisor: 25, researcher: 92 },
      pendingSupervisorVerifications: 4,
      activeProjects: 18,
      totalProjects: 22,
      storageBytes: 157286400, // 150 MB
      storageFilesCount: 85,
      pendingMarketplaceListings: 2,
      openDisputes: 1,
      pendingForumReports: 3,
      aiUsageThisMonth: {
        tokens: 154000,
        costUsd: 0.231,
        requestCount: 42
      }
    };

    const html = renderToString(
      <AdminOverviewTab
        overview={mockOverview}
        isLoading={false}
        onRefresh={() => {}}
        onNavigateTab={() => {}}
      />
    );

    assert.ok(html.includes('Platform Governance Center'), 'Must render Governance Center banner');
    assert.ok(html.includes('User Community'), 'Must render Users KPI');
    assert.ok(html.includes('120'), 'Must render user count');
    assert.ok(html.includes('Research Projects'), 'Must render Projects KPI');
    assert.ok(html.includes('22'), 'Must render total projects count');
    assert.ok(html.includes('Storage Volume'), 'Must render Storage KPI');
    assert.ok(html.includes('150 MB'), 'Must render formatted storage size');
    assert.ok(html.includes('Monthly AI Compute'), 'Must render AI Compute KPI');
    assert.ok(html.includes('0.2310') || html.includes('0.231'), 'Must render monthly AI cost');
    assert.ok(html.includes('Supervisor Queue'), 'Must render Supervisor Queue card');
    assert.ok(html.includes('Deletion Requests'), 'Must render Deletion Requests card');
    assert.ok(html.includes('Marketplace'), 'Must render Marketplace card');
    assert.ok(html.includes('Forum Reports'), 'Must render Forum Reports card');
  });

  it('3. AdminUserDirectoryTab renders search, role/status filters, and user table container', () => {
    const html = renderToString(
      <AdminUserDirectoryTab onNotify={() => {}} />
    );

    assert.ok(html.includes('User Directory &amp; Identity RBAC') || html.includes('User Directory & Identity RBAC'), 'Must render user directory header');
    assert.ok(html.includes('Search scholars by name, email, or institution...'), 'Must render search placeholder');
    assert.ok(html.includes('All Roles'), 'Must render role filter');
    assert.ok(html.includes('All Statuses'), 'Must render status filter');
  });

  it('4. AdminVerificationsTab renders faculty credential queue controls and status tabs', () => {
    const html = renderToString(
      <AdminVerificationsTab onNotify={() => {}} onRefreshOverview={() => {}} />
    );

    assert.ok(html.includes('Supervisor Verification Queue'), 'Must render verification queue title');
    assert.ok(html.includes('Pending'), 'Must render Pending filter');
    assert.ok(html.includes('Approved'), 'Must render Approved filter');
    assert.ok(html.includes('Rejected'), 'Must render Rejected filter');
    assert.ok(html.includes('All Records'), 'Must render All Records filter');
  });

  it('5. AdminAuditLogsTab renders immutable audit trail search and action filters', () => {
    const html = renderToString(
      <AdminAuditLogsTab onNotify={() => {}} />
    );

    assert.ok(html.includes('Platform Audit &amp; Security Log Explorer') || html.includes('Platform Audit & Security Log Explorer'), 'Must render Audit Log title');
    assert.ok(html.includes('Search by actor identity, action type, or target ID...'), 'Must render audit search placeholder');
    assert.ok(html.includes('All Action Types'), 'Must render action filter');
    assert.ok(html.includes('All Target Entities'), 'Must render target filter');
  });

  it('6. AdminGovernanceTab renders marketplace hub, forum portal, and project deletion approval queue', () => {
    const html = renderToString(
      <AdminGovernanceTab onNotify={() => {}} onNavigate={() => {}} onRefreshOverview={() => {}} />
    );

    assert.ok(html.includes('Marketplace &amp; Escrow Governance') || html.includes('Marketplace & Escrow Governance'), 'Must render marketplace hub');
    assert.ok(html.includes('Community &amp; Forum Moderation') || html.includes('Community & Forum Moderation'), 'Must render forum hub');
    assert.ok(html.includes('Project Deletion Approval Queue'), 'Must render project deletion queue');
    assert.ok(html.includes('Pending Deletions'), 'Must render pending deletions badge');
  });

  it('7. AdminSystemHealthTab renders infrastructure status indicators and storage breakdown', () => {
    const html = renderToString(
      <AdminSystemHealthTab onNotify={() => {}} />
    );

    assert.ok(html.includes('Postgres Database'), 'Must render Postgres status card');
    assert.ok(html.includes('Supabase Auth &amp; JWKS') || html.includes('Supabase Auth & JWKS'), 'Must render Auth status card');
    assert.ok(html.includes('Supabase Realtime'), 'Must render Realtime status card');
    assert.ok(html.includes('AI Gateway Layer'), 'Must render AI Gateway status card');
    assert.ok(html.includes('Storage Footprint &amp; Category Distribution') || html.includes('Storage Footprint & Category Distribution'), 'Must render Storage distribution section');
    assert.ok(html.includes('System Diagnostics &amp; Error Event Stream') || html.includes('System Diagnostics & Error Event Stream'), 'Must render error event stream');
  });

  it('8. UserDetailModal renders privacy boundary banner protecting private researcher content (Spec 09 compliance)', () => {
    const html = renderToString(
      <UserDetailModal
        userId="test-user-uuid"
        isOpen={true}
        initialDetail={{
          id: 'test-user-uuid',
          fullName: 'Dr. Jane Scholar',
          email: 'jane@mit.edu',
          role: 'Researcher',
          status: 'Active',
          institution: 'MIT',
          department: 'Computer Science',
          photoUrl: null,
          reputationPoints: 120,
          projectsCount: 3,
          tasksCount: 5,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
          researchFieldTags: ['NLP', 'Bioinformatics'],
          skills: ['Python', 'PyTorch'],
          recentAuditLogs: []
        }}
        onClose={() => {}}
        onRoleChange={() => {}}
        onToggleSuspend={() => {}}
        onForcePasswordReset={() => {}}
      />
    );

    assert.ok(html.includes('Operational User Profile'), 'Must render user detail modal title');
    assert.ok(html.includes('Governance Privacy Boundary:'), 'Must render privacy boundary banner');
    assert.ok(html.includes('Admin access is strictly operational and metadata-bound'), 'Must affirm zero content inspection rule');
  });

  it('9. UserActionModal renders role changer, suspension confirmation, and password reset dialogs', () => {
    const html = renderToString(
      <UserActionModal
        isOpen={true}
        actionType="role"
        targetUser={{ id: 'test-user-id', name: 'Dr. Jane Scholar', role: 'Researcher', status: 'Active' }}
        onClose={() => {}}
        onSubmitRoleChange={async () => {}}
        onSubmitSuspend={async () => {}}
        onSubmitForcePasswordReset={async () => {}}
      />
    );

    assert.ok(html.includes('Assign Application Role'), 'Must render role assignment title');
    assert.ok(html.includes('Target Scholar:'), 'Must render target scholar label');
    assert.ok(html.includes('Dr. Jane Scholar'), 'Must render scholar name');
    assert.ok(html.includes('Save Role Changes'), 'Must render submit button');
  });
});
