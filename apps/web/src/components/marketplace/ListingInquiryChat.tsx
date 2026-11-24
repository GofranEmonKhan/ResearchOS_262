import React, { useState } from 'react';
import { MessageSquare, Send, User } from 'lucide-react';
import { ListingInquiry } from '@researchos/shared-types';

interface ListingInquiryChatProps {
  inquiries: ListingInquiry[];
  currentUserId?: string;
  onSendInquiry: (body: string) => Promise<void>;
}

export const ListingInquiryChat: React.FC<ListingInquiryChatProps> = ({
  inquiries,
  currentUserId,
  onSendInquiry,
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await onSendInquiry(message.trim());
      setMessage('');
    } catch (err: any) {
      console.error('Failed to send inquiry:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0D0F14]/90 p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
        <MessageSquare className="w-4 h-4 text-indigo-400" />
        <h4 className="text-sm font-semibold text-slate-100">Contact Provider / Pre-Booking Inquiry</h4>
      </div>

      {/* Messages List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {inquiries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            No inquiries yet. Send a message to ask about software environment, benchmark speeds, or dataset schemas.
          </p>
        ) : (
          inquiries.map((inq) => {
            const isMe = currentUserId && inq.senderId === currentUserId;
            return (
              <div
                key={inq.id}
                className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 flex-shrink-0">
                  {inq.senderAvatarUrl ? (
                    <img
                      src={inq.senderAvatarUrl}
                      alt={inq.senderName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`max-w-[80%] rounded-xl p-3 text-xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {!isMe && (
                    <div className="text-[10px] font-semibold text-indigo-300 mb-1">
                      {inq.senderName || 'Researcher'}
                    </div>
                  )}
                  <p className="leading-relaxed whitespace-pre-wrap">{inq.body}</p>
                  <div
                    className={`mt-1 text-[10px] text-right ${
                      isMe ? 'text-indigo-200' : 'text-slate-500'
                    }`}
                  >
                    {new Date(inq.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message Input */}
      <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-slate-800">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask the provider a question..."
          className="flex-1 px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Send
        </button>
      </form>
    </div>
  );
};
