import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, FolderPlus, ArrowRight, X } from 'lucide-react';

export type NoticeModalType = 'info' | 'warning' | 'error' | 'success' | 'project-required';

interface NoticeModalProps {
  isOpen: boolean;
  type?: NoticeModalType;
  title: string;
  message: string;
  primaryActionText?: string;
  secondaryActionText?: string;
  onPrimaryAction?: () => void;
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  type = 'info',
  title,
  message,
  primaryActionText = 'Acknowledge',
  secondaryActionText,
  onPrimaryAction,
  onClose,
}) => {
  if (!isOpen) return null;

  const getTypeConfig = () => {
    switch (type) {
      case 'project-required':
        return {
          icon: FolderPlus,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/15 border-amber-500/30',
          borderColor: 'border-amber-500/30',
          glowBg: 'bg-amber-600/10',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
          iconBg: 'bg-amber-500/15 border-amber-500/30',
          borderColor: 'border-amber-500/30',
          glowBg: 'bg-amber-600/10',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/25',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-rose-400',
          iconBg: 'bg-rose-500/15 border-rose-500/30',
          borderColor: 'border-rose-500/30',
          glowBg: 'bg-rose-600/10',
          btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25',
        };
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-emerald-400',
          iconBg: 'bg-emerald-500/15 border-emerald-500/30',
          borderColor: 'border-emerald-500/30',
          glowBg: 'bg-emerald-600/10',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/25',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: 'text-blue-400',
          iconBg: 'bg-blue-500/15 border-blue-500/30',
          borderColor: 'border-blue-500/30',
          glowBg: 'bg-blue-600/10',
          btnBg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/25',
        };
    }
  };

  const config = getTypeConfig();
  const IconComponent = config.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className={`relative w-full max-w-md bg-[#0D0C1B] border ${config.borderColor} rounded-2xl shadow-2xl p-6 space-y-4 overflow-hidden animate-in zoom-in-95 duration-150`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background */}
        <div className={`absolute top-0 right-0 w-36 h-36 ${config.glowBg} rounded-full blur-3xl pointer-events-none`} />

        {/* Header with Icon */}
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl ${config.iconBg} border ${config.iconColor} shrink-0`}>
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            <p className="text-sm text-slate-200 mt-1.5 leading-relaxed">{message}</p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
          {secondaryActionText && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-colors"
            >
              {secondaryActionText}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (onPrimaryAction) {
                onPrimaryAction();
              } else {
                onClose();
              }
            }}
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-lg transition-all ${config.btnBg}`}
          >
            <span>{primaryActionText}</span>
            {type === 'project-required' && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
