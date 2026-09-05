import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { api } from '../../lib/api.js';
import { supabase } from '../../supabase.js';
import { Notification, NotificationType } from '@researchos/shared-types';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import {
  Bell,
  CheckCheck,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Sparkles,
  RotateCcw,
  Search,
  Check,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

interface NotificationsPageProps {
  onNavigate: (route: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const fetchNotifications = useCallback(async (showRefreshing = false) => {
    if (!user) return;
    try {
      if (showRefreshing) setIsRefreshing(true);
      else setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user?.id) return;

    // Realtime Postgres subscription for instant notification updates
    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: any }) => {
          const row = payload.new;
          const newNotif: Notification = {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            payload: row.payload || {},
            channel: row.channel || 'InApp',
            isRead: Boolean(row.is_read),
            createdAt: row.created_at,
          };
          setNotifications((prev) => [newNotif, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: any }) => {
          const row = payload.new;
          setNotifications((prev) =>
            prev.map((n) => (n.id === row.id ? { ...n, isRead: Boolean(row.is_read) } : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleMarkSingleRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleNavigateToContext = (n: Notification) => {
    if (!n.isRead) {
      handleMarkSingleRead(n.id);
    }
    const projectId = n.payload?.projectId as string | undefined;
    if (projectId) {
      onNavigate(`/projects/${projectId}`);
    } else {
      onNavigate('/dashboard');
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'TaskAssigned':
        return (
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shrink-0 shadow-sm">
            <Clock className="w-5 h-5" />
          </div>
        );
      case 'TaskApproved':
        return (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0 shadow-sm">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'RevisionRequested':
        return (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0 shadow-sm">
            <RotateCcw className="w-5 h-5" />
          </div>
        );
      case 'DeadlineIn48h':
      case 'ReviewDeadline':
        return (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 shrink-0 shadow-sm">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
      case 'MilestoneDue':
        return (
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 shrink-0 shadow-sm">
            <Calendar className="w-5 h-5" />
          </div>
        );
      case 'BookingRequest':
      case 'ForumReply':
        return (
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 shrink-0 shadow-sm">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/25 text-slate-400 shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
        );
    }
  };

  const getNotificationTitle = (n: Notification) => {
    if (n.payload?.title) return String(n.payload.title);
    switch (n.type) {
      case 'TaskAssigned':
        return 'Task Assignment Dispatch';
      case 'TaskApproved':
        return 'Deliverable Approved by Supervisor';
      case 'RevisionRequested':
        return 'Revision Requested on Deliverable';
      case 'DeadlineIn48h':
        return '48-Hour Deadline Alert';
      case 'MilestoneDue':
        return 'Milestone Due Date Approaching';
      default:
        return 'Workspace Notification';
    }
  };

  const getNotificationDescription = (n: Notification) => {
    if (n.payload?.revisionNote) return String(n.payload.revisionNote);
    if (n.payload?.message) return String(n.payload.message);
    if (n.payload?.description) return String(n.payload.description);
    switch (n.type) {
      case 'TaskAssigned':
        return 'You have been assigned as the lead researcher on this task.';
      case 'TaskApproved':
        return 'Your supervisor verified the deliverable and marked the task Approved.';
      case 'RevisionRequested':
        return 'Supervisor provided revision guidance and requested updates to your deliverable.';
      case 'DeadlineIn48h':
        return 'A scheduled task milestone is due within the next 48 hours.';
      default:
        return 'Status update in your research workspace.';
    }
  };

  // Filter logic
  const filteredNotifications = notifications.filter((n) => {
    // Category filter
    if (categoryFilter === 'unread' && n.isRead) return false;
    if (categoryFilter === 'tasks' && n.type !== 'TaskAssigned') return false;
    if (categoryFilter === 'reviews' && n.type !== 'TaskApproved' && n.type !== 'RevisionRequested') return false;
    if (categoryFilter === 'deadlines' && n.type !== 'DeadlineIn48h' && n.type !== 'ReviewDeadline' && n.type !== 'MilestoneDue') return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = getNotificationTitle(n).toLowerCase();
      const desc = getNotificationDescription(n).toLowerCase();
      const project = String(n.payload?.projectName || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || project.includes(q);
    }

    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <WorkspaceLayout
      activeTab="dashboard"
      onNavigate={onNavigate}
      headerProps={{
        userId: user?.id,
        userRole: profile?.role,
        onNavigate,
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Page Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-950/40 via-indigo-950/30 to-[#0B0C10] p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-300 shadow-md">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Notification Center
                    </h1>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/40 shadow-sm">
                        {unreadCount} Unread
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time workspace activity, task assignments, supervision feedback, and deadline alerts.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 self-start sm:self-auto">
              <button
                onClick={() => fetchNotifications(true)}
                disabled={isRefreshing}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all hover:scale-105"
                title="Refresh Notifications"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-violet-400' : ''}`} />
              </button>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/25 flex items-center space-x-2 transition-all hover:scale-105"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark All as Read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0D0C18] p-3.5 rounded-2xl border border-white/10 shadow-md">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `All (${notifications.length})` },
              { id: 'unread', label: `Unread (${unreadCount})` },
              { id: 'tasks', label: 'Tasks' },
              { id: 'reviews', label: 'Reviews & Approvals' },
              { id: 'deadlines', label: 'Deadlines' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                  categoryFilter === tab.id
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/20 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[38px] min-h-[38px] bg-white/5 border border-white/10 text-xs rounded-xl pl-8 pr-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 w-full sm:w-60 transition-all"
            />
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-16 text-center rounded-3xl bg-[#0D0C18] border border-white/10">
              <RefreshCw className="w-8 h-8 animate-spin text-violet-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">Loading your notification stream...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-16 text-center rounded-3xl bg-[#0D0C18] border border-white/10">
              <Sparkles className="w-10 h-10 text-violet-400/50 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white">No notifications found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchQuery || categoryFilter !== 'all'
                  ? 'No notifications match your current search or category filter.'
                  : 'You are all caught up! New tasks, supervision approvals, and alerts will appear here.'}
              </p>
              {(searchQuery || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-violet-300 text-xs font-medium border border-white/10 transition-all"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleNavigateToContext(n)}
                className={`group p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row items-start justify-between gap-4 ${
                  !n.isRead
                    ? 'bg-gradient-to-r from-violet-950/40 via-[#0E0D1A] to-[#0A0A12] border-violet-500/40 shadow-lg shadow-violet-950/30 hover:border-violet-400/60'
                    : 'bg-[#0D0C18]/80 hover:bg-[#121122] border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                <div className="flex items-start space-x-4 min-w-0 flex-1">
                  {getNotificationIcon(n.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-sm font-semibold tracking-tight ${
                          !n.isRead ? 'text-white' : 'text-slate-200'
                        }`}
                      >
                        {getNotificationTitle(n)}
                      </h4>

                      {!n.isRead && (
                        <span className="px-2 py-0.5 text-[9px] font-bold bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/40 shadow-[0_0_8px_rgba(139,92,246,0.4)]">
                          New
                        </span>
                      )}

                      {Boolean(n.payload?.projectName) && (
                        <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-white/5 text-slate-300 rounded-md border border-white/10">
                          {String(n.payload?.projectName)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {getNotificationDescription(n)}
                    </p>

                    {Boolean(n.payload?.dueDate) && (
                      <div className="flex items-center space-x-1.5 text-[11px] text-amber-400 mt-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Due: {new Date(String(n.payload?.dueDate)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-3">
                      <span>{formatDateTime(n.createdAt)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  {!n.isRead ? (
                    <button
                      type="button"
                      onClick={(e) => handleMarkSingleRead(n.id, e)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium transition-all flex items-center space-x-1"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Mark Read</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center space-x-1 mr-2">
                      <Check className="w-3.5 h-3.5 text-slate-600" />
                      <span>Read</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleNavigateToContext(n)}
                    className="px-3.5 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 hover:text-white border border-violet-500/30 text-xs font-semibold transition-all flex items-center space-x-1.5 group-hover:translate-x-0.5"
                  >
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
