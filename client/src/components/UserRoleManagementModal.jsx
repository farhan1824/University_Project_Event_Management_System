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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-3xl w-full max-w-3xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
              <Shield size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-base-content">
                User Management & Role Promotion
              </h3>
              <p className="text-xs text-base-content/60">
                Promote normal workers to Team Leaders and assign them to departments
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-success/20 border border-success/30 text-success text-xs font-semibold flex items-center gap-2">
            <Check size={16} />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Search */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
            <input
              type="text"
              placeholder="Search user by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-sm input-bordered w-full pl-9 bg-base-100 rounded-xl text-xs"
            />
          </div>
          <span className="text-xs text-base-content/50 font-mono">
            {filteredUsers.length} Users
          </span>
        </div>

        {/* Users Table / List */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 pr-1">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-xs text-base-content/50 py-12 text-center">No users found.</p>
          ) : (
            filteredUsers.map((u) => {
              const isCreator = u.role === 'EVENT_CREATOR';
              const isLeader = u.role === 'TEAM_LEADER';
              const isWorker = u.role === 'WORKER';

              return (
                <div
                  key={u.id}
                  className="p-3.5 rounded-2xl bg-base-100 border border-base-content/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-base-content/25 transition-all"
                >
                  {/* User Profile */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="avatar">
                      <div className="w-10 h-10 rounded-full bg-base-300 ring-1 ring-base-content/10">
                        <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-base-content truncate">{u.name}</span>
                        <span className={`badge badge-xs font-bold ${
                          isCreator ? 'badge-primary' : isLeader ? 'badge-secondary' : 'badge-ghost'
                        }`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-base-content/60 truncate flex items-center gap-2 mt-0.5">
                        <span>{u.email}</span>
                        <span className="font-mono text-base-content/40">•</span>
                        <span className="font-mono flex items-center gap-0.5 text-primary">
                          <Phone size={11} /> {u.phone}
                        </span>
                      </div>

                      {/* Department Tags */}
                      {isLeader && u.leadingDepartments && u.leadingDepartments.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5">
                          <span className="text-[10px] uppercase font-bold text-secondary">Leads:</span>
                          {u.leadingDepartments.map(d => (
                            <span key={d.id} className="badge badge-xs badge-outline border-secondary/40 text-secondary text-[10px]">
                              {d.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Promotion / Department Assignment Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:justify-end">
                    {/* Promote to Team Leader */}
                    {isWorker && (
                      <button
                        onClick={() => handleRoleChange(u.id, 'TEAM_LEADER')}
                        className="btn btn-xs btn-secondary font-bold gap-1 rounded-xl shadow-sm"
                        title="Promote worker to Team Leader"
                      >
                        <ArrowUpRight size={13} /> Promote to Leader
                      </button>
                    )}

                    {/* Assign Departments to Team Leader */}
                    {isLeader && (
                      <div className="dropdown dropdown-end">
                        <label tabIndex={0} className="btn btn-xs btn-outline border-secondary/40 hover:bg-secondary/10 text-secondary gap-1 rounded-xl">
                          <Layers size={13} /> Assign Dept
                        </label>
                        <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-2xl bg-base-200 border border-base-content/15 rounded-2xl w-60 mt-1">
                          <li className="menu-title text-[10px] font-bold uppercase text-base-content/60">
                            Assign {u.name.split(' ')[0]} to Department:
                          </li>
                          {departments.map((dept) => (
                            <li key={dept.id}>
                              <button
                                onClick={() => handleAssignLeaderToDept(dept.id, u.id)}
                                className={`text-xs flex items-center justify-between ${
                                  dept.leaderId === u.id ? 'font-bold text-secondary bg-secondary/10' : ''
                                }`}
                              >
                                <span>{dept.name}</span>
                                {dept.leaderId === u.id && <Check size={13} />}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Demote back to Worker */}
                    {isLeader && (
                      <button
                        onClick={() => handleRoleChange(u.id, 'WORKER')}
                        className="btn btn-xs btn-ghost text-base-content/60 hover:text-warning gap-1"
                        title="Demote back to Ground Worker"
                      >
                        <ArrowDownRight size={13} /> Demote
                      </button>
                    )}

                    {isCreator && (
                      <span className="badge badge-sm badge-primary badge-outline font-mono text-[10px]">
                        Primary Organizer
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-base-content/10 mt-3">
          <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default UserRoleManagementModal;
