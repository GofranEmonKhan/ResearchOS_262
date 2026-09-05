import React, { useState, useEffect, useRef } from 'react';
import { ProjectMessage, Project } from '@researchos/shared-types';
import { X, Send, MessagesSquare } from 'lucide-react';
import { supabase } from '../../supabase.js';
import { UserAvatar } from '../common/UserAvatar.js';

export interface ProjectChatDrawerProps {
  project: Project | null;
  currentUserId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectChatDrawer: React.FC<ProjectChatDrawerProps> = ({
  project,
  currentUserId,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!project) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      }
    } catch (err) {
      console.error('Error fetching project messages:', err);
    }
  };

  useEffect(() => {
    if (isOpen && project) {
      fetchMessages();

      // Realtime subscription for incoming messages
      const channel = supabase
        .channel(`project-chat-${project.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'project_messages',
            filter: `project_id=eq.${project.id}`,
          },
          (payload: { new: any }) => {
            const newMsg = payload.new as ProjectMessage;
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            setTimeout(scrollToBottom, 50);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const body = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body }),
      });

      if (res.ok) {
        const sentMessage = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 sm:w-96 bg-[#0A0914]/95 backdrop-blur-2xl border-l border-white/10 z-50 flex flex-col shadow-2xl shadow-black/90 animate-in slide-in-from-right duration-300">
      {/* Drawer Header */}
      <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
            <MessagesSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white truncate max-w-[190px]">
              {project.title} Chat
            </h3>
            <p className="text-[10px] text-emerald-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Realtime Channel</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <MessagesSquare className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
            <p className="text-xs text-slate-400 font-medium">No messages yet</p>
            <p className="text-[11px] text-slate-600">Start the discussion with your team.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderId === currentUserId;

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div className={`flex items-center space-x-1.5 text-[10px] text-slate-500 px-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <UserAvatar
                    photoUrl={m.sender?.photoUrl}
                    name={m.sender?.fullName}
                    role={m.sender?.role}
                    size="xs"
                  />
                  <span className="font-medium text-slate-400">{isMe ? 'You' : m.sender?.fullName || 'Member'}</span>
                  <span>•</span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-violet-600/20'
                      : 'bg-white/[0.05] border border-white/10 text-slate-200 rounded-bl-none'
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

      {/* Message Composer */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-white/[0.02]">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message to project members..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white transition-all shadow-md shadow-violet-600/30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
