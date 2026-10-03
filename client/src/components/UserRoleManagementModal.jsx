import React, { useState, useEffect } from 'react';
import { authAPI, departmentAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { Users, Shield, ArrowUpRight, ArrowDownRight, Layers, X, Check, Search, Phone } from 'lucide-react';

export const UserRoleManagementModal = ({ isOpen, onClose }) => {
  const { currentEventData, selectedEventId, refreshEventData } = useEvent();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserForDept, setSelectedUserForDept] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getUsers();
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Promote/Demote User
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await authAPI.updateUserRole(userId, newRole);
      if (res.data.success) {
        setActionMessage(res.data.message);
        setTimeout(() => setActionMessage(null), 3000);
        loadUsers();
        refreshEventData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Assign Team Leader to Department
  const handleAssignLeaderToDept = async (deptId, leaderId) => {
    try {
      await departmentAPI.update(deptId, { leaderId });
      loadUsers();
      refreshEventData();
      setSelectedUserForDept(null);
    } catch (e) {
      console.error(e);
    }
  };

  const departments = currentEventData?.departments || [];

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-modal p-5 sm:p-6 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                User Management & Role Promotion
              </h3>
              <p className="text-xs text-slate-500">
                Promote normal workers to Team Leaders and assign them to departments
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <Check size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Search */}
        <div className="mt-4 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm sm:input-md w-full pl-9 bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-xs sm:text-sm text-slate-900"
          />
        </div>

        {/* User List */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No registered users found.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isCreator = u.role === 'EVENT_CREATOR';
              const isLeader = u.role === 'TEAM_LEADER';
              const isWorker = u.role === 'WORKER';

              return (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full ring-2 ring-indigo-100">
                        <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-slate-900 truncate flex items-center gap-2">
                        <span>{u.name}</span>
                        <span className={`badge badge-xs font-mono font-bold ${
                          isCreator ? 'bg-purple-100 text-purple-800' : isLeader ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{u.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.phone || 'No phone registered'}</div>
                    </div>
                  </div>

                  {/* Actions (Promote / Demote / Assign to Dept) */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isWorker && (
                      <button
                        onClick={() => handleRoleChange(u.id, 'TEAM_LEADER')}
                        className="btn btn-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold gap-1 shadow-xs"
                      >
                        <ArrowUpRight size={13} /> Promote to Leader
                      </button>
                    )}

                    {isLeader && (
                      <>
                        <button
                          onClick={() => setSelectedUserForDept(u)}
                          className="btn btn-xs bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold gap-1 shadow-xs"
                        >
                          <Layers size={13} /> Assign Dept
                        </button>
                        <button
                          onClick={() => handleRoleChange(u.id, 'WORKER')}
                          className="btn btn-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold gap-1"
                        >
                          <ArrowDownRight size={13} /> Demote to Worker
                        </button>
                      </>
                    )}

                    {isCreator && (
                      <span className="text-[11px] text-purple-700 font-bold px-2 py-1 bg-purple-50 rounded-lg border border-purple-200">
                        👑 System Admin
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Department Assignment Sub-Modal */}
        {selectedUserForDept && (
          <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-indigo-900">
                Assign <strong>{selectedUserForDept.name}</strong> as Leader of:
              </span>
              <button
                onClick={() => setSelectedUserForDept(null)}
                className="btn btn-ghost btn-circle btn-xs text-slate-400 hover:text-slate-700"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => handleAssignLeaderToDept(dept.id, selectedUserForDept.id)}
                  className="btn btn-sm bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-slate-800 text-xs font-semibold justify-between rounded-xl shadow-xs"
                >
                  <span className="truncate">{dept.name}</span>
                  <Check size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3.5 border-t border-slate-100 mt-3 pb-safe">
          <button onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserRoleManagementModal;
