import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderToString } from 'react-dom/server';

import { AuthProvider } from '../context/AuthContext.js';
import { AppSidebar } from '../components/layout/AppSidebar.js';
import { TopHeader } from '../components/layout/TopHeader.js';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout.js';
import { KanbanBoard } from '../components/workspace/KanbanBoard.js';
import { MilestoneTimeline } from '../components/workspace/MilestoneTimeline.js';
import { WorkspaceCalendar } from '../components/workspace/WorkspaceCalendar.js';
import { SupervisorReviewModal } from '../components/workspace/SupervisorReviewModal.js';
import { ProjectMembersModal } from '../components/workspace/ProjectMembersModal.js';
import { Project } from '@researchos/shared-types';

describe('Spec 02 — Workspace Layout & Navigation UI Tests', () => {
  const mockProject: Project = {
    id: 'test-project-123',
    ownerId: 'test-user-456',
    title: 'Deep Learning for Protein Dynamics',
    abstract: 'Neural molecular simulation',
    domainTags: ['BioML'],
    startDate: new Date().toISOString(),
    isPersonal: false,
    status: 'Ongoing',
    progressPercent: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('1. AppSidebar renders in collapsed mode by default with w-[72px] class and navigation icons', () => {
    const html = renderToString(
      <AuthProvider>
        <AppSidebar activeTab="kanban" />
      </AuthProvider>
    );
    assert.ok(html.includes('w-[72px]'), 'Collapsed sidebar should have default w-[72px] narrow container');
    assert.ok(html.includes('Workspace Board'), 'Contains navigation item names');
    assert.ok(html.includes('Milestones &amp; Calendar') || html.includes('Milestones & Calendar'), 'Contains milestone calendar label');
    assert.ok(html.includes('Research AI Co-Pilot'), 'Contains AI co-pilot link');
  });

  it('2. AppSidebar renders expanded width w-64 when isHovered=true', () => {
    const html = renderToString(
      <AuthProvider>
        <AppSidebar activeTab="kanban" isHovered={true} />
      </AuthProvider>
    );
    assert.ok(html.includes('w-64'), 'Hovered sidebar should expand width to w-64');
  });

  it('3. TopHeader renders active project title, status pills, and action buttons', () => {
    const html = renderToString(
      <AuthProvider>
        <TopHeader
          userId="test-user-456"
          userRole="Supervisor"
          activeProject={mockProject}
          projects={[mockProject]}
          isChatOpen={false}
          onOpenNewTaskModal={() => {}}
          onOpenInviteModal={() => {}}
        />
      </AuthProvider>
    );

    assert.ok(html.includes('Deep Learning for Protein Dynamics'), 'Renders active project title');
    assert.ok(html.includes('Ongoing'), 'Renders project status pill');
    assert.ok(html.includes('Completed'), 'Renders progress percentage');
    assert.ok(html.includes('Invite / Members'), 'Supervisor has Invite / Members button');
    assert.ok(html.includes('New Task'), 'Supervisor has New Task button');
  });

  it('4. TopHeader displays "Propose Task" button for Researcher in collaborative projects', () => {
    const html = renderToString(
      <AuthProvider>
        <TopHeader
          userId="researcher-user-789"
          userRole="Researcher"
          activeProject={mockProject}
          projects={[mockProject]}
          onOpenNewTaskModal={() => {}}
        />
      </AuthProvider>
    );

    assert.ok(html.includes('Propose Task'), 'Researcher in supervised project sees Propose Task button');
    assert.ok(!html.includes('Invite / Members'), 'Researcher does not see project invite button');
  });

  it('5. WorkspaceLayout renders AppSidebar, TopHeader and nested children smoothly', () => {
    const html = renderToString(
      <AuthProvider>
        <WorkspaceLayout
          activeTab="kanban"
          headerProps={{
            userId: 'test-user-456',
            userRole: 'Supervisor',
            activeProject: mockProject,
          }}
        >
          <div id="workspace-content-test">Kanban Board Active</div>
        </WorkspaceLayout>
      </AuthProvider>
    );

    assert.ok(html.includes('Kanban Board Active'), 'Renders nested workspace children');
    assert.ok(html.includes('Deep Learning for Protein Dynamics'), 'Renders active project in TopHeader');
  });

  it('6. KanbanBoard renders all task columns, search bar, and task cards', () => {
    const mockTasks = [
      {
        id: 'task-1',
        projectId: mockProject.id,
        title: 'Run Molecular Dynamic Simulations',
        description: 'Simulate with AMBER forcefield',
        status: 'ToDo',
        priority: 'High',
        dueDate: '2026-09-10T00:00:00Z',
        isProposal: false,
        assignee: { fullName: 'Alex Researcher', email: 'alex@lab.edu' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <KanbanBoard
        tasks={mockTasks as any}
        milestones={[]}
        members={[]}
        project={mockProject}
        currentUserId="test-user-456"
        currentUserRole="Supervisor"
        onTaskClick={() => {}}
        onTaskMove={async () => {}}
        onReviewTask={() => {}}
        onOpenNewTask={() => {}}
      />
    );

    assert.ok(html.includes('To Do'), 'Renders To Do column');
    assert.ok(html.includes('In Progress'), 'Renders In Progress column');
    assert.ok(html.includes('Under Review'), 'Renders Under Review column');
    assert.ok(html.includes('Approved'), 'Renders Approved column');
    assert.ok(html.includes('Run Molecular Dynamic Simulations'), 'Renders task card title');
    assert.ok(html.includes('Filter tasks by name'), 'Renders search input');
  });

  it('7. MilestoneTimeline renders milestone progress, locking status, and proposal badges', () => {
    const mockMilestones = [
      {
        id: 'milestone-1',
        projectId: mockProject.id,
        name: 'Phase 1: Dataset Collection',
        weightPct: 30,
        status: 'InProgress',
        targetDate: '2026-09-30',
        isLocked: false,
        isProposed: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'milestone-2',
        projectId: mockProject.id,
        name: 'Phase 2: Baseline Benchmark',
        weightPct: 70,
        status: 'Pending',
        targetDate: '2026-11-15',
        isLocked: true,
        isProposed: true,
        proposedBy: 'researcher-user-789',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <MilestoneTimeline
        milestones={mockMilestones as any}
        tasks={[]}
        project={mockProject}
        currentUserId="test-user-456"
        currentUserRole="Supervisor"
        onLockToggle={async () => {}}
        onApproveProposal={async () => {}}
        onOpenNewMilestone={() => {}}
      />
    );

    assert.ok(html.includes('Phase 1: Dataset Collection'), 'Renders active milestone title');
    assert.ok(html.includes('Phase 2: Baseline Benchmark'), 'Renders proposed milestone title');
    assert.ok(html.includes('weight') && html.includes('30'), 'Renders weight percentage');
    assert.ok(html.includes('Proposed'), 'Renders proposal badge');
  });

  it('8. WorkspaceCalendar displays scheduled deadlines', () => {
    const mockTasks = [
      {
        id: 'task-1',
        projectId: mockProject.id,
        title: 'Submit NeurIPS paper draft',
        status: 'InProgress',
        priority: 'High',
        dueDate: '2026-09-15T00:00:00Z',
        isProposal: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <WorkspaceCalendar
        tasks={mockTasks as any}
        milestones={[]}
        onTaskClick={() => {}}
      />
    );

    assert.ok(html.includes('Workspace Schedule &amp; Deadlines') || html.includes('Workspace Schedule & Deadlines'), 'Renders calendar header');
    assert.ok(html.includes('Submit NeurIPS paper draft'), 'Renders task title');
    assert.ok(html.includes('Scheduled Deadlines'), 'Renders scheduled count section');
  });

  it('9. SupervisorReviewModal displays deliverable approval and revision request controls', () => {
    const mockTask = {
      id: 'task-sub-1',
      projectId: mockProject.id,
      title: 'Draft Methodology Section',
      deliverableUrl: 'https://storage.researchos.dev/drafts/methodology.pdf',
      status: 'Submitted',
      priority: 'High',
      assignee: { fullName: 'Alex Researcher', email: 'alex@lab.edu' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const html = renderToString(
      <SupervisorReviewModal
        task={mockTask as any}
        isOpen={true}
        onClose={() => {}}
        onApprove={async () => {}}
        onRequestRevision={async () => {}}
      />
    );

    assert.ok(html.includes('Supervisor Review Workflow'), 'Renders review modal title');
    assert.ok(html.includes('Draft Methodology Section'), 'Renders task title');
    assert.ok(html.includes('Approve Deliverable'), 'Renders Approve button');
    assert.ok(html.includes('Request Revision'), 'Renders Request Revision button');
    assert.ok(html.includes('Revision Feedback &amp; Instructions') || html.includes('Revision Feedback & Instructions'), 'Renders feedback section');
  });

  it('10. ProjectMembersModal renders member list, role badges, direct user invite, and join link generator', () => {
    const mockMembers = [
      {
        id: 'member-1',
        projectId: mockProject.id,
        userId: 'test-user-456',
        projectRole: 'Member',
        user: { fullName: 'Dr. Jane Supervisor', email: 'jane@univ.edu', role: 'Supervisor' },
        createdAt: new Date().toISOString(),
      },
    ];

    const html = renderToString(
      <ProjectMembersModal
        project={mockProject}
        members={mockMembers as any}
        currentUserId="test-user-456"
        currentUserRole="Supervisor"
        isOpen={true}
        onClose={() => {}}
        onRefreshMembers={async () => {}}
      />
    );

    assert.ok(html.includes('Project Team &amp; Collaborators') || html.includes('Project Team & Collaborators'), 'Renders team modal title');
    assert.ok(html.includes('Dr. Jane Supervisor'), 'Renders member full name');
    assert.ok(html.includes('Invite Academic'), 'Supervisor has direct user invite tab');
    assert.ok(html.includes('Join Codes &amp; Links') || html.includes('Join Codes & Links'), 'Supervisor has join link tab');
  });

  it('11. JoinProjectModal renders code input and join action button', async () => {
    const { JoinProjectModal } = await import('../components/workspace/JoinProjectModal.js');
    const html = renderToString(
      <JoinProjectModal
        isOpen={true}
        onClose={() => {}}
        onProjectJoined={() => {}}
      />
    );

    assert.ok(html.includes('Join Research Workspace'), 'Renders join modal header');
    assert.ok(html.includes('Invite Code'), 'Renders invite code label');
    assert.ok(html.includes('Join Workspace'), 'Renders Join Workspace submit button');
  });

  it('12. NotificationBell renders trigger button with title and aria-label', async () => {
    const { NotificationBell } = await import('../components/layout/NotificationBell.js');
    const html = renderToString(
      <AuthProvider>
        <NotificationBell userId="test-user-456" onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('title="Notifications"'), 'Renders notification bell title');
    assert.ok(html.includes('aria-label="Notifications"'), 'Renders notification bell aria label');
  });

  it('13. NotificationsPage renders Notification Center banner, filter pills, search bar, and empty or list state', async () => {
    const { NotificationsPage } = await import('../pages/dashboards/NotificationsPage.js');
    const html = renderToString(
      <AuthProvider>
        <NotificationsPage onNavigate={() => {}} />
      </AuthProvider>
    );

    assert.ok(html.includes('Notification Center'), 'Renders Notification Center heading');
    assert.ok(html.includes('Search notifications...'), 'Renders search input placeholder');
    assert.ok(html.includes('All (') || html.includes('All'), 'Renders All filter pill');
    assert.ok(html.includes('Unread'), 'Renders Unread filter pill');
    assert.ok(html.includes('Tasks'), 'Renders Tasks filter pill');
    assert.ok(html.includes('Reviews &amp; Approvals') || html.includes('Reviews & Approvals'), 'Renders Reviews filter pill');
  });
});
