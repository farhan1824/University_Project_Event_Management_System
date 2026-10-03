import React, { useState, useEffect } from 'react';
import { taskAPI, departmentAPI, authAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { User, Check, X, Search, Phone, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';

export const AssignTaskModal = ({ isOpen, onClose, task, departmentId, onAssigned }) => {
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket } = useSocket();

  const [deptMembers, setDeptMembers] = useState([]);
  const [allWorkers, setAllWorkers] = useState([]);
  const [activeTab, setActiveTab] = useState('dept'); // 'dept' or 'all'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => {
    if (isOpen && task) {
      loadWorkers();
    }
  }, [isOpen, task, departmentId]);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const targetDeptId = departmentId || task?.departmentId;
      
      // Load department members (strictly only WORKERs)
      if (targetDeptId) {
        const deptRes = await departmentAPI.getById(targetDeptId);
        if (deptRes.data.success) {
          const members = deptRes.data.data.members || [];
          setDeptMembers(members.filter(m => m.role === 'WORKER'));
        }
      }

      // Load all registered workers (strictly only WORKER role)
      const usersRes = await authAPI.getUsers();
      if (usersRes.data.success) {
        setAllWorkers(usersRes.data.data.filter(u => u.role === 'WORKER'));
      }
    } catch (e) {
      console.error('Failed to load workers for assignment', e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  const currentAssigneeId = task.assignedTo?._id || task.assignedTo?.id || task.assignedTo;

  const handleAssign = async (workerId) => {
    try {
      setAssigningId(workerId || 'unassigned');
      const res = await taskAPI.update(task.id, {
        assignedTo: workerId || null
      });

      if (res.data.success) {
        if (socket) {
          socket.emit('broadcast_task_update', {
            eventId: selectedEventId,
            task: res.data.data,
            updatedBy: 'Team Leader'
          });
        }
        refreshEventData();
        if (onAssigned) onAssigned(res.data.data);
        onClose();
      }
    } catch (e) {
      console.error('Failed to assign task', e);
    } finally {
      setAssigningId(null);
    }
  };

  const listToShow = activeTab === 'dept' ? deptMembers : allWorkers;
  const filteredList = listToShow.filter(w =>
    (w.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (w.phone || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-modal p-5 sm:p-6 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Assign Worker to Task
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">
                {task.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        {/* Source Switch Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 mt-4 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('dept')}
            className={`flex-1 py-1.5 font-bold rounded-xl transition-all ${
              activeTab === 'dept' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dept Roster ({deptMembers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 font-bold rounded-xl transition-all ${
              activeTab === 'all' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Workers ({allWorkers.length})
          </button>
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search workers by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm w-full pl-9 bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-xs text-slate-900"
          />
        </div>

        {/* Workers List */}
        <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1 max-h-64">
          
          {/* Unassign Option */}
          <button
            onClick={() => handleAssign(null)}
            disabled={assigningId !== null}
            className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between text-xs transition-all touch-active ${
              !currentAssigneeId ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                ∅
              </div>
              <div>
                <span className="font-semibold block">Leave Unassigned</span>
                <span className="text-[10px] text-slate-400">Task will be placed in open queue</span>
              </div>
            </div>
            {!currentAssigneeId && <Check size={16} className="text-primary font-bold" />}
          </button>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No workers found matching "{search}".
            </div>
          ) : (
            filteredList.map((worker) => {
              const isAssigned = String(currentAssigneeId) === String(worker.id);
              const isProcessing = assigningId === worker.id;

              return (
                <button
                  key={worker.id}
                  onClick={() => handleAssign(worker.id)}
                  disabled={assigningId !== null}
                  className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between text-xs transition-all touch-active ${
                    isAssigned 
                      ? 'bg-indigo-50 border-indigo-300 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full ring-1 ring-slate-200">
                        <img src={worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`} alt={worker.name} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate flex items-center gap-1.5">
                        <span>{worker.name}</span>
                        {isAssigned && (
                          <span className="badge badge-xs bg-indigo-600 text-white font-bold">CURRENT</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">{worker.phone || 'Ground Worker'}</div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isProcessing ? (
                      <span className="loading loading-spinner loading-xs text-primary"></span>
                    ) : isAssigned ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check size={14} />
                      </div>
                    ) : (
                      <span className="btn btn-xs bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl border border-slate-200 text-[11px]">
                        Assign
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100 mt-3 pb-safe">
          <button onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default AssignTaskModal;
