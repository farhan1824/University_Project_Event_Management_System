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
      
      // Load department members
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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-primary/20 text-primary">
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-base-content">
                Assign Worker to Task
              </h3>
              <p className="text-xs text-base-content/60 truncate max-w-[240px]">
                {task.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="mt-3 flex items-center bg-base-100 p-1 rounded-xl border border-base-content/10 text-xs">
          <button
            onClick={() => setActiveTab('dept')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'dept' ? 'bg-primary text-white shadow-sm' : 'text-base-content/70 hover:bg-base-200'
            }`}
          >
            Department Roster ({deptMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'all' ? 'bg-primary text-white shadow-sm' : 'text-base-content/70 hover:bg-base-200'
            }`}
          >
            All Workers ({allWorkers.length})
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
          <input
            type="text"
            placeholder="Search workers by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-sm input-bordered w-full pl-9 bg-base-100 rounded-xl text-xs"
          />
        </div>

        {/* Workers List */}
        <div className="flex-1 overflow-y-auto mt-3 space-y-2 pr-1 min-h-[160px] max-h-[280px]">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <AlertCircle size={28} className="mx-auto text-base-content/30" />
              <p className="text-xs text-base-content/60 font-medium">
                {activeTab === 'dept' 
                  ? 'No workers in this department roster yet.' 
                  : 'No registered workers found.'}
              </p>
              {activeTab === 'dept' && (
                <button
                  onClick={() => setActiveTab('all')}
                  className="btn btn-xs btn-outline btn-primary rounded-xl"
                >
                  Browse All Registered Workers
                </button>
              )}
            </div>
          ) : (
            filteredList.map((worker) => {
              const isSelected = currentAssigneeId === worker.id || currentAssigneeId === worker._id;
              const isAssigningThis = assigningId === worker.id;

              return (
                <div
                  key={worker.id || worker._id}
                  onClick={() => handleAssign(worker.id || worker._id)}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-sm'
                      : 'bg-base-100 border-base-content/10 hover:border-primary/40 hover:bg-base-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="avatar">
                      <div className="w-8 h-8 rounded-full bg-base-300 ring-1 ring-base-content/10">
                        <img
                          src={worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`}
                          alt={worker.name}
                        />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-base-content truncate flex items-center gap-1.5">
                        <span>{worker.name}</span>
                        {isSelected && (
                          <span className="badge badge-primary badge-xs font-bold">Current</span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-primary truncate flex items-center gap-1">
                        <Phone size={10} /> {worker.phone}
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isAssigningThis}
                    className={`btn btn-xs rounded-xl font-bold shrink-0 ${
                      isSelected ? 'btn-success text-white' : 'btn-primary'
                    }`}
                  >
                    {isAssigningThis ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : isSelected ? (
                      <><Check size={12} /> Assigned</>
                    ) : (
                      'Assign'
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Unassign option */}
        <div className="flex items-center justify-between pt-3 border-t border-base-content/10 mt-3">
          {currentAssigneeId ? (
            <button
              onClick={() => handleAssign(null)}
              disabled={assigningId === 'unassigned'}
              className="btn btn-xs btn-ghost text-error hover:bg-error/10 font-bold"
            >
              {assigningId === 'unassigned' ? 'Unassigning...' : 'Clear Assignee (Unassign)'}
            </button>
          ) : <div></div>}

          <button onClick={onClose} className="btn btn-sm btn-ghost">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default AssignTaskModal;
