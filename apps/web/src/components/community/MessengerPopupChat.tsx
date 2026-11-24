import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Minus,
  Maximize2,
  Paperclip,
  Image as ImageIcon,
  File,
  FileText,
  FileSpreadsheet,
  FileArchive,
  FileCode,
  Download,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { DirectMessage, DirectMessageThread, Profile, UserRole } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { api, getAuthToken } from '../../lib/api.js';
import { supabase } from '../../supabase.js';

export interface MessengerPopupChatProps {
  currentUserId: string;
  partnerId: string;
  isOpen: boolean;
  onClose: () => void;
  onExpandToFullTab?: (partnerId: string) => void;
  onSelectUser?: (userId: string) => void;
  initialProfile?: Profile | null;
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['pdf'].includes(ext)) {
    return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
  }
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText className="w-4 h-4 text-blue-400 shrink-0" />;
  }
  if (['xls', 'xlsx', 'csv', 'tsv'].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />;
  }
  if (['zip', 'tar', 'gz', 'rar', '7z'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (['py', 'js', 'ts', 'jsx', 'tsx', 'cpp', 'r', 'json', 'sql'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-purple-400 shrink-0" />;
  }
  return <File className="w-4 h-4 text-indigo-400 shrink-0" />;
}

function parseMessageContent(body: string): { text: string; attachments: ParsedAttachment[] } {
  const attachments: ParsedAttachment[] = [];
  let workingText = body;

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

  const fileRegex = /\[(?:📎\s*)?(.*?)(?:\s*\((.*?)\))?\]\((https?:\/\/[^\s)]+)\)/g;
  while ((match = fileRegex.exec(workingText)) !== null) {
    const name = match[1] || 'Document';
    const sizeText = match[2] || undefined;
    const url = match[3];

    const isImg = /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url) || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
    if (isImg) {
      attachments.push({ type: 'image', name, url });
    } else {
      attachments.push({ type: 'file', name, url, sizeText });
    }
  }
  workingText = workingText.replace(fileRegex, '').trim();

  return { text: workingText, attachments };
}

export const MessengerPopupChat: React.FC<MessengerPopupChatProps> = ({
  currentUserId,
  partnerId,
  isOpen,
  onClose,
  onExpandToFullTab,
  onSelectUser,
  initialProfile,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [partner, setPartner] = useState<Profile | DirectMessageThread['partner'] | null>(initialProfile || null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessageBody, setNewMessageBody] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [previewLightboxImage, setPreviewLightboxImage] = useState<{ url: string; title: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch partner profile if not provided
  useEffect(() => {
    if (!partnerId) return;

    const fetchPartner = async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/users/${partnerId}/community-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPartner({
            id: data.userId || partnerId,
            fullName: data.fullName || 'Scholar',
            photoUrl: data.photoUrl || null,
            role: (data.role as UserRole) || 'Researcher',
            institution: data.institution || '',
            reputationPoints: data.reputationPoints || 0,
            isFacultyVerified: data.isFacultyVerified || false,
          });
        }
      } catch (err) {
        console.error('Failed to load partner for popup:', err);
      }
    };

    fetchPartner();
  }, [partnerId]);

  // Fetch conversation messages
  const fetchMessages = async () => {
    if (!partnerId) return;
    setIsLoading(true);
    try {
      const data = await api.getDirectMessageConversation(partnerId);
      const msgList = Array.isArray(data) ? data : (data as any).messages || [];
      setMessages(msgList);
    } catch (err) {
      console.error('Failed to load popup messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && partnerId) {
      fetchMessages();
      setIsMinimized(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, partnerId]);

  // Realtime subscription for incoming and outgoing DMs in this active popup conversation
  useEffect(() => {
    if (!isOpen || !partnerId || !currentUserId) return;

    const channel = supabase
      .channel(`popup-dm-live-${partnerId}-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (
            (newMsg.sender_id === partnerId && newMsg.recipient_id === currentUserId) ||
            (newMsg.sender_id === currentUserId && newMsg.recipient_id === partnerId)
          ) {
            setMessages((prev) => {
              const camelCaseMsg: DirectMessage = {
                id: newMsg.id,
                senderId: newMsg.sender_id,
                recipientId: newMsg.recipient_id,
                body: newMsg.body,
                createdAt: newMsg.created_at,
                isRead: newMsg.is_read,
              };
              if (prev.some((m) => m.id === camelCaseMsg.id)) return prev;
              return [...prev, camelCaseMsg];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, partnerId, currentUserId]);

  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingAttachments, isMinimized]);

  // File selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newItems: PendingAttachment[] = Array.from(e.target.files).map((file) => {
      const isImage = file.type.startsWith('image/');
      return {
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
        isImage,
      };
    });
    setPendingAttachments((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const uploadAttachment = async (file: File) => {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `direct-messages/${currentUserId}/${Date.now()}_${cleanName}`;

    const { error } = await supabase.storage
      .from('task-submissions')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(error.message);

    const { data: signedData } = await supabase.storage
      .from('task-submissions')
      .createSignedUrl(filePath, 60 * 60 * 24 * 365);

    return {
      name: file.name,
      url: signedData?.signedUrl || '',
      size: file.size,
      isImage: file.type.startsWith('image/'),
    };
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!newMessageBody.trim() && pendingAttachments.length === 0) || !partnerId || isSending) return;

    const text = newMessageBody.trim();
    const currentAttachments = [...pendingAttachments];
    setNewMessageBody('');
    setPendingAttachments([]);
    setIsSending(true);

    try {
      let finalBody = text;
      if (currentAttachments.length > 0) {
        const uploaded = await Promise.all(
          currentAttachments.map((item) => uploadAttachment(item.file))
        );
        const markdown = uploaded.map((u) =>
          u.isImage ? `![${u.name}](${u.url})` : `[📎 ${u.name} (${formatFileSize(u.size)})](${u.url})`
        );
        finalBody = finalBody ? `${finalBody}\n\n${markdown.join('\n\n')}` : markdown.join('\n\n');
      }

      const sent = await api.sendDirectMessage(partnerId, finalBody);
      setMessages((prev) => [...prev, sent]);

      currentAttachments.forEach((a) => {
        if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
      });
    } catch (err: any) {
      console.error('Failed to send popup DM:', err);
      alert(err.message || 'Failed to deliver message');
      setNewMessageBody(text);
      setPendingAttachments(currentAttachments);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen || !partnerId) return null;

  const partnerName = partner?.fullName || 'Scholar';
  const partnerPhoto = partner?.photoUrl;
  const isFaculty = (partner as any)?.isFacultyVerified || partner?.role === 'Supervisor';

  return (
    <>
      {/* Minimized Messenger Floating Pill */}
      {isMinimized ? (
        <div
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-5 right-6 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#0C0B1E] border border-violet-500/40 rounded-full shadow-2xl shadow-violet-600/30 cursor-pointer hover:scale-105 transition-all duration-200 group animate-in slide-in-from-bottom-5"
        >
          <div className="relative">
            <UserAvatar name={partnerName} photoUrl={partnerPhoto} size="sm" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0C0B1E] rounded-full" />
          </div>
          <div className="min-w-0 pr-1">
            <span className="text-xs font-bold text-white block truncate max-w-[120px]">
              {partnerName}
            </span>
            <span className="text-[10px] text-violet-300 block">Click to open chat</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Full Messenger Pop-up Docked Window */
        <div className="fixed bottom-4 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[380px] h-[520px] max-h-[85vh] bg-[#0A091A] border border-violet-500/30 rounded-3xl shadow-2xl shadow-violet-950/60 overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-200">
          {/* Top Messenger Header */}
          <div className="p-3.5 border-b border-white/10 bg-[#070617] flex items-center justify-between shrink-0">
            <div
              onClick={() => onSelectUser?.(partnerId)}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="relative shrink-0">
                <UserAvatar name={partnerName} photoUrl={partnerPhoto} size="sm" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#070617] rounded-full" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs font-bold text-white truncate">{partnerName}</span>
                  {isFaculty && (
                    <span className="p-0.5 rounded-full bg-violet-500/20 text-violet-300" title="Supervisor">
                      <GraduationCap className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {partner?.institution || 'Academic Scholar'}
                </p>
              </div>
            </div>

            {/* Header Window Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsMinimized(true)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Minimize chat"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {onExpandToFullTab && (
                <button
                  onClick={() => {
                    onClose();
                    onExpandToFullTab(partnerId);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  title="Expand to full DMs view"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-white/10 transition-colors"
                title="Close chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-[#0B0A1E] custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-12 gap-2">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                <span className="text-[11px] text-slate-400">Loading conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/30 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-violet-400" />
                </div>
                <h4 className="text-xs font-bold text-white">Direct Message</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px]">
                  Say hello to {partnerName}. Share notes, figures, or files.
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
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 space-y-2 text-xs ${
                        isMine
                          ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white rounded-br-sm shadow-md shadow-violet-600/20 border border-white/10'
                          : 'bg-gradient-to-br from-[#14122B] to-[#0E0C22] text-slate-100 rounded-bl-sm border border-white/10 shadow-sm'
                      }`}
                    >
                      {parsed.text && (
                        <p className="leading-relaxed whitespace-pre-wrap font-normal break-words">
                          {parsed.text}
                        </p>
                      )}

                      {/* Attached Images */}
                      {parsed.attachments.filter((a) => a.type === 'image').length > 0 && (
                        <div className="space-y-1.5">
                          {parsed.attachments
                            .filter((a) => a.type === 'image')
                            .map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewLightboxImage({ url: img.url, title: img.name })}
                                className="relative rounded-lg overflow-hidden bg-black/40 border border-white/15 cursor-pointer max-h-48"
                              >
                                <img
                                  src={img.url}
                                  alt={img.name}
                                  className="w-full h-auto max-h-48 object-cover hover:scale-105 transition-transform"
                                />
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Attached Files */}
                      {parsed.attachments.filter((a) => a.type === 'file').length > 0 && (
                        <div className="space-y-1 pt-0.5">
                          {parsed.attachments
                            .filter((a) => a.type === 'file')
                            .map((file, idx) => (
                              <a
                                key={idx}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={file.name}
                                className={`flex items-center justify-between gap-2 p-2 rounded-lg border transition-all ${
                                  isMine
                                    ? 'bg-black/30 border-white/20 hover:bg-black/40 text-white'
                                    : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07] text-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {getFileIcon(file.name)}
                                  <span className="text-[11px] font-semibold truncate max-w-[150px]">
                                    {file.name}
                                  </span>
                                </div>
                                <Download className="w-3 h-3 text-slate-300 shrink-0" />
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

          {/* Pending Attachments Strip */}
          {pendingAttachments.length > 0 && (
            <div className="px-3 py-2 bg-[#080718] border-t border-white/10 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              {pendingAttachments.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.06] border border-white/15 rounded-lg text-[10px] text-slate-200 shrink-0"
                >
                  {item.isImage && item.previewUrl ? (
                    <img src={item.previewUrl} alt="thumb" className="w-5 h-5 object-cover rounded" />
                  ) : (
                    getFileIcon(item.file.name)
                  )}
                  <span className="truncate max-w-[100px]">{item.file.name}</span>
                  <button
                    onClick={() => removePendingAttachment(item.id)}
                    className="p-0.5 text-slate-400 hover:text-rose-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-2.5 border-t border-white/10 bg-[#070617] flex items-center gap-1.5 shrink-0"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.zip,.txt,.py"
            />
            <input
              ref={imageInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-white/[0.06] border border-white/10 transition-colors shrink-0"
              title="Attach files"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="p-2 rounded-xl text-slate-400 hover:text-violet-300 hover:bg-white/[0.06] border border-white/10 transition-colors shrink-0"
              title="Attach photos"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={newMessageBody}
              onChange={(e) => setNewMessageBody(e.target.value)}
              placeholder="Message..."
              className="flex-1 px-3 py-2 bg-[#0B0A1E] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
            />

            <button
              type="submit"
              disabled={isSending || (!newMessageBody.trim() && pendingAttachments.length === 0)}
              className="p-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-xl transition-all hover:scale-105 shadow-md shadow-violet-600/30 shrink-0"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewLightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setPreviewLightboxImage(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-[#0A091A] border border-white/20 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-white/10 flex items-center justify-between bg-black/40">
              <span className="text-xs font-bold text-white truncate max-w-md">
                {previewLightboxImage.title}
              </span>
              <button
                onClick={() => setPreviewLightboxImage(null)}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center">
              <img
                src={previewLightboxImage.url}
                alt={previewLightboxImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
