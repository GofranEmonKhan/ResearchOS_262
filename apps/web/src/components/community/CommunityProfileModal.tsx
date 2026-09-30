import React, { useState, useEffect } from 'react';
import {
  X,
  BadgeCheck,
  Building2,
  Sparkles,
  Send,
  Trophy,
  CheckCircle2,
  Flame,
  ShieldCheck,
  HelpCircle,
  Award,
  Copy,
  Check,
  BookOpen,
  GraduationCap,
  UserCheck,
  Shield,
  Zap,
} from 'lucide-react';
import { CommunityProfile } from '@researchos/shared-types';
import { UserAvatar } from '../common/UserAvatar.js';
import { getAuthToken } from '../../lib/api.js';

interface CommunityProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onStartDM?: (userId: string) => void;
  initialProfile?: CommunityProfile | null;
}

export const CommunityProfileModal: React.FC<CommunityProfileModalProps> = ({
  userId,
  isOpen,
  onClose,
  onStartDM,
  initialProfile,
}) => {
  const [profile, setProfile] = useState<CommunityProfile | null>(initialProfile || null);
  const [isLoading, setIsLoading] = useState(!initialProfile);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const token = await getAuthToken();
        const res = await fetch(`/api/users/${userId}/community-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to load community profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const getReputationRank = (pts: number) => {
    if (pts >= 1000) return { title: 'Grandmaster Scholar', color: 'text-amber-300', bg: 'bg-amber-500/15', border: 'border-amber-500/30' };
    if (pts >= 500) return { title: 'Lead Investigator', color: 'text-violet-300', bg: 'bg-violet-500/15', border: 'border-violet-500/30' };
    if (pts >= 200) return { title: 'Senior Researcher', color: 'text-indigo-300', bg: 'bg-indigo-500/15', border: 'border-indigo-500/30' };
    if (pts >= 50) return { title: 'Active Scholar', color: 'text-blue-300', bg: 'bg-blue-500/15', border: 'border-blue-500/30' };
    return { title: 'Junior Researcher', color: 'text-slate-300', bg: 'bg-slate-500/15', border: 'border-slate-500/30' };
  };

  /**
   * Premium Facebook Community Style Badge Configuration
   * Maps badge criteria to Facebook-inspired pill styles, icons, and gradients.
   */
  const getFacebookStyleBadge = (criteriaOrName: string) => {
    const key = criteriaOrName.toLowerCase();

    if (key.includes('accepted') || key.includes('authority') || key.includes('star')) {
      return {
        icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" />,
        containerClass: 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 border-amber-500/30 text-amber-200 hover:border-amber-400/60 shadow-amber-500/5',
        iconBg: 'bg-amber-500/20 text-amber-300',
        category: 'Top Contributor',
      };
    }
    if (key.includes('five') || key.includes('leader')) {
      return {
        icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
        containerClass: 'bg-gradient-to-r from-orange-500/15 to-rose-500/10 border-orange-500/30 text-orange-200 hover:border-orange-400/60 shadow-orange-500/5',
        iconBg: 'bg-orange-500/20 text-orange-300',
        category: 'Discussion Leader',
      };
    }
    if (key.includes('answer') || key.includes('solver') || key.includes('helper')) {
      return {
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        containerClass: 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/30 text-emerald-200 hover:border-emerald-400/60 shadow-emerald-500/5',
        iconBg: 'bg-emerald-500/20 text-emerald-300',
        category: 'Problem Solver',
      };
    }
    if (key.includes('verified') || key.includes('seal') || key.includes('expert')) {
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-violet-300" />,
        containerClass: 'bg-gradient-to-r from-violet-500/15 to-purple-500/10 border-violet-500/30 text-violet-200 hover:border-violet-400/60 shadow-violet-500/5',
        iconBg: 'bg-violet-500/20 text-violet-300',
        category: 'Group Expert',
      };
    }
    if (key.includes('pillar') || key.includes('100') || key.includes('reputation')) {
      return {
        icon: <Trophy className="w-3.5 h-3.5 text-indigo-300" />,
        containerClass: 'bg-gradient-to-r from-indigo-500/15 to-purple-500/10 border-indigo-500/30 text-indigo-200 hover:border-indigo-400/60 shadow-indigo-500/5',
        iconBg: 'bg-indigo-500/20 text-indigo-300',
        category: 'Community Pillar',
      };
    }
    if (key.includes('question') || key.includes('curious')) {
      return {
        icon: <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />,
        containerClass: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/10 border-cyan-500/30 text-cyan-200 hover:border-cyan-400/60 shadow-cyan-500/5',
        iconBg: 'bg-cyan-500/20 text-cyan-300',
        category: 'Conversation Starter',
      };
    }
    return {
      icon: <Award className="w-3.5 h-3.5 text-indigo-300" />,
      containerClass: 'bg-gradient-to-r from-indigo-500/15 to-slate-800/20 border-indigo-500/30 text-indigo-200 hover:border-indigo-400/60',
      iconBg: 'bg-indigo-500/20 text-indigo-300',
      category: 'Merit Badge',
    };
  };

  const handleCopyProfile = () => {
    const url = `${window.location.origin}/community?profile=${profile?.userId || userId}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const rank = getReputationRank(profile?.reputationPoints || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-[#0B0A16] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Floating Controls */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-20">
          <button
            onClick={handleCopyProfile}
            title="Copy Profile Link"
            className="p-2 bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white rounded-xl border border-white/15 backdrop-blur-md transition-all shadow-sm"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            title="Close Profile"
            className="p-2 bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white rounded-xl border border-white/15 backdrop-blur-md transition-all shadow-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body Container (Includes banner so avatar -mt-14 never gets clipped by scroll boundary) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Sleek Top Cover Banner */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-slate-950 via-indigo-950/60 to-purple-950/40 relative border-b border-white/10 overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:20px_20px] opacity-15 pointer-events-none" />
          </div>

          <div className="px-6 pb-6 pt-0 space-y-5">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <div className="w-9 h-9 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Loading researcher profile...</span>
              </div>
            ) : profile ? (
              <>
                {/* HEADER ROW: Large Avatar + Direct Message Action */}
                <div className="flex items-end justify-between -mt-14 sm:-mt-16 mb-2">
                  {/* Bigger & Highly Visible Avatar Circle */}
                  <div className="relative shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-[#0B0A16] shadow-2xl bg-[#141226] overflow-hidden flex items-center justify-center border-2 border-white/30">
                      <UserAvatar
                        name={profile.fullName}
                        photoUrl={profile.photoUrl}
                        size="2xl"
                        className="!w-full !h-full text-3xl font-bold"
                      />
                    </div>
                    {/* Active Online Status Badge */}
                    <span
                      className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-3 border-[#0B0A16] rounded-full shadow-md z-10"
                      title="Active Researcher"
                    />
                  </div>

                {/* Direct Message Button - Gorgeous Electric Sunset Nebula gradient with luxury shine hover & micro-interaction */}
                {onStartDM && (
                  <button
                    onClick={() => {
                      onClose();
                      onStartDM(profile.userId);
                    }}
                    className="relative group overflow-hidden inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400 hover:from-violet-500 hover:via-fuchsia-400 hover:to-amber-300 border border-white/25 hover:border-white/50 shadow-lg shadow-fuchsia-500/25 hover:shadow-xl hover:shadow-fuchsia-500/40 transition-all duration-300 hover:scale-[1.03] active:scale-95 shrink-0"
                  >
                    {/* Ambient light sheen sweep animation on hover */}
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/0 via-white/30 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />

                    <Send className="w-3.5 h-3.5 text-amber-100 group-hover:text-white transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span className="tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Direct Message</span>
                  </button>
                )}
              </div>

              {/* RESEARCHER IDENTITY & ACADEMIC STATURE */}
              <div className="space-y-2">
                {/* Full Name & Faculty Verified Badge */}
                <div className="flex items-center flex-wrap gap-2">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {profile.fullName}
                  </h2>

                  {/* Facebook / Twitter style Faculty Verified Badge */}
                  {profile.isFacultyVerified && (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-sm"
                      title="Verified Faculty Supervisor"
                    >
                      <BadgeCheck className="w-4 h-4 text-blue-400 fill-blue-400/20" />
                      Faculty Verified
                    </span>
                  )}

                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-slate-300 border border-white/10">
                    {profile.role === 'Supervisor' ? 'Faculty Supervisor' : 'Researcher'}
                  </span>
                </div>

                {/* Institutional Affiliation & Department */}
                <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 font-medium">
                  <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-slate-100 font-semibold">
                    {profile.institution || 'Stanford University'}
                  </span>
                  {profile.department && (
                    <span className="text-slate-400 font-normal">• {profile.department}</span>
                  )}
                </p>
              </div>

              {/* RESEARCH BIO & TOPIC FOCUS */}
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-2xl space-y-3">
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                  {profile.bio ||
                    'Active academic researcher contributing to peer-reviewed inquiries, experimental protocols, and computational research methodologies.'}
                </p>

                {/* Research Focus Field Tags */}
                {profile.researchFieldTags && profile.researchFieldTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-white/5">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Focus Areas:
                    </span>
                    {profile.researchFieldTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* PREMIUM FACEBOOK COMMUNITY STYLE BADGES */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Award className="w-4 h-4 text-indigo-400" />
                    Community Badges & Honors ({profile.badges?.length || 0})
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Peer verified badges
                  </span>
                </div>

                {profile.badges && profile.badges.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {profile.badges.map((ub) => {
                      const badgeStyle = getFacebookStyleBadge(ub.badge?.criteria || ub.badge?.name || '');
                      return (
                        <div
                          key={ub.badgeId}
                          title={ub.badge?.description || 'Earned through research contribution'}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-default shadow-sm ${badgeStyle.containerClass}`}
                        >
                          {/* Circular Badge Emblem Icon */}
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-inner ${badgeStyle.iconBg}`}
                          >
                            {badgeStyle.icon}
                          </div>

                          <div className="min-w-0">
                            <span className="block text-xs font-bold leading-snug truncate">
                              {ub.badge?.name || 'Academic Merit'}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {badgeStyle.category}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl text-center text-xs text-slate-500">
                    No community badges earned yet. Participate in research discussions to unlock badges.
                  </div>
                )}
              </div>

              {/* ACADEMIC CREDENTIALS & RESEARCH DETAILS SECTION */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    Academic Credentials & Info
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-xs font-bold text-white">{profile.reputationPoints}</span>
                    <span className="text-xs text-slate-400">Rep</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rank.bg} ${rank.color} border ${rank.border}`}>
                      {rank.title}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl divide-y divide-white/5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3.5">
                    <div className="flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Primary Institution</span>
                        <span className="font-semibold text-slate-100 text-xs">
                          {profile.institution || 'Stanford University'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Department / Laboratory</span>
                        <span className="font-semibold text-slate-100 text-xs">
                          {profile.department || 'Computer Science / EECS'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5">
                    <div className="flex items-start gap-2.5">
                      <UserCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Account Status & Role</span>
                        <span className="font-semibold text-slate-100 text-xs">
                          {profile.status} • {profile.role}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-[11px] text-slate-500 block">Faculty Endorsement</span>
                        <span className="font-semibold text-slate-100 text-xs">
                          {profile.isFacultyVerified ? 'Verified Principal Supervisor' : 'Standard Researcher'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-400">Profile not found.</div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
