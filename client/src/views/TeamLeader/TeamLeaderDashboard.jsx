import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useSocket } from '../../context/SocketContext';
import { departmentAPI, taskAPI, issueAPI } from '../../services/api';
import CreateTaskModal from '../../components/CreateTaskModal';
import AddWorkerModal from '../../components/AddWorkerModal';
import AssignTaskModal from '../../components/AssignTaskModal';
import { 
  Layers, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  Phone, 
  Plus, 
  MessageSquare, 
  ExternalLink, 
  UserPlus,
  ArrowUpRight,
  Filter,
  UserCheck,
  UserX
} from 'lucide-react';

export const TeamLeaderDashboard = () => {
  const { user } = useAuth();
  const { selectedEventId, refreshEventData } = useEvent();
  const { openIssueChat, socket } = useSocket();

  const [myDepartments, setMyDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [deptDetails, setDeptDetails] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [issues, setIssues] = useState([]);
  const [taskFilter, setTaskFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState(null);

  // 1. Fetch departments assigned to this Team Leader for the active event
  const loadMyDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentAPI.getAll({ eventId: selectedEventId, leaderId: user.id });
      if (res.data.success) {
        setMyDepartments(res.data.data);
        if (res.data.data.length > 0) {
          const current = res.data.data.find(d => d.id === selectedDeptId) || res.data.data[0];
          setSelectedDeptId(current.id);
        } else {
          setSelectedDeptId(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId && user) {
      loadMyDepartments();
    }
  }, [selectedEventId, user]);

  // 2. Fetch selected department details (members, tasks, issues)
  const loadDepartmentData = async (deptId) => {
    if (!deptId) return;
    try {
      const res = await departmentAPI.getById(deptId);
      if (res.data.success) {
        setDeptDetails(res.data.data);
        setTasks(res.data.data.tasks || []);
        setIssues(res.data.data.issues || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedDeptId) {
      loadDepartmentData(selectedDeptId);
    }
  }, [selectedDeptId]);

  // Escalate an issue
  const handleEscalate = async (issueId) => {
    try {
      await issueAPI.escalate(issueId, {
        escalationNote: `${user.name} (Team Leader) escalated this issue to Event Creator.`
      });
      refreshEventData();
      loadDepartmentData(selectedDeptId);
      openIssueChat(issueId);
    } catch (e) {
      console.error(e);
    }
  };

  // Resolve an issue locally
  const handleResolve = async (issueId) => {
    try {
      await issueAPI.resolve(issueId, {
        resolutionNote: `Resolved locally by Team Leader ${user.name}.`
      });
      refreshEventData();
      loadDepartmentData(selectedDeptId);
    } catch (e) {
      console.error(e);
    }
  };

  // Remove member from department
  const handleRemoveMember = async (membershipId) => {
    if (!selectedDeptId || !membershipId) return;
    try {
      await departmentAPI.removeMember(selectedDeptId, membershipId);
      loadDepartmentData(selectedDeptId);
      loadMyDepartments();
      refreshEventData();
    } catch (e) {
      console.error(e);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    if (taskFilter === 'COMPLETED') return t.status === 'COMPLETED';
    if (taskFilter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (taskFilter === 'BLOCKED') return t.status === 'BLOCKED';
    if (taskFilter === 'OVERDUE') return t.status === 'OVERDUE';
    return true;
  });

  const selectedDept = myDepartments.find(d => d.id === selectedDeptId);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-base-200 to-base-300 border border-base-content/10 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-secondary badge-sm uppercase font-mono font-bold tracking-wider">
                👔 Team Leader Station
              </span>
              <span className="text-xs text-base-content/60 font-medium">
                {myDepartments.length} Assigned Department(s)
              </span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-base-content mt-1">
              {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-base-content/70">
              Manage department rosters, delegate operational tasks, and triage field problem escalations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn btn-sm btn-primary rounded-xl font-bold gap-1.5 shadow-md shadow-primary/20"
            >
              <Plus size={15} /> Create Task
            </button>
            <button
              onClick={() => setIsWorkerModalOpen(true)}
              className="btn btn-sm btn-secondary rounded-xl font-bold gap-1.5 shadow-md shadow-secondary/20"
            >
              <UserPlus size={15} /> Add Worker
            </button>
          </div>
        </div>

        {/* Multi-Department Tabs */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
          {myDepartments.length === 0 ? (
            <p className="text-xs text-base-content/50 italic">No departments assigned to you in this event.</p>
          ) : (
            myDepartments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`btn btn-sm rounded-xl font-bold transition-all gap-2 ${
                  selectedDeptId === dept.id
                    ? 'btn-secondary shadow-lg shadow-secondary/20'
                    : 'btn-ghost bg-base-100/60 hover:bg-base-100 border border-base-content/10'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.colorCode }}></span>
                <span>{dept.name}</span>
                <span className="badge badge-xs badge-neutral">{dept.progress}%</span>
              </button>
            ))
          )}
        </div>
      </div>

      {selectedDept && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Task Board & Problem Triage Hub */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Problem Triage Hub */}
            <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-warning/20 text-warning">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-base-content">
                      Problem Triage Hub ({issues.filter(i => i.status !== 'RESOLVED').length})
                    </h2>
                    <p className="text-xs text-base-content/60">
                      Solve issues locally or escalate critical bottlenecks to the Event Creator
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {issues.length === 0 ? (
                  <div className="text-center py-6 text-xs text-base-content/50">
                    No open problems reported in {selectedDept.name}.
                  </div>
                ) : (
                  issues.map((iss) => {
                    const isResolved = iss.status === 'RESOLVED';
                    const isEscalated = iss.isEscalated || iss.status === 'ESCALATED';

                    return (
                      <div
                        key={iss.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isResolved 
                            ? 'bg-base-100/40 border-base-content/10 opacity-70' 
                            : isEscalated 
                              ? 'bg-base-100 border-error/40 glow-critical' 
                              : 'bg-base-100 border-warning/40 shadow-sm'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`badge badge-sm font-bold ${
                                isResolved ? 'badge-success' : isEscalated ? 'badge-error text-white' : 'badge-warning'
                              }`}>
                                {iss.status}
                              </span>
                              <span className="badge badge-sm badge-outline">{iss.category}</span>
                              <span className="text-xs text-base-content/60 font-mono">
                                Priority: <strong className={iss.priority === 'CRITICAL' ? 'text-error' : 'text-warning'}>{iss.priority}</strong>
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-base-content">{iss.title}</h3>
                            <p className="text-xs text-base-content/70">{iss.description}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              onClick={() => openIssueChat(iss.id)}
                              className="btn btn-xs btn-primary gap-1 font-semibold"
                            >
                              <MessageSquare size={13} /> Chat
                            </button>

                            {!isResolved && !isEscalated && (
                              <button
                                onClick={() => handleEscalate(iss.id)}
                                className="btn btn-xs btn-error text-white font-bold gap-1"
                              >
                                <ShieldAlert size={13} /> Escalate
                              </button>
                            )}

                            {!isResolved && (
                              <button
                                onClick={() => handleResolve(iss.id)}
                                className="btn btn-xs btn-success text-white font-bold gap-1"
                              >
                                <CheckCircle2 size={13} /> Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Department Tasks Board */}
            <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-base-content/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/20 text-primary">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-base-content">
                      Department Tasks ({filteredTasks.length})
                    </h2>
                    <p className="text-xs text-base-content/60">Assigned work in {selectedDept.name}</p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-base-100 p-1 rounded-xl border border-base-content/10 text-xs overflow-x-auto">
                  {['ALL', 'IN_PROGRESS', 'BLOCKED', 'OVERDUE', 'COMPLETED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        taskFilter === f ? 'bg-primary text-white font-bold shadow-sm' : 'text-base-content/70 hover:bg-base-200'
                      }`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {filteredTasks.length === 0 ? (
                  <p className="text-xs text-base-content/50 py-8 text-center">No tasks matching selected filter.</p>
                ) : (
                  filteredTasks.map((t) => {
                    const isAssigned = !!(t.assignee?.name || t.assignedTo?.name || (t.assignedTo && typeof t.assignedTo === 'object'));
                    const assigneeName = t.assignee?.name || t.assignedTo?.name || (t.assignedTo && typeof t.assignedTo === 'string' ? 'Assigned' : 'Unassigned');

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-base-100 border border-base-content/10 hover:border-base-content/25 transition-all space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`badge badge-xs font-bold ${
                                t.status === 'COMPLETED' ? 'badge-success' : t.status === 'BLOCKED' ? 'badge-error' : t.status === 'OVERDUE' ? 'badge-warning' : 'badge-info'
                              }`}>
                                {t.status}
                              </span>
                              <span className="badge badge-xs badge-ghost font-mono">{t.priority}</span>
                            </div>
                            <h4 className="font-bold text-sm text-base-content mt-1">{t.title}</h4>
                            {t.description && (
                              <p className="text-xs text-base-content/65 leading-relaxed">{t.description}</p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono text-warning font-semibold flex items-center gap-1">
                              <Clock size={12} />
                              {new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Assignee Action & Live Progress */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-base-content/5">
                          
                          {/* 1-Click Interactive Assignee Button */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-base-content/60">Assignee:</span>
                            {isAssigned && assigneeName !== 'Unassigned' ? (
                              <button
                                onClick={() => setTaskToAssign(t)}
                                className="btn btn-xs btn-outline border-base-content/20 hover:border-primary hover:bg-primary/10 gap-1.5 rounded-xl font-bold normal-case text-xs text-base-content"
                                title="Click to change or reassign worker"
                              >
                                <span className="w-2 h-2 rounded-full bg-success"></span>
                                <span>{assigneeName}</span>
                                <span className="text-[10px] text-primary underline ml-1">Change</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setTaskToAssign(t)}
                                className="btn btn-xs btn-warning btn-outline gap-1.5 rounded-xl font-bold normal-case text-xs animate-pulse"
                                title="Click to assign a worker from your department"
                              >
                                <UserCheck size={12} />
                                <span>+ Assign Worker</span>
                              </button>
                            )}
                          </div>

                          {/* Progress */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-primary">{t.progress}%</span>
                            <progress className="progress progress-primary w-24 h-1.5" value={t.progress} max="100"></progress>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right 1 Col: Department Team Roster with Direct Contact Actions */}
          <div className="space-y-6">
            <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-secondary" />
                  <h3 className="font-display font-bold text-base text-base-content">
                    Team Members ({deptDetails?.members?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={() => setIsWorkerModalOpen(true)}
                  className="btn btn-secondary btn-sm rounded-xl font-bold gap-1 shadow-sm"
                  title="Search & Add Worker"
                >
                  <UserPlus size={14} /> Add Worker
                </button>
              </div>

              <div className="mt-3 space-y-2.5">
                {!deptDetails?.members || deptDetails.members.length === 0 ? (
                  <div className="text-center py-6 space-y-2">
                    <p className="text-xs text-base-content/50">No workers assigned to this team yet.</p>
                    <button
                      onClick={() => setIsWorkerModalOpen(true)}
                      className="btn btn-xs btn-outline btn-secondary rounded-xl font-bold gap-1"
                    >
                      <UserPlus size={12} /> Search & Add Workers
                    </button>
                  </div>
                ) : (
                  deptDetails.members.map((m) => (
                    <div key={m.id} className="p-3 rounded-2xl bg-base-100 border border-base-content/10 flex items-center justify-between gap-2 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="avatar">
                          <div className="w-8 h-8 rounded-full bg-base-300 ring-1 ring-base-content/10">
                            <img src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt={m.name} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-base-content truncate">{m.name}</div>
                          <div className="text-[11px] font-mono text-primary truncate">{m.phone}</div>
                        </div>
                      </div>

                      {/* Phone & WhatsApp Quick Connect & Remove */}
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${m.phone.replace(/[^0-9+]/g, '')}`}
                          className="btn btn-ghost btn-circle btn-xs text-success"
                          title={`Call ${m.name}`}
                        >
                          <Phone size={13} />
                        </a>
                        <a
                          href={`https://wa.me/${m.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-circle btn-xs text-accent"
                          title={`WhatsApp message to ${m.name}`}
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={() => handleRemoveMember(m.membershipId)}
                          className="btn btn-ghost btn-circle btn-xs text-error/60 hover:text-error"
                          title={`Remove ${m.name} from department`}
                        >
                          <UserX size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 1. Create Task Modal */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultDepartmentId={selectedDeptId}
        onSuccess={() => {
          loadDepartmentData(selectedDeptId);
          loadMyDepartments();
        }}
      />

      {/* 2. Search & Add Worker Modal (Integrated from Registered Users) */}
      <AddWorkerModal
        isOpen={isWorkerModalOpen}
        onClose={() => setIsWorkerModalOpen(false)}
        department={deptDetails || selectedDept}
        onMemberAdded={() => {
          loadDepartmentData(selectedDeptId);
          loadMyDepartments();
          refreshEventData();
        }}
      />

      {/* 3. Quick Assign Task Modal */}
      <AssignTaskModal
        isOpen={!!taskToAssign}
        onClose={() => setTaskToAssign(null)}
        task={taskToAssign}
        departmentId={selectedDeptId}
        onAssigned={() => {
          loadDepartmentData(selectedDeptId);
          loadMyDepartments();
        }}
      />

    </div>
  );
};

export default TeamLeaderDashboard;
