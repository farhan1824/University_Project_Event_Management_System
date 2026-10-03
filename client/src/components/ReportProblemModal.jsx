import React, { useState } from 'react';
import { issueAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { AlertTriangle, X, Check, ShieldAlert } from 'lucide-react';

const CATEGORIES = [
  { id: 'Equipment Problem', label: '⚙️ Equipment Problem', desc: 'Damaged cables, broken tools, generator fault' },
  { id: 'Material Missing', label: '📦 Material Missing', desc: 'Shortage of parts, tapes, bulbs, badges' },
  { id: 'Need More Workers', label: '👥 Need More Workers', desc: 'Heavy load, tight deadline, need extra hands' },
  { id: 'Cannot Complete Task', label: '🚫 Cannot Complete Task', desc: 'Physical blockage, power cut, stage occupied' },
  { id: 'Other', label: '❓ Other Issue', desc: 'Any other operational hindrance' }
];

export const ReportProblemModal = ({ isOpen, onClose, task, departmentId, onSuccess }) => {
  const { selectedEventId, refreshEventData } = useEvent();
  const { socket, openIssueChat } = useSocket();

  const [category, setCategory] = useState('Equipment Problem');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('CRITICAL');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      const res = await issueAPI.report({
        eventId: selectedEventId,
        departmentId: departmentId || task?.departmentId,
        taskId: task?.id || null,
        title: title.trim(),
        description: description.trim(),
        category,
        priority
      });

      if (res.data.success) {
        if (socket) {
          socket.emit('broadcast_issue_update', {
            eventId: selectedEventId,
            issue: res.data.data,
            action: 'REPORTED'
          });
        }
        refreshEventData();
        onClose();
        if (onSuccess) onSuccess(res.data.data);
        openIssueChat(res.data.data.id);
      }
    } catch (err) {
      console.error('Failed to report issue:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-modal p-5 sm:p-6 animate-in zoom-in-95 duration-150 text-left max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">Report a Problem</h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px] sm:max-w-[320px]">
                {task ? `Task: ${task.title}` : 'Operational problem reporting'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Step 1: Select Category */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-2 block">
              1. What's wrong? (Category)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    if (!title) setTitle(cat.label.replace(/^[^\s]+\s/, ''));
                  }}
                  className={`p-3 rounded-2xl text-left border transition-all touch-active ${
                    category === cat.id
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                    <span>{cat.label}</span>
                    {category === cat.id && <Check size={14} className="text-indigo-600 font-black" />}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Problem Headline */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              2. Problem Headline *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Stage left speaker cable shorted, power tripping"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered input-sm sm:input-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-xs sm:text-sm text-slate-900"
            />
          </div>

          {/* Step 3: Details */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              3. Details & Immediate Need
            </label>
            <textarea
              rows={2}
              placeholder="Describe what happened and what equipment or help you need..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-slate-50 focus:bg-white rounded-xl text-xs border-slate-200 focus:border-indigo-600 text-slate-900"
            ></textarea>
          </div>

          {/* Step 4: Urgency Priority */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1.5 block">
              4. Urgency Level
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPriority('CRITICAL')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  priority === 'CRITICAL'
                    ? 'border-rose-400 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🔴 Urgent / Blocking Work
              </button>
              <button
                type="button"
                onClick={() => setPriority('HIGH')}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  priority === 'HIGH'
                    ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                🟡 Medium Priority
              </button>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 pb-safe">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md shadow-rose-600/20 px-4 gap-1.5 border-none touch-active"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <ShieldAlert size={15} />
                  <span>Send Report to Team Leader</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default ReportProblemModal;
