import React from 'react';
import { Sparkles } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  badgeText?: string;
  badgeColor?: 'purple' | 'cyan' | 'indigo' | 'rose' | 'amber';
  subtitle?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showBadge = true,
  badgeText = 'v1.0',
  badgeColor = 'purple',
  subtitle,
  onClick,
}) => {
  const iconSizeClass = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }[size];

  const sparkleSizeClass = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const textSizeClass = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
  }[size];

  const badgeColorClass = {
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  }[badgeColor];

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 group select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* Brand Icon Orb with Sparkles */}
      <div
        className={`${iconSizeClass} rounded-full bg-gradient-to-tr from-purple-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-[0_0_14px_rgba(139,92,246,0.5)] group-hover:scale-105 transition-transform duration-200 shrink-0`}
      >
        <Sparkles className={`${sparkleSizeClass} text-white animate-pulse-slow`} />
      </div>

      {/* Brand Wordmark & Badges */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-2">
          <span className={`font-bold tracking-tight text-white font-sans ${textSizeClass}`}>
            Research<span className="text-purple-400">OS</span>
          </span>
          {showBadge && (
            <span
              className={`hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${badgeColorClass}`}
            >
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-[11px] text-slate-400 leading-none mt-0.5 truncate max-w-[200px]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
