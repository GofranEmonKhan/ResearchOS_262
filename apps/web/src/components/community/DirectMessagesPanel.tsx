import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  ShieldAlert,
  UserX,
  UserCheck,
  Lock,
  GraduationCap,
  Sparkles,
  Flag,
  UserPlus,
  X,
  User,
  Clock,
  Building,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  File,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Download,
  Eye,
  Check,
  CheckCheck,
  UploadCloud,
} from 'lucide-react';
import { DirectMessage, DirectMessageThread, Profile, UserRole } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { api, getAuthToken } from '../../lib/api.js';
import { supabase } from '../../supabase.js';

interface DirectMessagesPanelProps {
  currentUserId: string;
  onOpenReport?: (targetType: 'DirectMessage', targetId: string) => void;
  onSelectUser?: (userId: string) => void;
  initialPartnerId?: string | null;
}

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl?: string;
  isImage: boolean;
}

interface ParsedAttachment {
  type: 'image' | 'file';
  name: string;
  url: string;
  sizeText?: string;
}

interface ParsedMessageContent {
  text: string;
  attachments: ParsedAttachment[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) {
    return <FileText className="w-5 h-5 text-rose-400 shrink-0" />;
  }
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText className="w-5 h-5 text-blue-400 shrink-0" />;
  }
  if (['xls', 'xlsx', 'csv', 'tsv'].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return <FileArchive className="w-5 h-5 text-amber-400 shrink-0" />;
  }
  if (['py', 'js', 'ts', 'jsx', 'tsx', 'cpp', 'r', 'json', 'sql', 'sh'].includes(ext)) {
    return <FileCode className="w-5 h-5 text-purple-400 shrink-0" />;
  }
  return <File className="w-5 h-5 text-indigo-400 shrink-0" />;
}

function parseMessageContent(body: string): ParsedMessageContent {
  const attachments: ParsedAttachment[] = [];
  let workingText = body;

  // 1. Match markdown images: ![filename](url)
  const imageRegex = /!\[(.*?)\]\((https?:\/\/[^\s)]+)\)/g;
  let match;
  while ((match = imageRegex.exec(body)) !== null) {
    attachments.push({
      type: 'image',
      name: match[1] || 'Image Attachment',
      url: match[2],
    });
  }
  workingText = workingText.replace(imageRegex, '').trim();

  // 2. Match markdown files: [📎 filename (size)](url) or [filename](url)
  const fileRegex = /\[(?:📎\s*)?(.*?)(?:\s*\((.*?)\))?\]\((https?:\/\/[^\s)]+)\)/g;
  while ((match = fileRegex.exec(workingText)) !== null) {
    const name = match[1] || 'Document';
    const sizeText = match[2] || undefined;
    const url = match[3];

    const isImg = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url) || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
    if (isImg) {
      attachments.push({
        type: 'image',
        name,
        url,
      });
    } else {
      attachments.push({
        type: 'file',
        name,
        url,
        sizeText,
      });
    }
  }
  workingText = workingText.replace(fileRegex, '').trim();

  return {
    text: workingText,
    attachments,
  };
}

export const DirectMessagesPanel: React.FC<DirectMessagesPanelProps> = ({
  currentUserId,
  onOpenReport,
  onSelectUser,
  initialPartnerId,
}) => {
  const [threads, setThreads] = useState<DirectMessageThread[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(initialPartnerId || null);
  const [activePartnerProfile, setActivePartnerProfile] = useState<DirectMessageThread['partner'] | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // File Upload State
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewLightboxImage, setPreviewLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Scholar search / New Chat modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [scholarSearchQuery, setScholarSearchQuery] = useState('');
  const [isSearchingScholars, setIsSearchingScholars] = useState(false);
  const [searchedScholars, setSearchedScholars] = useState<Profile[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ─── Fetch Threads ──────────────────────────────────────────────────────────
  const fetchThreads = async () => {
    try {
      const res = await api.listDirectMessageThreads();
      const threadList = res.threads || [];
      setThreads(threadList);

      if (!activePartnerId && threadList.length > 0) {
        setActivePartnerId(threadList[0].partnerId);
      }
    } catch (err) {
      console.error('Failed to load DM threads:', err);
    } finally {
      setIsLoadingThreads(false);
    }
  };

  // ─── Ensure Partner Profile & Thread ───────────────────────────────────────
  const ensurePartnerProfile = async (partnerId: string) => {
    // Check if we already have it in threads
    const existingThread = threads.find((t) => t.partnerId === partnerId);
    if (existingThread) {
      setActivePartnerProfile(existingThread.partner);
      return;
    }

    try {
      const token = await getAuthToken();
      const res = await fetch(`/api/users/${partnerId}/community-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        const partnerInfo: DirectMessageThread['partner'] = {
          id: data.userId || partnerId,
          fullName: data.fullName || 'Scholar',
          photoUrl: data.photoUrl || null,
          role: (data.role as UserRole) || 'Researcher',
          institution: data.institution || '',
          reputationPoints: data.reputationPoints || 0,
          isFacultyVerified: data.isFacultyVerified || false,
        };

        setActivePartnerProfile(partnerInfo);

        // Prepend a provisional thread if not already in thread list
        setThreads((prev) => {
          if (prev.some((t) => t.partnerId === partnerId)) return prev;
          const newThread: DirectMessageThread = {
            partnerId,
            partner: partnerInfo,
            unreadCount: 0,
            lastMessage: null,
            isBlocked: false,
            hasBlockedYou: false,
          };
          return [newThread, ...prev];
        });
      }
    } catch (err) {
      console.error('Failed to fetch partner profile:', err);
    }
  };

  // ─── Fetch Conversation Messages ───────────────────────────────────────────
  const fetchMessages = async (partnerId: string) => {
    setIsLoadingMessages(true);
    try {
      const data = await api.getDirectMessageConversation(partnerId);
      const msgList = Array.isArray(data) ? data : (data as any).messages || [];
      setMessages(msgList);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchThreads();
  }, []);

  // Sync with initialPartnerId if provided externally
  useEffect(() => {
    if (initialPartnerId) {
      setActivePartnerId(initialPartnerId);
      ensurePartnerProfile(initialPartnerId);
    }
  }, [initialPartnerId]);

  // Load conversation whenever active partner changes
  useEffect(() => {
    if (activePartnerId) {
      ensurePartnerProfile(activePartnerId);
      fetchMessages(activePartnerId);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [activePartnerId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAttachments]);

  // ─── Scholar Search for New Conversations ─────────────────────────────────
  useEffect(() => {
    if (!scholarSearchQuery.trim()) {
      setSearchedScholars([]);
      setIsSearchingScholars(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingScholars(true);
      try {
        const results = await api.searchScholars(scholarSearchQuery.trim());
        setSearchedScholars(results.filter((p) => p.id !== currentUserId));
      } catch (err) {
        console.error('Failed to search scholars:', err);
      } finally {
        setIsSearchingScholars(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [scholarSearchQuery, currentUserId]);

  const activeThread = threads.find((t) => t.partnerId === activePartnerId);

  // ─── Start Chat with a Chosen Scholar ──────────────────────────────────────
  const handleStartChatWithScholar = (scholar: Profile) => {
    const partnerInfo: DirectMessageThread['partner'] = {
      id: scholar.id,
      fullName: scholar.fullName,
      photoUrl: scholar.photoUrl,
      role: scholar.role,
      institution: scholar.institution,
      reputationPoints: scholar.reputationPoints ?? 0,
      isFacultyVerified: scholar.role === 'Supervisor',
    };

    setActivePartnerProfile(partnerInfo);
    setActivePartnerId(scholar.id);
    setIsNewChatOpen(false);
    setScholarSearchQuery('');
    setSearchedScholars([]);

    // Prepend to threads if not exists
    setThreads((prev) => {
      if (prev.some((t) => t.partnerId === scholar.id)) return prev;
      const newThread: DirectMessageThread = {
        partnerId: scholar.id,
        partner: partnerInfo,
        unreadCount: 0,
        lastMessage: null,
        isBlocked: false,
        hasBlockedYou: false,
      };
      return [newThread, ...prev];
    });

    setMessages([]);
  };

  // ─── File Attachment Handlers ─────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    addFilesToQueue(Array.from(e.target.files));
    e.target.value = '';
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: PendingAttachment[] = files.map((file) => {
      const isImage = file.type.startsWith('image/');
      const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl,
        isImage,
      };
    });

    setPendingAttachments((prev) => [...prev, ...newItems]);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  // ─── Upload Files to Supabase Storage ─────────────────────────────────────
  const uploadAttachment = async (file: File): Promise<{ name: string; url: string; size: number; isImage: boolean }> => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `direct-messages/${currentUserId}/${Date.now()}_${cleanName}`;

    const { error } = await supabase.storage
      .from('task-submissions')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed for ${file.name}: ${error.message}`);
    }

    // Generate signed URL
    const { data: signedData, error: signedErr } = await supabase.storage
      .from('task-submissions')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year signed URL

    if (signedErr || !signedData?.signedUrl) {
      throw new Error(`Could not generate signed access link for ${file.name}`);
    }

    return {
      name: file.name,
      url: signedData.signedUrl,
      size: file.size,
      isImage: file.type.startsWith('image/'),
    };
  };

  // ─── Send Message (Text & Attachments) ────────────────────────────────────
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMessageBody.trim() && pendingAttachments.length === 0) || !activePartnerId || isSending) return;

    const messageText = newMessageBody.trim();
    const currentAttachments = [...pendingAttachments];

    setNewMessageBody('');
    setPendingAttachments([]);
    setIsSending(true);

    try {
      let finalBody = messageText;

      // 1. Upload any pending attachments
      if (currentAttachments.length > 0) {
        const uploaded = await Promise.all(
          currentAttachments.map((item) => uploadAttachment(item.file))
        );

        const attachmentMarkdownBlocks = uploaded.map((u) => {
          if (u.isImage) {
            return `![${u.name}](${u.url})`;
          }
          return `[📎 ${u.name} (${formatFileSize(u.size)})](${u.url})`;
        });

        if (finalBody) {
          finalBody = `${finalBody}\n\n${attachmentMarkdownBlocks.join('\n\n')}`;
        } else {
          finalBody = attachmentMarkdownBlocks.join('\n\n');
        }
      }

      // 2. Deliver via Express API
      const sentMessage = await api.sendDirectMessage(activePartnerId, finalBody);
      setMessages((prev) => [...prev, sentMessage]);

      // Cleanup object URLs
      currentAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });

      // Refresh threads
      fetchThreads();
    } catch (err: any) {
      console.error('Failed to send DM:', err);
      alert(err.message || 'Failed to deliver direct message');
      setNewMessageBody(messageText);
      setPendingAttachments(currentAttachments);
    } finally {
      setIsSending(false);
    }
  };

  // ─── Drag and Drop Handlers ───────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  // ─── Toggle User Block ─────────────────────────────────────────────────────
  const handleToggleBlock = async () => {
    if (!activePartnerId) return;
    const isBlocked = activeThread?.isBlocked;

    try {
      if (isBlocked) {
        await api.unblockUser(activePartnerId);
      } else {
        await api.blockUser(activePartnerId);
      }

      setThreads((prev) =>
        prev.map((t) =>
          t.partnerId === activePartnerId ? { ...t, isBlocked: !isBlocked } : t
        )
      );
    } catch (err: any) {
      console.error('Failed to toggle block:', err);
      alert(err.message || 'Failed to update user block status');
    }
  };

  // Filter existing threads by sidebar search term
  const filteredThreads = threads.filter((t) =>
    t.partner.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.partner.institution && t.partner.institution.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.lastMessage?.body && t.lastMessage.body.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Active Partner Details
  const partnerName = activeThread?.partner.fullName || activePartnerProfile?.fullName || 'Scholar';
  const partnerPhoto = activeThread?.partner.photoUrl || activePartnerProfile?.photoUrl;
  const partnerRole = activeThread?.partner.role || activePartnerProfile?.role;
  const partnerInstitution = activeThread?.partner.institution || activePartnerProfile?.institution || 'Academic Institution';
  const isFaculty = activeThread?.partner.isFacultyVerified || partnerRole === 'Supervisor' || activePartnerProfile?.isFacultyVerified;
  const reputation = activeThread?.partner.reputationPoints ?? activePartnerProfile?.reputationPoints ?? 0;
  const isBlocked = activeThread?.isBlocked;
  const hasBlockedYou = activeThread?.hasBlockedYou;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col md:flex-row h-[calc(100vh-230px)] min-h-[580px] max-h-[850px] bg-[#0A091A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative"
    >
      {/* ─── DRAG & DROP OVERLAY ───────────────────────────────────────────── */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-violet-950/80 backdrop-blur-md border-2 border-dashed border-violet-400 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
          <div className="w-16 h-16 rounded-3xl bg-violet-600/30 border border-violet-400 flex items-center justify-center mb-3 shadow-xl shadow-violet-600/40">
            <UploadCloud className="w-8 h-8 text-violet-300 animate-bounce" />
          </div>
          <h3 className="text-lg font-bold text-white">Drop files to share in Direct Message</h3>
          <p className="text-xs text-violet-200/80 mt-1 max-w-sm">
            Share research datasets, figures, manuscript drafts, or documents directly with {partnerName}.
          </p>
        </div>
      )}

      {/* ─── LEFT PANEL: Conversations & Scholar Search ────────────────────── */}
      <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/10 flex flex-col bg-[#070617] shrink-0">
        {/* Header & New Chat Trigger */}
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Conversations
            </h3>
            {threads.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                {threads.length}
              </span>
            )}
          </div>

          <button
            onClick={() => setIsNewChatOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all shadow-md shadow-violet-600/30 hover:scale-105"
            title="Start new direct message"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Filter Search Input */}
        <div className="p-3.5 border-b border-white/[0.06] bg-black/20">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Threads List */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04] custom-scrollbar">
          {isLoadingThreads ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading messages...</p>
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                {searchTerm ? 'No matching conversations' : 'No direct messages yet'}
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                {searchTerm
                  ? 'Try searching with another name or start a new chat.'
                  : 'Start a confidential discussion with any peer or advisor across institutions.'}
              </p>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="px-4 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-300 transition-all inline-flex items-center gap-1.5 mt-2"
              >
                <UserPlus className="w-3.5 h-3.5" /> Find Scholars
              </button>
            </div>
          ) : (
            filteredThreads.map((t) => {
              const isActive = t.partnerId === activePartnerId;
              const hasUnread = t.unreadCount > 0;

              return (
                <div
                  key={t.partnerId}
                  onClick={() => {
                    setActivePartnerId(t.partnerId);
                    setActivePartnerProfile(t.partner);
                  }}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-600/20 via-indigo-600/15 to-transparent border-l-4 border-violet-500 shadow-inner'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      name={t.partner.fullName}
                      photoUrl={t.partner.photoUrl}
                      role={t.partner.role}
                      size="md"
                    />
                    {t.partner.isFacultyVerified && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-violet-600 border border-black flex items-center justify-center text-[9px] text-white">
                        <GraduationCap className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                        {t.partner.fullName}
                      </span>
                      <span className="text-[10px] text-slate-500 shrink-0 ml-1">
                        {t.lastMessage
                          ? new Date(t.lastMessage.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-[11px] truncate max-w-[180px] ${
                          hasUnread ? 'text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        {t.lastMessage?.body
                          ? t.lastMessage.body.startsWith('![')
                            ? '📷 Shared an image'
                            : t.lastMessage.body.startsWith('[📎')
                            ? '📎 Shared a file'
                            : t.lastMessage.body
                          : 'New conversation'}
                      </p>

                      {hasUnread && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-violet-600 text-white shrink-0 shadow-md shadow-violet-600/50 animate-pulse">
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

      {/* ─── RIGHT PANEL: Active Direct Message Conversation ─────────────── */}
      <div className="flex-1 flex flex-col bg-[#0B0A1E] min-w-0 min-h-0 relative">
        {activePartnerId ? (
          <>
            {/* Active Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-[#070617] shrink-0">
              <div
                onClick={() => onSelectUser?.(activePartnerId)}
                className="flex items-center gap-3 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    name={partnerName}
                    photoUrl={partnerPhoto}
                    role={partnerRole}
                    size="sm"
                  />
                  {isFaculty && (
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-violet-600 border border-black flex items-center justify-center text-[8px] text-white">
                      <GraduationCap className="w-2 h-2" />
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">
                      {partnerName}
                    </span>
                    {isFaculty && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <GraduationCap className="w-3 h-3" />
                        Supervisor
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      <Sparkles className="w-2.5 h-2.5" />
                      {reputation} Rep
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                    <Building className="w-3 h-3 text-slate-500" />
                    {partnerInstitution}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onSelectUser?.(activePartnerId)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all hidden sm:flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile</span>
                </button>

                <button
                  onClick={handleToggleBlock}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                    isBlocked
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.08]'
                  }`}
                  title={isBlocked ? 'Unblock user' : 'Block user from messaging'}
                >
                  {isBlocked ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                  <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                </button>
              </div>
            </div>

            {/* Privacy Guarantee Notice (AC-13 Strict Confidentiality) */}
            <div className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-violet-950/30 to-indigo-950/20 border-b border-violet-500/20 text-[11px] text-violet-300 shrink-0">
              <Lock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="truncate">
                <strong className="text-white">Confidential Academic Channel:</strong> End-to-end peer discussion with instant file & figure sharing.
              </span>
            </div>

            {/* Messages Chat Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 custom-scrollbar">
              {isLoadingMessages ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
                  <p className="text-xs text-slate-400">Loading conversation history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center max-w-sm mx-auto space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600/20 via-indigo-600/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center shadow-lg shadow-violet-500/10">
                    <MessageSquare className="w-8 h-8 text-violet-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Start the Discussion</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Say hello to <strong>{partnerName}</strong>. You can ask research questions, share figures, PDFs, datasets, or code files.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === currentUserId;
                  const parsed = parseMessageContent(m.body);

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}
                    >
                      {/* Message Meta Info */}
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                          <Clock className="w-2.5 h-2.5 text-slate-500" />
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && (
                          <span title={m.isRead ? 'Seen' : 'Delivered'}>
                            {m.isRead ? (
                              <CheckCheck className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Check className="w-3 h-3 text-slate-400" />
                            )}
                          </span>
                        )}
                        {!isMine && onOpenReport && (
                          <button
                            onClick={() => onOpenReport('DirectMessage', m.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-amber-400 p-0.5"
                            title="Report Direct Message"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Message Bubble Container with Brand Gradient */}
                      <div
                        className={`max-w-md sm:max-w-lg rounded-2xl p-3.5 space-y-2.5 ${
                          isMine
                            ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white rounded-br-sm shadow-xl shadow-violet-600/20 border border-white/10'
                            : 'bg-gradient-to-br from-[#14122B] to-[#0E0C22] text-slate-100 rounded-bl-sm border border-white/10 shadow-md'
                        }`}
                      >
                        {/* Text Content */}
                        {parsed.text && (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-normal break-words">
                            {parsed.text}
                          </p>
                        )}

                        {/* Image Attachments (Messenger Photo Style) */}
                        {parsed.attachments.filter((a) => a.type === 'image').length > 0 && (
                          <div className="space-y-2">
                            {parsed.attachments
                              .filter((a) => a.type === 'image')
                              .map((img, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => setPreviewLightboxImage({ url: img.url, title: img.name })}
                                  className="relative group/img overflow-hidden rounded-xl bg-black/40 border border-white/15 cursor-pointer max-h-72 transition-transform hover:scale-[1.01]"
                                >
                                  <img
                                    src={img.url}
                                    alt={img.name}
                                    className="w-full h-auto max-h-72 object-cover"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <span className="px-2.5 py-1 bg-black/70 text-white text-[11px] font-medium rounded-lg flex items-center gap-1 backdrop-blur-sm border border-white/20">
                                      <Eye className="w-3.5 h-3.5" /> View Fullscreen
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        {/* Document / File Attachments (Messenger File Card Style) */}
                        {parsed.attachments.filter((a) => a.type === 'file').length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            {parsed.attachments
                              .filter((a) => a.type === 'file')
                              .map((file, idx) => (
                                <a
                                  key={idx}
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={file.name}
                                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border transition-all ${
                                    isMine
                                      ? 'bg-black/30 border-white/20 hover:bg-black/40 text-white'
                                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] text-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-white/10 shrink-0">
                                      {getFileIcon(file.name)}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-semibold block truncate max-w-[200px] sm:max-w-[260px]">
                                        {file.name}
                                      </span>
                                      {file.sizeText && (
                                        <span className="text-[10px] text-slate-400 block">
                                          {file.sizeText}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0">
                                    <Download className="w-3.5 h-3.5" />
                                  </div>
                                </a>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ─── PENDING ATTACHMENTS PREVIEW STRIP ──────────────────────── */}
            {pendingAttachments.length > 0 && (
              <div className="px-4 py-2.5 bg-[#080718] border-t border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {pendingAttachments.map((item) => (
                  <div
                    key={item.id}
                    className="relative group flex items-center gap-2 px-3 py-1.5 bg-white/[0.06] border border-white/15 rounded-xl text-xs text-slate-200 shrink-0"
                  >
                    {item.isImage && item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-7 h-7 object-cover rounded-lg border border-white/10 shrink-0"
                      />
                    ) : (
                      getFileIcon(item.file.name)
                    )}

                    <div className="min-w-0 max-w-[140px]">
                      <span className="block truncate font-medium text-[11px] text-white">
                        {item.file.name}
                      </span>
                      <span className="block text-[9px] text-slate-400">
                        {formatFileSize(item.file.size)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removePendingAttachment(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-md hover:bg-white/10 transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ─── MESSAGE COMPOSER BAR ─────────────────────────────────────── */}
            {!isBlocked && !hasBlockedYou ? (
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-white/10 bg-[#070617] flex items-center gap-2 sm:gap-3 shrink-0"
              >
                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.tsv,.zip,.tar,.gz,.txt,.py,.r,.json"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*"
                />

                {/* Attach File Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-white/[0.06] border border-white/10 transition-colors shrink-0"
                  title="Attach documents, datasets, or code files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-white/[0.06] border border-white/10 transition-colors shrink-0 hidden sm:flex items-center justify-center"
                  title="Attach figures or photos"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>

                {/* Text Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessageBody}
                  onChange={(e) => setNewMessageBody(e.target.value)}
                  placeholder={`Write a direct message to ${partnerName}... (Press Enter to send)`}
                  className="flex-1 px-4 py-3 bg-[#0B0A1E] border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={isSending || (!newMessageBody.trim() && pendingAttachments.length === 0)}
                  className="p-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-2xl transition-all hover:scale-105 disabled:hover:scale-100 shadow-lg shadow-violet-600/30 shrink-0"
                  title="Send message"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            ) : (
              <div className="p-4 bg-rose-500/10 border-t border-rose-500/20 text-center text-xs text-rose-300 font-semibold flex items-center justify-center gap-2 shrink-0">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Cannot send message: Communication is currently blocked.</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-600/20 via-indigo-600/20 to-purple-600/20 border border-violet-500/30 flex items-center justify-center mx-auto shadow-xl shadow-violet-600/10">
              <MessageSquare className="w-8 h-8 text-violet-400" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-white">Academic Direct Messaging</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect directly with professors, researchers, and fellow students across institutions with rich file & figure sharing.
              </p>
            </div>
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-violet-600/30 flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Start New Conversation</span>
            </button>
          </div>
        )}
      </div>

      {/* ─── MODAL: Fullscreen Image Lightbox ──────────────────────────────── */}
      {previewLightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#0A091A] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-xs font-bold text-white truncate max-w-md">
                {previewLightboxImage.title}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={previewLightboxImage.url}
                  download={previewLightboxImage.title}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setPreviewLightboxImage(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-2 flex items-center justify-center overflow-auto max-h-[80vh]">
              <img
                src={previewLightboxImage.url}
                alt={previewLightboxImage.title}
                className="max-h-[78vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: New Direct Message / Scholar Search ────────────────────── */}
      {isNewChatOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNewChatOpen(false);
          }}
        >
          <div className="bg-[#0B0A1E] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">Start New Direct Message</h3>
              </div>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-white/10 bg-black/20">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={scholarSearchQuery}
                  onChange={(e) => setScholarSearchQuery(e.target.value)}
                  placeholder="Search by researcher name, institution, or field..."
                  autoFocus
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.04] border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[250px] custom-scrollbar">
              {isSearchingScholars ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                  <p className="text-xs text-slate-400">Searching verified scholars...</p>
                </div>
              ) : scholarSearchQuery.trim().length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs space-y-1">
                  <p className="font-semibold text-slate-400">Search for Scholars</p>
                  <p>Type a name, university (e.g. Stanford, MIT), or field of study.</p>
                </div>
              ) : searchedScholars.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No scholars found matching "{scholarSearchQuery}".
                </div>
              ) : (
                searchedScholars.map((scholar) => (
                  <div
                    key={scholar.id}
                    onClick={() => handleStartChatWithScholar(scholar)}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-violet-500/40 hover:bg-violet-500/10 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        name={scholar.fullName}
                        photoUrl={scholar.photoUrl}
                        role={scholar.role}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">
                            {scholar.fullName}
                          </span>
                          {scholar.role === 'Supervisor' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                              Supervisor
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {scholar.institution || 'Academic Scholar'} · {scholar.department || 'Department'}
                        </p>
                      </div>
                    </div>

                    <button className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-md shadow-violet-600/30 shrink-0 ml-2">
                      Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
