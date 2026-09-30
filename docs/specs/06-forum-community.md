# Spec 06 — Discussion Forum & Research Community

## Goal

Implement Module 6 of `feature-plan.md`: research questions/posts, answers, comments, voting, accepted answers, reputation, badges, tag follows, user profiles, direct messaging, blocking/reporting, and Admin moderation. Community behavior is intentionally flatter than research-project governance: Supervisors and Researchers participate as community members, while Admin owns moderation powers. Private DMs remain private except for the explicitly limited metadata access needed for a reported conversation.

**Depends on:** `00-foundation.md`, `01-auth-rbac.md`

**Agent mode:** Plan mode, Agent-assisted autonomy. Use Review-driven autonomy for moderation, reported-DM access, or data deletion logic.

## Entities & relations

### Post

```text
Post {
  id             uuid PK
  authorId       FK→User
  title          string
  body           text
  tags           string[]
  attachmentIds  FK→FileAsset[]
  projectId      FK→Project?
  isPinned       bool default(false)
  createdAt      datetime
}
```

Author controls own content. `isPinned` for project posts is controlled by the relevant Supervisor.

### Answer

```text
Answer {
  id               uuid PK
  postId           FK→Post
  authorId         FK→User
  body             text
  isAccepted       bool default(false)
  expertVerifiedBy FK→User?
  expertVerifiedAt datetime?
  createdAt        datetime
}
```

### Comment

```text
Comment {
  id         uuid PK
  targetType enum(Post, Answer)
  targetId   uuid
  authorId   FK→User
  body       string
  createdAt  datetime
}
```

### Vote

```text
Vote {
  id         uuid PK
  targetType enum(Post, Answer)
  targetId   uuid
  voterId    FK→User
  value      enum(Up, Down)
  unique(targetType, targetId, voterId)
}
```

### Badge / UserBadge

```text
Badge {
  id uuid PK
  name string
  criteria string
}

UserBadge {
  userId FK→User
  badgeId FK→Badge
  awardedAt datetime
}
```

Supervisor/Faculty verified identity is derived from active Supervisor status rather than being a Badge row.

### TagFollow

```text
TagFollow {
  userId FK→User
  tag string
}
```

### DirectMessage

```text
DirectMessage {
  id          uuid PK
  senderId    FK→User
  recipientId FK→User
  body        string
  createdAt   datetime
}
```

Admin may access only metadata for a Reported conversation.

### UserBlock

```text
UserBlock {
  blockerId FK→User
  blockedId FK→User
  createdAt datetime
}
```

### Report

```text
Report {
  id          uuid PK
  targetType  enum(Post, Answer, Comment, DirectMessage)
  targetId    uuid
  reporterId  FK→User
  reason      string
  status      enum(Pending, ActionTaken, Dismissed)
  reviewedBy  FK→User?
  createdAt   datetime
}
```

## Core rules

- Researcher and Supervisor have the same community posting/answering/voting/DM rights except Supervisor-specific trust features.
- Askers can accept an answer to their own question.
- Supervisor may optionally mark an answer Expert Verified inside their field.
- Admin can moderate posts/threads and manage tag taxonomy.
- Admin cannot read ordinary private DMs.
- A reported DM may expose only the metadata necessary for moderation unless a separate approved policy explicitly changes this scope.

## API endpoints

> Proposed endpoint contract.

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/forum/posts` | Authenticated | Feed/search posts |
| POST | `/forum/posts` | Researcher/Supervisor | Create post |
| GET | `/forum/posts/:id` | Authenticated | Read post + answers |
| PATCH | `/forum/posts/:id` | Author | Edit own post |
| DELETE | `/forum/posts/:id` | Author; Admin moderation | Delete/remove post |
| POST | `/forum/posts/:id/answers` | Researcher/Supervisor | Add answer |
| PATCH | `/forum/answers/:id` | Author | Edit own answer |
| POST | `/forum/posts/:id/accept/:answerId` | Post author | Accept answer |
| POST | `/forum/answers/:id/expert-verify` | Active Supervisor, scoped to field | Mark Expert Verified |
| POST | `/forum/:targetType/:targetId/vote` | Authenticated | Up/down vote |
| DELETE | `/forum/:targetType/:targetId/vote` | Voter | Remove vote |
| POST | `/forum/:targetType/:targetId/comments` | Authenticated | Add comment |
| POST | `/forum/reports` | Authenticated | Report content/DM |
| GET | `/admin/forum/reports` | Admin | Moderation queue |
| POST | `/admin/forum/reports/:id/action` | Admin | Take moderation action |
| GET | `/forum/tags/following` | Authenticated | Followed tags |
| POST | `/forum/tags/:tag/follow` | Authenticated | Follow tag |
| DELETE | `/forum/tags/:tag/follow` | Authenticated | Unfollow tag |
| GET | `/users/:userId/community-profile` | Authenticated | Community profile/reputation |
| GET | `/messages` | Authenticated | Own direct-message threads |
| POST | `/messages` | Authenticated | Send direct message |
| POST | `/messages/block` | Authenticated | Block user |
| DELETE | `/messages/block/:userId` | Authenticated | Unblock user |

## Role behavior

### Researcher

- Ask questions, answer, comment, vote.
- Accept an answer on their own question.
- DM other users.
- Edit/delete their own content.
- Build visible reputation.
- Block/report other users.

### Supervisor

- Same core community rights as Researcher.
- Active Supervisor can show the derived Supervisor/Faculty badge.
- May optionally Expert Verify an answer in their own field.
- May pin an announcement inside their own project group discussion.

### Admin

- Moderates reports.
- Can hide/delete forum content.
- Can lock a thread.
- Can issue warnings, mute, or ban users.
- Manages tag taxonomy and community guidelines.
- Cannot read private DMs except the limited metadata of a reported conversation.

## Acceptance criteria

- [ ] Researcher can create, edit, and delete their own posts.
- [ ] Supervisor can do the same as a community member.
- [ ] User cannot edit another user's post or answer.
- [ ] Question author can accept an answer only on their own question.
- [ ] Each user can have at most one vote per target.
- [ ] Changing a vote updates that user's existing vote rather than creating duplicates.
- [ ] Supervisor Expert Verification requires active Supervisor status and the defined field scope.
- [ ] User can follow/unfollow tags.
- [ ] Direct messages are visible only to sender/recipient.
- [ ] A blocked user cannot continue sending DM messages to the blocker.
- [ ] Admin moderation can remove reported content.
- [ ] Admin cannot retrieve ordinary DM bodies.
- [ ] A reported DirectMessage exposes only the permitted metadata to Admin.
- [ ] Reports have explicit status transitions and reviewer attribution.
- [ ] Reputation changes are generated by server-side events, not arbitrary client input.
- [ ] Supervisor/Faculty identity is derived from role/status rather than allowing a user to self-award the badge.
