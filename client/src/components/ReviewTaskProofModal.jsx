import React, { useState } from 'react';
import { taskAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  RotateCcw, 
  User, 
  Clock, 
  FileText, 
  Layers, 
  ExternalLink 
} from 'lucide-react';

export const ReviewTaskProofModal = ({ isOpen, onClose, task, onSuccess }) => {
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket } = useSocket();

  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [showReworkInput, setShowReworkInput] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !task) return null;

  // Approve Task
  const handleApprove = async () => {
    try {
      setProcessing(true);
      setError(null);
      const res = await taskAPI.approve(task.id);
      if (res.data.success) {
        if (socket) {
          socket.emit('broadcast_task_update', {
            eventId: selectedEventId,
            task: res.data.data,
            updatedBy: 'Team Leader'
          });
        }
        refreshEventData();
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error('Failed to approve task', err);
      setError('Failed to approve task. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Request Rework / Reject
  const handleReject = async () => {
    if (!showReworkInput) {
      setShowReworkInput(true);
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      const res = await taskAPI.reject(task.id, {
        feedbackNotes: feedbackNotes.trim()
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
        if (onSuccess) onSuccess(res.data.data);
        onClose();
      }
    } catch (err) {
      console.error('Failed to request rework', err);
      setError('Failed to send rework request.');
    } finally {
      setProcessing(false);
    }
  };

  const assigneeName = task.assignee?.name || task.assignedTo?.name || 'Worker';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-modal p-5 sm:p-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">
                Review Completion Proof
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px] sm:max-w-[320px]">
                {task.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-4 flex-1 overflow-y-auto pr-1">
          
          {/* Worker Info Badge */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <User size={15} className="text-primary" />
              <span className="text-slate-600">Submitted by: <strong className="text-slate-900 font-bold">{assigneeName}</strong></span>
            </div>
            <div className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
              <Clock size={12} />
              {task.submittedAt ? new Date(task.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
            </div>
          </div>

          {/* Photo Proof View */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1.5 block">
              Submitted Photo Evidence
            </label>
            {task.proofImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-72 shadow-inner group">
                <img
                  src={task.proofImage}
                  alt="Task completion evidence"
                  className="w-full h-56 sm:h-64 object-cover"
                />
                <a
                  href={task.proofImage}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute bottom-3 right-3 btn btn-xs bg-white/90 hover:bg-white text-slate-800 backdrop-blur-md rounded-xl gap-1 text-[11px] shadow-md border border-slate-200"
                >
                  <ExternalLink size={12} /> View Full Image
                </a>
              </div>
            ) : (
              <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No photo was attached with this submission.
              </div>
            )}
          </div>

          {/* Worker Notes */}
          {task.proofNotes && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileText size={14} className="text-indigo-600" /> Worker Notes:
              </div>
              <p className="text-slate-600 italic pl-5 leading-relaxed">
                "{task.proofNotes}"
              </p>
            </div>
          )}

          {/* Feedback Notes Input (when requesting rework) */}
          {showReworkInput && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 animate-in fade-in duration-150">
              <label className="label-text font-bold text-xs text-amber-900 flex items-center gap-1">
                <AlertTriangle size={14} className="text-amber-600" /> Rework Instructions for Worker:
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Please straighten row 4 chairs and double check the cable clamps on left truss..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="textarea textarea-bordered w-full bg-white rounded-xl text-xs border-amber-200 focus:border-amber-400 text-slate-900"
              ></textarea>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3.5 border-t border-slate-100 mt-3 gap-2 flex-wrap pb-safe">
          <button
            type="button"
            onClick={handleReject}
            disabled={processing}
            className="btn btn-sm bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 font-bold rounded-xl gap-1 shadow-xs touch-active"
          >
            <RotateCcw size={14} />
            {showReworkInput ? 'Send Rework Request' : 'Request Changes'}
          </button>

          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={processing}
              className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1.5 shadow-md shadow-emerald-600/20 px-4 border-none touch-active"
            >
              {processing ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Approve & Complete</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ReviewTaskProofModal;
