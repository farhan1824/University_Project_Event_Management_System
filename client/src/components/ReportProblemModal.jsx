import React, { useState } from 'react';
import { issueAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { AlertTriangle, X, Check } from 'lucide-react';

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
        // Automatically open the issue chat room
        openIssueChat(res.data.data.id);
      }
    } catch (err) {
      console.error('Failed to report issue:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-2xl w-full max-w-lg shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-error/20 text-error">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-base-content">Report a Problem</h3>
              <p className="text-xs text-base-content/60">
                {task ? `Task: ${task.title}` : 'Operational problem reporting'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Step 1: Select Category */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-2 block">
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
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    category === cat.id
                      ? 'bg-primary/20 border-primary text-primary font-bold shadow-sm'
                      : 'bg-base-100 border-base-content/10 hover:bg-base-300'
                  }`}
                >
                  <div className="text-xs font-semibold">{cat.label}</div>
                  <div className="text-[10px] text-base-content/60 leading-tight mt-0.5">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Problem Headline */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              2. Problem Headline
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Main power cable damaged and sparking"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered w-full bg-base-100 rounded-xl text-sm"
            />
          </div>

          {/* Step 3: Priority */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              3. Urgency / Priority
            </label>
            <div className="flex gap-2">
              {['CRITICAL', 'HIGH', 'MEDIUM'].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`btn btn-xs flex-1 rounded-lg font-bold ${
                    priority === p
                      ? p === 'CRITICAL' ? 'btn-error text-white' : p === 'HIGH' ? 'btn-warning text-slate-900' : 'btn-info text-white'
                      : 'btn-outline border-base-content/20'
                  }`}
                >
                  {p === 'CRITICAL' ? '🔴 Critical (Stop Work)' : p === 'HIGH' ? '🟠 High' : '🔵 Medium'}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Short Description */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              4. Additional Details
            </label>
            <textarea
              rows={2}
              placeholder="Describe what happened or what replacement is needed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-base-100 rounded-xl text-xs"
            ></textarea>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-content/10">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="btn btn-sm btn-error text-white font-bold gap-1.5 px-5 shadow-lg shadow-error/20"
            >
              {submitting ? <span className="loading loading-spinner loading-xs"></span> : <AlertTriangle size={16} />}
              Submit Problem
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ReportProblemModal;
