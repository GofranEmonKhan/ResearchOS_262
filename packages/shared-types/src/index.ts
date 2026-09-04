/**
 * ResearchOS Shared Types & Enums
 * Single Source of Truth for Client and Server Contracts
 */

// ==========================================
// 1. Core Application Roles & Statuses (Spec 01)
// ==========================================

export type UserRole = 'Admin' | 'Supervisor' | 'Researcher';

export const USER_ROLES: Record<UserRole, UserRole> = {
  Admin: 'Admin',
  Supervisor: 'Supervisor',
  Researcher: 'Researcher',
};

export type UserStatus = 'Active' | 'PendingVerification' | 'Suspended';

export const USER_STATUSES: Record<UserStatus, UserStatus> = {
  Active: 'Active',
  PendingVerification: 'PendingVerification',
  Suspended: 'Suspended',
};

export type VerificationStatus = 'Pending' | 'Approved' | 'Rejected';

export const VERIFICATION_STATUSES: Record<VerificationStatus, VerificationStatus> = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

// ==========================================
// 2. Research Workspace Enums (Spec 02)
// ==========================================

export type ProjectStatus = 'Planning' | 'Ongoing' | 'Writing' | 'Submitted' | 'Completed';

export const PROJECT_STATUSES: Record<ProjectStatus, ProjectStatus> = {
  Planning: 'Planning',
  Ongoing: 'Ongoing',
  Writing: 'Writing',
  Submitted: 'Submitted',
  Completed: 'Completed',
};

export type ProjectRole = 'Member' | 'CoSupervisor';

export const PROJECT_ROLES: Record<ProjectRole, ProjectRole> = {
  Member: 'Member',
  CoSupervisor: 'CoSupervisor',
};

export type ProjectInviteType = 'Email' | 'Code';

export const PROJECT_INVITE_TYPES: Record<ProjectInviteType, ProjectInviteType> = {
  Email: 'Email',
  Code: 'Code',
};

export type ProjectInviteStatus = 'Pending' | 'Accepted' | 'Revoked';

export const PROJECT_INVITE_STATUSES: Record<ProjectInviteStatus, ProjectInviteStatus> = {
  Pending: 'Pending',
  Accepted: 'Accepted',
  Revoked: 'Revoked',
};

export type MilestoneStatus = 'Pending' | 'InProgress' | 'Completed';

export const MILESTONE_STATUSES: Record<MilestoneStatus, MilestoneStatus> = {
  Pending: 'Pending',
  InProgress: 'InProgress',
  Completed: 'Completed',
};

export type TaskPriority = 'Low' | 'Medium' | 'High';

export const TASK_PRIORITIES: Record<TaskPriority, TaskPriority> = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
};

export type TaskStatus = 'ToDo' | 'InProgress' | 'Submitted' | 'UnderReview' | 'Approved' | 'RevisionRequested';

export const TASK_STATUSES: Record<TaskStatus, TaskStatus> = {
  ToDo: 'ToDo',
  InProgress: 'InProgress',
  Submitted: 'Submitted',
  UnderReview: 'UnderReview',
  Approved: 'Approved',
  RevisionRequested: 'RevisionRequested',
};

export type NotificationType =
  | 'TaskAssigned'
  | 'DeadlineIn48h'
  | 'RevisionRequested'
  | 'TaskApproved'
  | 'ReviewDeadline'
  | 'BookingRequest'
  | 'ForumReply'
  | 'MilestoneDue';

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationType> = {
  TaskAssigned: 'TaskAssigned',
  DeadlineIn48h: 'DeadlineIn48h',
  RevisionRequested: 'RevisionRequested',
  TaskApproved: 'TaskApproved',
  ReviewDeadline: 'ReviewDeadline',
  BookingRequest: 'BookingRequest',
  ForumReply: 'ForumReply',
  MilestoneDue: 'MilestoneDue',
};

export type NotificationChannel = 'InApp' | 'Email';

export const NOTIFICATION_CHANNELS: Record<NotificationChannel, NotificationChannel> = {
  InApp: 'InApp',
  Email: 'Email',
};

// ==========================================
// 3. User & Auth Entities (Spec 01)
// ==========================================

export interface Profile {
  id: string; // FK -> auth.users.id
  fullName: string;
  role: UserRole;
  status: UserStatus;
  institution: string;
  department: string;
  researchFieldTags: string[];
  photoUrl?: string | null;
  bio?: string | null;
  orcidUrl?: string | null;
  scholarUrl?: string | null;
  researchInterests: string[];
  skills: string[];
  reputationPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisorVerificationRequest {
  id: string;
  userId: string;
  documentUrl: string;
  institutionDomain: string;
  status: VerificationStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  user?: Partial<Profile> | null;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ==========================================
// 4. Research Workspace Entities (Spec 02)
// ==========================================

export interface Project {
  id: string;
  ownerId: string; // FK -> profiles.id (Supervisor for supervised; creating Researcher if isPersonal)
  isPersonal: boolean;
  title: string;
  abstract: string;
  domainTags: string[];
  startDate: string;
  endDate?: string | null;
  status: ProjectStatus;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
  owner?: Partial<Profile> | null;
  membersCount?: number;
  tasksCount?: number;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  projectRole: ProjectRole;
  addedBy?: string | null;
  joinedAt: string;
  user?: Partial<Profile> | null;
}

export interface ProjectInvite {
  id: string;
  projectId: string;
  createdBy: string;
  inviteType: ProjectInviteType;
  invitedEmail?: string | null;
  invitedRole: ProjectRole;
  code?: string | null;
  maxUses?: number | null;
  usesCount: number;
  expiresAt?: string | null;
  status: ProjectInviteStatus;
  createdAt: string;
}

export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  targetDate: string;
  weightPct: number;
  status: MilestoneStatus;
  isLocked: boolean;
  isProposed: boolean;
  proposedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  tasksCount?: number;
  approvedTasksCount?: number;
}

export interface Task {
  id: string;
  projectId: string;
  milestoneId?: string | null;
  title: string;
  description: string;
  assigneeId: string;
  createdBy: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  progressNote?: string | null;
  revisionNote?: string | null;
  isProposed: boolean;
  proposedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: Partial<Profile> | null;
  creator?: Partial<Profile> | null;
  milestone?: Partial<Milestone> | null;
  commentsCount?: number;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: Partial<Profile> | null;
}

export interface ProjectMessage {
  id: string;
  projectId: string;
  senderId: string;
  body: string;
  createdAt: string;
  sender?: Partial<Profile> | null;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  channel: NotificationChannel;
  isRead: boolean;
  createdAt: string;
}

// ==========================================
// 5. Request & Response DTOs
// ==========================================

// Profile DTOs
export interface UpdateProfileDto {
  fullName?: string;
  photoUrl?: string | null;
  bio?: string | null;
  orcidUrl?: string | null;
  scholarUrl?: string | null;
  institution?: string;
  department?: string;
  researchFieldTags?: string[];
  researchInterests?: string[];
  skills?: string[];
}

export interface SubmitSupervisorVerificationDto {
  documentUrl: string;
  institutionDomain: string;
}

export interface RejectSupervisorVerificationDto {
  rejectionReason: string;
}

export interface ChangeUserRoleDto {
  role: UserRole;
}

// Project DTOs
export interface CreateProjectDto {
  title: string;
  abstract?: string;
  domainTags?: string[];
  startDate?: string;
  endDate?: string | null;
  isPersonal?: boolean;
}

export interface UpdateProjectDto {
  title?: string;
  abstract?: string;
  domainTags?: string[];
  startDate?: string;
  endDate?: string | null;
  status?: ProjectStatus;
}

export interface AddProjectMemberDto {
  userId: string;
  projectRole?: ProjectRole;
}

export interface UpdateProjectMemberDto {
  projectRole: ProjectRole;
}

export interface CreateProjectInviteDto {
  inviteType: ProjectInviteType;
  invitedEmail?: string;
  invitedRole?: ProjectRole;
  maxUses?: number;
  expiresInDays?: number;
}

export interface AcceptInviteCodeDto {
  code: string;
}

// Milestone DTOs
export interface CreateMilestoneDto {
  name: string;
  targetDate: string;
  weightPct?: number;
}

export interface UpdateMilestoneDto {
  name?: string;
  targetDate?: string;
  weightPct?: number;
  status?: MilestoneStatus;
}

// Task DTOs
export interface CreateTaskDto {
  title: string;
  description?: string;
  assigneeId?: string; // In supervised projects, Project Owner Supervisor assigns; personal projects default to self
  milestoneId?: string | null;
  dueDate: string;
  priority?: TaskPriority;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  milestoneId?: string | null;
  progressNote?: string;
}

export interface SubmitTaskDto {
  progressNote?: string;
}

export interface RequestTaskRevisionDto {
  revisionNote: string;
}

export interface AddTaskCommentDto {
  body: string;
}

export interface SendProjectMessageDto {
  body: string;
}

// API Health Check Response
export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  supabase: boolean;
}

// ==========================================
// 6. Literature Review & Paper Manager (Spec 03)
// ==========================================

export type ReadingStatus = 'Unread' | 'Reading' | 'Read' | 'DeeplyAnalysed';

export const READING_STATUSES: Record<ReadingStatus, ReadingStatus> = {
  Unread: 'Unread',
  Reading: 'Reading',
  Read: 'Read',
  DeeplyAnalysed: 'DeeplyAnalysed',
};

export type SidebarFieldType =
  | 'ResearchGap'
  | 'Limitation'
  | 'FutureWork'
  | 'DatasetUsed'
  | 'Methodology'
  | 'Results';

export const SIDEBAR_FIELD_TYPES: Record<SidebarFieldType, SidebarFieldType> = {
  ResearchGap: 'ResearchGap',
  Limitation: 'Limitation',
  FutureWork: 'FutureWork',
  DatasetUsed: 'DatasetUsed',
  Methodology: 'Methodology',
  Results: 'Results',
};

export type CitationPurposeType =
  | 'Motivation'
  | 'MethodSource'
  | 'DatasetSource'
  | 'ComparisonBaseline'
  | 'ContradictingEvidence'
  | 'SupportingEvidence'
  | 'RelatedWork';

export const CITATION_PURPOSE_TYPES: Record<CitationPurposeType, CitationPurposeType> = {
  Motivation: 'Motivation',
  MethodSource: 'MethodSource',
  DatasetSource: 'DatasetSource',
  ComparisonBaseline: 'ComparisonBaseline',
  ContradictingEvidence: 'ContradictingEvidence',
  SupportingEvidence: 'SupportingEvidence',
  RelatedWork: 'RelatedWork',
};

export type MetadataSource = 'crossref' | 'openalex' | 'pdf_extraction' | 'user';

export const METADATA_SOURCES: Record<MetadataSource, MetadataSource> = {
  crossref: 'crossref',
  openalex: 'openalex',
  pdf_extraction: 'pdf_extraction',
  user: 'user',
};

export interface FileAsset {
  id: string;
  ownerId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface Paper {
  id: string;
  uploaderId: string;
  projectId?: string | null;
  title: string;
  authors: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  fileAssetId: string;
  readingStatus: ReadingStatus;
  isRequiredReading: boolean;
  assignedBySupervisorId?: string | null;
  linkedTaskId?: string | null;
  metadataSource: MetadataSource;
  metadataConfidence: number;
  metadataLastRefreshedAt?: string | null;
  createdAt: string;
  // Joined fields for UI
  uploader?: Partial<Profile> | null;
  fileAsset?: Partial<FileAsset> | null;
  collections?: Collection[];
}

export interface PaperSidebarFields {
  id: string;
  paperId: string;
  researchGap?: string | null;
  limitation?: string | null;
  futureWork?: string | null;
  datasetUsed?: string | null;
  methodology?: string | null;
  results?: string | null;
  personalNotes?: string | null;
  personalNotesVisible: boolean;
}

export interface AnnotationRect {
  x: number;          // normalized percentage 0.0–1.0 relative to page width
  y: number;          // normalized percentage 0.0–1.0 relative to page height
  width: number;      // normalized percentage 0.0–1.0
  height: number;     // normalized percentage 0.0–1.0
}

export interface AnnotationPositionData {
  page: number;
  rects: AnnotationRect[];
  color?: string;
}

export interface PaperAnnotation {
  id: string;
  paperId: string;
  userId: string;
  page: number;
  highlightedText: string;
  positionData: AnnotationPositionData;
  stickyNote?: string | null;
  linkedSidebarField?: SidebarFieldType | null;
  createdAt: string;
  user?: Partial<Profile> | null;
}

export interface Collection {
  id: string;
  ownerId: string;
  name: string;
  colorHex: string;
  paperCount?: number;
}

export interface CitationPurpose {
  id: string;
  paperId: string;
  manuscriptId?: string | null;
  purpose: CitationPurposeType;
  note?: string | null;
}

export interface PaperComment {
  id: string;
  paperId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author?: Partial<Profile> | null;
}

export interface MetadataCandidate {
  title: string;
  authors: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  source: MetadataSource;
  confidence: number;     // 0.0–1.0
}

export interface MetadataResult {
  status: 'resolved' | 'candidates' | 'manual';
  paper?: MetadataCandidate;
  candidates?: MetadataCandidate[];
}

// DTOs
export interface ResolveMetadataDto {
  storagePath: string;    // {userId}/{uuid}.pdf
  fileName: string;
}

export interface CreatePaperDto {
  title: string;
  authors?: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  storagePath: string;    // {userId}/{uuid}.pdf
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  metadataSource?: MetadataSource;
  metadataConfidence?: number;
}

export interface UpdatePaperDto {
  title?: string;
  authors?: string[];
  year?: number | null;
  doi?: string | null;
  venue?: string | null;
  readingStatus?: ReadingStatus;  // bidirectional — any valid enum value
}

export interface SharePaperDto {
  projectId: string;
}

export interface RequiredReadingDto {
  linkedTaskId?: string | null;
}

export interface UpdateSidebarFieldsDto {
  researchGap?: string | null;
  limitation?: string | null;
  futureWork?: string | null;
  datasetUsed?: string | null;
  methodology?: string | null;
  results?: string | null;
  personalNotes?: string | null;
  personalNotesVisible?: boolean;
}

export interface CreateAnnotationDto {
  page: number;
  highlightedText: string;
  positionData: AnnotationPositionData;   // required for persistent rendering
  stickyNote?: string | null;
  linkedSidebarField?: SidebarFieldType | null;
}

export interface UpdateAnnotationDto {
  stickyNote?: string | null;
  linkedSidebarField?: SidebarFieldType | null;
}

export interface CreateCollectionDto {
  name: string;
  colorHex?: string;
}

export interface UpdateCollectionDto {
  name?: string;
  colorHex?: string;
}

export interface CreateCitationPurposeDto {
  paperId: string;
  manuscriptId?: string | null;
  purpose: CitationPurposeType;
  note?: string | null;
}

export interface AddPaperCommentDto {
  body: string;
}

export interface PaperSearchParams {
  q?: string;             // Metadata search query (title, authors, venue)
  projectId?: string;     // Filter to project library
  collectionId?: string;  // Filter to collection
  readingStatus?: ReadingStatus;
  year?: number;
  isRequiredReading?: boolean;
  page?: number;
  limit?: number;
}

export interface PaperListResponse {
  papers: Paper[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

