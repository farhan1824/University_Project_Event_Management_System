import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useSocket } from '../../context/SocketContext';
import { departmentAPI, taskAPI, issueAPI } from '../../services/api';
import CreateTaskModal from '../../components/CreateTaskModal';
import AddWorkerModal from '../../components/AddWorkerModal';
import AssignTaskModal from '../../components/AssignTaskModal';
import ReviewTaskProofModal from '../../components/ReviewTaskProofModal';
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
  UserCheck, 
  UserX,
  Camera,
  Sparkles
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
  const [selectedTaskForReview, setSelectedTaskForReview] = useState(null);

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
    if (taskFilter === 'PENDING_APPROVAL') return t.status === 'PENDING_APPROVAL';
    if (taskFilter === 'COMPLETED') return t.status === 'COMPLETED';
    if (taskFilter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (taskFilter === 'BLOCKED') return t.status === 'BLOCKED';
    if (taskFilter === 'OVERDUE') return t.status === 'OVERDUE';
    return true;
  });

  const selectedDept = myDepartments.find(d => d.id === selectedDeptId);
  const pendingApprovalCount = tasks.filter(t => t.status === 'PENDING_APPROVAL').length;
  const openIssuesCount = issues.filter(i => i.status !== 'RESOLVED').length;

  return (
    <div className="space-y-6 pb-24 text-left">
      
      {/* Header Banner - Team Leader Command Hub */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-indigo-700/15 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase text-white/95">
                👔 Department Leader
              </span>
              <span className="text-xs font-mono font-bold text-indigo-200 bg-black/20 px-2.5 py-0.5 rounded-full">
                {myDepartments.length} Department(s)
              </span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white mt-2 leading-tight">
              {user.name}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 max-w-xl">
              Coordinate team rosters, delegate tasks, inspect worker completion photo proofs, and triage ground problems.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-2 md:pt-0">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn btn-sm bg-white text-indigo-700 hover:bg-slate-100 rounded-xl font-bold gap-1.5 shadow-md border-none touch-active"
            >
              <Plus size={16} /> Create Task
            </button>
            <button
              onClick={() => setIsWorkerModalOpen(true)}
              className="btn btn-sm bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-white/20 rounded-xl font-bold gap-1.5 shadow-sm touch-active"
            >
              <UserPlus size={16} /> Add Worker
            </button>
          </div>
        </div>

        {/* Multi-Department Navigation Tabs */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 relative z-10">
          {myDepartments.length === 0 ? (
            <p className="text-xs text-indigo-200 italic">No departments assigned to you in this event.</p>
          ) : (
            myDepartments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`btn btn-sm rounded-2xl font-bold transition-all gap-2 border-none touch-active ${
                  selectedDeptId === dept.id
                    ? 'bg-white text-indigo-900 shadow-md shadow-black/20'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.colorCode || '#4f46e5' }}></span>
                <span>{dept.name}</span>
                <span className="badge badge-xs bg-black/20 text-white border-none font-bold">{dept.progress}%</span>
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
            <div className="card-premium p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                      Problem Triage Hub ({openIssuesCount})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Solve issues locally or escalate critical bottlenecks to Event Creator
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {issues.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    No open problems reported in {selectedDept.name}. Everything running smoothly!
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
                            ? 'bg-slate-50 border-slate-200 opacity-70' 
                            : isEscalated 
                              ? 'bg-rose-50/60 border-rose-200 glow-critical' 
                              : 'bg-amber-50/50 border-amber-200/80 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`badge badge-sm font-bold shadow-xs ${
                                isResolved ? 'badge-success text-white' : isEscalated ? 'badge-error text-white' : 'badge-warning text-slate-900 font-bold'
                              }`}>
                                {iss.status}
                              </span>
                              <span className="badge badge-sm bg-white text-slate-700 border border-slate-200 font-semibold">{iss.category}</span>
                              <span className="text-xs font-mono text-slate-500">
                                Priority: <strong className={iss.priority === 'CRITICAL' ? 'text-rose-600 font-bold' : 'text-amber-600 font-bold'}>{iss.priority}</strong>
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 mt-1">{iss.title}</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">{iss.description}</p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            <button
                              onClick={() => openIssueChat(iss.id)}
                              className="btn btn-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 font-bold rounded-xl border-none shadow-xs"
                            >
                              <MessageSquare size={13} /> Chat
                            </button>

                            {!isResolved && !isEscalated && (
                              <button
                                onClick={() => handleEscalate(iss.id)}
                                className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 rounded-xl border-none shadow-xs"
                              >
                                <ShieldAlert size={13} /> Escalate
                              </button>
                            )}

                            {!isResolved && (
                              <button
                                onClick={() => handleResolve(iss.id)}
                                className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 rounded-xl border-none shadow-xs"
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
            <div className="card-premium p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Layers size={20} />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                      Department Tasks ({filteredTasks.length})
                    </h2>
                    <p className="text-xs text-slate-500">Assigned work & proof reviews in {selectedDept.name}</p>
                  </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto">
                  {['ALL', 'PENDING_APPROVAL', 'IN_PROGRESS', 'BLOCKED', 'OVERDUE', 'COMPLETED'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setTaskFilter(f)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        taskFilter === f ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f === 'PENDING_APPROVAL' ? `PROOF SUBMITTED (${pendingApprovalCount})` : f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {filteredTasks.length === 0 ? (
                  <p className="text-xs text-slate-400 py-10 text-center">No tasks matching selected filter.</p>
                ) : (
                  filteredTasks.map((t) => {
                    const isAssigned = !!(t.assignee?.name || t.assignedTo?.name || (t.assignedTo && typeof t.assignedTo === 'object'));
                    const assigneeName = t.assignee?.name || t.assignedTo?.name || (t.assignedTo && typeof t.assignedTo === 'string' ? 'Assigned' : 'Unassigned');
                    const isPendingApproval = t.status === 'PENDING_APPROVAL';

                    return (
                      <div
                        key={t.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 shadow-xs ${
                          isPendingApproval 
                            ? 'bg-amber-50/40 border-amber-300 glow-warning' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center justify-center font-extrabold tracking-wide text-[10px] sm:text-[11px] px-2.5 py-1 rounded-full shadow-xs leading-none uppercase ${
                                isPendingApproval 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                  : t.status === 'COMPLETED' 
                                    ? 'bg-emerald-600 text-white' 
                                    : t.status === 'BLOCKED' 
                                      ? 'bg-rose-600 text-white' 
                                      : t.status === 'OVERDUE' 
                                        ? 'bg-amber-400 text-slate-950 font-black' 
                                        : 'bg-indigo-600 text-white'
                              }`}>
                                {isPendingApproval ? '🟡 PROOF SUBMITTED' : t.status.replace('_', ' ')}
                              </span>
                              <span className="inline-flex items-center justify-center text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 leading-none">
                                {t.priority}
                              </span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900 mt-1">{t.title}</h4>
                            {t.description && (
                              <p className="text-xs text-slate-600 leading-relaxed">{t.description}</p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono text-amber-600 font-bold flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">
                              <Clock size={12} />
                              {new Date(t.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Interactive Assignee Action, Proof Review & Live Progress */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
                          
                          {/* 1-Click Interactive Assignee Button & Review Proof Button */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-slate-500 font-medium">Assignee:</span>
                            {isAssigned && assigneeName !== 'Unassigned' ? (
                              <button
                                onClick={() => setTaskToAssign(t)}
                                className="btn btn-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 gap-1.5 rounded-xl font-bold normal-case text-xs text-slate-800 shadow-xs"
                                title="Click to change or reassign worker"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>{assigneeName}</span>
                                <span className="text-[10px] text-indigo-600 underline ml-1 font-semibold">Change</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setTaskToAssign(t)}
                                className="btn btn-xs bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 gap-1.5 rounded-xl font-bold normal-case text-xs animate-pulse shadow-xs"
                                title="Click to assign a worker from your department"
                              >
                                <UserCheck size={12} />
                                <span>+ Assign Worker</span>
                              </button>
                            )}

                            {/* Proof Review Action Button */}
                            {isPendingApproval && (
                              <button
                                onClick={() => setSelectedTaskForReview(t)}
                                className="btn btn-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-black gap-1 rounded-xl shadow-md animate-pulse border-none"
                              >
                                <Camera size={13} /> Review Proof & Approve
                              </button>
                            )}

                            {t.status === 'COMPLETED' && t.proofImage && (
                              <button
                                onClick={() => setSelectedTaskForReview(t)}
                                className="btn btn-xs btn-ghost text-indigo-600 text-[11px] underline font-bold"
                              >
                                View Proof
                              </button>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-600 font-mono">{t.progress}%</span>
                            <progress className="progress progress-primary w-24 h-2 bg-slate-100" value={t.progress} max="100"></progress>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right 1 Col: Department Team Roster */}
          <div className="space-y-6">
            <div className="card-premium p-5 space-y-4">
              <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  <h3 className="font-display font-bold text-base text-slate-900">
                    Team Members ({deptDetails?.members?.length || 0})
                  </h3>
                </div>
                <button
                  onClick={() => setIsWorkerModalOpen(true)}
                  className="btn btn-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold gap-1 shadow-xs"
                  title="Search & Add Worker"
                >
                  <UserPlus size={13} /> Add
                </button>
              </div>

              <div className="space-y-2">
                {!deptDetails?.members || deptDetails.members.length === 0 ? (
                  <div className="text-center py-8 space-y-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                    <p className="text-xs text-slate-400">No workers assigned to this department yet.</p>
                    <button
                      onClick={() => setIsWorkerModalOpen(true)}
                      className="btn btn-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-1 border-none shadow-xs"
                    >
                      <UserPlus size={12} /> Search & Add Workers
                    </button>
                  </div>
                ) : (
                  deptDetails.members.map((m) => (
                    <div key={m.id} className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200 flex items-center justify-between gap-2 shadow-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="avatar">
                          <div className="w-8 h-8 rounded-full ring-2 ring-indigo-200">
                            <img src={m.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.name}`} alt={m.name} />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">{m.name}</div>
                          <div className="text-[11px] font-mono text-indigo-600 font-semibold truncate">{m.phone || 'No phone'}</div>
                        </div>
                      </div>

                      {/* Phone & WhatsApp Quick Connect & Remove */}
                      <div className="flex items-center gap-1">
                        <a
                          href={`tel:${m.phone ? m.phone.replace(/[^0-9+]/g, '') : ''}`}
                          className="btn btn-ghost btn-circle btn-xs text-emerald-600 hover:bg-emerald-50"
                          title={`Call ${m.name}`}
                        >
                          <Phone size={13} />
                        </a>
                        <a
                          href={`https://wa.me/${m.phone ? m.phone.replace(/[^0-9]/g, '') : ''}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-circle btn-xs text-sky-600 hover:bg-sky-50"
                          title={`WhatsApp message to ${m.name}`}
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button
                          onClick={() => handleRemoveMember(m.membershipId)}
                          className="btn btn-ghost btn-circle btn-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50"
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

      {/* 4. Review Task Proof Modal */}
      <ReviewTaskProofModal
        isOpen={Boolean(selectedTaskForReview)}
        onClose={() => setSelectedTaskForReview(null)}
        task={selectedTaskForReview}
        onSuccess={() => {
          loadDepartmentData(selectedDeptId);
          loadMyDepartments();
          refreshEventData();
        }}
      />

    </div>
  );
};

export default TeamLeaderDashboard;
