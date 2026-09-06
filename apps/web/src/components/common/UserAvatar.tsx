import React, { useState, useEffect } from 'react';

export interface UserAvatarProps {
  photoUrl?: string | null;
  name?: string;
  role?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  photoUrl,
  name = 'User',
  role,
  size = 'md',
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset imgError when photoUrl changes
  useEffect(() => {
    setImgError(false);
  }, [photoUrl]);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-24 h-24 text-2xl',
  }[size];

  const getGradientByRole = () => {
    if (role === 'Admin') return 'from-rose-600 to-pink-600 shadow-rose-600/30';
    if (role === 'Supervisor') return 'from-violet-600 to-indigo-600 shadow-violet-600/30';
    return 'from-indigo-600 to-cyan-600 shadow-indigo-600/30';
  };

  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();
  const hasValidPhoto = Boolean(photoUrl && photoUrl.trim().length > 0 && !imgError);

  return (
    <div
      className={`relative rounded-full flex items-center justify-center font-bold text-white shrink-0 overflow-hidden select-none border border-white/20 shadow-md ${sizeClasses} ${
        !hasValidPhoto ? `bg-gradient-to-tr ${getGradientByRole()}` : 'bg-slate-800'
      } ${className}`}
    >
      {hasValidPhoto ? (
        <img
          src={photoUrl!}
          alt={name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};
