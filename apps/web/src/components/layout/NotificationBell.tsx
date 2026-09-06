import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ExternalLink,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../supabase.js';
import { api } from '../../lib/api.js';
import { Notification, NotificationType } from '@researchos/shared-types';

interface NotificationBellProps {
  userId?: string;
  onNavigate?: (route: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId, onNavigate }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    // Realtime subscription for incoming notifications
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: { new: any }) => {
          const row = payload.new;
          const newNotification: Notification = {
            id: row.id,
            userId: row.user_id,
            type: row.type,
            payload: row.payload || {},
            channel: row.channel || 'InApp',
            isRead: Boolean(row.is_read),
            createdAt: row.created_at,
          };
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
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
  }, [userId, fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await api.markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Error marking notification as read:', err);
      }
    }

    setIsOpen(false);

    // If notification has an associated project or route, navigate to it
    const projectId = notification.payload?.projectId as string | undefined;
    if (projectId && onNavigate) {
      onNavigate(`/projects/${projectId}`);
    } else if (onNavigate) {
      onNavigate('/dashboard');
    }
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
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'TaskApproved':
        return (
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'RevisionRequested':
        return (
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
            <RotateCcw className="w-4 h-4" />
          </div>
        );
      case 'DeadlineIn48h':
      case 'ReviewDeadline':
        return (
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'MilestoneDue':
        return (
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        );
      case 'BookingRequest':
      case 'ForumReply':
        return (
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/25 text-slate-400 shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  const getNotificationTitle = (n: Notification) => {
    if (n.payload?.title) return String(n.payload.title);
    switch (n.type) {
      case 'TaskAssigned':
        return 'New Task Assigned';
      case 'TaskApproved':
        return 'Task Approved';
      case 'RevisionRequested':
        return 'Revision Requested';
      case 'DeadlineIn48h':
        return 'Upcoming Deadline in 48h';
      case 'MilestoneDue':
        return 'Milestone Deadline Near';
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
        return 'You have been assigned a new task by your supervisor.';
      case 'TaskApproved':
        return 'Your task deliverable has been verified and marked as approved.';
      case 'RevisionRequested':
        return 'Supervisor provided revision guidance on your deliverable.';
      case 'DeadlineIn48h':
        return 'A scheduled project deadline is approaching within 48 hours.';
      default:
        return 'Status updated on your research workspace.';
    }
  };

  const displayedNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition-all duration-200 select-none ${
          isOpen
            ? 'bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border-violet-500/60 shadow-[0_0_16px_rgba(139,92,246,0.3)] ring-1 ring-violet-500/40 text-white'
            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-400 hover:text-white'
        }`}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white shadow-lg shadow-violet-500/50 border border-black animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown Surface */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl popover-neon-surface p-0 z-50 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          {/* Top Neon Sweep Shimmer */}
          <div className="popover-neon-sweep" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-semibold text-white">Notifications</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] text-violet-400 hover:text-violet-300 font-medium flex items-center space-x-1 hover:underline transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-0.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 px-3 py-2 border-b border-white/5 bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                filter === 'unread'
                  ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification Items List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-white/5 scrollbar-thin">
            {loading && notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-violet-400 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Syncing live notifications...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Sparkles className="w-7 h-7 mx-auto text-violet-400/50 mb-2" />
                <p className="text-xs text-slate-300 font-medium">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications in your inbox'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 hover:bg-white/[0.04] cursor-pointer transition-all flex items-start space-x-3 group relative ${
                    !n.isRead
                      ? 'bg-gradient-to-r from-violet-950/25 via-transparent to-transparent border-l-2 border-violet-500'
                      : ''
                  }`}
                >
                  {getNotificationIcon(n.type)}

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !n.isRead ? 'text-white font-medium' : 'text-slate-300'
                        }`}
                      >
                        {getNotificationTitle(n)}
                      </p>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {getNotificationDescription(n)}
                    </p>

                    {Boolean(n.payload?.projectName) && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10 font-mono">
                        {String(n.payload?.projectName)}
                      </span>
                    )}
                  </div>

                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.9)] animate-pulse" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-4 py-2.5 bg-black/40 border-t border-white/10 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigate?.('/notifications');
              }}
              className="text-violet-400 hover:text-violet-300 font-medium flex items-center space-x-1 transition-colors hover:underline"
            >
              <span>Open Notification Center</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>

            <span className="flex items-center space-x-1 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Sync</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
