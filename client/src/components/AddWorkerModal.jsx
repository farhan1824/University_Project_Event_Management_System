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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-secondary/20 text-secondary">
              <UserPlus size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-base-content">
                Add Worker to {department.name}
              </h3>
              <p className="text-xs text-base-content/60">
                Search from already registered workers or invite a new field operator
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="mt-3.5 flex items-center bg-base-100 p-1 rounded-xl border border-base-content/10 text-xs">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'search' ? 'bg-secondary text-secondary-content shadow-sm' : 'text-base-content/70 hover:bg-base-200'
            }`}
          >
            <Search size={13} /> Registered Workers ({availableWorkers.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'manual' ? 'bg-secondary text-secondary-content shadow-sm' : 'text-base-content/70 hover:bg-base-200'
            }`}
          >
            <UserPlus size={13} /> Manual Entry
          </button>
        </div>

        {activeTab === 'search' ? (
          <div className="flex-1 flex flex-col min-h-0 mt-3 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
              <input
                type="text"
                placeholder="Search registered workers by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input input-sm input-bordered w-full pl-9 bg-base-100 rounded-xl text-xs"
              />
            </div>

            {/* List of Registered Workers */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[200px] max-h-[300px]">
              {loading ? (
                <div className="flex justify-center items-center h-36">
                  <span className="loading loading-spinner loading-md text-secondary"></span>
                </div>
              ) : filteredWorkers.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <AlertCircle size={30} className="mx-auto text-base-content/30" />
                  <p className="text-xs text-base-content/60 font-medium">
                    {registeredUsers.length === 0 
                      ? 'No other users registered in the system yet.' 
                      : availableWorkers.length === 0
                        ? 'All registered workers are already in this department!'
                        : 'No workers matched your search.'}
                  </p>
                  <p className="text-[11px] text-base-content/40">
                    You can switch to <strong>"Manual Entry"</strong> tab to invite a worker before they sign up.
                  </p>
                </div>
              ) : (
                filteredWorkers.map((worker) => {
                  const isAdding = addingId === worker.id;

                  return (
                    <div
                      key={worker.id}
                      className="p-3 rounded-2xl bg-base-100 border border-base-content/10 hover:border-secondary/40 flex items-center justify-between gap-3 shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="avatar">
                          <div className="w-9 h-9 rounded-full bg-base-300 ring-1 ring-base-content/10">
                            <img
                              src={worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`}
                              alt={worker.name}
                            />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-base-content truncate">{worker.name}</span>
                            <span className="badge badge-ghost badge-xs text-[9px] uppercase font-mono">
                              {worker.role.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-base-content/60 truncate mt-0.5">
                            {worker.email}
                          </div>
                          <div className="text-[11px] font-mono text-primary flex items-center gap-1 mt-0.5">
                            <Phone size={10} /> {worker.phone}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddRegisteredWorker(worker)}
                        disabled={isAdding}
                        className="btn btn-xs btn-secondary rounded-xl font-bold gap-1 shrink-0 shadow-sm"
                      >
                        {isAdding ? (
                          <span className="loading loading-spinner loading-xs"></span>
                        ) : (
                          <><Plus size={12} /> Add to Team</>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* Manual Entry Form */
          <form onSubmit={handleManualSubmit} className="mt-3.5 space-y-3">
            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
                Worker Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Jamal Uddin"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="input input-bordered input-sm w-full bg-base-100 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
                Phone Number (for emergency contact & WhatsApp)
              </label>
              <input
                type="tel"
                placeholder="e.g. +880 1711-223344"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className="input input-bordered input-sm w-full bg-base-100 rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="worker@events.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input input-bordered input-sm w-full bg-base-100 rounded-xl text-xs"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={manualSubmitting || !inviteName.trim()}
                className="btn btn-sm btn-secondary w-full rounded-xl font-bold"
              >
                {manualSubmitting ? <span className="loading loading-spinner loading-xs"></span> : <UserPlus size={15} />}
                Add to Department Roster
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-base-content/10 mt-3">
          <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default AddWorkerModal;
