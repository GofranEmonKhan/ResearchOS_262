import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  UserX, 
  CheckCircle2, 
  Building2, 
  FolderKanban, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Loader2
} from 'lucide-react';
import { AdminUserListItem, UserRole, UserStatus } from '@researchos/shared-types';
import { api } from '../../lib/api.js';
import { UserAvatar } from '../common/UserAvatar.js';
import { HoverSelect } from '../common/HoverSelect.js';
import { UserDetailModal } from './UserDetailModal.js';
import { UserActionModal, UserActionType } from './UserActionModal.js';

interface AdminUserDirectoryTabProps {
  onNotify: (type: 'success' | 'error', text: string) => void;
}

export const AdminUserDirectoryTab: React.FC<AdminUserDirectoryTabProps> = ({ onNotify }) => {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedUserIdForDetail, setSelectedUserIdForDetail] = useState<string | null>(null);
  const [actionModalState, setActionModalState] = useState<{
    isOpen: boolean;
    type: UserActionType | null;
    targetUser: { id: string; name: string; role: string; status: string } | null;
  }>({
    isOpen: false,
    type: null,
    targetUser: null,
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAdminUsers({
        search: searchQuery.trim() || undefined,
        role: roleFilter !== 'ALL' ? (roleFilter as UserRole) : undefined,
        status: statusFilter !== 'ALL' ? (statusFilter as UserStatus) : undefined,
        page,
        limit,
      });
      setUsers(res.users);
      setTotalUsers(res.total);
    } catch (err: any) {
      onNotify('error', err.message || 'Failed to fetch user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleRoleChangeSubmit = async (userId: string, newRole: UserRole) => {
    await api.changeUserRole(userId, newRole);
    onNotify('success', `User role successfully updated to ${newRole}.`);
    await fetchUsers();
  };

  const handleSuspendSubmit = async (userId: string) => {
    await api.suspendUser(userId);
    onNotify('success', `User status toggled successfully.`);
    await fetchUsers();
  };

  const handleForcePasswordResetSubmit = async (userId: string) => {
    await api.forcePasswordReset(userId);
    onNotify('success', `Password recovery dispatched to user email.`);
  };

  const totalPages = Math.max(1, Math.ceil(totalUsers / limit));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0E1017] border border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>User Directory & Identity RBAC</span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              {totalUsers} Registered
            </span>
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Search, filter and administer platform scholar accounts without accessing private research content.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="self-start md:self-auto px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <form onSubmit={handleSearchSubmit} className="sm:col-span-6 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scholars by name, email, or institution..."
            className="w-full bg-[#0E1017] border border-slate-800 rounded-xl pl-9 pr-20 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="sm:col-span-3">
          <HoverSelect
            value={roleFilter}
            onChange={(val) => { setRoleFilter(val); setPage(1); }}
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'Researcher', label: 'Researchers' },
              { value: 'Supervisor', label: 'Supervisors' },
              { value: 'Admin', label: 'Administrators' },
            ]}
            className="w-full"
            buttonClassName="py-2 text-xs"
          />
        </div>

        <div className="sm:col-span-3">
          <HoverSelect
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setPage(1); }}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'Active', label: 'Active Status' },
              { value: 'PendingVerification', label: 'Pending Verification' },
              { value: 'Suspended', label: 'Suspended Accounts' },
            ]}
            className="w-full"
            buttonClassName="py-2 text-xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl bg-[#0E1017] border border-slate-800/90 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <span>Loading scholars directory...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No scholars match the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-[#121622] text-slate-300 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-3.5 px-4">Scholar Identity</th>
                  <th className="py-3.5 px-3">Role</th>
                  <th className="py-3.5 px-3">Status</th>
                  <th className="py-3.5 px-3">Institution</th>
                  <th className="py-3.5 px-3 text-center">Projects</th>
                  <th className="py-3.5 px-3">Joined</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#141824]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar 
                          name={u.fullName || 'User'} 
                          photoUrl={u.photoUrl} 
                          role={u.role} 
                          size="sm" 
                        />
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                            <span>{u.fullName || 'Unnamed User'}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">
                            {u.email || u.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${
                        u.role === 'Admin' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        u.role === 'Supervisor' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/30' :
                        'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      }`}>
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2.5 py-0.5 rounded-full font-semibold text-xs ${
                        u.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                        u.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-300">
                      {u.institution ? (
                        <div className="flex items-center gap-1.5 truncate max-w-[180px]" title={u.institution}>
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{u.institution}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">Unspecified</span>
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-xs">
                        <FolderKanban className="w-3 h-3 text-indigo-400" />
                        <span>{u.projectsCount || 0}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setSelectedUserIdForDetail(u.id)}
                          className="px-2.5 py-1 rounded-lg bg-[#181D2D] hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          title="View Operational Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Details</span>
                        </button>

                        <button
                          onClick={() => setActionModalState({
                            isOpen: true,
                            type: 'role',
                            targetUser: { id: u.id, name: u.fullName || u.email || 'User', role: u.role, status: u.status }
                          })}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/20 transition-colors cursor-pointer"
                          title="Change Application Role"
                        >
                          Role
                        </button>

                        <button
                          onClick={() => setActionModalState({
                            isOpen: true,
                            type: u.status === 'Suspended' ? 'reactivate' : 'suspend',
                            targetUser: { id: u.id, name: u.fullName || u.email || 'User', role: u.role, status: u.status }
                          })}
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            u.status === 'Suspended'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                          title={u.status === 'Suspended' ? 'Reactivate Account' : 'Suspend Account'}
                        >
                          {u.status === 'Suspended' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-800 bg-[#10131E] text-xs text-slate-400">
          <div>
            Showing <span className="text-slate-200 font-semibold">{users.length}</span> of{' '}
            <span className="text-slate-200 font-semibold">{totalUsers}</span> scholars
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="p-1.5 rounded-lg bg-[#161B28] hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="p-1.5 rounded-lg bg-[#161B28] hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Details Modal */}
      <UserDetailModal
        userId={selectedUserIdForDetail}
        isOpen={Boolean(selectedUserIdForDetail)}
        onClose={() => setSelectedUserIdForDetail(null)}
        onRoleChange={(uid, role) => {
          setSelectedUserIdForDetail(null);
          const u = users.find(x => x.id === uid);
          setActionModalState({
            isOpen: true,
            type: 'role',
            targetUser: { id: uid, name: u?.fullName || 'User', role, status: u?.status || 'Active' }
          });
        }}
        onToggleSuspend={(uid, status) => {
          setSelectedUserIdForDetail(null);
          const u = users.find(x => x.id === uid);
          setActionModalState({
            isOpen: true,
            type: status === 'Suspended' ? 'reactivate' : 'suspend',
            targetUser: { id: uid, name: u?.fullName || 'User', role: u?.role || 'Researcher', status }
          });
        }}
        onForcePasswordReset={(uid) => {
          setSelectedUserIdForDetail(null);
          const u = users.find(x => x.id === uid);
          setActionModalState({
            isOpen: true,
            type: 'password-reset',
            targetUser: { id: uid, name: u?.fullName || 'User', role: u?.role || 'Researcher', status: u?.status || 'Active' }
          });
        }}
      />

      {/* Action Dialog */}
      <UserActionModal
        isOpen={actionModalState.isOpen}
        actionType={actionModalState.type}
        targetUser={actionModalState.targetUser}
        onClose={() => setActionModalState({ isOpen: false, type: null, targetUser: null })}
        onSubmitRoleChange={handleRoleChangeSubmit}
        onSubmitSuspend={handleSuspendSubmit}
        onSubmitForcePasswordReset={handleForcePasswordResetSubmit}
      />
    </div>
  );
};
