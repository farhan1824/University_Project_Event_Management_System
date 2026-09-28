import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useSocket } from '../../context/SocketContext';
import { taskAPI } from '../../services/api';
import ReportProblemModal from '../../components/ReportProblemModal';
import { 
  CheckCircle, 
  Play, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Zap, 
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';

export const WorkerDashboard = () => {
  const { user } = useAuth();
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket, openIssueChat } = useSocket();

  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForProblem, setSelectedTaskForProblem] = useState(null);

  // Load tasks assigned to this worker in the active event
  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const res = await taskAPI.getAll({
        eventId: selectedEventId,
        assignedTo: user.id
      });
      if (res.data.success) {
        setMyTasks(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId && user) {
      loadMyTasks();
    }
  }, [selectedEventId, user]);

  // Worker Action: 1-Tap START
  const handleStartTask = async (task) => {
    try {
      const res = await taskAPI.start(task.id);
      if (res.data.success) {
        if (socket) {
          socket.emit('broadcast_task_update', {
            eventId: selectedEventId,
            task: res.data.data,
            updatedBy: user.name
          });
        }
        refreshEventData();
        loadMyTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Worker Action: 1-Tap COMPLETE
  const handleCompleteTask = async (task) => {
    try {
      const res = await taskAPI.complete(task.id);
      if (res.data.success) {
        if (socket) {
          socket.emit('broadcast_task_update', {
            eventId: selectedEventId,
            task: res.data.data,
            updatedBy: user.name
          });
        }
        refreshEventData();
        loadMyTasks();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Categorize tasks for easy scrolling on mobile
  const activeTasks = myTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'BLOCKED' || t.status === 'OVERDUE');
  const pendingTasks = myTasks.filter(t => t.status === 'NOT_STARTED');
  const completedTasks = myTasks.filter(t => t.status === 'COMPLETED');

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-16">
      
      {/* Worker Greeting Banner */}
      <div className="bg-gradient-to-br from-base-200 to-base-300 border border-base-content/10 rounded-3xl p-5 shadow-lg text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="badge badge-accent badge-sm uppercase font-mono font-bold tracking-wider text-slate-950">
              👷 Ground Worker Portal
            </span>
          </div>
          <span className="text-xs font-mono text-base-content/60">
            {myTasks.length} Assigned Task(s)
          </span>
        </div>

        <h1 className="font-display font-black text-2xl text-base-content mt-2">
          {user.name}
        </h1>
        <p className="text-xs text-base-content/70 mt-0.5">
          Tap <strong>Start</strong> when you begin work, <strong>Done</strong> when finished, or <strong>Report Problem</strong> if blocked.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : myTasks.length === 0 ? (
        <div className="text-center py-12 bg-base-200/50 rounded-3xl border border-dashed border-base-content/15 p-6">
          <Sparkles size={36} className="mx-auto text-primary/60 mb-2" />
          <h3 className="font-bold text-base text-base-content">No Tasks Assigned Yet</h3>
          <p className="text-xs text-base-content/60 mt-1">Your Team Leader has not assigned any tasks to your roster in this event.</p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Active / In Progress / Blocked Tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-primary flex items-center gap-1.5 px-1">
                <Zap size={14} /> Active Work ({activeTasks.length})
              </h2>

              {activeTasks.map((task) => {
                const isBlocked = task.status === 'BLOCKED' || task.activeIssue;
                const isOverdue = task.status === 'OVERDUE';

                return (
                  <div
                    key={task.id}
                    className={`rounded-3xl p-5 border transition-all shadow-xl space-y-4 ${
                      isBlocked
                        ? 'bg-base-200 border-error/50 glow-critical'
                        : isOverdue
                          ? 'bg-base-200 border-warning/50'
                          : 'bg-base-200 border-primary/40 glow-primary'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge badge-sm font-bold ${
                            isBlocked ? 'badge-error text-white animate-pulse' : isOverdue ? 'badge-warning text-slate-900' : 'badge-info text-white'
                          }`}>
                            {isBlocked ? 'BLOCKED / PROBLEM' : isOverdue ? 'OVERDUE' : 'WORKING NOW'}
                          </span>
                          <span className="badge badge-sm badge-ghost text-xs">
                            {task.departmentName}
                          </span>
                        </div>
                        <h3 className="font-display font-black text-lg text-base-content mt-2 leading-snug">
                          {task.title}
                        </h3>
                        <p className="text-xs text-base-content/75 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    {/* Deadline & Progress */}
                    <div className="flex items-center justify-between text-xs bg-base-100/60 p-2.5 rounded-2xl border border-base-content/5">
                      <span className="flex items-center gap-1 text-base-content/70">
                        <Clock size={13} className="text-warning" />
                        Target: <strong className="text-base-content">{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </span>
                      <span className="font-bold text-primary">{task.progress}% Progress</span>
                    </div>

                    {/* Blocked Issue Alert & Tri-party Chat button */}
                    {task.activeIssue && (
                      <div className="p-3 bg-error/15 border border-error/30 rounded-2xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-error font-medium">
                          <ShieldAlert size={18} className="shrink-0" />
                          <span className="truncate">{task.activeIssue.title}</span>
                        </div>
                        <button
                          onClick={() => openIssueChat(task.activeIssue.id)}
                          className="btn btn-xs btn-error text-white font-bold gap-1 rounded-xl shadow-md"
                        >
                          <MessageSquare size={13} /> Chat Room
                        </button>
                      </div>
                    )}

                    {/* Large Mobile Action Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="btn btn-md btn-success text-white font-black text-sm rounded-2xl shadow-lg shadow-success/20 gap-1.5"
                      >
                        <CheckCircle size={18} /> I'M DONE
                      </button>

                      <button
                        onClick={() => setSelectedTaskForProblem(task)}
                        className="btn btn-md btn-error btn-outline font-bold text-xs rounded-2xl gap-1.5 hover:text-white"
                      >
                        <AlertTriangle size={16} /> REPORT PROBLEM
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending / Not Started Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-base-content/60 flex items-center gap-1.5 px-1">
                <Clock size={14} /> Pending to Start ({pendingTasks.length})
              </h2>

              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-3xl p-5 bg-base-200 border border-base-content/10 shadow-md space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="badge badge-sm badge-ghost text-xs mb-1">
                        {task.departmentName}
                      </span>
                      <h3 className="font-display font-bold text-base text-base-content">
                        {task.title}
                      </h3>
                      <p className="text-xs text-base-content/70 mt-1">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-base-content/60">
                    <span className="flex items-center gap-1">
                      <Clock size={13} /> Deadline: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="badge badge-xs badge-neutral">{task.priority} Priority</span>
                  </div>

                  {/* 1-Tap Start Button */}
                  <button
                    onClick={() => handleStartTask(task)}
                    className="btn btn-md btn-primary w-full text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 gap-2 mt-2"
                  >
                    <Play size={18} /> START THIS WORK
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-success flex items-center gap-1.5 px-1">
                <CheckCircle size={14} /> Finished Work ({completedTasks.length})
              </h2>

              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-2xl p-4 bg-base-200/50 border border-success/20 opacity-80 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-base-content line-through block">{task.title}</span>
                    <span className="text-[11px] text-base-content/50">{task.departmentName}</span>
                  </div>
                  <span className="badge badge-success text-white font-bold gap-1 text-xs">
                    ✓ Done
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Problem Report Modal */}
      <ReportProblemModal
        isOpen={Boolean(selectedTaskForProblem)}
        onClose={() => setSelectedTaskForProblem(null)}
        task={selectedTaskForProblem}
        onSuccess={() => {
          loadMyTasks();
          refreshEventData();
        }}
      />

    </div>
  );
};

export default WorkerDashboard;
