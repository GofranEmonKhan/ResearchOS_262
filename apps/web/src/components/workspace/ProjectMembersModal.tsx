import React, { useState, useEffect } from 'react';
import { Project, ProjectMember, ProjectRole, ProjectInvite, Profile } from '@researchos/shared-types';
import {
  X,
  UserPlus,
  Users,
  Copy,
  Check,
  Trash2,
  Key,
  Shield,
  GraduationCap,
  Microscope,
  Search,
  Loader2,
  Clock,
  AlertCircle,
  Ban,
  Mail,
  Link2,
  UserCheck,
  Send,
} from 'lucide-react';
import { supabase } from '../../supabase.js';
import { UserAvatar } from '../common/UserAvatar.js';

export interface ProjectMembersModalProps {
  project?: Project | null;
  members: ProjectMember[];
  currentUserId?: string;
  currentUserRole?: string;
  isOpen: boolean;
  onClose: () => void;
  onRefreshMembers: () => Promise<void>;
}

type TabType = 'members' | 'invite-user' | 'invite-links';

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  project,
  members = [],
  currentUserId,
  currentUserRole,
  isOpen,
  onClose,
  onRefreshMembers,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [searchMemberQuery, setSearchMemberQuery] = useState<string>('');

  // Invites State
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState<boolean>(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [inviteRole, setInviteRole] = useState<ProjectRole>('Member');
  const [maxUses, setMaxUses] = useState<number>(10);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);

  // Direct User Invite State
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [directEmail, setDirectEmail] = useState<string>('');
  const [directRole, setDirectRole] = useState<ProjectRole>('Member');
  const [isSendingDirectInvite, setIsSendingDirectInvite] = useState<boolean>(false);
  const [directSuccessMessage, setDirectSuccessMessage] = useState<string | null>(null);
  const [directErrorMessage, setDirectErrorMessage] = useState<string | null>(null);

  // Member Management State
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);

  const isOwner = project?.ownerId === currentUserId;
  const isSupervisor = currentUserRole === 'Supervisor' || isOwner;

  // Fetch invites when tab opens
  useEffect(() => {
    if (isOpen && project && isSupervisor && activeTab === 'invite-links') {
      fetchInvites();
    }
  }, [isOpen, project?.id, activeTab, isSupervisor]);

  // Debounced User Search
  useEffect(() => {
    if (!userSearchQuery.trim() || userSearchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUsers(true);
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const res = await fetch(`/profiles/search?q=${encodeURIComponent(userSearchQuery.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: Profile[] = await res.json();
          // Filter out users who are already members
          const existingUserIds = new Set(members.map((m) => m.userId));
          setSearchResults(data.filter((u) => !existingUserIds.has(u.id)));
        }
      } catch (err) {
        console.error('Error searching profiles:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, members]);

  if (!isOpen || !project) return null;

  const fetchInvites = async () => {
    setIsLoadingInvites(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setInvites(data);
      }
    } catch (err) {
      console.error('Error loading project invites:', err);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          inviteType: 'Code',
          invitedRole: inviteRole,
          maxUses: maxUses === -1 ? 9999 : maxUses,
          expiresInDays: expiresInDays === -1 ? -1 : expiresInDays,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setInviteCode(data.code);
        fetchInvites();
      }
    } catch (err) {
      console.error('Error generating invite code:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/invites/${inviteId}/revoke`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        fetchInvites();
      }
    } catch (err) {
      console.error('Error revoking invite:', err);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDirectAddMember = async () => {
    if (!selectedUser && !directEmail.trim()) return;

    setIsSendingDirectInvite(true);
    setDirectSuccessMessage(null);
    setDirectErrorMessage(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      if (selectedUser) {
        // Direct addition to project_members
        const res = await fetch(`/projects/${project.id}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: selectedUser.id,
            projectRole: directRole,
          }),
        });

        if (res.ok) {
          setDirectSuccessMessage(`Added ${selectedUser.fullName} as ${directRole === 'CoSupervisor' ? 'Co-Supervisor / Reviewer' : 'Researcher Member'}.`);
          setSelectedUser(null);
          setUserSearchQuery('');
          await onRefreshMembers();
        } else {
          const err = await res.json();
          setDirectErrorMessage(err.error || 'Failed to add project member.');
        }
      } else {
        // Email invitation
        const res = await fetch(`/projects/${project.id}/invites`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            inviteType: 'Email',
            invitedEmail: directEmail.trim(),
            invitedRole: directRole,
            maxUses: 1,
            expiresInDays: 14,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setDirectSuccessMessage(`Invitation created for ${directEmail} (Invite Code: ${data.code || 'Sent'}).`);
          setDirectEmail('');
        } else {
          const err = await res.json();
          setDirectErrorMessage(err.error || 'Failed to send invitation.');
        }
      }
    } catch (err: any) {
      setDirectErrorMessage(err.message || 'Error executing invitation.');
    } finally {
      setIsSendingDirectInvite(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: ProjectRole) => {
    setUpdatingRoleId(userId);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/members/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectRole: newRole }),
      });

      if (res.ok) {
        await onRefreshMembers();
      }
    } catch (err) {
      console.error('Error changing member role:', err);
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const handleRemoveMember = async (userId: string, memberName?: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName || 'this member'} from the research workspace?`)) return;

    setIsRemovingId(userId);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const res = await fetch(`/projects/${project.id}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await onRefreshMembers();
      }
    } catch (err) {
      console.error('Error removing member:', err);
    } finally {
      setIsRemovingId(null);
    }
  };

  const filteredMembers = members.filter((m) => {
    const q = searchMemberQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.user?.fullName?.toLowerCase().includes(q) ||
      m.user?.department?.toLowerCase().includes(q) ||
      m.user?.institution?.toLowerCase().includes(q) ||
      m.projectRole.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0D0C18] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/90 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Project Team & Collaborators</h3>
              <p className="text-xs text-slate-400 truncate max-w-md">{project.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-white/5 bg-white/[0.01]">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
              activeTab === 'members'
                ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Active Team ({members.length})</span>
          </button>

          {isSupervisor && !project.isPersonal && (
            <>
              <button
                onClick={() => setActiveTab('invite-user')}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
                  activeTab === 'invite-user'
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Academic</span>
              </button>

              <button
                onClick={() => setActiveTab('invite-links')}
                className={`py-3.5 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 transition-all ${
                  activeTab === 'invite-links'
                    ? 'border-violet-500 text-violet-400 bg-violet-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Join Codes & Links</span>
              </button>
            </>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: TEAM MEMBERS LIST */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Search filter */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search team members by name, role, or institution..."
                  value={searchMemberQuery}
                  onChange={(e) => setSearchMemberQuery(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Members List */}
              <div className="divide-y divide-white/5 space-y-1">
                {filteredMembers.map((m) => {
                  const isMemberOwner = m.userId === project.ownerId;
                  const isCurrentUser = m.userId === currentUserId;

                  return (
                    <div
                      key={m.id}
                      className="py-3.5 flex items-center justify-between group hover:bg-white/[0.02] px-3 rounded-2xl transition-all"
                    >
                      <div className="flex items-center space-x-3.5 min-w-0">
                        <UserAvatar
                          photoUrl={m.user?.photoUrl}
                          name={m.user?.fullName}
                          role={m.user?.role}
                          size="md"
                          className="shrink-0"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white truncate">
                              {m.user?.fullName || 'Academic Collaborator'}
                            </span>
                            {isCurrentUser && (
                              <span className="text-[10px] text-slate-500 font-medium">(You)</span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">
                            {m.user?.department || m.user?.institution || 'Research Contributor'}
                          </p>
                        </div>
                      </div>

                      {/* Right: Role Badge & Actions */}
                      <div className="flex items-center space-x-3 shrink-0">
                        {isMemberOwner ? (
                          <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-[11px] font-bold">
                            <Shield className="w-3.5 h-3.5 text-violet-400" />
                            <span>Principal Investigator (Owner)</span>
                          </div>
                        ) : isOwner ? (
                          /* Role Switcher for Project Owner */
                          <div className="flex items-center space-x-2">
                            <select
                              value={m.projectRole}
                              disabled={updatingRoleId === m.userId}
                              onChange={(e) => handleRoleChange(m.userId, e.target.value as ProjectRole)}
                              className="bg-black/60 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500 font-medium"
                            >
                              <option value="Member">Researcher Member</option>
                              <option value="CoSupervisor">Co-Supervisor / Reviewer</option>
                            </select>

                            <button
                              onClick={() => handleRemoveMember(m.userId, m.user?.fullName)}
                              disabled={isRemovingId === m.userId}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                              title="Remove member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          /* Readonly Role Badge */
                          <div
                            className={`px-3 py-1 rounded-xl text-[11px] font-semibold border flex items-center space-x-1.5 ${
                              m.projectRole === 'CoSupervisor'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                                : 'bg-white/5 border-white/10 text-slate-300'
                            }`}
                          >
                            {m.projectRole === 'CoSupervisor' ? (
                              <>
                                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Co-Supervisor / Reviewer</span>
                              </>
                            ) : (
                              <>
                                <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Researcher</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No collaborators found matching your search.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DIRECT INVITATION */}
          {activeTab === 'invite-user' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-xs text-violet-300 flex items-start space-x-3">
                <AlertCircle className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                <span>
                  Invite registered faculty, postdocs, and students to this research workspace. Assign appropriate governance roles based on responsibilities.
                </span>
              </div>

              {/* Feedback messages */}
              {directSuccessMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>{directSuccessMessage}</span>
                </div>
              )}
              {directErrorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>{directErrorMessage}</span>
                </div>
              )}

              {/* User Search / Autocomplete */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Search Registered Academic
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Type name to search registered researchers or supervisors..."
                    value={userSearchQuery}
                    onChange={(e) => {
                      setUserSearchQuery(e.target.value);
                      setSelectedUser(null);
                    }}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                  {isSearchingUsers && (
                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {searchResults.length > 0 && !selectedUser && (
                  <div className="bg-[#141224] border border-white/10 rounded-2xl p-1.5 max-h-48 overflow-y-auto space-y-1 shadow-2xl">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserSearchQuery(u.fullName);
                          setSearchResults([]);
                        }}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-white/10 flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center space-x-3">
                          <UserAvatar photoUrl={u.photoUrl} name={u.fullName} role={u.role} size="sm" />
                          <div>
                            <p className="text-xs font-semibold text-white group-hover:text-violet-300">
                              {u.fullName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {u.department || u.institution} · {u.role}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-violet-400 font-semibold px-2 py-0.5 rounded bg-violet-500/10">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected User Badge */}
              {selectedUser && (
                <div className="p-3 rounded-2xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserAvatar photoUrl={selectedUser.photoUrl} name={selectedUser.fullName} role={selectedUser.role} size="sm" />
                    <div>
                      <p className="text-xs font-bold text-white">{selectedUser.fullName}</p>
                      <p className="text-[10px] text-slate-400">{selectedUser.institution} · {selectedUser.role}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearchQuery('');
                    }}
                    className="text-xs text-slate-400 hover:text-white p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Or Invite by Email */}
              {!selectedUser && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Or Invite by Academic Email</span>
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. colleague@university.edu"
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Target Project Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDirectRole('Member')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      directRole === 'Member'
                        ? 'border-violet-500 bg-violet-600/20 text-white shadow-lg shadow-violet-600/20'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <Microscope className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-bold">Researcher (Member)</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Executes tasks, submits deliverables for review, and proposes milestones.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDirectRole('CoSupervisor')}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      directRole === 'CoSupervisor'
                        ? 'border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-600/20'
                        : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <GraduationCap className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs font-bold">Co-Supervisor / Reviewer</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Conducts internal reviews, evaluates task submissions, and co-supervises.
                    </p>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleDirectAddMember}
                disabled={isSendingDirectInvite || (!selectedUser && !directEmail.trim())}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center space-x-2"
              >
                {isSendingDirectInvite ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {selectedUser ? `Add ${selectedUser.fullName} to Workspace` : 'Send Invitation'}
                </span>
              </button>
            </div>
          )}

          {/* TAB 3: SHAREABLE INVITE LINKS & CODES */}
          {activeTab === 'invite-links' && (
            <div className="space-y-6">
              {/* Link Generator Card */}
              <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-violet-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Generate Shareable Join Code
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Join Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as ProjectRole)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="Member">Researcher (Member)</option>
                      <option value="CoSupervisor">Co-Supervisor / Reviewer</option>
                    </select>
                  </div>

                  {/* Usage Limit */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Max Uses</label>
                    <select
                      value={maxUses}
                      onChange={(e) => setMaxUses(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value={1}>Single-use (1 member)</option>
                      <option value={5}>Small Group (5 members)</option>
                      <option value={10}>Standard (10 members)</option>
                      <option value={50}>Lab Cohort (50 members)</option>
                      <option value={-1}>Unlimited</option>
                    </select>
                  </div>

                  {/* Expiration */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-400">Expiration</label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value={1}>24 Hours</option>
                      <option value={7}>7 Days (Default)</option>
                      <option value={30}>30 Days</option>
                      <option value={-1}>Never Expire</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateInvite}
                  disabled={isGenerating}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-md shadow-violet-600/20 transition-all flex items-center justify-center space-x-1.5"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Generate New Join Code</span>
                </button>

                {/* Newly Generated Code Display */}
                {inviteCode && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-black to-indigo-950/40 border border-violet-500/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">
                        New Join Code ({inviteRole === 'CoSupervisor' ? 'Co-Supervisor' : 'Researcher'})
                      </span>
                      <span className="font-mono font-bold text-violet-300 text-sm tracking-widest">
                        {inviteCode}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(inviteCode)}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow transition-all flex items-center space-x-1.5"
                    >
                      {copiedCode === inviteCode ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === inviteCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Existing Active Invites Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Active Workspace Invites ({invites.filter((i) => i.status === 'Pending').length})</span>
                </h4>

                {isLoadingInvites ? (
                  <div className="py-8 flex items-center justify-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                  </div>
                ) : invites.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-white/5 text-center text-xs text-slate-500">
                    No active invite codes. Generate one above to invite collaborators.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
                    {invites.map((inv) => {
                      const isExpired = inv.expiresAt && new Date(inv.expiresAt) < new Date();
                      const isRevoked = inv.status === 'Revoked';

                      return (
                        <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-white">{inv.code || 'Email Invite'}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  inv.invitedRole === 'CoSupervisor'
                                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {inv.invitedRole === 'CoSupervisor' ? 'Co-Supervisor' : 'Researcher'}
                              </span>
                              {isRevoked ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                                  Revoked
                                </span>
                              ) : isExpired ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                                  Expired
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                              Uses: {inv.usesCount} / {inv.maxUses || '∞'} ·{' '}
                              {inv.expiresAt ? `Expires ${new Date(inv.expiresAt).toLocaleDateString()}` : 'No expiration'}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            {inv.code && !isRevoked && !isExpired && (
                              <button
                                onClick={() => handleCopy(inv.code!)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
                                title="Copy Code"
                              >
                                {copiedCode === inv.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}

                            {!isRevoked && (
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                title="Revoke invite"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
