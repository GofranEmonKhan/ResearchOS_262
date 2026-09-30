# Spec 02 — Research Workspace

## Goal

Implement Module 2 of `feature-plan.md`: supervised and personal research projects, project membership and invites, milestones, tasks, approval workflow, project chat, notifications, calendar/deadline support, progress calculation, and the role-specific workspace dashboards. A Supervisor governs supervised projects; a Researcher executes assigned work and may self-manage tasks only inside a personal project; Admin sees aggregate metadata and performs only explicitly permitted lifecycle operations.

**Depends on:** `00-foundation.md`, `01-auth-rbac.md`

**Agent mode:** Plan mode, Agent-assisted autonomy. Use Review-driven autonomy for authorization/state-machine or destructive schema changes.

## Source-of-truth rules

- Follow `feature-plan.md` Module 2 and the corresponding entities in `ResearchOS_Data_Model_Entity_Ownership.md`.
- `supabase/migrations/*.sql` remains the schema source of truth.
- All business-data writes go through Express using the server-side Supabase secret-key client.
- Frontend Supabase client is limited to Auth, Storage uploads, and Realtime subscriptions.
- Application authorization is always enforced in Express using verified user identity + live `profiles.role/status` lookup.
- Ownership beats role. Project membership and explicit ownership/access paths must be checked before mutations.

## Entities & relations

### Project

```text
Project {
  id              uuid PK
  ownerId         FK→User        // Supervisor for supervised; creating Researcher if isPersonal
  isPersonal      bool
  title           string
  abstract        string
  domainTags      string[]
  startDate       date
  endDate         date?
  status          enum(Planning, Ongoing, Writing, Submitted, Completed)
  progressPercent int             // computed server-side
  createdAt       datetime
}
```

Access scope: `ownerId` (Supervisor for supervised projects; creating Researcher when `isPersonal=true`).

### ProjectMember

```text
ProjectMember {
  id           uuid PK
  projectId    FK→Project
  userId       FK→User
  projectRole  enum(Member, CoSupervisor)
  addedBy      FK→User
  joinedAt     datetime
}
```

Access scope: project membership. Project Owner Supervisor controls membership and governance. `CoSupervisor` is a project-scoped assignment for another Supervisor; `Reviewer` is their manuscript review duty in Module 05 rather than a ProjectMember role. Only the Project Owner Supervisor has Module 02 project-governance authority.

### ProjectInvite

```text
ProjectInvite {
  id           uuid PK
  projectId    FK→Project
  createdBy    FK→User
  inviteType   enum(Email, Code)
  invitedEmail string?
  code         string? unique
  maxUses      int?
  usesCount    int default(0)
  expiresAt    datetime?
  status       enum(Pending, Accepted, Revoked)
}
```

Only the project Supervisor may create/revoke invites.

### Milestone

```text
Milestone {
  id          uuid PK
  projectId   FK→Project
  name        string
  targetDate  date
  weightPct   int
  status      enum(Pending, InProgress, Completed)
  isLocked    bool default(false)
  isProposed  bool default(false)
  proposedBy  FK→User?
}
```

Supervisor writes directly. Researcher may only propose (`isProposed=true`).

### Task

```text
Task {
  id            uuid PK
  projectId     FK→Project
  milestoneId   FK→Milestone?
  title         string
  description   string
  assigneeId    FK→User
  createdBy     FK→User
  dueDate       date
  priority      enum(Low, Medium, High)
  status        enum(ToDo, InProgress, Submitted, UnderReview, Approved, RevisionRequested)
  progressNote  string?
  revisionNote  string?
  isProposed    bool default(false)
  proposedBy    FK→User?
}
```

Only Supervisor may assign another person in supervised projects. Only Supervisor may set `Approved`. Researcher may update execution fields/statuses allowed by the workflow.

### TaskComment

```text
TaskComment {
  id uuid PK
  taskId FK→Task
  authorId FK→User
  body string
  createdAt datetime
}
```

Any project member can read/comment.

### ProjectMessage

```text
ProjectMessage {
  id uuid PK
  projectId FK→Project
  senderId FK→User
  body string
  createdAt datetime
}
```

Read access is project-membership scoped. Realtime subscription uses Postgres Changes; writes remain Express-authorized.

### Notification

```text
Notification {
  id        uuid PK
  userId    FK→User
  type      enum(TaskAssigned, DeadlineIn48h, RevisionRequested, TaskApproved,
                 ReviewDeadline, BookingRequest, ForumReply, MilestoneDue)
  payload   json
  channel   enum(InApp, Email)
  isRead    bool default(false)
  createdAt datetime
}
```

Owner-only read/mark-read. In-app updates use Realtime. Deadline-in-48h generation is deferred to scheduled infrastructure.

## State and business rules

### Task workflow

```text
ToDo
  → InProgress
  → Submitted
  → UnderReview
      ├→ Approved
      └→ RevisionRequested → InProgress
```

A Researcher cannot self-approve.

### Project creation

- Supervisor can create supervised projects and becomes owner.
- Researcher can create only a personal project (`isPersonal=true`, no supervisor).
- Researcher self-assignment is allowed only in a personal project.

### Membership

- Supervisor adds/removes project members and assigns project roles.
- Researcher joins a supervised project only through an approved invite/invite code.
- Non-members cannot access project content.

### Milestones

- Supervisor defines/edits/locks milestones.
- Researcher may propose a milestone.
- A locked milestone prevents editing of its tasks after approval.

### Progress

Progress is derived server-side from approved task completion:
- When milestones with weights exist: `Progress = sum(milestone.weightPct * (approved_tasks_in_milestone / total_tasks_in_milestone))`
- When no milestones exist or unweighted: `Progress = round((approved_tasks / total_tasks) * 100)`
- Do not let clients write arbitrary `progressPercent`; it is updated server-side on task approvals.

### Calendar & Deadline Scope
In Module 02, the calendar/deadline view is derived strictly from `Task.dueDate` and `Milestone.targetDate`. Meeting slots/calendaring entities are deferred until a future approved module/entity.

### Realtime & Defense-in-Depth RLS
Frontend subscribes to Postgres Changes directly using the publishable key.
- `project_messages` `SELECT` policy: User must be project owner (`projects.owner_id = auth.uid()`) OR an active project member (`EXISTS (SELECT 1 FROM project_members WHERE project_id = project_messages.project_id AND user_id = auth.uid())`).
- `notifications` `SELECT` & `UPDATE` policy: `auth.uid() = user_id`.
- All writes remain strictly Express-authorized using the server secret key.

## API endpoints

> The source docs define the workflows and entities but do not prescribe exact REST paths for Module 2. The following are the proposed implementation contracts and should remain consistent with the source rules.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/projects` | Authenticated | List projects visible to current user |
| POST | `/projects` | Supervisor; Researcher for personal only | Create project |
| GET | `/projects/:projectId` | Members; Admin aggregate-only | Project details within allowed scope |
| PATCH | `/projects/:projectId` | Project Owner Supervisor; personal owner | Update project metadata |
| POST | `/projects/:projectId/members` | Project Owner Supervisor | Add member |
| DELETE | `/projects/:projectId/members/:userId` | Project Owner Supervisor | Remove member |
| POST | `/projects/:projectId/invites` | Project Owner Supervisor | Create email/code invite |
| POST | `/invites/:code/accept` | Authenticated Researcher | Accept join code |
| POST | `/projects/:projectId/milestones` | Project Owner Supervisor; Researcher proposal | Create milestone/proposal |
| PATCH | `/milestones/:id` | Project Owner Supervisor; proposer only while proposed | Update permitted fields |
| POST | `/milestones/:id/lock` | Project Owner Supervisor | Lock milestone |
| POST | `/milestones/:id/approve-proposal` | Project Owner Supervisor | Approve milestone proposal |
| POST | `/projects/:projectId/tasks` | Project Owner Supervisor; Researcher personal self-task; Researcher proposal | Create task |
| PATCH | `/tasks/:id` | Assignee for execution fields; Supervisor for governance fields | Update task |
| POST | `/tasks/:id/submit` | Assignee Researcher | Submit for approval (enters Supervisor review queue) |
| POST | `/tasks/:id/approve` | Project Owner Supervisor | Approve submitted task |
| POST | `/tasks/:id/revision` | Project Owner Supervisor | Request revision with feedback |
| POST | `/tasks/:id/approve-proposal` | Project Owner Supervisor | Approve researcher task proposal |
| GET | `/tasks/:id/comments` | Project members | List comments |
| POST | `/tasks/:id/comments` | Project members | Add comment |
| GET | `/projects/:projectId/messages` | Project members | Load project chat history |
| POST | `/projects/:projectId/messages` | Project members | Send project message |
| GET | `/notifications` | Authenticated | List own notifications |
| PATCH | `/notifications/:id/read` | Recipient only | Mark notification read |

### Representative request/response shapes

#### Create project

```json
{
  "title": "Research Title",
  "abstract": "Short abstract",
  "domainTags": ["HCI", "AI"],
  "startDate": "2026-09-01",
  "endDate": "2027-02-28",
  "isPersonal": false
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "title": "Research Title",
    "status": "Planning",
    "progressPercent": 0
  }
}
```

#### Submit task

```json
{
  "progressNote": "Completed the experiment and attached the report."
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "status": "Submitted"
  }
}
```

#### Request revision

```json
{
  "revisionNote": "Please rerun with the revised baseline and explain the metric discrepancy."
}
```

Response:

```json
{
  "data": {
    "id": "uuid",
    "status": "RevisionRequested",
    "revisionNote": "Please rerun with the revised baseline and explain the metric discrepancy."
  }
}
```

## Role behavior

### Supervisor

- Creates the project and becomes Project Owner (holds exclusive Module 02 governance authority).
- Adds/removes members and sets project roles: Member / CoSupervisor.
- Defines milestones and deadlines.
- Is the only role that assigns a task to another person in a supervised project.
- Reviews submitted work and can Approve or Request Revision.
- Sees supervised-project dashboard with students, overdue tasks, and progress.
- Can lock a milestone.

### Researcher

- Sees only projects where they are a member, plus personal projects.
- Can create a personal project and self-assign tasks there.
- In supervised projects, updates task execution fields, adds deliverables/progress notes, and submits for approval.
- Cannot mark a supervised task Approved.
- Can propose milestones/tasks for Supervisor review.
- Uses their own calendar/deadline view.

### Admin

- Does not open project content.
- Sees aggregate project metadata only.
- May archive/transfer a project when formally required.
- May force-delete only through the formal, logged deletion workflow.

## Acceptance criteria

- [ ] Researcher can create a personal project, but cannot create a supervised project with another Supervisor as owner.
- [ ] Supervisor can create a supervised project and becomes its owner.
- [ ] Researcher cannot add/remove project members.
- [ ] Only the project Supervisor can add/remove members and create/revoke invites.
- [ ] A non-member cannot read project content or project messages.
- [ ] Researcher can join a supervised project only through a valid invite/code path.
- [ ] Only Supervisor can assign a task to another person in a supervised project.
- [ ] Researcher can self-assign only inside a personal project.
- [ ] Researcher cannot set a supervised task to `Approved`; API returns 403.
- [ ] Only Supervisor can move a submitted task to `Approved`.
- [ ] Only Supervisor can move a submitted/under-review task to `RevisionRequested` and provide feedback.
- [ ] Revision request loops the task back to the Researcher workflow.
- [ ] Researcher can submit a task only for a task they are the assignee of.
- [ ] A locked milestone prevents task edits covered by the lock rule.
- [ ] Researcher milestone/task proposals are visibly marked as proposals and do not become active governance objects without Supervisor action.
- [ ] `progressPercent` is computed from approved work and cannot be arbitrarily written by the frontend.
- [ ] Task comments are visible only to project members.
- [ ] Project messages are visible only to project members.
- [ ] Project messages can be received through Realtime without allowing unauthorized rows to reach a subscriber.
- [ ] Notification read state can be changed only by the notification recipient.
- [ ] Deadline-in-48h notifications are generated by the server/scheduled workflow, not by trusting a client.
- [ ] Admin cannot retrieve private project content through an ordinary project-content endpoint.
- [ ] Every governance action that changes task state is authorization-tested by role and ownership.
