import React, { useState, useEffect } from 'react';
import { authAPI, departmentAPI } from '../services/api';
import { UserPlus, Search, Phone, Check, User, X, AlertCircle, Sparkles, Plus } from 'lucide-react';

export const AddWorkerModal = ({ isOpen, onClose, department, onMemberAdded }) => {
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search' or 'manual'

  // Manual Invite Form State
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRegisteredWorkers();
    }
  }, [isOpen, department]);

  const loadRegisteredWorkers = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getUsers();
      if (res.data.success) {
        setRegisteredUsers(res.data.data);
      }
    } catch (e) {
      console.error('Failed to load registered users', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !department) return null;

  // Existing member IDs in this department
  const existingMemberIds = (department.members || []).map(m => m.id || m._id);

  // Filter available registered workers who are WORKERs (or not yet in this department)
  const availableWorkers = registeredUsers.filter(u => {
    const isWorkerOnly = u.role === 'WORKER';
    const notInDept = !existingMemberIds.includes(u.id);
    return isWorkerOnly && notInDept;
  });

  const filteredWorkers = availableWorkers.filter(u =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  // 1-Click Add Registered Worker
  const handleAddRegisteredWorker = async (worker) => {
    try {
      setAddingId(worker.id);
      const res = await departmentAPI.addMember(department.id, {
        userId: worker.id,
        name: worker.name,
        email: worker.email,
        phone: worker.phone
      });

      if (res.data.success) {
        if (onMemberAdded) onMemberAdded();
        onClose();
      }
    } catch (e) {
      console.error('Failed to add member to department', e);
    } finally {
      setAddingId(null);
    }
  };

  // Manual Invite Submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!inviteName.trim()) return;

    try {
      setManualSubmitting(true);
      const res = await departmentAPI.addMember(department.id, {
        name: inviteName.trim(),
        email: inviteEmail.trim() || `${inviteName.toLowerCase().replace(/\s+/g, '')}@events.com`,
        phone: invitePhone.trim() || '+880 1700-000000'
      });

      if (res.data.success) {
        setInviteName('');
        setInviteEmail('');
        setInvitePhone('');
        if (onMemberAdded) onMemberAdded();
        onClose();
      }
    } catch (e) {
      console.error('Failed to manually invite member', e);
    } finally {
      setManualSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-modal p-5 sm:p-6 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <UserPlus size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Add Worker to {department.name}
              </h3>
              <p className="text-xs text-slate-500">
                Assign registered workers or invite new team members
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 mt-4 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 font-bold rounded-xl transition-all ${
              activeTab === 'search' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🔍 Choose from Registered Workers ({availableWorkers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 font-bold rounded-xl transition-all ${
              activeTab === 'manual' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✍️ Quick Manual Add
          </button>
        </div>

        {/* TAB 1: Search & Pick From Registered Users */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 mt-3 space-y-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered workers by name, phone, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-sm w-full pl-9 bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-xs text-slate-900"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-60">
              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-sm text-primary"></span>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-4 space-y-2">
                  <p className="text-xs text-slate-500 font-medium">
                    {search ? `No registered workers matching "${search}"` : 'No available workers to add.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('manual')}
                    className="btn btn-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold border-none shadow-xs"
                  >
                    + Add Worker Manually
                  </button>
                </div>
              ) : (
                filteredWorkers.map((worker) => {
                  const isAdding = addingId === worker.id;
                  return (
                    <div
                      key={worker.id}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 transition-all flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="avatar">
                          <div className="w-8 h-8 rounded-full ring-1 ring-slate-200">
                            <img src={worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`} alt={worker.name} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                            <span>{worker.name}</span>
                            <span className="badge badge-xs bg-slate-200 text-slate-700 font-mono">WORKER</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">{worker.phone || worker.email}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddRegisteredWorker(worker)}
                        disabled={isAdding}
                        className="btn btn-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-1 shrink-0 border-none shadow-xs touch-active"
                      >
                        {isAdding ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <>
                            <Plus size={13} /> Add to Roster
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Quick Manual Add */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3 mt-3 flex-1 overflow-y-auto pr-1">
            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Johnson"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="input input-sm input-bordered w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+880 1700-000000"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className="input input-sm input-bordered w-full bg-slate-50 focus:bg-white rounded-xl font-mono text-xs border-slate-200 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="alex@events.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input input-sm input-bordered w-full bg-slate-50 focus:bg-white rounded-xl text-xs border-slate-200 focus:border-indigo-600 text-slate-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={manualSubmitting || !inviteName.trim()}
                className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white w-full rounded-xl font-bold gap-1 border-none shadow-sm touch-active"
              >
                {manualSubmitting ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  <>
                    <UserPlus size={15} /> Add to Department Roster
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 mt-3 pb-safe">
          <button onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddWorkerModal;
