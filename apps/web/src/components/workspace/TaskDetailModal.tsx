import React, { useState, useEffect, useRef } from 'react';
import {
  Task,
  TaskComment,
  TaskStatus,
  Milestone,
  Project,
  SubmissionFile,
} from '@researchos/shared-types';
import {
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Sparkles,
  Lock,
  Clock,
  Target,
  User,
  RotateCcw,
  Award,
  ChevronRight,
  FileText,
  AlertTriangle,
  Play,
  Loader2,
  Paperclip,
  Upload,
  File,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Trash2,
  Download,
  CheckCircle,
  Package,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { supabase } from '../../supabase.js';
import { UserAvatar } from '../common/UserAvatar.js';

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TaskDetailModalProps {
  task: Task | null;
  project?: Project | null;
  milestones: Milestone[];
  currentUserId?: string;
  currentUserRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus, note?: string) => Promise<void>;
  onReviewTask: (task: Task) => void;
  onApprove?: (taskId: string) => Promise<void>;
  onRequestRevision?: (taskId: string, note: string) => Promise<void>;
  /** Called when researcher submits with files — replaces onStatusChange for submission */
  onSubmitTask?: (taskId: string, progressNote: string, files: SubmissionFile[]) => Promise<void>;
}

// ─── Status Configuration ─────────────────────────────────────────────────────
const STATUS_STEPS: { id: TaskStatus; label: string; short: string }[] = [
  { id: 'ToDo', label: 'To Do', short: '1' },
  { id: 'InProgress', label: 'In Progress', short: '2' },
  { id: 'Submitted', label: 'Under Review', short: '3' },
  { id: 'Approved', label: 'Approved', short: '4' },
];

const STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    color: string;
    bg: string;
    border: string;
    dot: string;
  }
> = {
  ToDo: {
    label: 'To Do',
    color: 'text-slate-300',
    bg: 'bg-slate-850',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  },
  InProgress: {
    label: 'In Progress',
    color: 'text-sky-300',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/40',
    dot: 'bg-sky-400',
  },
  Submitted: {
    label: 'Under Review',
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
  },
  UnderReview: {
    label: 'Under Review',
    color: 'text-amber-300',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
  },
  RevisionRequested: {
    label: 'Revision Needed',
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    dot: 'bg-rose-400',
  },
  Approved: {
    label: 'Approved',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/40',
    dot: 'bg-emerald-400',
  },
};

const PRIORITY_CONFIG = {
  High: { color: 'text-rose-300', bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
  Medium: { color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  Low: { color: 'text-slate-300', bg: 'bg-slate-700/50', border: 'border-white/10' },
};

const getStepIndex = (status: TaskStatus) => {
  if (status === 'RevisionRequested') return 1.5;
  if (status === 'UnderReview') return 2;
  const idx = STATUS_STEPS.findIndex((s) => s.id === status);
  return idx < 0 ? 0 : idx;
};

// ─── File Utility Helpers ──────────────────────────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function formatBytes(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type?: string, name?: string) {
  const mime = (type || '').toLowerCase();
  const ext = (name || '').split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext)) {
    return <FileImage className="w-5 h-5 text-violet-400" />;
  }
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv') ||
    ['xlsx', 'xls', 'csv', 'tsv'].includes(ext)
  ) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
  }
  if (
    mime.includes('zip') ||
    mime.includes('tar') ||
    mime.includes('compressed') ||
    ['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)
  ) {
    return <FileArchive className="w-5 h-5 text-amber-400" />;
  }
  if (
    mime.includes('javascript') ||
    mime.includes('typescript') ||
    mime.includes('json') ||
    mime.includes('python') ||
    ['js', 'ts', 'tsx', 'py', 'json', 'sh', 'sql', 'cpp', 'rs', 'go'].includes(ext)
  ) {
    return <FileCode className="w-5 h-5 text-sky-400" />;
  }
  if (mime === 'application/pdf' || ext === 'pdf') {
    return <File className="w-5 h-5 text-rose-400" />;
  }
  return <FileText className="w-5 h-5 text-indigo-400" />;
}

interface LocalFile {
  file: File;
  preview?: string;
  uploading: boolean;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  project,
  milestones,
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  onStatusChange,
  onReviewTask,
  onApprove,
  onRequestRevision,
  onSubmitTask,
}) => {
  // Comment state
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Action state
  const [isActioning, setIsActioning] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [revisionNote, setRevisionNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [isResubmitting, setIsResubmitting] = useState(false);

  // File upload state
  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<SubmissionFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const isSupervisor = currentUserRole === 'Supervisor' || project?.ownerId === currentUserId;
  const isAssignedToMe = task?.assigneeId === currentUserId;
  const milestone = milestones.find((m) => m.id === task?.milestoneId);
  const statusCfg = task ? STATUS_CONFIG[task.status] || STATUS_CONFIG.ToDo : STATUS_CONFIG.ToDo;
  const priorityCfg = task ? PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Medium : PRIORITY_CONFIG.Medium;
  const stepIndex = task ? getStepIndex(task.status) : 0;
  const isOverdue =
    task?.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Approved';

  // ─── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && task) {
      fetchComments();
      setProgressNote(task.progressNote || '');
      setRevisionNote('');
      setActionError(null);
      setLocalFiles([]);
      setUploadedFiles(task.submissionFiles || []);
      setIsResubmitting(false);
    }
  }, [isOpen, task?.id]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  if (!isOpen || !task || !project) return null;

  // ─── Comment Fetch ──────────────────────────────────────────────────────────
  const fetchComments = async () => {
    if (!task) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/tasks/${task.id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setComments(await res.json());
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  // ─── File Handling ──────────────────────────────────────────────────────────
  const validateAndAddFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const errors: string[] = [];

    const valid = arr.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        errors.push(`${f.name}: exceeds 50 MB limit`);
        return false;
      }
      return true;
    });

    if (errors.length) setActionError(errors.join('; '));

    const newLocals: LocalFile[] = valid.map((f) => ({
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      uploading: false,
    }));

    setLocalFiles((prev) => [...prev, ...newLocals]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length) validateAndAddFiles(e.dataTransfer.files);
  };

  const removeLocalFile = (idx: number) => {
    setLocalFiles((prev) => {
      const next = [...prev];
      const f = next[idx];
      if (f.preview) URL.revokeObjectURL(f.preview);
      next.splice(idx, 1);
      return next;
    });
  };

  const removeExistingFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Upload all queued files to Supabase Storage ────────────────────────────
  const uploadFiles = async (): Promise<SubmissionFile[]> => {
    if (localFiles.length === 0) return uploadedFiles;

    const results: SubmissionFile[] = [...uploadedFiles];

    for (let i = 0; i < localFiles.length; i++) {
      const { file } = localFiles[i];
      setLocalFiles((prev) =>
        prev.map((lf, idx) => (idx === i ? { ...lf, uploading: true, error: undefined } : lf))
      );

      const ext = file.name.split('.').pop();
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const path = `${task.id}/${safeName}`;

      const { data, error } = await supabase.storage
        .from('task-submissions')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error) {
        setLocalFiles((prev) =>
          prev.map((lf, idx) => (idx === i ? { ...lf, uploading: false, error: error.message } : lf))
        );
        continue;
      }

      results.push({
        name: file.name,
        url: data.path,
        size: file.size,
        type: file.type || 'application/octet-stream',
        uploadedAt: new Date().toISOString(),
      });

      setLocalFiles((prev) =>
        prev.map((lf, idx) => (idx === i ? { ...lf, uploading: false } : lf))
      );
    }

    setUploadedFiles(results);
    setLocalFiles([]);
    return results;
  };

  // ─── Get signed download URL ────────────────────────────────────────────────
  const getDownloadUrl = async (filePath: string): Promise<string> => {
    try {
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
      }
      const { data } = await supabase.storage
        .from('task-submissions')
        .createSignedUrl(filePath, 60 * 60);
      return data?.signedUrl || '#';
    } catch {
      return '#';
    }
  };

  const handleDownload = async (sf: SubmissionFile) => {
    const url = await getDownloadUrl(sf.url);
    if (url && url !== '#') {
      window.open(url, '_blank');
    }
  };

  // ─── Action Handlers ────────────────────────────────────────────────────────
  const handleStartTask = async () => {
    setIsActioning(true);
    setActionError(null);
    try {
      await onStatusChange(task.id, 'InProgress');
    } catch (e: any) {
      setActionError(e.message || 'Failed to start task');
    } finally {
      setIsActioning(false);
    }
  };

  const handleSubmitTask = async () => {
    setIsActioning(true);
    setActionError(null);
    try {
      let files = uploadedFiles;
      if (localFiles.length > 0) files = await uploadFiles();

      if (onSubmitTask) {
        await onSubmitTask(task.id, progressNote.trim(), files);
      } else {
        await onStatusChange(task.id, 'Submitted', progressNote.trim() || undefined);
      }
      setIsResubmitting(false);
    } catch (e: any) {
      setActionError(e.message || 'Failed to submit task');
    } finally {
      setIsActioning(false);
    }
  };

  const handleApproveInline = async () => {
    if (!onApprove) {
      onReviewTask(task);
      return;
    }
    setIsActioning(true);
    setActionError(null);
    try {
      await onApprove(task.id);
    } catch (e: any) {
      setActionError(e.message || 'Failed to approve task');
    } finally {
      setIsActioning(false);
    }
  };

  const handleRequestRevisionInline = async () => {
    if (!revisionNote.trim()) {
      setActionError('Revision feedback note is required to request revision.');
      return;
    }
    if (!onRequestRevision) {
      onReviewTask(task);
      return;
    }
    setIsActioning(true);
    setActionError(null);
    try {
      await onRequestRevision(task.id, revisionNote.trim());
    } catch (e: any) {
      setActionError(e.message || 'Failed to request revision');
    } finally {
      setIsActioning(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPostingComment) return;
    setIsPostingComment(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch(`/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((p) => [...p, data]);
        setNewComment('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(task.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ─── Deliverables List Component ───────────────────────────────────────────
  const submissionFiles = task.submissionFiles || uploadedFiles || [];
  const hasDeliverables = (task.progressNote && task.progressNote.trim().length > 0) || submissionFiles.length > 0;
  const canEditSubmission = (task.status === 'InProgress' || task.status === 'RevisionRequested' || isResubmitting) && (isAssignedToMe || isSupervisor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0B0A1E] border border-white/10 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl shadow-black overflow-hidden">
        {/* ─── Top Header Bar ────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Status Badge */}
            <span
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${statusCfg.bg} ${statusCfg.border} ${statusCfg.color} shadow-sm`}
            >
              <span className={`w-2 h-2 rounded-full ${statusCfg.dot} animate-pulse`} />
              {statusCfg.label}
            </span>

            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${priorityCfg.bg} ${priorityCfg.border} ${priorityCfg.color}`}
            >
              <Target className="w-3.5 h-3.5" />
              {task.priority} Priority
            </span>

            {/* Proposed Tag */}
            {task.isProposed && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Proposed Task
              </span>
            )}

            {/* Milestone Locked Tag */}
            {milestone?.isLocked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold">
                <Lock className="w-3 h-3" /> Milestone Locked
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Universal Lifecycle Stepper ───────────────────────────────── */}
        <div className="px-6 py-3.5 border-b border-white/[0.06] bg-[#080718] shrink-0">
          <div className="flex items-center justify-between gap-2 overflow-x-auto">
            {STATUS_STEPS.map((step, idx) => {
              const isCurrent =
                task.status === step.id ||
                (task.status === 'UnderReview' && step.id === 'Submitted');
              const isPast =
                stepIndex > idx && !(task.status === 'RevisionRequested' && idx >= 2);

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                        isPast
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                          : isCurrent
                          ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-600/50 ring-2 ring-violet-500/30'
                          : 'bg-white/[0.04] border-white/10 text-slate-500'
                      }`}
                    >
                      {isPast ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : step.short}
                    </div>
                    <span
                      className={`text-xs font-semibold whitespace-nowrap ${
                        isPast
                          ? 'text-emerald-300'
                          : isCurrent
                          ? 'text-violet-200 font-bold'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STATUS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 min-w-[20px] rounded-full ${
                        isPast ? 'bg-emerald-500/40' : 'bg-white/10'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}

            {task.status === 'RevisionRequested' && (
              <div className="ml-2 shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <RotateCcw className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                <span className="text-xs font-bold text-rose-300">Action Required: Revision</span>
              </div>
            )}
          </div>
        </div>

        {/* ─── Main Body: Left Content & Right Discussion ─────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row min-h-0">
          {/* ── Left Column: Universal Task Details Hub ── */}
          <div className="flex-1 overflow-y-auto min-w-0 p-6 space-y-6">
            {/* Task Title */}
            <div>
              <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                {task.title}
              </h2>
            </div>

            {/* Core Metadata Cards Grid (Always Rendered) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Assignee Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" /> Assignee
                </span>
                <div className="flex items-center gap-2 pt-0.5">
                  <UserAvatar
                    photoUrl={task.assignee?.photoUrl}
                    name={task.assignee?.fullName}
                    role={task.assignee?.role}
                    size="xs"
                  />
                  <span className="text-xs font-semibold text-white truncate">
                    {task.assignee?.fullName || 'Unassigned'}
                  </span>
                </div>
              </div>

              {/* Due Date Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" /> Due Date
                </span>
                <p
                  className={`text-xs font-bold pt-0.5 ${
                    isOverdue ? 'text-rose-400' : 'text-slate-200'
                  }`}
                >
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : 'No deadline'}
                  {isOverdue && (
                    <span className="block text-[10px] text-rose-400 font-normal">Overdue</span>
                  )}
                </p>
              </div>

              {/* Milestone Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" /> Milestone
                </span>
                <p className="text-xs font-semibold text-violet-300 truncate pt-0.5">
                  {milestone?.name || 'General Workspace'}
                </p>
              </div>

              {/* Task ID Card */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> Task ID
                </span>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs font-mono text-slate-300">
                    {task.id.slice(0, 8)}...
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Copy full ID"
                  >
                    {copiedId ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Task Objectives / Description Section (Always Rendered) */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-violet-400" /> Task Objectives & Description
              </h4>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {task.description || (
                    <span className="italic text-slate-500">
                      No description specified for this task.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* ─── SECTION: Deliverables & Submissions (Universal - Always Visible) ─── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-emerald-400" /> Deliverables & Submissions
                </h4>
                {submissionFiles.length > 0 && (
                  <span className="text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    {submissionFiles.length} Attachment{submissionFiles.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Progress Note / Summary */}
              {task.progressNote ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-950/20 to-indigo-950/10 border border-violet-500/20 space-y-1.5">
                  <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-violet-400" /> Researcher Submission Summary
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {task.progressNote}
                  </p>
                </div>
              ) : null}

              {/* Submitted Files Gallery */}
              {submissionFiles.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {submissionFiles.map((sf, i) => (
                    <div
                      key={`${sf.name}-${i}`}
                      className="group flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-violet-500/30 hover:bg-violet-500/5 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          {getFileIcon(sf.type, sf.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{sf.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatBytes(sf.size || 0)}
                            {sf.uploadedAt &&
                              ` · ${new Date(sf.uploadedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          onClick={() => handleDownload(sf)}
                          className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold transition-all flex items-center gap-1.5"
                          title="Open or Download Deliverable"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                        {canEditSubmission && (
                          <button
                            onClick={() => removeExistingFile(i)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Informative Placeholder when no deliverables yet */}
              {!hasDeliverables && (
                <div className="p-4 rounded-2xl bg-white/[0.015] border border-dashed border-white/10 text-center space-y-1">
                  <p className="text-xs font-semibold text-slate-400">
                    No deliverables submitted yet
                  </p>
                  <p className="text-[11px] text-slate-500">
                    When you submit this task, your summary notes, PDFs, code, and datasets will
                    appear here.
                  </p>
                </div>
              )}
            </div>

            {/* ─── SECTION: Review & Evaluation Hub (Universal - Always Visible) ─── */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Award className="w-3.5 h-3.5 text-amber-400" /> Review & Evaluation Status
              </h4>

              {/* Status: Under Review */}
              {(task.status === 'Submitted' || task.status === 'UnderReview') && (
                <>
                  {isSupervisor ? (
                    // Supervisor Review Controls Panel
                    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-indigo-950/20 p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30">
                            <Award className="w-5 h-5 text-violet-300" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Supervisor Evaluation</p>
                            <p className="text-xs text-slate-300">
                              Review deliverables and sign off or request modifications
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Supervisor Feedback / Revision Note
                        </label>
                        <textarea
                          value={revisionNote}
                          onChange={(e) => setRevisionNote(e.target.value)}
                          placeholder="Provide constructive feedback, required changes, or approval notes..."
                          rows={3}
                          className="w-full bg-[#080718] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <button
                          onClick={handleRequestRevisionInline}
                          disabled={isActioning || !revisionNote.trim()}
                          className="py-3 px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                        >
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                          Request Revision
                        </button>
                        <button
                          onClick={handleApproveInline}
                          disabled={isActioning}
                          className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                        >
                          {isActioning ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          Approve & Mark Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Researcher View: Pending Evaluation
                    <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Eye className="w-5 h-5 text-amber-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-amber-200">
                          Awaiting Supervisor Review
                        </p>
                        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                          Your submission deliverables have been sent to the supervisor. You will be
                          notified once reviewed.
                        </p>
                      </div>
                      {isAssignedToMe && !isResubmitting && (
                        <button
                          onClick={() => setIsResubmitting(true)}
                          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition-all shrink-0"
                        >
                          Update Submission
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Status: Revision Requested */}
              {task.status === 'RevisionRequested' && (
                <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Supervisor Feedback & Action Required
                    </span>
                  </div>
                  <p className="text-sm text-rose-100 leading-relaxed whitespace-pre-wrap pl-6">
                    {task.revisionNote || 'Please update your deliverables according to guidance and resubmit.'}
                  </p>
                </div>
              )}

              {/* Status: Approved */}
              {task.status === 'Approved' && (
                <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-300">
                      Task Approved & Verified ✓
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      All deliverables have been reviewed, approved, and verified by the project
                      supervisor.
                    </p>
                  </div>
                </div>
              )}

              {/* Status: ToDo or InProgress */}
              {(task.status === 'ToDo' || task.status === 'InProgress') && (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-400 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    {task.status === 'ToDo'
                      ? 'Task not yet started. Start working to prepare deliverables.'
                      : 'Task currently in progress. Complete your work and submit for supervisor evaluation.'}
                  </span>
                </div>
              )}
            </div>

            {/* Error Banner */}
            {actionError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-rose-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-xs font-medium">{actionError}</span>
              </div>
            )}

            {/* ─── SECTION: Active Submission / Action Panel ─── */}
            {canEditSubmission ? (
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30">
                      <Upload className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        {isResubmitting
                          ? 'Update & Resubmit Deliverables'
                          : 'Submit Work for Supervisor Review'}
                      </p>
                      <p className="text-xs text-slate-400">
                        Attach your summary notes, PDFs, code, reports, or datasets
                      </p>
                    </div>
                  </div>
                  {isResubmitting && (
                    <button
                      onClick={() => setIsResubmitting(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Progress Note Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Work Summary / Findings Note
                  </label>
                  <textarea
                    value={progressNote}
                    onChange={(e) => setProgressNote(e.target.value)}
                    placeholder="Describe what you've accomplished, key findings, methodology, and any relevant links..."
                    rows={4}
                    className="w-full bg-[#080718] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/60 resize-none leading-relaxed transition-colors"
                  />
                </div>

                {/* File Upload Drop Zone */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Attach Deliverables & Files
                    <span className="text-slate-500 font-normal normal-case">
                      (PDF, Word, Excel, Images, Code, ZIP — max 50 MB each)
                    </span>
                  </label>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all py-6 flex flex-col items-center gap-2 ${
                      isDragging
                        ? 'border-violet-500 bg-violet-500/15'
                        : 'border-white/15 bg-white/[0.02] hover:border-violet-500/40 hover:bg-violet-500/5'
                    }`}
                  >
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-xs text-slate-300 font-medium">
                      Drag & drop files here or <span className="text-violet-400 font-bold">browse</span>
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && validateAndAddFiles(e.target.files)}
                    />
                  </div>

                  {/* Queued Local Files */}
                  {localFiles.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {localFiles.map((lf, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.04] border border-white/10"
                        >
                          {lf.preview ? (
                            <img
                              src={lf.preview}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                              alt=""
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                              {getFileIcon(lf.file.type, lf.file.name)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {lf.file.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {formatBytes(lf.file.size)}
                            </p>
                          </div>
                          {lf.uploading ? (
                            <Loader2 className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
                          ) : (
                            <button
                              onClick={() => removeLocalFile(i)}
                              className="text-slate-400 hover:text-rose-400 transition-colors shrink-0 p-1"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmitTask}
                  disabled={isActioning}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30"
                >
                  {isActioning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  {isActioning ? 'Uploading & Submitting...' : 'Submit for Supervisor Review'}
                </button>
              </div>
            ) : task.status === 'ToDo' && (isAssignedToMe || isSupervisor) ? (
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-white">Ready to Begin Work?</p>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Move this task into In Progress to start logging deliverables
                  </p>
                </div>
                <button
                  onClick={handleStartTask}
                  disabled={isActioning}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-sky-600/20 shrink-0"
                >
                  {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Start Working
                </button>
              </div>
            ) : null}
          </div>

          {/* ── Right Column: Unified Discussion & Activity Stream (Universal) ── */}
          <div className="w-full lg:w-[350px] xl:w-[390px] shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#070617] max-h-[45vh] lg:max-h-full">
            {/* Thread Header */}
            <div className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Discussion & Activity
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-slate-300 font-semibold">
                {comments.length}
              </span>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
              {comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-slate-500" />
                  </div>
                  <p className="text-xs text-slate-300 font-semibold">No discussion yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                    Leave a question, feedback, or update for your team members
                  </p>
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          photoUrl={c.author?.photoUrl}
                          name={c.author?.fullName}
                          role={c.author?.role}
                          size="xs"
                        />
                        <span className="text-xs font-bold text-violet-300">
                          {c.author?.fullName || 'Project Member'}
                        </span>
                        {c.author?.role && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({c.author.role})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="ml-6 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={commentsEndRef} />
            </div>

            {/* Comment Composer */}
            <div className="p-3.5 border-t border-white/[0.08] shrink-0 bg-white/[0.02]">
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment or note..."
                  className="flex-1 bg-[#0B0A1E] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors min-w-0"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isPostingComment}
                  className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-all shadow-md shadow-violet-600/30 shrink-0"
                  title="Send comment"
                >
                  {isPostingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ─── Footer Bar ────────────────────────────────────────────────── */}
        <div className="px-6 py-3 border-t border-white/[0.08] bg-white/[0.015] flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 font-mono">
            {task.projectId.slice(0, 8)} / {task.id.slice(0, 8)}
            {task.updatedAt && ` · Updated ${new Date(task.updatedAt).toLocaleDateString()}`}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
