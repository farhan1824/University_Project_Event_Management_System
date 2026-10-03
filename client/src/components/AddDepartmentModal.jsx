import React, { useState, useEffect } from 'react';
import { departmentAPI, authAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { Layers, User, X, Plus } from 'lucide-react';

const PALETTE = ['#4f46e5', '#7c3aed', '#0284c7', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4'];

export const AddDepartmentModal = ({ isOpen, onClose, onSuccess }) => {
  const { selectedEventId, refreshEventData } = useEvent();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [colorCode, setColorCode] = useState(PALETTE[0]);
  const [leaders, setLeaders] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadLeaders();
  }, []);

  const loadLeaders = async () => {
    try {
      const res = await authAPI.getUsers();
      if (res.data.success) {
        setLeaders(res.data.data.filter(u => u.role === 'TEAM_LEADER'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await departmentAPI.create({
        eventId: selectedEventId,
        name: name.trim(),
        description: description.trim(),
        leaderId: leaderId || null,
        colorCode
      });

      if (res.data.success) {
        refreshEventData();
        onClose();
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      console.error('Failed to create department:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-modal p-5 sm:p-6 animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">Add Department</h3>
              <p className="text-xs text-slate-500">Configure department and assign Team Leader</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Department Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Media & Photography, Stage Operations, Security"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm sm:input-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900"
            />
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <User size={13} className="text-primary" /> Assign Team Leader
            </label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="select select-bordered select-sm sm:select-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900 text-xs sm:text-sm"
            >
              <option value="">-- Unassigned (Assign later) --</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Department Color Theme
            </label>
            <div className="flex items-center gap-2 pt-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColorCode(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    colorCode === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                ></button>
              ))}
            </div>
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Roles and responsibilities of this department..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-slate-50 focus:bg-white rounded-xl text-xs border-slate-200 focus:border-indigo-600 text-slate-900"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 pb-safe">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 px-4 border-none touch-active"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                'Create Department'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default AddDepartmentModal;
