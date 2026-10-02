import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface HoverSelectOption<T = string> {
  value: T;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface HoverSelectProps<T = string> {
  value: T;
  options: HoverSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
  placement?: 'bottom' | 'top' | 'auto';
  disabled?: boolean;
}

export function HoverSelect<T extends string = string>({
  value,
  options = [],
  onChange,
  placeholder = 'Select option...',
  label,
  icon,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left',
  placement = 'auto',
  disabled = false,
}: HoverSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<'top' | 'bottom'>('bottom');
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Determine top vs bottom placement dynamically
  const updatePlacement = useCallback(() => {
    if (placement === 'top') {
      setResolvedPlacement('top');
      return;
    }
    if (placement === 'bottom') {
      setResolvedPlacement('bottom');
      return;
    }
    // Auto detection
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 280 && spaceAbove > spaceBelow) {
        setResolvedPlacement('top');
      } else {
        setResolvedPlacement('bottom');
      }
    }
  }, [placement]);

  // Clear pending close timeout
  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  // Schedule close with subtle debounce to prevent flicker across boundaries
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, [cancelClose]);

  // Hover handlers for container (covers trigger + popover menu)
  const handleMouseEnter = () => {
    if (disabled) return;
    updatePlacement();
    cancelClose();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    scheduleClose();
  };

  // Click/Tap toggle for touch devices and keyboard interaction
  const handleTriggerClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    updatePlacement();
    setIsOpen((prev) => !prev);
  };

  // Select an option
  const handleSelect = (option: HoverSelectOption<T>) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      cancelClose();
    };
  }, [cancelClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        updatePlacement();
        setIsOpen(true);
        setFocusedIndex(0);
      } else {
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        updatePlacement();
        setIsOpen(true);
        setFocusedIndex(options.length - 1);
      } else {
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && focusedIndex >= 0 && focusedIndex < options.length) {
        handleSelect(options[focusedIndex]);
      } else {
        updatePlacement();
        setIsOpen((prev) => !prev);
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const isTop = resolvedPlacement === 'top';

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      className={`relative inline-block text-left ${isOpen ? 'z-50' : 'z-10'} ${className}`}
    >
      {label && (
        <label className="block text-sm font-medium text-slate-200 mb-1.5">{label}</label>
      )}

      {/* Dropdown Trigger Field */}
      <button
        type="button"
        onClick={handleTriggerClick}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        className={`w-full h-[40px] min-h-[40px] flex items-center justify-between gap-2.5 px-3.5 text-sm rounded-xl border transition-all duration-200 select-none ${
          isOpen
            ? 'bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border-violet-500/60 shadow-[0_0_16px_rgba(139,92,246,0.3)] ring-1 ring-violet-500/40 text-white'
            : 'bg-white/5 hover:bg-white/[0.08] border-white/10 hover:border-violet-500/30 text-slate-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {icon && <span className="text-violet-400 shrink-0">{icon}</span>}
          {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="px-2 py-0.5 text-xs font-semibold bg-violet-500/25 text-violet-200 rounded-md border border-violet-500/40 shadow-sm shrink-0 leading-none inline-flex items-center">
              {selectedOption.badge}
            </span>
          )}
        </div>

        {/* Animated Chevron: smoothly rotates 180deg with subtle neon violet glow */}
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ease-out ${
            isOpen ? 'rotate-180 text-violet-300 drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]' : 'text-slate-400'
          }`}
        />
      </button>

      {/* Popover Options Menu: Elevated Cosmic Surface with Neon Border & Sweep Animation */}
      <div
        role="listbox"
        className={`absolute z-50 min-w-full rounded-2xl popover-neon-surface p-1.5 transition-all duration-200 ease-out transform ${
          isTop ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        } ${
          align === 'right' ? 'right-0' : 'left-0'
        } ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
            : isTop
            ? 'opacity-0 translate-y-1 scale-98 pointer-events-none invisible'
            : 'opacity-0 -translate-y-1 scale-98 pointer-events-none invisible'
        } ${menuClassName ? menuClassName : 'w-max max-w-xs sm:max-w-sm'}`}
      >
        {/* Animated Top/Bottom Neon Shimmer Line */}
        <div className={`absolute left-0 right-0 h-[1.5px] overflow-hidden pointer-events-none ${
          isTop ? 'bottom-0 rounded-b-2xl' : 'top-0 rounded-t-2xl'
        }`}>
          <div className="w-full h-full bg-gradient-to-r from-transparent via-violet-400 to-transparent popover-neon-sweep opacity-90" />
        </div>

        {/* Invisible bridge to prevent cursor gap drop */}
        <div className={`absolute left-0 right-0 h-2 bg-transparent ${isTop ? '-bottom-2' : '-top-2'}`} />

        <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-center text-xs text-slate-400 italic">
              No options available
            </div>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isFocused = index === focusedIndex;

              return (
                <button
                  key={String(option.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs sm:text-sm rounded-xl flex items-center justify-between gap-2.5 transition-all duration-150 ${
                    option.disabled
                      ? 'opacity-40 cursor-not-allowed text-slate-500'
                      : isSelected
                      ? 'bg-gradient-to-r from-violet-600/35 via-indigo-600/25 to-transparent text-white font-semibold border-l-2 border-violet-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                      : isFocused
                      ? 'bg-white/10 text-white translate-x-0.5'
                      : 'text-slate-200 hover:bg-white/[0.08] hover:text-white hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                    {option.icon && <span className="shrink-0">{option.icon}</span>}
                    <span className="truncate">{option.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {option.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-violet-500/20 text-violet-200 rounded border border-violet-500/30 shrink-0">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-violet-300 shrink-0 drop-shadow-[0_0_6px_rgba(167,139,250,0.8)]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
