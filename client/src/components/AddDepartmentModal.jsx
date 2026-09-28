import React, { useState, useEffect } from 'react';
import { departmentAPI, authAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { Layers, User, X, Plus } from 'lucide-react';

const PALETTE = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6'];

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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-2xl w-full max-w-md shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-secondary/20 text-secondary">
              <Layers size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-base-content">Add Department</h3>
              <p className="text-xs text-base-content/60">Configure department and assign Team Leader</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Department Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Media & Photography, Stage Management, Security"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm w-full bg-base-100 rounded-xl"
            />
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 flex items-center gap-1">
              <User size={13} /> Assign Team Leader
            </label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="select select-bordered select-sm w-full bg-base-100 rounded-xl"
            >
              <option value="">No Leader Assigned Yet</option>
              {leaders.map((l) => (
                <option key={l.id} value={l.id}>{l.name} ({l.email})</option>
              ))}
            </select>
            <span className="text-[11px] text-base-content/50 mt-1 block">
              * Note: A Team Leader can manage multiple departments simultaneously.
            </span>
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Color Tag
            </label>
            <div className="flex gap-2">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColorCode(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    colorCode === c ? 'scale-110 border-white ring-2 ring-primary/40' : 'border-transparent opacity-75'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Description / Scope
            </label>
            <textarea
              rows={2}
              placeholder="Describe what operations this department executes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-base-100 rounded-xl text-xs"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-content/10">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="btn btn-sm btn-secondary rounded-xl font-bold px-5"
            >
              {submitting ? <span className="loading loading-spinner loading-xs"></span> : <Plus size={16} />}
              Create Department
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDepartmentModal;
