import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEvent } from '../../context/EventContext';
import { useSocket } from '../../context/SocketContext';
import { taskAPI } from '../../services/api';
import ReportProblemModal from '../../components/ReportProblemModal';
import SubmitTaskProofModal from '../../components/SubmitTaskProofModal';
import { 
  CheckCircle, 
  Play, 
  AlertTriangle, 
  Clock, 
  MessageSquare, 
  Zap, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  Camera, 
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export const WorkerDashboard = () => {
  const { user } = useAuth();
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket, openIssueChat } = useSocket();

  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskForProblem, setSelectedTaskForProblem] = useState(null);
  const [selectedTaskForProof, setSelectedTaskForProof] = useState(null);

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

  // Categorize tasks for easy scrolling on mobile
  const activeTasks = myTasks.filter(t => 
    t.status === 'IN_PROGRESS' || t.status === 'BLOCKED' || t.status === 'OVERDUE' || t.status === 'PENDING_APPROVAL'
  );
  const pendingTasks = myTasks.filter(t => t.status === 'NOT_STARTED');
  const completedTasks = myTasks.filter(t => t.status === 'COMPLETED');

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-24 text-left">
      
      {/* Worker Greeting Banner - Mobile Hero Card */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-indigo-600/15 relative overflow-hidden">
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase text-white/95">
              👷 Ground Operations
            </span>
            <span className="text-xs font-mono font-bold text-indigo-100 bg-black/20 px-2.5 py-0.5 rounded-full">
              {myTasks.length} Assigned
            </span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-3xl text-white mt-3 leading-tight">
            {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100/90 mt-1 leading-relaxed">
            Tap <strong>Start</strong> when beginning, <strong>Submit Proof</strong> with live camera when done, or <strong>Report Problem</strong> if blocked.
          </p>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/15 text-center">
            <div className="bg-white/10 rounded-2xl p-2">
              <div className="text-lg font-black">{activeTasks.length}</div>
              <div className="text-[10px] text-indigo-200 uppercase font-semibold">Active</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2">
              <div className="text-lg font-black">{pendingTasks.length}</div>
              <div className="text-[10px] text-indigo-200 uppercase font-semibold">To Start</div>
            </div>
            <div className="bg-white/10 rounded-2xl p-2">
              <div className="text-lg font-black text-emerald-300">{completedTasks.length}</div>
              <div className="text-[10px] text-indigo-200 uppercase font-semibold">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <span className="loading loading-spinner loading-md text-primary"></span>
        </div>
      ) : myTasks.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-3xl border border-dashed border-slate-200 p-6 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-primary flex items-center justify-center mx-auto mb-3">
            <Sparkles size={28} />
          </div>
          <h3 className="font-display font-bold text-base text-slate-800">No Tasks Assigned Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Your Team Leader has not assigned any tasks to your roster in this event. Relax or check in with your lead!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* Active / In Progress / Pending Approval / Blocked Tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-indigo-700 flex items-center gap-1.5 px-1">
                <Zap size={14} className="text-indigo-600" /> Active Tasks ({activeTasks.length})
              </h2>

              {activeTasks.map((task) => {
                const isBlocked = task.status === 'BLOCKED' || task.activeIssue;
                const isOverdue = task.status === 'OVERDUE';
                const isPendingApproval = task.status === 'PENDING_APPROVAL';

                return (
                  <div
                    key={task.id}
                    className={`card-premium p-5 space-y-4 transition-all ${
                      isBlocked
                        ? 'border-rose-300 bg-rose-50/40 glow-critical'
                        : isPendingApproval
                          ? 'border-amber-300 bg-amber-50/40 glow-warning'
                          : isOverdue
                            ? 'border-amber-300 bg-amber-50/30'
                            : 'border-indigo-200 bg-white glow-primary'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`badge badge-sm font-bold shadow-xs ${
                            isBlocked 
                              ? 'badge-error text-white animate-pulse' 
                              : isPendingApproval 
                                ? 'badge-warning text-slate-900 font-bold' 
                                : isOverdue 
                                  ? 'badge-warning text-slate-900' 
                                  : 'bg-indigo-600 text-white'
                          }`}>
                            {isBlocked 
                              ? 'BLOCKED / PROBLEM' 
                              : isPendingApproval 
                                ? '🟡 PENDING LEADER APPROVAL' 
                                : isOverdue 
                                  ? 'OVERDUE' 
                                  : 'WORKING NOW'}
                          </span>
                          <span className="badge badge-sm bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                            {task.departmentName}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-lg text-slate-900 mt-2 leading-snug">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Deadline & Progress Pill */}
                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                      <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <Clock size={13} className="text-amber-500" />
                        Target: <strong className="text-slate-900 font-bold">{new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                      </span>
                      <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        {task.progress}% Done
                      </span>
                    </div>

                    {/* Rework Request Feedback Alert */}
                    {task.feedbackNotes && !isPendingApproval && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs space-y-1">
                        <div className="font-bold text-amber-800 flex items-center gap-1">
                          <RotateCcw size={14} /> Team Leader Requested Changes:
                        </div>
                        <p className="text-slate-700 pl-4 italic">
                          "{task.feedbackNotes}"
                        </p>
                      </div>
                    )}

                    {/* Blocked Issue Alert & Local/Escalated Chat button */}
                    {task.activeIssue && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-rose-700 font-medium">
                          <ShieldAlert size={18} className="shrink-0 text-rose-600" />
                          <span className="truncate">{task.activeIssue.title}</span>
                        </div>
                        <button
                          onClick={() => openIssueChat(task.activeIssue.id)}
                          className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 rounded-xl shadow-sm"
                        >
                          <MessageSquare size={13} /> Chat Leader
                        </button>
                      </div>
                    )}

                    {/* Pending Approval Notice */}
                    {isPendingApproval && (
                      <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-amber-800 font-semibold">
                          <Camera size={16} className="shrink-0 text-amber-600" />
                          <span>Proof submitted! Waiting for leader review & sign-off.</span>
                        </div>
                        <button
                          onClick={() => setSelectedTaskForProof(task)}
                          className="btn btn-xs btn-outline border-amber-400 text-amber-800 hover:bg-amber-100 rounded-xl text-[11px]"
                        >
                          Re-submit
                        </button>
                      </div>
                    )}

                    {/* Large Mobile Action Buttons */}
                    {!isPendingApproval && (
                      <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                          onClick={() => setSelectedTaskForProof(task)}
                          className="btn btn-md bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md shadow-emerald-600/25 gap-1.5 border-none touch-active"
                        >
                          <Camera size={18} /> SUBMIT PROOF
                        </button>

                        <button
                          onClick={() => setSelectedTaskForProblem(task)}
                          className="btn btn-md btn-outline border-rose-300 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-xs rounded-2xl gap-1.5 touch-active"
                        >
                          <AlertTriangle size={16} /> REPORT PROBLEM
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending / Not Started Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-slate-500 flex items-center gap-1.5 px-1">
                <Clock size={14} /> Pending to Start ({pendingTasks.length})
              </h2>

              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  className="card-premium p-5 space-y-3 bg-white border-slate-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="badge badge-sm bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold mb-1">
                        {task.departmentName}
                      </span>
                      <h3 className="font-display font-bold text-base text-slate-900">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-slate-600 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-2 rounded-xl">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock size={13} className="text-slate-400" /> Deadline: {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="badge badge-xs bg-slate-200 text-slate-700 font-bold">{task.priority}</span>
                  </div>

                  {/* 1-Tap Start Button */}
                  <button
                    onClick={() => handleStartTask(task)}
                    className="btn btn-md bg-indigo-600 hover:bg-indigo-700 w-full text-white font-black text-sm rounded-2xl shadow-md shadow-indigo-600/20 gap-2 mt-1 border-none touch-active"
                  >
                    <Play size={18} /> START THIS WORK
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Completed Tasks Summary Section */}
          {completedTasks.length > 0 && (
            <div className="space-y-3 pt-2">
              <h2 className="font-display font-bold text-xs uppercase tracking-widest text-emerald-700 flex items-center gap-1.5 px-1">
                <CheckCircle2 size={14} className="text-emerald-600" /> Approved & Finished Work ({completedTasks.length})
              </h2>

              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-600">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">{task.title}</h4>
                        <span className="text-[11px] text-slate-500 font-medium">{task.departmentName}</span>
                      </div>
                    </div>
                    <span className="badge badge-sm bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                      100% VERIFIED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Report Problem Modal */}
      <ReportProblemModal
        isOpen={Boolean(selectedTaskForProblem)}
        onClose={() => setSelectedTaskForProblem(null)}
        task={selectedTaskForProblem}
        onSuccess={() => {
          loadMyTasks();
          refreshEventData();
        }}
      />

      {/* Submit Task Photo Proof Modal */}
      <SubmitTaskProofModal
        isOpen={Boolean(selectedTaskForProof)}
        onClose={() => setSelectedTaskForProof(null)}
        task={selectedTaskForProof}
        onSuccess={() => {
          loadMyTasks();
          refreshEventData();
        }}
      />

    </div>
  );
};

export default WorkerDashboard;
