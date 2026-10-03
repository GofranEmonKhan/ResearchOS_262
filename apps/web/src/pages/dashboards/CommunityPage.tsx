import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Sparkles,
  Compass,
  Tag as TagIcon,
  ShieldCheck,
  TrendingUp,
  BookmarkCheck,
  User,
  HelpCircle,
  Mail,
  BookOpen,
  ArrowUpDown,
  Clock,
  ArrowBigUp,
  Flame,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { WorkspaceLayout } from '../../components/layout/WorkspaceLayout.js';
import { HoverSelect } from '../../components/common/HoverSelect.js';
import { PostCard } from '../../components/community/PostCard.js';
import { CreatePostModal } from '../../components/community/CreatePostModal.js';
import { PostDetailModal } from '../../components/community/PostDetailModal.js';
import { ReactionDetailModal } from '../../components/community/ReactionDetailModal.js';
import { DirectMessagesPanel } from '../../components/community/DirectMessagesPanel.js';
import { MessengerPopupChat } from '../../components/community/MessengerPopupChat.js';
import { CommunityProfileModal } from '../../components/community/CommunityProfileModal.js';
import { AdminModerationModal } from '../../components/community/AdminModerationModal.js';
import { ContextualLoader } from '../../components/common/ContextualLoader.js';
import { ForumPost, ForumVoteValue } from '@researchos/shared-types';
import { api, getAuthToken } from '../../lib/api.js';
import { supabase } from '../../supabase.js';

export interface CommunityPageProps {
  onNavigate?: (route: string) => void;
  initialTab?: 'all' | 'following' | 'unanswered' | 'blogs' | 'dms' | 'my-posts' | 'moderation';
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ onNavigate, initialTab }) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'unanswered' | 'blogs' | 'dms' | 'my-posts' | 'moderation'>(initialTab || 'all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedSort, setSelectedSort] = useState<'newest' | 'top-voted' | 'most-active'>('newest');
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [followedTags, setFollowedTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [initialPostType, setInitialPostType] = useState<'discussion' | 'blog'>('discussion');
  const [activeDetailPostId, setActiveDetailPostId] = useState<string | null>(null);
  const [activeReactorTarget, setActiveReactorTarget] = useState<{ type: 'Post' | 'Answer'; id: string } | null>(null);
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);
  const [initialDmPartnerId, setInitialDmPartnerId] = useState<string | null>(null);
  const [isAdminModerationOpen, setIsAdminModerationOpen] = useState(false);

  // Messenger Pop-up & Unread State
  const [popupDmPartnerId, setPopupDmPartnerId] = useState<string | null>(null);
  const [isPopupDmOpen, setIsPopupDmOpen] = useState(false);
  const [unreadDmCount, setUnreadDmCount] = useState<number>(0);

  const isAdmin = profile?.role === 'Admin';
  const isFacultyVerified = profile?.role === 'Supervisor' && profile?.status === 'Active';

  // ─── Fetch Unread DM Count ──────────────────────────────────────────────────
  const fetchUnreadDmCount = useCallback(async () => {
    try {
      const res = await api.listDirectMessageThreads();
      const count = (res.threads || []).reduce((acc, t) => acc + (t.unreadCount || 0), 0);
      setUnreadDmCount(count);
    } catch (err) {
      console.error('Failed to load unread DM count:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnreadDmCount();

    if (!user?.id) return;

    // Realtime subscription for incoming direct messages
    const channel = supabase
      .channel(`community-page-dms-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadDmCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchUnreadDmCount]);

  // ─── Auto-dismiss Pop-up Chat when user opens or is in the Inbox (DMs Tab) ──
  useEffect(() => {
    if (activeTab === 'dms') {
      setIsPopupDmOpen(false);
      setPopupDmPartnerId(null);
    }
  }, [activeTab]);

  // ─── Query Params Sync ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const partnerParam = urlParams.get('partner');
      const profileParam = urlParams.get('profile');
      const postParam = urlParams.get('post');

      if (tabParam === 'dms' || tabParam === 'blogs' || tabParam === 'following' || tabParam === 'unanswered' || tabParam === 'my-posts') {
        setActiveTab(tabParam as any);
      }
      if (partnerParam && tabParam !== 'dms') {
        setInitialDmPartnerId(partnerParam);
        setPopupDmPartnerId(partnerParam);
        setIsPopupDmOpen(true);
      }
      if (profileParam) {
        setActiveProfileUserId(profileParam);
      }
      if (postParam) {
        setActiveDetailPostId(postParam);
      }
    }
  }, []);

  // Debounce search term to prevent rapid sequential network requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPosts = async () => {
    if (activeTab === 'dms' || activeTab === 'moderation') return;

    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams();
      if (selectedTag) params.append('tag', selectedTag);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedSort) params.append('sort', selectedSort);
      params.append('tab', activeTab);

      const res = await fetch(`/api/forum/posts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to load forum posts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const token = await getAuthToken();
      const [popRes, folRes] = await Promise.all([
        fetch('/api/forum/tags/popular', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/forum/tags/followed', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (popRes.ok) {
        const data = await popRes.json();
        setPopularTags(data.tags || []);
      }
      if (folRes.ok) {
        const data = await folRes.json();
        setFollowedTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [activeTab, selectedTag, selectedSort, debouncedSearchTerm]);

  const handleToggleFollowTag = async (tag: string) => {
    const isFollowed = followedTags.includes(tag);
    const method = isFollowed ? 'DELETE' : 'POST';

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/tags/${tag}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setFollowedTags((prev) =>
          isFollowed ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
      }
    } catch (err) {
      console.error('Failed to toggle follow tag:', err);
    }
  };

  const handleVote = async (postId: string, value: ForumVoteValue) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/votes/Post/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      if (res.ok) {
        const { reactions } = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, currentUserReaction: value, score: reactions.up - reactions.down, reactions }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleRetractVote = async (postId: string) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/votes/Post/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const { reactions } = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, currentUserReaction: null, currentUserVote: null, score: reactions.up - reactions.down, reactions }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to retract vote:', err);
    }
  };

  const handleEditPost = (updatedPost: ForumPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        fetchTags();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleAnswerCountChange = (postId: string, newCount: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, answersCount: newCount } : p))
    );
  };

  const handleCreatePostSubmit = async (data: {
    title: string;
    body: string;
    tags: string[];
    attachmentIds: string[];
    projectId?: string;
  }) => {
    const token = await getAuthToken();
    const res = await fetch('/api/forum/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create post');
    }

    fetchPosts();
    fetchTags();
  };

  return (
    <WorkspaceLayout
      activeTab="community"
      onTabChange={(tab) => {
        if (!onNavigate) return;
        if (tab === 'dashboard') {
          onNavigate('/dashboard');
        } else if (tab === 'kanban' || tab === 'calendar') {
          const lastId = typeof window !== 'undefined' ? localStorage.getItem('researchos_last_active_project_id') : null;
          if (lastId) {
            onNavigate(`/projects/${lastId}?tab=${tab}`);
          } else {
            onNavigate(`/dashboard?tab=${tab}`);
          }
        }
      }}
      onNavigate={onNavigate}
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-7 bg-gradient-to-r from-violet-950/40 via-surface-1 to-indigo-950/40 border border-violet-500/20 rounded-3xl shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2.5 bg-violet-600/15 border border-violet-500/30 rounded-xl text-violet-400 shadow-sm shadow-violet-950/40">
                <Compass className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Academic Community & Peer Forum
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Global Discourse
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300/90 font-normal max-w-2xl leading-relaxed">
              Engage in peer-reviewed scientific discourse, ask technical questions, read curated methodology blogs, earn academic reputation, and collaborate across institutions.
            </p>
          </div>

          {/* CTA Button */}
          <div className="flex items-center gap-3 z-10 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ask Question / Post</span>
            </button>
          </div>
        </div>

        {/* Navigation Tab Bar & Search Controls */}
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5 p-2.5 rounded-2xl bg-[#090A16]/95 border border-slate-800/90 shadow-2xl backdrop-blur-xl">
          {/* Segmented Tab Controls */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 shrink-0">
            {[
              { id: 'all', label: 'All Discussions', icon: MessageSquare },
              { id: 'following', label: 'Following Tags', icon: BookmarkCheck },
              { id: 'unanswered', label: 'Unanswered', icon: HelpCircle },
              { id: 'blogs', label: 'Scientific Blogs & Insights', icon: BookOpen },
              { id: 'dms', label: 'Direct Messages', icon: Mail, unreadCount: unreadDmCount },
              { id: 'my-posts', label: 'My Activity', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedTag(null);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30 ring-1 ring-white/20'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-violet-400'}`} />
                  <span>{tab.label}</span>
                  {tab.id === 'dms' && unreadDmCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-sm shadow-rose-500/50 animate-pulse">
                      {unreadDmCount > 9 ? '9+' : unreadDmCount}
                    </span>
                  )}
                </button>
              );
            })}

            {isAdmin && (
              <button
                onClick={() => setIsAdminModerationOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-all ml-1 cursor-pointer whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Moderation Queue</span>
              </button>
            )}
          </div>

          {/* Search & Sort Filters (for feed and blogs tabs) */}
          {activeTab !== 'dms' && (
            <div className="flex items-center gap-2.5 w-full xl:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 xl:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeTab === 'blogs'
                      ? 'Search research blogs...'
                      : 'Search scientific posts...'
                  }
                  className="w-full pl-9 pr-8 py-2 bg-slate-900/90 border border-slate-800 hover:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none transition-all"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Interactive Sort Dropdown for Discussions */}
              {activeTab !== 'blogs' && (
                <HoverSelect
                  value={selectedSort}
                  options={[
                    {
                      value: 'newest',
                      label: 'Newest First',
                      icon: <Clock className="w-3.5 h-3.5 text-violet-400" />,
                    },
                    {
                      value: 'top-voted',
                      label: 'Top Voted',
                      icon: <ArrowBigUp className="w-3.5 h-3.5 text-amber-400" />,
                    },
                    {
                      value: 'most-active',
                      label: 'Most Active',
                      icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
                    },
                  ]}
                  onChange={(val) => setSelectedSort(val as any)}
                  icon={<ArrowUpDown className="w-3.5 h-3.5 text-violet-400" />}
                  align="right"
                  buttonClassName="py-2 px-3.5 text-xs bg-slate-900/90 border-slate-800 hover:border-violet-500/40 rounded-xl text-slate-200"
                  menuClassName="w-44"
                />
              )}
            </div>
          )}
        </div>

        {/* Active Tag Filter Indicator */}
        {selectedTag && (
          <div className="flex items-center justify-between p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl text-xs text-indigo-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <TagIcon className="w-4 h-4 text-indigo-400" />
              <span>Showing discussions tagged with <strong>#{selectedTag}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleFollowTag(selectedTag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  followedTags.includes(selectedTag)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
                }`}
              >
                {followedTags.includes(selectedTag) ? 'Following' : '+ Follow Tag'}
              </button>
              <button
                onClick={() => setSelectedTag(null)}
                className="text-slate-400 hover:text-white font-semibold"
              >
                Clear filter
              </button>
            </div>
          </div>
        )}

        {/* Main Layout Grid */}
        {activeTab === 'dms' ? (
          <DirectMessagesPanel
            currentUserId={user?.id || ''}
            onSelectUser={(uid) => setActiveProfileUserId(uid)}
            initialPartnerId={initialDmPartnerId}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Feed (3 Cols) */}
            <div className="lg:col-span-3 space-y-4">
              {/* Active Scientific Blogs Filter Banner */}
              {activeTab === 'blogs' && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-purple-950/30 border border-emerald-500/20 rounded-2xl shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Scientific Blogs & Research Insights
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          FILTER ACTIVE
                        </span>
                      </h3>
                      <p className="text-xs text-slate-300/80 mt-0.5">
                        Showing peer-written research blogs, deep methodology analyses, and academic reflections.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setInitialPostType('blog');
                      setIsCreateModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Write Scientific Blog
                  </button>
                </div>
              )}

              {isLoading ? (
                <ContextualLoader
                  context="community"
                  fullScreen={false}
                  size="sm"
                  title="Loading Discussions & Insights"
                  subtitle="Streaming peer questions, answers, and research discussions..."
                />
              ) : (activeTab === 'blogs' ? posts.filter((p) => p.tags?.includes('scientific-blog') || p.tags?.includes('blog')) : posts).length === 0 ? (
                <div className="p-12 text-center bg-[#0C0B1B]/80 border border-white/10 rounded-2xl space-y-3">
                  {activeTab === 'blogs' ? (
                    <>
                      <BookOpen className="w-12 h-12 text-emerald-400/60 mx-auto" />
                      <h3 className="text-base font-bold text-white">No scientific blogs found</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Be the first scholar to publish a scientific blog, research methodology essay, or literature synthesis!
                      </p>
                      <button
                        onClick={() => {
                          setInitialPostType('blog');
                          setIsCreateModalOpen(true);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        + Write First Scientific Blog
                      </button>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
                      <h3 className="text-base font-bold text-white">No discussions found</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Be the first scholar to start a discussion or ask a question in this topic!
                      </p>
                      <button
                        onClick={() => {
                          setInitialPostType('discussion');
                          setIsCreateModalOpen(true);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
                      >
                        Ask Question
                      </button>
                    </>
                  )}
                </div>
              ) : (
                (activeTab === 'blogs' ? posts.filter((p) => p.tags?.includes('scientific-blog') || p.tags?.includes('blog')) : posts).map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id}
                    userRole={profile?.role}
                    isAdmin={isAdmin}
                    isFacultyVerified={isFacultyVerified}
                    onOpenDetail={(id) => setActiveDetailPostId(id)}
                    onSelectTag={(t) => setSelectedTag(t)}
                    onSelectAuthor={(uid) => setActiveProfileUserId(uid)}
                    onVote={(id, val) => handleVote(id, val)}
                    onRetractVote={(id) => handleRetractVote(id)}
                    onOpenReactors={(id) => setActiveReactorTarget({ type: 'Post', id })}
                    onReport={() => {
                      alert('Report submitted for moderation review.');
                    }}
                    onEdit={handleEditPost}
                    onDelete={handleDeletePost}
                    onAnswerCountChange={handleAnswerCountChange}
                  />
                ))
              )}
            </div>

            {/* Sidebar Widgets (1 Col) */}
            <div className="space-y-5">
              {/* Popular Tags Widget */}
              <div className="p-5 bg-surface-1/90 border border-white/10 rounded-2xl shadow-lg space-y-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  Popular Research Fields
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {popularTags.slice(0, 15).map(({ tag, count }) => {
                    return (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          selectedTag === tag
                            ? 'bg-violet-600 text-white font-bold shadow-md shadow-violet-600/30'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        <span>#{tag}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reputation Protocol Explainer */}
              <div className="p-5 bg-gradient-to-br from-violet-950/30 via-surface-1/90 to-surface-1 border border-violet-500/20 rounded-2xl shadow-lg space-y-3.5 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-violet-300">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Scholar Reputation Ledger
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="font-medium">Peer Upvote / React</span>
                    <strong className="text-emerald-400 font-mono">+10 Rep</strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="font-medium">Accepted Solution</span>
                    <strong className="text-emerald-400 font-mono">+15 Rep</strong>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                    <span className="font-medium">Faculty Expert Seal</span>
                    <strong className="text-violet-300 font-mono">+20 Rep</strong>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="font-medium">Downvote Received</span>
                    <strong className="text-rose-400 font-mono">-2 Rep</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 leading-relaxed">
                  Earn reputation points to unlock faculty peer review endorsement badges and community governance privileges.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── FLOATING MESSENGER POP-UP CHAT WIDGET ────────────────────────── */}
      {popupDmPartnerId && activeTab !== 'dms' && (
        <MessengerPopupChat
          currentUserId={user?.id || ''}
          partnerId={popupDmPartnerId}
          isOpen={isPopupDmOpen}
          onClose={() => {
            setIsPopupDmOpen(false);
            setPopupDmPartnerId(null);
          }}
          onExpandToFullTab={(partnerId) => {
            setIsPopupDmOpen(false);
            setPopupDmPartnerId(null);
            setInitialDmPartnerId(partnerId);
            setActiveTab('dms');
          }}
          onSelectUser={(uid) => setActiveProfileUserId(uid)}
        />
      )}

      {/* ─── FLOATING MESSENGER ACTION TRIGGER (Quick Access from Any Tab) ─── */}
      {activeTab !== 'dms' && !isPopupDmOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              if (popupDmPartnerId) {
                setIsPopupDmOpen(true);
              } else {
                setActiveTab('dms');
              }
            }}
            className="group relative flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-violet-600/50 hover:shadow-violet-600/70 hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20"
            title="Open Messenger Chats"
          >
            <div className="relative">
              <MessageSquare className="w-5 h-5 text-white" />
              {unreadDmCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white border-2 border-[#0A091A] shadow-md animate-pulse">
                  {unreadDmCount > 9 ? '9+' : unreadDmCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold tracking-wide hidden sm:inline">
              Messages
            </span>
            {unreadDmCount > 0 && (
              <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-white">
                {unreadDmCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Modals */}
      {isCreateModalOpen && (
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreatePostSubmit}
          popularTags={popularTags}
          initialPostType={initialPostType}
        />
      )}

      {activeDetailPostId && (
        <PostDetailModal
          postId={activeDetailPostId}
          isOpen={!!activeDetailPostId}
          onClose={() => setActiveDetailPostId(null)}
          currentUserId={user?.id}
          userRole={profile?.role}
          isFacultyVerified={isFacultyVerified}
          onSelectAuthor={(uid) => {
            setActiveDetailPostId(null);
            setActiveProfileUserId(uid);
          }}
          onSelectTag={(t) => {
            setActiveDetailPostId(null);
            setSelectedTag(t);
          }}
          onOpenReactors={(type, id) => setActiveReactorTarget({ type, id })}
          onReport={() => alert('Report submitted for moderation review.')}
        />
      )}

      {activeReactorTarget && (
        <ReactionDetailModal
          isOpen={!!activeReactorTarget}
          onClose={() => setActiveReactorTarget(null)}
          targetType={activeReactorTarget.type}
          targetId={activeReactorTarget.id}
          onSelectUser={(uid) => {
            setActiveReactorTarget(null);
            setActiveProfileUserId(uid);
          }}
        />
      )}

      {activeProfileUserId && (
        <CommunityProfileModal
          userId={activeProfileUserId}
          isOpen={!!activeProfileUserId}
          onClose={() => setActiveProfileUserId(null)}
          onStartDM={(targetUserId) => {
            const partner = targetUserId || activeProfileUserId;
            setActiveProfileUserId(null);
            // Open Messenger Pop-up docked window on the current view!
            setPopupDmPartnerId(partner);
            setIsPopupDmOpen(true);
          }}
        />
      )}

      {isAdmin && (
        <AdminModerationModal
          isOpen={isAdminModerationOpen}
          onClose={() => setIsAdminModerationOpen(false)}
        />
      )}
    </WorkspaceLayout>
  );
};
