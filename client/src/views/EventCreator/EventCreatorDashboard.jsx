import React, { useState, useEffect } from 'react';
import { useEvent } from '../../context/EventContext';
import { useSocket } from '../../context/SocketContext';
import { activityAPI } from '../../services/api';
import HealthBadge from '../../components/HealthBadge';
import CreateEventModal from '../../components/CreateEventModal';
import AddDepartmentModal from '../../components/AddDepartmentModal';
import CreateTaskModal from '../../components/CreateTaskModal';
import UserRoleManagementModal from '../../components/UserRoleManagementModal';
import { 
  CheckCircle, 
  Clock, 
  AlertOctagon, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  ShieldAlert, 
  Layers, 
  Users, 
  MessageSquare, 
  Calendar,
  Activity,
  Sparkles,
  ShieldCheck,
  CalendarPlus,
  ArrowRight
} from 'lucide-react';

export const EventCreatorDashboard = () => {
  const { events, currentEventData, selectedEventId, refreshEventData } = useEvent();
  const { openIssueChat } = useSocket();

  const [activities, setActivities] = useState([]);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Fetch activity log
  useEffect(() => {
    if (selectedEventId) {
      loadActivities();
    } else {
      setActivities([]);
    }
  }, [selectedEventId]);

  const loadActivities = async () => {
    try {
      const res = await activityAPI.getAll({ eventId: selectedEventId, limit: 8 });
      if (res.data.success) {
        setActivities(res.data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // If no events exist in the system yet, show onboarding screen
  if (!events || events.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-secondary mx-auto flex items-center justify-center text-white text-4xl shadow-xl shadow-primary/25 animate-pulse-subtle">
          🎪
        </div>

        <div className="space-y-2">
          <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-mono uppercase font-bold tracking-wider">
            👑 Event Creator Command Center
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
            Welcome to EventOps!
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You are the primary organizer. Start by creating your first event, then configure departments and assign team leaders.
          </p>
        </div>

        <div className="card-premium p-6 sm:p-8 space-y-5 text-left bg-white">
          <h3 className="font-display font-bold text-base text-slate-900 flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Setup Workflow:
          </h3>
          <ol className="steps steps-vertical sm:steps-horizontal w-full text-xs font-semibold">
            <li className="step step-primary">Create Event</li>
            <li className="step">Add Departments</li>
            <li className="step">Assign Leaders</li>
            <li className="step">Create Tasks</li>
          </ol>

          <div className="pt-3 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex-1 rounded-2xl font-bold shadow-md shadow-indigo-600/20 gap-2 border-none touch-active"
            >
              <CalendarPlus size={18} /> Create Your First Event
            </button>
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="btn btn-outline border-slate-300 hover:bg-slate-50 text-slate-700 rounded-2xl font-semibold gap-2 touch-active"
            >
              <ShieldCheck size={18} /> View Registered Users
            </button>
          </div>
        </div>

        {/* Modals */}
        <CreateEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
        <UserRoleManagementModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} />
      </div>
    );
  }

  // If loading event details
  if (!currentEventData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="mt-3 text-sm text-slate-500">Loading operational command center...</p>
      </div>
    );
  }

  const { event, health } = currentEventData;
  const stats = health?.stats || {};
  const departmentStats = health?.departmentStats || [];
  const criticalIssues = health?.criticalIssues || [];
  const upcomingDeadlines = health?.upcomingDeadlines || [];

  return (
    <div className="space-y-6 pb-24 text-left">
      
      {/* 1. Header Banner & Action Bar */}
      <div className="bg-gradient-to-br from-indigo-700 via-indigo-800 to-purple-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl shadow-indigo-700/15 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase text-white/95">
                👑 Organizer Command
              </span>
              <HealthBadge status={health.healthStatus} label={health.healthLabel} size="md" />
            </div>
            
            <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
              {event.name}
            </h1>
            
            <p className="text-xs sm:text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
              {event.description || 'Centralized operational visibility, department health, and critical issue escalation.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="btn btn-sm bg-white text-indigo-900 hover:bg-slate-100 rounded-xl font-bold shadow-md border-none gap-1.5 touch-active"
            >
              <ShieldCheck size={15} /> Team & Roles
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn btn-sm bg-indigo-500/40 hover:bg-indigo-500/60 text-white border border-white/20 rounded-xl font-bold gap-1.5 touch-active"
            >
              <Plus size={15} /> Add Task
            </button>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="btn btn-sm bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-white/15 rounded-xl font-medium gap-1.5 touch-active"
            >
              <Layers size={15} /> Add Dept
            </button>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="btn btn-sm btn-ghost text-white/80 hover:bg-white/10 rounded-xl font-medium gap-1.5 touch-active"
            >
              <Calendar size={15} /> New Event
            </button>
          </div>
        </div>

        {/* Health Advisory Banner */}
        <div className={`mt-5 p-3 rounded-2xl border text-xs flex items-center gap-2.5 relative z-10 ${
          health.healthStatus === 'CRITICAL'
            ? 'bg-rose-500/20 border-rose-400 text-rose-100 font-semibold'
            : health.healthStatus === 'ATTENTION_NEEDED'
              ? 'bg-amber-500/20 border-amber-300 text-amber-100 font-medium'
              : 'bg-emerald-500/20 border-emerald-300 text-emerald-100 font-medium'
        }`}>
          {health.healthStatus === 'CRITICAL' ? <AlertOctagon size={18} className="shrink-0 animate-bounce" /> : <Sparkles size={18} className="shrink-0" />}
          <span>{health.healthMessage}</span>
        </div>
      </div>

      {/* 2. Key Metrics Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Overall Progress */}
        <div className="card-premium p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall Progress</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-indigo-600">{health.overallProgress}%</span>
            <TrendingUp size={20} className="text-indigo-400" />
          </div>
          <progress className="progress progress-primary w-full h-1.5 mt-2 bg-slate-100" value={health.overallProgress} max="100"></progress>
        </div>

        {/* Completed */}
        <div className="card-premium p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-emerald-600">{stats.completed || 0}</span>
            <CheckCircle size={20} className="text-emerald-400" />
          </div>
          <span className="text-[10px] text-slate-400">of {stats.total || 0} total tasks</span>
        </div>

        {/* In Progress */}
        <div className="card-premium p-4 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-sky-600 uppercase tracking-wider">In Progress</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-sky-600">{stats.inProgress || 0}</span>
            <Clock size={20} className="text-sky-400" />
          </div>
          <span className="text-[10px] text-slate-400">actively working</span>
        </div>

        {/* Overdue */}
        <div className={`card-premium p-4 flex flex-col justify-between ${
          (stats.overdue || 0) > 0 ? 'bg-amber-50/50 border-amber-200' : ''
        }`}>
          <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Overdue</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-amber-600">{stats.overdue || 0}</span>
            <AlertTriangle size={20} className="text-amber-400" />
          </div>
          <span className="text-[10px] text-slate-400">past target deadline</span>
        </div>

        {/* Blocked */}
        <div className={`card-premium p-4 flex flex-col justify-between ${
          (stats.blocked || 0) > 0 ? 'bg-rose-50/60 border-rose-300 glow-critical' : ''
        }`}>
          <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Blocked</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-rose-600">{stats.blocked || 0}</span>
            <AlertOctagon size={20} className="text-rose-500" />
          </div>
          <span className="text-[10px] text-slate-400">stopped by problems</span>
        </div>

        {/* Escalated Issues */}
        <div className={`card-premium p-4 flex flex-col justify-between ${
          criticalIssues.length > 0 ? 'bg-rose-50 border-rose-300 glow-critical' : ''
        }`}>
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Escalated</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-rose-600">{criticalIssues.length}</span>
            <ShieldAlert size={20} className="text-rose-600" />
          </div>
          <span className="text-[10px] text-slate-400">requires creator sign-off</span>
        </div>

      </div>

      {/* 3. Main Dashboard Grid: Critical Issues + Department Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Department Progress Matrix & Critical Escalations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Critical Escalated Issues Hub */}
          <div className="card-premium p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                    Critical Issues & Escalation Hub
                  </h2>
                  <p className="text-xs text-slate-500">
                    Unresolved problems escalated from Team Leaders requiring organizer guidance
                  </p>
                </div>
              </div>
              <span className={`badge ${criticalIssues.length > 0 ? 'badge-error text-white font-bold animate-pulse' : 'badge-ghost text-xs'}`}>
                {criticalIssues.length} Active
              </span>
            </div>

            <div className="space-y-3">
              {criticalIssues.length === 0 ? (
                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle size={32} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-800">No Unresolved Critical Issues</p>
                  <p className="text-xs text-slate-500 mt-0.5">All department tasks are progressing without escalations.</p>
                </div>
              ) : (
                criticalIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200 hover:border-rose-300 transition-all shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="badge badge-error badge-sm text-white font-bold">🔴 ESCALATED</span>
                        <span className="badge badge-sm bg-white text-slate-700 border border-slate-200 font-semibold">{issue.category}</span>
                        <span className="text-xs text-slate-500">
                          Dept: <strong className="text-indigo-600">{issue.departmentName || 'Department'}</strong>
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1">{issue.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-1">{issue.description}</p>
                    </div>

                    <button
                      onClick={() => openIssueChat(issue.id)}
                      className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-1.5 shrink-0 shadow-sm border-none touch-active"
                    >
                      <MessageSquare size={15} />
                      Open Escalation Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Department Progress Overview */}
          <div className="card-premium p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-slate-900">
                    Department Progress & Operations
                  </h2>
                  <p className="text-xs text-slate-500">
                    Live operational progress across all event departments
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDeptModalOpen(true)}
                  className="btn btn-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold gap-1 shadow-xs"
                >
                  <Plus size={13} /> Add Dept
                </button>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  {departmentStats.length} Depts
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {departmentStats.length === 0 ? (
                <div className="sm:col-span-2 text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-2 p-4">
                  <Layers size={32} className="mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-700">No Departments Configured</p>
                  <p className="text-xs text-slate-500">Click "Add Department" to create your operational teams.</p>
                  <button
                    onClick={() => setIsDeptModalOpen(true)}
                    className="btn btn-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold mt-1 border-none shadow-xs"
                  >
                    + Create Department
                  </button>
                </div>
              ) : (
                departmentStats.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition-all space-y-3 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.colorCode || '#4f46e5' }}></span>
                          <h3 className="font-bold text-sm text-slate-900">{dept.name}</h3>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Leader: <strong className="text-slate-800 font-semibold">{dept.leader ? dept.leader.name : 'Unassigned'}</strong>
                        </span>
                      </div>
                      <span className="text-lg font-black font-display text-indigo-600">{dept.progress}%</span>
                    </div>

                    <progress
                      className="progress progress-primary w-full h-2 bg-slate-200"
                      value={dept.progress}
                      max="100"
                    ></progress>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span className="flex items-center gap-1 font-medium">
                        <CheckCircle size={12} className="text-emerald-600" />
                        {dept.completedTasks}/{dept.totalTasks} Tasks
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Users size={12} />
                        {dept.membersCount} Workers
                      </span>
                      {dept.openIssuesCount > 0 && (
                        <span className="badge badge-xs badge-error text-white font-bold">
                          {dept.openIssuesCount} Issues
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Upcoming Deadlines & Real-time Activity Stream */}
        <div className="space-y-6">
          
          {/* Upcoming Deadlines */}
          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-500" />
                <h3 className="font-display font-bold text-base text-slate-900">Upcoming Deadlines</h3>
              </div>
            </div>

            <div className="space-y-2.5">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No active upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 truncate max-w-[160px]">{item.title}</span>
                      <span className={`badge badge-xs ${item.status === 'OVERDUE' ? 'badge-warning font-bold text-slate-900' : 'badge-ghost text-slate-600'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.departmentName}</span>
                      <span className="font-mono text-amber-600 font-bold">
                        {new Date(item.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Activity Stream */}
          <div className="card-premium p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-600" />
                <h3 className="font-display font-bold text-base text-slate-900">Live Activity Log</h3>
              </div>
            </div>

            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No activity recorded yet.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 truncate">{act.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 leading-tight">{act.details}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modals */}
      <CreateEventModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
      <AddDepartmentModal isOpen={isDeptModalOpen} onClose={() => setIsDeptModalOpen(false)} />
      <CreateTaskModal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} />
      <UserRoleManagementModal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} />

    </div>
  );
};

export default EventCreatorDashboard;
