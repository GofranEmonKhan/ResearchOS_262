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
  | 'MilestoneDue'
  | 'ExperimentFlagged'
  | 'ExperimentCommented'
  | 'AnswerAccepted'
  | 'ExpertVerified'
  | 'DirectMessageReceived'
  | 'ContentReported'
  | 'ReviewerAssigned'
  | 'ReviewCommentAdded'
  | 'CommentFixed'
  | 'CommentResolved'
  | 'ManuscriptStatusChanged'
  | 'BookingAccepted'
  | 'BookingRejected'
  | 'PaymentEscrowed'
  | 'AccessReleased'
  | 'BookingCompleted'
  | 'DisputeRaised'
  | 'DisputeResolved'
  | 'ListingApproved'
  | 'ListingRejected'
  | 'InquiryReceived';

export const NOTIFICATION_TYPES: Record<NotificationType, NotificationType> = {
  TaskAssigned: 'TaskAssigned',
  DeadlineIn48h: 'DeadlineIn48h',
  RevisionRequested: 'RevisionRequested',
  TaskApproved: 'TaskApproved',
  ReviewDeadline: 'ReviewDeadline',
  BookingRequest: 'BookingRequest',
  ForumReply: 'ForumReply',
  MilestoneDue: 'MilestoneDue',
  ExperimentFlagged: 'ExperimentFlagged',
  ExperimentCommented: 'ExperimentCommented',
  AnswerAccepted: 'AnswerAccepted',
  ExpertVerified: 'ExpertVerified',
  DirectMessageReceived: 'DirectMessageReceived',
  ContentReported: 'ContentReported',
  ReviewerAssigned: 'ReviewerAssigned',
  ReviewCommentAdded: 'ReviewCommentAdded',
  CommentFixed: 'CommentFixed',
  CommentResolved: 'CommentResolved',
  ManuscriptStatusChanged: 'ManuscriptStatusChanged',
  BookingAccepted: 'BookingAccepted',
  BookingRejected: 'BookingRejected',
  PaymentEscrowed: 'PaymentEscrowed',
  AccessReleased: 'AccessReleased',
  BookingCompleted: 'BookingCompleted',
  DisputeRaised: 'DisputeRaised',
  DisputeResolved: 'DisputeResolved',
  ListingApproved: 'ListingApproved',
  ListingRejected: 'ListingRejected',
  InquiryReceived: 'InquiryReceived',
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
  description: string;
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

export interface SubmissionFile {
  name: string;        // Original filename
  url: string;         // Supabase Storage path (used with getPublicUrl / createSignedUrl)
  size: number;        // bytes
  type: string;        // MIME type
  uploadedAt: string;  // ISO timestamp
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
  submissionFiles?: SubmissionFile[];
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
  description?: string;
  targetDate: string;
  weightPct?: number;
}

export interface UpdateMilestoneDto {
  name?: string;
  description?: string;
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
  submissionFiles?: SubmissionFile[];
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

// ==========================================
// 6. Experiment Tracker Types & Contracts (Spec 04)
// ==========================================

export type ExperimentPurpose =
  | 'ModelTesting'
  | 'HyperparameterTuning'
  | 'DatasetComparison'
  | 'PerformanceEvaluation'
  | 'Baseline'
  | 'Final';

export const EXPERIMENT_PURPOSES: Record<ExperimentPurpose, ExperimentPurpose> = {
  ModelTesting: 'ModelTesting',
  HyperparameterTuning: 'HyperparameterTuning',
  DatasetComparison: 'DatasetComparison',
  PerformanceEvaluation: 'PerformanceEvaluation',
  Baseline: 'Baseline',
  Final: 'Final',
};

export type ExperimentStatus = 'Draft' | 'Final';

export const EXPERIMENT_STATUSES: Record<ExperimentStatus, ExperimentStatus> = {
  Draft: 'Draft',
  Final: 'Final',
};

export type ExperimentFlagType = 'NeedsRerun' | 'NotReproducible';

export const EXPERIMENT_FLAG_TYPES: Record<ExperimentFlagType, ExperimentFlagType> = {
  NeedsRerun: 'NeedsRerun',
  NotReproducible: 'NotReproducible',
};

export interface ExperimentConfig {
  model?: string;
  hyperparameters?: Record<string, string | number | boolean>;
  dataset?: string;
  hardware?: string;
  codeCommit?: string;
  notebookFileId?: string | null;
  environmentNotes?: string;
  [key: string]: any;
}

export type ExperimentMetrics = Record<string, number | string>;

export interface Experiment {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  purpose: ExperimentPurpose;
  hypothesis?: string | null;
  date: string;
  config: ExperimentConfig;
  metrics: ExperimentMetrics;
  outputFileIds: string[];
  observation?: string | null;
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
  // Enriched relations
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  projectName?: string;
  flags?: ExperimentFlag[];
  linkedTasks?: { id: string; title: string; status: TaskStatus }[];
  outputFiles?: FileAsset[];
  commentsCount?: number;
}

export interface ExperimentFlag {
  id: string;
  experimentId: string;
  flaggedBy: string;
  type: ExperimentFlagType;
  note: string;
  raisedTaskId?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
  createdAt: string;
  flaggedByName?: string;
  raisedTaskTitle?: string | null;
}

export interface TaskExperimentLink {
  taskId: string;
  experimentId: string;
  createdAt: string;
}

export interface ExperimentComment {
  id: string;
  experimentId: string;
  authorId: string;
  body: string;
  createdAt: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
}

export interface CreateExperimentDto {
  name: string;
  purpose: ExperimentPurpose;
  hypothesis?: string;
  date?: string;
  config?: ExperimentConfig;
  metrics?: ExperimentMetrics;
  outputFileIds?: string[];
  observation?: string;
  status?: ExperimentStatus;
}

export interface UpdateExperimentDto {
  name?: string;
  purpose?: ExperimentPurpose;
  hypothesis?: string | null;
  date?: string;
  config?: ExperimentConfig;
  metrics?: ExperimentMetrics;
  outputFileIds?: string[];
  observation?: string | null;
}

export interface CreateExperimentFlagDto {
  type: ExperimentFlagType;
  note: string;
  createRevisionTask?: boolean;
  taskTitle?: string;
  taskDueDate?: string;
}

export interface ResolveExperimentFlagDto {
  resolutionNote: string;
}

export interface AddExperimentCommentDto {
  body: string;
}

export interface LinkTaskExperimentDto {
  experimentId: string;
}

export interface ExperimentSearchParams {
  projectId?: string;
  purpose?: ExperimentPurpose;
  status?: ExperimentStatus;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface ExperimentListResponse {
  experiments: Experiment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AlignedParameterRow {
  parameterKey: string;
  group: 'model' | 'hyperparameter' | 'dataset' | 'hardware' | 'codeCommit' | 'environment';
  isIdentical: boolean;
  values: Record<string, string | number | boolean | null>;
}

export interface AlignedMetricRow {
  metricKey: string;
  isNumeric: boolean;
  values: Record<string, number | string | null>;
  min?: number;
  max?: number;
  bestExperimentId?: string;
}

export interface ExperimentComparisonResponse {
  experiments: Experiment[];
  parameterMatrix: AlignedParameterRow[];
  metricMatrix: AlignedMetricRow[];
  summary: {
    totalCompared: number;
    differingParametersCount: number;
    commonParametersCount: number;
    commonDataset?: string;
  };
}

export interface SavedExperimentFigure {
  id: string;
  title: string;
  experimentIds: string[];
  experimentNames: string[];
  metrics: string[];
  dataUrl: string;
  suggestedCaption: string;
  suggestedLabel: string;
  relativePath: string;
  chartType: 'grouped-bar' | 'radar' | 'metric-delta' | 'delta';
  createdAt: string;
  caption?: string;
  label?: string;
  suggestedPath?: string;
}

// ==========================================
// 8. Discussion Forum & Community (Spec 06)
// ==========================================

export type ForumTargetType = 'Post' | 'Answer';

export const FORUM_TARGET_TYPES: Record<ForumTargetType, ForumTargetType> = {
  Post: 'Post',
  Answer: 'Answer',
};

export type ForumVoteValue =
  | 'Up'
  | 'Down'
  | 'Like'
  | 'Love'
  | 'Insightful'
  | 'Celebrate'
  | 'Curious'
  | 'Support';

export const FORUM_VOTE_VALUES: Record<ForumVoteValue, ForumVoteValue> = {
  Up: 'Up',
  Down: 'Down',
  Like: 'Like',
  Love: 'Love',
  Insightful: 'Insightful',
  Celebrate: 'Celebrate',
  Curious: 'Curious',
  Support: 'Support',
};

export type ReportTargetType = 'Post' | 'Answer' | 'Comment' | 'DirectMessage';

export const REPORT_TARGET_TYPES: Record<ReportTargetType, ReportTargetType> = {
  Post: 'Post',
  Answer: 'Answer',
  Comment: 'Comment',
  DirectMessage: 'DirectMessage',
};

export type ReportStatus = 'Pending' | 'ActionTaken' | 'Dismissed';

export const REPORT_STATUSES: Record<ReportStatus, ReportStatus> = {
  Pending: 'Pending',
  ActionTaken: 'ActionTaken',
  Dismissed: 'Dismissed',
};

export interface ReactionCounts {
  like: number;
  love: number;
  insightful: number;
  celebrate: number;
  curious: number;
  support: number;
  up: number;
  down: number;
  totalReactions: number;
}

export interface ReactionUser {
  userId: string;
  fullName: string;
  photoUrl?: string | null;
  role: UserRole;
  value: ForumVoteValue;
  createdAt: string;
}

export interface ForumPost {
  id: string;
  authorId: string;
  projectId?: string | null;
  title: string;
  body: string;
  tags: string[];
  attachmentIds: string[];
  isPinned: boolean;
  isLocked: boolean;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  // Enriched relations
  author?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
    reputationPoints: number;
    institution?: string;
    isFacultyVerified?: boolean;
  };
  projectName?: string | null;
  score?: number;
  upvotesCount?: number;
  downvotesCount?: number;
  reactions?: ReactionCounts;
  currentUserReaction?: ForumVoteValue | null;
  currentUserVote?: 'Up' | 'Down' | null;
  answersCount?: number;
  hasAcceptedAnswer?: boolean;
  attachments?: FileAsset[];
  answers?: ForumAnswer[];
  comments?: ForumComment[];
}

export interface ForumAnswer {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  isAccepted: boolean;
  expertVerifiedBy?: string | null;
  expertVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Enriched relations
  author?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
    reputationPoints: number;
    institution?: string;
    isFacultyVerified?: boolean;
  };
  expertVerifier?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role?: UserRole;
    reputationPoints?: number;
    institution?: string;
    department?: string;
    isFacultyVerified?: boolean;
  } | null;
  score?: number;
  upvotesCount?: number;
  downvotesCount?: number;
  reactions?: ReactionCounts;
  currentUserReaction?: ForumVoteValue | null;
  currentUserVote?: 'Up' | 'Down' | null;
  comments?: ForumComment[];
}

export interface ForumComment {
  id: string;
  targetType: ForumTargetType;
  targetId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt?: string;
  author?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
  };
}

export interface ForumVote {
  id: string;
  targetType: ForumTargetType;
  targetId: string;
  voterId: string;
  value: ForumVoteValue;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  criteria: string;
  description: string;
  icon: string;
  createdAt: string;
}

export interface UserBadge {
  userId: string;
  badgeId: string;
  awardedAt: string;
  badge?: Badge;
}

export interface TagFollow {
  userId: string;
  tag: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
  };
  recipient?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
  };
}

export interface DirectMessageThread {
  partnerId: string;
  partner: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
    institution?: string;
    reputationPoints: number;
    isFacultyVerified?: boolean;
  };
  lastMessage?: DirectMessage | null;
  unreadCount: number;
  isBlocked: boolean;
  hasBlockedYou: boolean;
}

export interface UserBlock {
  blockerId: string;
  blockedId: string;
  createdAt: string;
  blockedUser?: {
    id: string;
    fullName: string;
    photoUrl?: string | null;
    role: UserRole;
  };
}

export interface ForumReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reason: string;
  description?: string | null;
  status: ReportStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  actionTaken?: string | null;
  actionNote?: string | null;
  targetSummary?: string;
  targetAuthorId?: string;
  targetAuthorName?: string;
  createdAt: string;
  reporter?: {
    id: string;
    fullName: string;
    role: UserRole;
    photoUrl?: string | null;
  };
  resolver?: {
    id: string;
    fullName: string;
    role: UserRole;
  };
  reviewedByUser?: {
    id: string;
    fullName: string;
    role: UserRole;
  };
}

export interface CommunityProfile {
  userId: string;
  fullName: string;
  photoUrl?: string | null;
  bio?: string | null;
  institution: string;
  department: string;
  role: UserRole;
  status: UserStatus;
  isFacultyVerified: boolean;
  reputationPoints: number;
  researchFieldTags: string[];
  badges: UserBadge[];
  stats: {
    postsCount: number;
    answersCount: number;
    acceptedAnswersCount: number;
    expertVerifiedCount: number;
    upvotesReceived: number;
  };
  recentPosts: ForumPost[];
  recentAnswers: ForumAnswer[];
}

export interface CreateForumPostDto {
  title: string;
  body: string;
  tags?: string[];
  attachmentIds?: string[];
  projectId?: string;
}

export interface UpdateForumPostDto {
  title?: string;
  body?: string;
  tags?: string[];
  attachmentIds?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
}

export interface CreateForumAnswerDto {
  body: string;
}

export interface UpdateForumAnswerDto {
  body: string;
}

export interface AddForumCommentDto {
  body: string;
}

export interface UpdateForumCommentDto {
  body: string;
}

export interface VoteForumDto {
  value: ForumVoteValue;
}

export interface CreateReportDto {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
}

export interface ActionReportDto {
  status: ReportStatus;
  actionTaken?: string;
  actionNote?: string;
  deleteTarget?: boolean;
  lockTarget?: boolean;
}

export interface SendDirectMessageDto {
  recipientId: string;
  body: string;
}

export interface BlockUserDto {
  targetUserId: string;
}

export interface ForumPostSearchParams {
  tag?: string;
  search?: string;
  authorId?: string;
  projectId?: string;
  filter?: 'all' | 'following' | 'unanswered' | 'my-posts';
  sort?: 'newest' | 'top' | 'activity';
  page?: number;
  limit?: number;
}

export interface ForumPostListResponse {
  posts: ForumPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// 9. Manuscript Writing & Internal Peer Review (Spec 05)
// ==========================================

export type ManuscriptStatus =
  | 'Draft'
  | 'UnderInternalReview'
  | 'Revising'
  | 'ReadyForSubmission'
  | 'Submitted'
  | 'Published'
  | 'Archived';

export const MANUSCRIPT_STATUSES: Record<ManuscriptStatus, ManuscriptStatus> = {
  Draft: 'Draft',
  UnderInternalReview: 'UnderInternalReview',
  Revising: 'Revising',
  ReadyForSubmission: 'ReadyForSubmission',
  Submitted: 'Submitted',
  Published: 'Published',
  Archived: 'Archived',
};

export type ManuscriptSectionType =
  | 'Abstract'
  | 'Introduction'
  | 'RelatedWork'
  | 'Methodology'
  | 'Experiments'
  | 'Results'
  | 'Discussion'
  | 'Conclusion'
  | 'Custom';

export const MANUSCRIPT_SECTION_TYPES: Record<ManuscriptSectionType, ManuscriptSectionType> = {
  Abstract: 'Abstract',
  Introduction: 'Introduction',
  RelatedWork: 'RelatedWork',
  Methodology: 'Methodology',
  Experiments: 'Experiments',
  Results: 'Results',
  Discussion: 'Discussion',
  Conclusion: 'Conclusion',
  Custom: 'Custom',
};

export type ReviewCommentSeverity =
  | 'GrammarOrTypo'
  | 'MinorScientific'
  | 'MajorScientific'
  | 'CriticalFlaw';

export const REVIEW_COMMENT_SEVERITIES: Record<ReviewCommentSeverity, ReviewCommentSeverity> = {
  GrammarOrTypo: 'GrammarOrTypo',
  MinorScientific: 'MinorScientific',
  MajorScientific: 'MajorScientific',
  CriticalFlaw: 'CriticalFlaw',
};

export type ReviewCommentStatus =
  | 'Open'
  | 'FixedByResearcher'
  | 'Resolved'
  | 'Reopened';

export const REVIEW_COMMENT_STATUSES: Record<ReviewCommentStatus, ReviewCommentStatus> = {
  Open: 'Open',
  FixedByResearcher: 'FixedByResearcher',
  Resolved: 'Resolved',
  Reopened: 'Reopened',
};

export type ReviewAssignmentStatus = 'Assigned' | 'InProgress' | 'Completed';

export const REVIEW_ASSIGNMENT_STATUSES: Record<ReviewAssignmentStatus, ReviewAssignmentStatus> = {
  Assigned: 'Assigned',
  InProgress: 'InProgress',
  Completed: 'Completed',
};

export interface ManuscriptAuthor {
  id: string;
  manuscriptId: string;
  userId: string;
  authorOrder: number;
  affiliation?: string | null;
  isCorresponding: boolean;
  createdAt: string;
  user?: Partial<Profile> | null;
}

export interface ManuscriptSection {
  id: string;
  manuscriptId: string;
  title: string;
  sectionType: ManuscriptSectionType;
  orderIndex: number;
  contentMarkdown: string;
  contentLatex: string;
  wordCount: number;
  isAiAssisted?: boolean;
  updatedBy?: string | null;
  updatedAt: string;
  createdAt: string;
  updater?: Partial<Profile> | null;
  commentsCount?: number;
}

export interface ManuscriptCitation {
  id: string;
  manuscriptId: string;
  sectionId?: string | null;
  paperId: string;
  citationKey: string;
  inTextLabel?: string | null;
  contextNote?: string | null;
  createdBy?: string | null;
  createdAt: string;
  paper?: Partial<Paper> | null;
  creator?: Partial<Profile> | null;
}

export interface WhyDidICiteThisContext {
  citationKey: string;
  inTextLabel?: string | null;
  contextNote?: string | null;
  paper: {
    id: string;
    title: string;
    authors: string[];
    year?: number | null;
    venue?: string | null;
    doi?: string | null;
  };
  highlights: {
    id: string;
    page: number;
    highlightedText: string;
    stickyNote?: string | null;
  }[];
  sidebarSummary?: {
    researchGap?: string | null;
    methodology?: string | null;
    results?: string | null;
    limitations?: string | null;
    personalNotes?: string | null; // Masked to null if requester != uploader & visible=false
  } | null;
  isMaskedNote: boolean;
}

export interface ReviewAssignment {
  id: string;
  manuscriptId: string;
  reviewerId: string;
  assignedBy: string;
  deadline?: string | null;
  status: ReviewAssignmentStatus;
  createdAt: string;
  reviewer?: Partial<Profile> | null;
  assigner?: Partial<Profile> | null;
}

export interface ReviewComment {
  id: string;
  manuscriptId: string;
  sectionId?: string | null;
  reviewerId: string;
  parentCommentId?: string | null;
  highlightedText?: string | null;
  commentText: string;
  severity: ReviewCommentSeverity;
  status: ReviewCommentStatus;
  fixNote?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewer?: Partial<Profile> | null;
  resolver?: Partial<Profile> | null;
  section?: Partial<ManuscriptSection> | null;
  replies?: ReviewComment[];
}

export interface ManuscriptVersion {
  id: string;
  manuscriptId: string;
  versionNumber: number;
  versionName: string;
  snapshotData: {
    title: string;
    abstract?: string | null;
    targetVenue?: string | null;
    status: ManuscriptStatus;
    sections: {
      title: string;
      sectionType: ManuscriptSectionType;
      orderIndex: number;
      contentMarkdown: string;
      contentLatex: string;
      wordCount: number;
    }[];
    authors: {
      userId: string;
      fullName?: string;
      authorOrder: number;
      affiliation?: string | null;
      isCorresponding: boolean;
    }[];
    citations: {
      citationKey: string;
      inTextLabel?: string | null;
      paperTitle?: string;
      paperDoi?: string | null;
      contextNote?: string | null;
    }[];
  };
  createdBy: string;
  createdAt: string;
  creator?: Partial<Profile> | null;
}

export interface ManuscriptRevisionLog {
  id: string;
  manuscriptId: string;
  sectionId?: string | null;
  actorId?: string | null;
  action: string;
  details?: Record<string, unknown> | null;
  createdAt: string;
  actor?: Partial<Profile> | null;
}

export interface ManuscriptChecklistItem {
  id: string;
  manuscriptId: string;
  label: string;
  isCompleted: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
  isLocked: boolean;
  orderIndex: number;
  createdAt: string;
  completedByUser?: Partial<Profile> | null;
}

export interface Manuscript {
  id: string;
  projectId: string;
  title: string;
  abstract?: string | null;
  targetVenue?: string | null;
  status: ManuscriptStatus;
  createdBy: string;
  supervisorId?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Partial<Project> | null;
  creator?: Partial<Profile> | null;
  supervisor?: Partial<Profile> | null;
  authors?: ManuscriptAuthor[];
  sections?: ManuscriptSection[];
  citations?: ManuscriptCitation[];
  reviewAssignments?: ReviewAssignment[];
  comments?: ReviewComment[];
  versions?: ManuscriptVersion[];
  checklistItems?: ManuscriptChecklistItem[];
  totalWordCount?: number;
  openCommentsCount?: number;
  unresolvedMajorCount?: number;
}

// Manuscript DTOs
export interface CreateManuscriptDto {
  projectId: string;
  title: string;
  abstract?: string;
  targetVenue?: string;
  authors?: {
    userId: string;
    authorOrder: number;
    affiliation?: string;
    isCorresponding?: boolean;
  }[];
  defaultSections?: boolean; // If true, creates standard IMRAD sections
}

export interface UpdateManuscriptDto {
  title?: string;
  abstract?: string | null;
  targetVenue?: string | null;
}

export interface AddManuscriptAuthorDto {
  userId: string;
  authorOrder?: number;
  affiliation?: string;
  isCorresponding?: boolean;
}

export interface UpdateManuscriptAuthorDto {
  authorOrder?: number;
  affiliation?: string;
  isCorresponding?: boolean;
}

export interface CreateManuscriptSectionDto {
  title: string;
  sectionType?: ManuscriptSectionType;
  orderIndex?: number;
  contentMarkdown?: string;
  contentLatex?: string;
}

export interface UpdateManuscriptSectionDto {
  title?: string;
  sectionType?: ManuscriptSectionType;
  orderIndex?: number;
  contentMarkdown?: string;
  contentLatex?: string;
}

export interface ReorderSectionsDto {
  sectionOrders: {
    sectionId: string;
    orderIndex: number;
  }[];
}

export interface InsertCitationDto {
  paperId: string;
  citationKey: string;
  sectionId?: string | null;
  inTextLabel?: string;
  contextNote?: string;
}

export interface AssignReviewerDto {
  reviewerId: string;
  deadline?: string;
}

export interface CreateReviewCommentDto {
  sectionId?: string | null;
  parentCommentId?: string | null;
  highlightedText?: string;
  commentText: string;
  severity?: ReviewCommentSeverity;
}

export interface FixReviewCommentDto {
  fixNote: string;
}

export interface ResolveReviewCommentDto {
  resolutionNote?: string;
}

export interface ReopenReviewCommentDto {
  reopenReason: string;
}

export interface CreateManuscriptVersionDto {
  versionName: string;
}

export interface RestoreManuscriptVersionDto {
  versionId: string;
}

export interface CreateChecklistItemDto {
  label: string;
  orderIndex?: number;
}

export interface UpdateChecklistItemDto {
  isCompleted?: boolean;
  label?: string;
  orderIndex?: number;
}

export interface TransitionManuscriptStatusDto {
  status: ManuscriptStatus;
  note?: string;
}

export interface ManuscriptExportOptions {
  format: 'markdown' | 'latex' | 'bibtex' | 'bundle';
  includeAbstract?: boolean;
  includeAuthorBlock?: boolean;
  includeBibTeX?: boolean;
}

export interface ManuscriptExportResult {
  fileName: string;
  mimeType: string;
  content: string;
  bibtexContent?: string;
}

export interface ManuscriptSearchParams {
  projectId?: string;
  status?: ManuscriptStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ManuscriptListResponse {
  manuscripts: Manuscript[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// 8. AI Research Assistant (Spec 08)
// ==========================================

// --- Enums ---

export type EmbeddingSourceType = 'Paper' | 'PaperSidebarFields' | 'ManuscriptSection';

export const EMBEDDING_SOURCE_TYPES: Record<EmbeddingSourceType, EmbeddingSourceType> = {
  Paper: 'Paper',
  PaperSidebarFields: 'PaperSidebarFields',
  ManuscriptSection: 'ManuscriptSection',
};

export type AiSuggestionStatus = 'Pending' | 'Accepted' | 'Rejected';

export const AI_SUGGESTION_STATUSES: Record<AiSuggestionStatus, AiSuggestionStatus> = {
  Pending: 'Pending',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
};

export type AiSuggestionTargetType = 'PaperSidebarFields' | 'ManuscriptSection';

export const AI_SUGGESTION_TARGET_TYPES: Record<AiSuggestionTargetType, AiSuggestionTargetType> = {
  PaperSidebarFields: 'PaperSidebarFields',
  ManuscriptSection: 'ManuscriptSection',
};

export type AiProviderEnum = 'OpenAI' | 'Gemini';

export const AI_PROVIDERS: Record<AiProviderEnum, AiProviderEnum> = {
  OpenAI: 'OpenAI',
  Gemini: 'Gemini',
};

export type SummarizeMode = 'short' | 'detailed' | 'method-focused';

export type WritingAssistAction = 'paraphrase' | 'grammar' | 'outline';

// --- Entities ---

export interface Embedding {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  ownerId: string;
  chunkIndex: number;
  /** vector field is not returned to clients — backend-only */
  createdAt: string;
}

export interface AiSuggestion {
  id: string;
  /** Always server-derived from JWT. Never trusted from client. */
  userId: string;
  targetType: AiSuggestionTargetType;
  targetId: string;
  fieldName: string;
  suggestedValue: string;
  status: AiSuggestionStatus;
  createdAt: string;
}

export interface AiUsageLog {
  id: string;
  userId: string;
  feature: string;
  tokensUsed: number;
  costUsd?: number;
  createdAt: string;
}

export interface AiProviderConfig {
  id: string;
  provider: AiProviderEnum;
  /**
   * Name of the server-side environment variable holding the actual API key.
   * e.g. "GEMINI_API_KEY". The raw key is NEVER stored here.
   */
  apiKeyRef: string;
  model: string;
  isActive: boolean;
  updatedBy?: string;
  updatedAt: string;
}

export interface AiQuota {
  role: UserRole;
  monthlyTokenLimit: number;
  updatedAt: string;
}

export interface BlockedPromptRule {
  id: string;
  /** Plain string — matched via case-insensitive substring. No regex. */
  pattern: string;
  reason: string;
  createdBy: string;
  createdAt: string;
}

export interface ProgressReport {
  id: string;
  projectId: string;
  studentId: string;
  generatedBy: string;
  periodStart: string;  // ISO date string YYYY-MM-DD
  periodEnd: string;    // ISO date string YYYY-MM-DD
  content: string;
  createdAt: string;
}

// --- Request DTOs ---

export interface SummarizeRequest {
  mode: SummarizeMode;
}

export interface SemanticSearchRequest {
  query: string;
  topK?: number;
  /** Optional project scope filter. Server validates/derives actual authorized projects. */
  scope?: {
    projects?: string[];
  };
}

export interface WritingAssistRequest {
  action: WritingAssistAction;
  /** Required for paraphrase and grammar actions */
  selectedText?: string;
  /** Required for outline action */
  sectionType?: string;
  /** Optional section ID being edited */
  sectionId?: string;
}

export interface CreateBlockedPromptRuleRequest {
  pattern: string;
  reason: string;
}

export interface UpdateAiQuotaRequest {
  monthlyTokenLimit: number;
}

export interface UpdateAiProviderConfigRequest {
  provider?: AiProviderEnum;
  apiKeyRef?: string;
  model?: string;
  isActive?: boolean;
}

export interface GenerateProgressReportRequest {
  studentId: string;
  periodStart: string;  // YYYY-MM-DD
  periodEnd: string;    // YYYY-MM-DD
  regenerate?: boolean;
}

// --- Response DTOs ---

export interface SemanticSearchResult {
  sourceType: EmbeddingSourceType;
  sourceId: string;
  similarity: number;
  /** Resolved title from the source entity */
  title?: string;
  /** Relevant text snippet from the matched chunk */
  snippet?: string;
}

export interface SemanticSearchResponse {
  data: SemanticSearchResult[];
  query: string;
  total: number;
}

export interface SummarizeResponse {
  paperId: string;
  mode: SummarizeMode;
  summary: string;
  tokensUsed: number;
}

export interface SidebarSuggestionsResponse {
  paperId: string;
  suggestions: AiSuggestion[];
}

export interface WritingAssistResponse {
  manuscriptId: string;
  sectionId: string;
  suggestion: AiSuggestion;
}

export interface ExperimentInsightResponse {
  experimentId: string;
  insight: string;
  tokensUsed: number;
}

export interface AiUsageSummary {
  tokensUsedThisMonth: number;
  monthlyLimit: number;
  percentUsed: number;
  recentLogs: AiUsageLog[];
}

export interface AdminAiUsageAnalytics {
  totalTokensThisMonth: number;
  totalCostUsdThisMonth: number;
  byRole: Array<{
    role: UserRole;
    tokensUsed: number;
    costUsd: number;
  }>;
  topUsers: Array<{
    userId: string;
    fullName: string;
    tokensUsed: number;
    costUsd: number;
  }>;
}

export interface AcceptSuggestionResponse {
  suggestionId: string;
  status: 'Accepted';
  targetType: AiSuggestionTargetType;
  targetId: string;
  fieldName: string;
  appliedValue: string;
}

export interface RejectSuggestionResponse {
  suggestionId: string;
  status: 'Rejected';
}

export interface AiSuggestionListParams {
  targetType?: AiSuggestionTargetType;
  targetId?: string;
  status?: AiSuggestionStatus;
  page?: number;
  limit?: number;
}

export interface AiSuggestionListResponse {
  suggestions: AiSuggestion[];
  total: number;
  page: number;
  limit: number;
}

// --- AI Literature Discovery (Perplexity / Consensus Model) ---

export interface DiscoveredPaper {
  id: string;              // OpenAlex work ID or normalized DOI
  title: string;
  authors: string[];
  year: number | null;
  venue: string | null;
  doi: string | null;
  abstract: string | null;
  tldr: string | null;     // AI 1-line key takeaway
  citationCount: number;
  isOpenAccess: boolean;
  pdfUrl?: string | null;
  landingPageUrl?: string | null;
  isImported?: boolean;
}

export interface LiteratureDiscoveryRequest {
  topic: string;
  limit?: number;          // 5 to 15 (default 10)
  yearRange?: {
    from?: number;
    to?: number;
  };
}

export interface LiteratureDiscoveryResponse {
  topic: string;
  synthesis: {
    summary: string;
    consensus: string;
    keyThemes: Array<{
      title: string;
      description: string;
      paperIndices: number[]; // 1-based references [1], [2] matching papers list
    }>;
    researchGaps: string[];
  };
  papers: DiscoveredPaper[];
}

export interface ImportDiscoveredPaperDto {
  projectId: string;
  title: string;
  authors: string[];
  year?: number | null;
  venue?: string | null;
  doi?: string | null;
  abstract?: string | null;
  pdfUrl?: string | null;
}

export interface ImportDiscoveredPaperResponse {
  paperId: string;
  message: string;
}

// ==========================================
// 8. Academic Marketplace & Compute Resource Sharing (Spec 07)
// ==========================================

export type ListingType = 'Hardware' | 'Dataset';

export const LISTING_TYPES: Record<ListingType, ListingType> = {
  Hardware: 'Hardware',
  Dataset: 'Dataset',
};

export type HardwareAccessMethod = 'SSH' | 'RemoteDesktop';

export const HARDWARE_ACCESS_METHODS: Record<HardwareAccessMethod, HardwareAccessMethod> = {
  SSH: 'SSH',
  RemoteDesktop: 'RemoteDesktop',
};

export type ListingApprovalStatus = 'Pending' | 'Approved' | 'Rejected';

export const LISTING_APPROVAL_STATUSES: Record<ListingApprovalStatus, ListingApprovalStatus> = {
  Pending: 'Pending',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

export type BookingStatus =
  | 'Requested'
  | 'Accepted'
  | 'Rejected'
  | 'PaymentEscrowed'
  | 'AccessReleased'
  | 'Completed'
  | 'Cancelled'
  | 'Disputed';

export const BOOKING_STATUSES: Record<BookingStatus, BookingStatus> = {
  Requested: 'Requested',
  Accepted: 'Accepted',
  Rejected: 'Rejected',
  PaymentEscrowed: 'PaymentEscrowed',
  AccessReleased: 'AccessReleased',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
  Disputed: 'Disputed',
};

export type TransactionStatus = 'Held' | 'Released' | 'Refunded' | 'Failed';

export const TRANSACTION_STATUSES: Record<TransactionStatus, TransactionStatus> = {
  Held: 'Held',
  Released: 'Released',
  Refunded: 'Refunded',
  Failed: 'Failed',
};

export type DisputeStatus = 'Open' | 'UnderReview' | 'Resolved' | 'Rejected';

export const DISPUTE_STATUSES: Record<DisputeStatus, DisputeStatus> = {
  Open: 'Open',
  UnderReview: 'UnderReview',
  Resolved: 'Resolved',
  Rejected: 'Rejected',
};

export type DisputeResolutionAction = 'RefundRequester' | 'ReleaseToProvider' | 'DismissDispute';

export const DISPUTE_RESOLUTION_ACTIONS: Record<DisputeResolutionAction, DisputeResolutionAction> = {
  RefundRequester: 'RefundRequester',
  ReleaseToProvider: 'ReleaseToProvider',
  DismissDispute: 'DismissDispute',
};

// --- Marketplace Interfaces & DTOs ---

export interface Listing {
  id: string;
  ownerId: string;
  type: ListingType;
  title: string;
  description?: string | null;
  // Hardware specific specifications
  gpuCpuModel?: string | null;
  vram?: string | null;
  ram?: string | null;
  storage?: string | null;
  os?: string | null;
  location?: string | null;
  accessMethod?: HardwareAccessMethod | null;
  hourlyPrice?: number | null;
  dailyPrice?: number | null;
  // Dataset specific specifications
  domain?: string | null;
  sizeBytes?: number | null;
  format?: string | null;
  license?: string | null;
  samplePreviewFileId?: string | null;
  datasetFileId?: string | null;
  onlinePrice?: number | null;
  // Institutional & pricing flags
  isFree: boolean;
  isInstitutional: boolean;
  freeForInstitutionStudents: boolean;
  institutionName?: string | null;
  approvalStatus: ListingApprovalStatus;
  rejectionReason?: string | null;
  isDelisted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingWithStats extends Listing {
  ownerName: string;
  ownerAvatarUrl?: string | null;
  ownerAffiliation?: string | null;
  ownerRating?: number | null;
  reviewCount: number;
  availableSlotCount?: number;
  samplePreviewUrl?: string | null;
}

export interface CreateListingDTO {
  type: ListingType;
  title: string;
  description?: string;
  gpuCpuModel?: string;
  vram?: string;
  ram?: string;
  storage?: string;
  os?: string;
  location?: string;
  accessMethod?: HardwareAccessMethod;
  hourlyPrice?: number;
  dailyPrice?: number;
  domain?: string;
  sizeBytes?: number;
  format?: string;
  license?: string;
  samplePreviewFileId?: string;
  datasetFileId?: string;
  onlinePrice?: number;
  isFree?: boolean;
  isInstitutional?: boolean;
  freeForInstitutionStudents?: boolean;
  institutionName?: string;
}

export interface UpdateListingDTO extends Partial<CreateListingDTO> {
  isDelisted?: boolean;
}

export interface AvailabilitySlot {
  id: string;
  listingId: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  createdAt: string;
}

export interface CreateSlotDTO {
  startTime: string;
  endTime: string;
}

export interface Booking {
  id: string;
  listingId: string;
  requesterId: string;
  slotId?: string | null;
  status: BookingStatus;
  totalPrice: number;
  accessDetails?: string | null;
  requesterNotes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingWithDetails extends Booking {
  listing: Listing;
  requester?: {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    email?: string | null;
    institution?: string | null;
  } | null;
  slot?: AvailabilitySlot | null;
  transaction?: Transaction | null;
  review?: ListingReview | null;
  dispute?: Dispute | null;
}

export interface RequestBookingDTO {
  slotId?: string;
  requesterNotes?: string;
}

export interface PayBookingDTO {
  cardToken?: string;
  testScenario?: 'success' | 'decline' | 'insufficient_funds';
}

export interface ReleaseAccessDTO {
  accessDetails: string;
}

export interface Transaction {
  id: string;
  bookingId: string;
  amount: number;
  commissionAmount: number;
  gatewayRef: string;
  status: TransactionStatus;
  invoiceFileId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionWithBooking extends Transaction {
  bookingTitle: string;
  listingType: ListingType;
  requesterName: string;
  providerName: string;
}

export interface ListingReview {
  id: string;
  bookingId: string;
  listingId: string;
  raterId: string;
  raterName?: string;
  raterAvatarUrl?: string | null;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface CreateListingReviewDTO {
  rating: number;
  comment?: string;
}

export interface Dispute {
  id: string;
  bookingId: string;
  raisedBy: string;
  raisedByName?: string;
  reason: string;
  status: DisputeStatus;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
  resolutionAction?: DisputeResolutionAction | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDisputeDTO {
  reason: string;
}

export interface ResolveDisputeDTO {
  action: DisputeResolutionAction;
  resolutionNote: string;
}

export interface ListingInquiry {
  id: string;
  listingId: string;
  senderId: string;
  senderName?: string;
  senderAvatarUrl?: string | null;
  body: string;
  createdAt: string;
}

export interface CreateListingInquiryDTO {
  body: string;
}

export interface MarketplaceFilterParams {
  type?: ListingType;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  gpuModel?: string;
  domain?: string;
  isInstitutional?: boolean;
  isFree?: boolean;
  page?: number;
  limit?: number;
}

export interface MarketplaceLedgerStats {
  totalGrossVolume: number;
  totalNetRevenue: number;
  totalPlatformCommission: number;
  totalEscrowHeld: number;
  totalRefunded: number;
  activeListingsCount: number;
  pendingListingsCount: number;
  openDisputesCount: number;
}


