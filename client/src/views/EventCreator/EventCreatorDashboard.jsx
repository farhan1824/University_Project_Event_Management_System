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
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CalendarPlus
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

  // If no events exist in the system yet, show the "Create Your First Event" onboarding screen
  if (!events || events.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary to-secondary mx-auto flex items-center justify-center text-white text-4xl shadow-2xl shadow-primary/30 animate-pulse-subtle">
          🎪
        </div>

        <div className="space-y-2">
          <span className="badge badge-primary badge-sm font-mono uppercase font-bold tracking-wider">
            👑 Event Creator Command Center
          </span>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-base-content tracking-tight">
            Welcome to EventOps!
          </h1>
          <p className="text-sm text-base-content/70 max-w-md mx-auto">
            You are the primary organizer. Start by creating your first event, then configure departments and assign team leaders.
          </p>
        </div>

        <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4 text-left">
          <h3 className="font-display font-bold text-base text-base-content flex items-center gap-2">
            <Sparkles size={18} className="text-primary" /> Setup Workflow:
          </h3>
          <ol className="steps steps-vertical sm:steps-horizontal w-full text-xs font-semibold">
            <li className="step step-primary">Create Event</li>
            <li className="step">Add Departments</li>
            <li className="step">Assign Leaders</li>
            <li className="step">Create Tasks</li>
          </ol>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="btn btn-primary flex-1 rounded-2xl font-bold shadow-lg shadow-primary/20 gap-2"
            >
              <CalendarPlus size={18} /> Create Your First Event
            </button>
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="btn btn-outline border-base-content/20 hover:bg-base-100 rounded-2xl font-semibold gap-2"
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
        <p className="mt-3 text-sm text-base-content/60">Loading operational command center...</p>
      </div>
    );
  }

  const { event, health } = currentEventData;
  const stats = health?.stats || {};
  const departmentStats = health?.departmentStats || [];
  const criticalIssues = health?.criticalIssues || [];
  const upcomingDeadlines = health?.upcomingDeadlines || [];

  return (
    <div className="space-y-6 pb-12">
      
      {/* 1. Header Banner & Action Bar */}
      <div className="bg-gradient-to-r from-base-200 via-base-200 to-base-300 border border-base-content/10 rounded-3xl p-5 sm:p-7 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="badge badge-primary badge-sm uppercase font-mono font-bold tracking-wider">
                👑 Organizer Command
              </span>
              <HealthBadge status={health.healthStatus} label={health.healthLabel} size="md" />
            </div>
            
            <h1 className="font-display font-black text-2xl sm:text-3xl text-base-content tracking-tight">
              {event.name}
            </h1>
            
            <p className="text-xs sm:text-sm text-base-content/70 max-w-2xl">
              {event.description || 'Centralized operational visibility, department health, and critical issue escalation.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="btn btn-sm btn-secondary rounded-xl font-bold shadow-md shadow-secondary/20 gap-1.5"
            >
              <ShieldCheck size={15} /> Manage Team & Roles
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn btn-sm btn-primary rounded-xl font-bold shadow-md shadow-primary/20 gap-1.5"
            >
              <Plus size={15} /> Add Task
            </button>
            <button
              onClick={() => setIsDeptModalOpen(true)}
              className="btn btn-sm btn-outline border-base-content/20 bg-base-100/50 hover:bg-base-100 rounded-xl font-medium gap-1.5"
            >
              <Layers size={15} /> Add Department
            </button>
            <button
              onClick={() => setIsEventModalOpen(true)}
              className="btn btn-sm btn-ghost hover:bg-base-300 rounded-xl font-medium gap-1.5"
            >
              <Calendar size={15} /> New Event
            </button>
          </div>

        </div>

        {/* Health Advisory Banner */}
        <div className={`mt-4 p-3 rounded-2xl border text-xs flex items-center gap-2.5 ${
          health.healthStatus === 'CRITICAL'
            ? 'bg-error/15 border-error/30 text-error font-semibold'
            : health.healthStatus === 'ATTENTION_NEEDED'
              ? 'bg-warning/15 border-warning/30 text-warning-content font-medium'
              : 'bg-success/15 border-success/30 text-success font-medium'
        }`}>
          {health.healthStatus === 'CRITICAL' ? <AlertOctagon size={18} className="shrink-0 animate-bounce" /> : <Sparkles size={18} className="shrink-0" />}
          <span>{health.healthMessage}</span>
        </div>
      </div>

      {/* 2. Key Metrics Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* Overall Progress */}
        <div className="bg-base-200/90 border border-base-content/10 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-base-content/60 uppercase tracking-wider">Overall Progress</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-primary">{health.overallProgress}%</span>
            <TrendingUp size={20} className="text-primary/70" />
          </div>
          <progress className="progress progress-primary w-full mt-2" value={health.overallProgress} max="100"></progress>
        </div>

        {/* Completed */}
        <div className="bg-base-200/90 border border-base-content/10 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-success uppercase tracking-wider">Completed</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-success">{stats.completed || 0}</span>
            <CheckCircle size={20} className="text-success/70" />
          </div>
          <span className="text-[10px] text-base-content/50">of {stats.total || 0} total tasks</span>
        </div>

        {/* In Progress */}
        <div className="bg-base-200/90 border border-base-content/10 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-info uppercase tracking-wider">In Progress</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-info">{stats.inProgress || 0}</span>
            <Clock size={20} className="text-info/70" />
          </div>
          <span className="text-[10px] text-base-content/50">actively working</span>
        </div>

        {/* Overdue */}
        <div className={`border rounded-2xl p-3.5 shadow-sm flex flex-col justify-between ${
          (stats.overdue || 0) > 0 ? 'bg-warning/10 border-warning/30' : 'bg-base-200/90 border-base-content/10'
        }`}>
          <span className="text-[11px] font-bold text-warning uppercase tracking-wider">Overdue</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-warning">{stats.overdue || 0}</span>
            <AlertTriangle size={20} className="text-warning/70" />
          </div>
          <span className="text-[10px] text-base-content/50">past deadline</span>
        </div>

        {/* Blocked */}
        <div className={`border rounded-2xl p-3.5 shadow-sm flex flex-col justify-between ${
          (stats.blocked || 0) > 0 ? 'bg-error/15 border-error/40 glow-critical' : 'bg-base-200/90 border-base-content/10'
        }`}>
          <span className="text-[11px] font-bold text-error uppercase tracking-wider">Blocked</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-error">{stats.blocked || 0}</span>
            <AlertOctagon size={20} className="text-error" />
          </div>
          <span className="text-[10px] text-base-content/50">stopped by problems</span>
        </div>

        {/* Escalated Issues */}
        <div className={`border rounded-2xl p-3.5 shadow-sm flex flex-col justify-between ${
          criticalIssues.length > 0 ? 'bg-error/20 border-error/50 glow-critical' : 'bg-base-200/90 border-base-content/10'
        }`}>
          <span className="text-[11px] font-bold text-error uppercase tracking-wider">Escalated</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black font-display text-error">{criticalIssues.length}</span>
            <ShieldAlert size={20} className="text-error" />
          </div>
          <span className="text-[10px] text-base-content/50">requires intervention</span>
        </div>

      </div>

      {/* 3. Main Dashboard Grid: Critical Issues + Department Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Department Progress Matrix & Critical Escalations */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Critical Escalated Issues Hub */}
          <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-error/20 text-error">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-base-content">
                    Critical Issues & Escalation Hub
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Unresolved problems escalated from Team Leaders requiring organizer instruction
                  </p>
                </div>
              </div>
              <span className={`badge ${criticalIssues.length > 0 ? 'badge-error text-white font-bold animate-pulse' : 'badge-ghost text-xs'}`}>
                {criticalIssues.length} Active
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {criticalIssues.length === 0 ? (
                <div className="text-center py-8 bg-base-100/50 rounded-2xl border border-dashed border-base-content/15">
                  <CheckCircle size={32} className="mx-auto text-success/60 mb-2" />
                  <p className="text-sm font-semibold text-base-content">No Unresolved Critical Issues</p>
                  <p className="text-xs text-base-content/50 mt-0.5">All department tasks are progressing without escalations.</p>
                </div>
              ) : (
                criticalIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 rounded-2xl bg-base-100 border border-error/30 hover:border-error transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-error badge-sm text-white font-bold">🔴 ESCALATED</span>
                        <span className="badge badge-sm badge-outline">{issue.category}</span>
                        <span className="text-xs text-base-content/60">
                          Dept: <strong className="text-primary">{issue.departmentName || 'Department'}</strong>
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-base-content">{issue.title}</h3>
                      <p className="text-xs text-base-content/70 line-clamp-1">{issue.description}</p>
                    </div>

                    <button
                      onClick={() => openIssueChat(issue.id)}
                      className="btn btn-sm btn-error text-white font-bold rounded-xl gap-1.5 shrink-0 shadow-md shadow-error/20"
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
          <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                  <Layers size={20} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base sm:text-lg text-base-content">
                    Department Progress & Operations
                  </h2>
                  <p className="text-xs text-base-content/60">
                    Live operational progress across all event departments
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDeptModalOpen(true)}
                  className="btn btn-xs btn-outline border-base-content/20 hover:bg-base-100 rounded-lg gap-1"
                >
                  <Plus size={13} /> Add Dept
                </button>
                <span className="text-xs font-mono text-base-content/60">
                  {departmentStats.length} Depts
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {departmentStats.length === 0 ? (
                <div className="sm:col-span-2 text-center py-8 bg-base-100/50 rounded-2xl border border-dashed border-base-content/15 space-y-2">
                  <Layers size={32} className="mx-auto text-base-content/40" />
                  <p className="text-sm font-semibold text-base-content">No Departments Configured</p>
                  <p className="text-xs text-base-content/50">Click "Add Department" to create your operational teams.</p>
                  <button
                    onClick={() => setIsDeptModalOpen(true)}
                    className="btn btn-xs btn-primary rounded-xl font-bold mt-1"
                  >
                    + Create Department
                  </button>
                </div>
              ) : (
                departmentStats.map((dept) => (
                  <div
                    key={dept.id}
                    className="p-4 rounded-2xl bg-base-100 border border-base-content/10 hover:border-base-content/25 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dept.colorCode }}></span>
                          <h3 className="font-bold text-sm text-base-content">{dept.name}</h3>
                        </div>
                        <span className="text-[11px] text-base-content/60 block mt-0.5">
                          Leader: <strong className="text-base-content font-medium">{dept.leader ? dept.leader.name : 'Unassigned'}</strong>
                        </span>
                      </div>
                      <span className="text-lg font-black font-display text-primary">{dept.progress}%</span>
                    </div>

                    <progress
                      className="progress progress-primary w-full h-2"
                      value={dept.progress}
                      max="100"
                    ></progress>

                    <div className="flex items-center justify-between text-[11px] text-base-content/60 pt-1 border-t border-base-content/5">
                      <span className="flex items-center gap-1">
                        <CheckCircle size={12} className="text-success" />
                        {dept.completedTasks}/{dept.totalTasks} Tasks
                      </span>
                      <span className="flex items-center gap-1">
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
          <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-warning" />
                <h3 className="font-display font-bold text-base text-base-content">Upcoming Deadlines</h3>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-base-content/50 py-4 text-center">No active upcoming deadlines.</p>
              ) : (
                upcomingDeadlines.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-xl bg-base-100 border border-base-content/10 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-base-content truncate max-w-[160px]">{item.title}</span>
                      <span className={`badge badge-xs ${item.status === 'OVERDUE' ? 'badge-warning font-bold text-slate-900' : 'badge-ghost'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-base-content/60">
                      <span>{item.departmentName}</span>
                      <span className="font-mono text-warning font-semibold">
                        {new Date(item.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Operational Activity Stream */}
          <div className="bg-base-200/90 border border-base-content/10 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-primary" />
                <h3 className="font-display font-bold text-base text-base-content">Live Activity Log</h3>
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {activities.length === 0 ? (
                <p className="text-xs text-base-content/50 py-4 text-center">No activity recorded yet.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base-content">{act.userName}</span>
                        <span className="text-[10px] text-base-content/50">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-base-content/75 mt-0.5">{act.details}</p>
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
