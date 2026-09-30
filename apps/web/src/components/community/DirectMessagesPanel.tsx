import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  UserX,
  Lock,
  GraduationCap,
  Sparkles,
  Flag,
} from 'lucide-react';
import { DirectMessage, DirectMessageThread } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { getAuthToken } from '../../lib/api.js';

interface DirectMessagesPanelProps {
  currentUserId: string;
  onOpenReport?: (targetType: 'DirectMessage', targetId: string) => void;
  onSelectUser?: (userId: string) => void;
}

export const DirectMessagesPanel: React.FC<DirectMessagesPanelProps> = ({
  currentUserId,
  onOpenReport,
  onSelectUser,
}) => {
  const [threads, setThreads] = useState<DirectMessageThread[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchThreads = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/messages/threads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { threads: data } = await res.json();
        setThreads(data || []);
        if (!activePartnerId && data && data.length > 0) {
          setActivePartnerId(data[0].partnerId);
        }
      }
    } catch (err) {
      console.error('Failed to load DM threads:', err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const fetchMessages = async (partnerId: string) => {
    setIsLoadingMessages(true);
    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/messages/threads/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { messages: data } = await res.json();
        setMessages(data || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    if (activePartnerId) {
      fetchMessages(activePartnerId);
    }
  }, [activePartnerId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const activeThread = threads.find((t) => t.partnerId === activePartnerId);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageBody.trim() || !activePartnerId || isSending) return;

    setIsSending(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: activePartnerId,
          body: newMessageBody.trim(),
        }),
      });

      if (res.ok) {
        const sentMessage = await res.json();
        setMessages((prev) => [...prev, sentMessage]);
        setNewMessageBody('');
        fetchThreads();
      }
    } catch (err) {
      console.error('Failed to send DM:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!activePartnerId || !activeThread) return;
    const isBlocked = activeThread.isBlocked;
    const action = isBlocked ? 'DELETE' : 'POST';

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/messages/blocks/${activePartnerId}`, {
        method: action,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setThreads((prev) =>
          prev.map((t) =>
            t.partnerId === activePartnerId ? { ...t, isBlocked: !isBlocked } : t
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle block:', err);
    }
  };

  const filteredThreads = threads.filter((t) =>
    t.partner.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col lg:flex-row h-[75vh] min-h-[550px] bg-[#0A0915] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Left Sidebar: Threads List */}
      <div className="w-full lg:w-80 border-r border-white/10 flex flex-col bg-white/[0.01]">
        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Thread items */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5">
          {isLoadingThreads ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12 px-4 text-slate-400 text-xs">
              No conversations yet. Connect with scholars from discussion posts!
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isActive = t.partnerId === activePartnerId;

              return (
                <div
                  key={t.partnerId}
                  onClick={() => setActivePartnerId(t.partnerId)}
                  className={`flex items-center gap-3 p-4 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 border-l-4 border-indigo-500'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <UserAvatar
                    name={t.partner.fullName}
                    photoUrl={t.partner.photoUrl}
                    size="md"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white truncate">
                        {t.partner.fullName}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {t.lastMessage ? new Date(t.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-slate-400 truncate max-w-[160px]">
                        {t.lastMessage?.body || 'Started a conversation'}
                      </p>

                      {t.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0 shadow-sm shadow-indigo-600/50 animate-pulse">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Window */}
      <div className="flex-1 flex flex-col bg-[#080712]">
        {activeThread ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-white/[0.02]">
              <div
                onClick={() => onSelectUser?.(activeThread.partnerId)}
                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <UserAvatar
                  name={activeThread.partner.fullName}
                  photoUrl={activeThread.partner.photoUrl}
                  size="sm"
                />

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">
                      {activeThread.partner.fullName}
                    </span>
                    {activeThread.partner.isFacultyVerified && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <GraduationCap className="w-3 h-3" />
                        Faculty
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-2.5 h-2.5" />
                      {activeThread.partner.reputationPoints || 0}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {activeThread.partner.institution || 'Scholar'}
                  </p>
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleBlock}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    activeThread.isBlocked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <UserX className="w-3.5 h-3.5" />
                  {activeThread.isBlocked ? 'Unblock Scholar' : 'Block'}
                </button>
              </div>
            </div>

            {/* Privacy Guarantee Banner (AC-13 Strict DM Privacy Rule) */}
            <div className="flex items-center gap-2 px-6 py-2 bg-indigo-950/20 border-b border-indigo-500/10 text-[11px] text-indigo-300">
              <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                <strong>Confidential Channel (AC-13):</strong> Direct messages are strictly private between participants. Platform administrators cannot inspect message bodies.
              </span>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 text-xs">
                  This is the start of your direct academic discussion with {activeThread.partner.fullName}.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === currentUserId;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-slate-500">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {!isMine && (
                          <button
                            onClick={() => onOpenReport?.('DirectMessage', m.id)}
                            className="text-slate-600 hover:text-amber-400 p-0.5"
                            title="Report Direct Message"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div
                        className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                          isMine
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-br-none shadow-md shadow-indigo-600/20'
                            : 'bg-[#151428] text-slate-200 rounded-bl-none border border-white/10'
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            {!activeThread.isBlocked && !activeThread.hasBlockedYou ? (
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center gap-3"
              >
                <input
                  type="text"
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  placeholder={`Direct message to ${activeThread.partner.fullName}...`}
                  className="flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />

                <button
                  type="submit"
                  disabled={isSending || !newMessageBody.trim()}
                  className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all hover:scale-105 disabled:opacity-50 disabled:scale-100 shadow-md shadow-indigo-600/30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className="p-4 bg-rose-500/10 border-t border-rose-500/20 text-center text-xs text-rose-300 font-semibold flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                <span>Cannot send messages: Conversation has been blocked.</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-3" />
            <p className="text-sm font-semibold text-slate-300">Select a Scholar</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Connect with fellow researchers, co-authors, and advisors in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
