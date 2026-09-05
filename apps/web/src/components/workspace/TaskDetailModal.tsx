import React, { useState, useEffect } from 'react';
import {
  Task,
  TaskComment,
  TaskStatus,
  Milestone,
  Project,
} from '@researchos/shared-types';
import {
  X,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../supabase.js';
import { UserAvatar } from '../common/UserAvatar.js';

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
}

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
}) => {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);

  const isSupervisor = currentUserRole === 'Supervisor' || project?.ownerId === currentUserId;
  const isAssignedToMe = task?.assigneeId === currentUserId;

  const milestone = milestones.find((m) => m.id === task?.milestoneId);

  if (!isOpen || !task || !project) return null;

  const fetchComments = async () => {
    if (!task) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/tasks/${task.id}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  useEffect(() => {
    if (isOpen && task) {
      fetchComments();
    }
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isPostingComment) return;

    setIsPostingComment(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: newComment.trim() }),
      });

      if (res.ok) {
        const createdComment = await res.json();
        setComments((prev) => [...prev, createdComment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0F0E1A] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl shadow-black/90 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs font-bold uppercase tracking-wider">
              {task.status}
            </span>
            {task.isProposed && (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Proposed Task
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title & Description */}
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{task.title}</h2>
            <p className="text-sm text-slate-300 mt-2.5 leading-relaxed whitespace-pre-wrap">
              {task.description || 'No detailed description provided.'}
            </p>
          </div>

          {/* Revision Note Banner if RevisionRequested */}
          {task.status === 'RevisionRequested' && task.revisionNote && (
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-200 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">Supervisor Revision Note</h4>
                <p className="text-xs text-rose-200 mt-1 leading-relaxed">{task.revisionNote}</p>
              </div>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Priority</span>
              <p className="text-white font-semibold mt-1">{task.priority}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Milestone</span>
              <p className="text-violet-300 font-semibold mt-1 truncate">
                {milestone?.name || 'None'} {milestone?.isLocked ? '🔒' : ''}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Assignee</span>
              <div className="flex items-center space-x-1.5 mt-1">
                <UserAvatar
                  photoUrl={task.assignee?.photoUrl}
                  name={task.assignee?.fullName}
                  role={task.assignee?.role}
                  size="xs"
                />
                <p className="text-white font-semibold truncate">{task.assignee?.fullName || 'Unassigned'}</p>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-500 tracking-wider">Due Date</span>
              <p className="text-slate-300 font-semibold mt-1">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
              </p>
            </div>
          </div>

          {/* Discussion Thread */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2 text-sm font-bold text-white border-b border-white/10 pb-2">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span>Discussion & Notes ({comments.length})</span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-3 text-center">No discussion comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2">
                        <UserAvatar
                          photoUrl={c.author?.photoUrl}
                          name={c.author?.fullName}
                          role={c.author?.role}
                          size="xs"
                        />
                        <span className="font-semibold text-violet-300">
                          {c.author?.fullName || 'Project Member'}
                        </span>
                      </div>
                      <span className="text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 whitespace-pre-wrap pl-6">{c.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Composer */}
            <form onSubmit={handlePostComment} className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a note or attach data reference..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isPostingComment}
                className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-all shadow-md shadow-violet-600/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            {task.status === 'ToDo' && (isAssignedToMe || isSupervisor) && (
              <button
                onClick={async () => {
                  await onStatusChange(task.id, 'InProgress');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all shadow-md shadow-sky-600/20"
              >
                Start Working (In Progress)
              </button>
            )}

            {(task.status === 'InProgress' || task.status === 'RevisionRequested') && isAssignedToMe && (
              <button
                onClick={async () => {
                  await onStatusChange(task.id, 'Submitted');
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold transition-all shadow-md shadow-violet-600/30 flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit for Review</span>
              </button>
            )}

            {task.status === 'Submitted' && isSupervisor && (
              <button
                onClick={() => {
                  onClose();
                  onReviewTask(task);
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-md shadow-violet-600/30 flex items-center space-x-1.5"
              >
                <span>Supervisor Review</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
