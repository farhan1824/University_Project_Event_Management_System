import React, { useState, useEffect } from 'react';
import { taskAPI, departmentAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { useSocket } from '../context/SocketContext';
import { PlusCircle, X, Calendar, Clock, User, Layers, Flag } from 'lucide-react';

export const CreateTaskModal = ({ isOpen, onClose, defaultDepartmentId, onSuccess }) => {
  const { selectedEventId, currentEventData, refreshEventData } = useEvent();
  const { socket } = useSocket();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [departmentId, setDepartmentId] = useState(defaultDepartmentId || '');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [deadlineHours, setDeadlineHours] = useState('4');
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // When department changes, load members of that department
  useEffect(() => {
    if (defaultDepartmentId) setDepartmentId(defaultDepartmentId);
  }, [defaultDepartmentId]);

  useEffect(() => {
    if (departmentId) {
      loadDepartmentMembers(departmentId);
    }
  }, [departmentId]);

  const loadDepartmentMembers = async (deptId) => {
    try {
      const res = await departmentAPI.getById(deptId);
      if (res.data.success) {
        setAvailableWorkers(res.data.data.members || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const departments = currentEventData?.departments || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !departmentId) return;

    try {
      setSubmitting(true);
      const deadlineDate = new Date(Date.now() + parseInt(deadlineHours, 10) * 3600000).toISOString();

      const res = await taskAPI.create({
        eventId: selectedEventId,
        departmentId,
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignedTo || null,
        priority,
        deadline: deadlineDate
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
        onClose();
        if (onSuccess) onSuccess(res.data.data);
      }
    } catch (err) {
      console.error('Failed to create task:', err);
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
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <PlusCircle size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">Create Operational Task</h3>
              <p className="text-xs text-slate-500">Assign work to department workers with a strict deadline</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          
          {/* Department Selection */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <Layers size={13} className="text-primary" /> Target Department *
            </label>
            <select
              required
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setAssignedTo('');
              }}
              className="select select-bordered select-sm sm:select-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900"
            >
              <option value="" disabled>Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Task Title */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Task Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Set up VIP lounge seating & sound check"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered input-sm sm:input-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-xs sm:text-sm text-slate-900"
            />
          </div>

          {/* Description */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Instructions & Checkpoints
            </label>
            <textarea
              rows={2}
              placeholder="Provide exact checklist instructions for the worker..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-slate-50 focus:bg-white rounded-xl text-xs border-slate-200 focus:border-indigo-600 text-slate-900"
            ></textarea>
          </div>

          {/* Assign Worker */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <User size={13} className="text-primary" /> Assign Ground Worker
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="select select-bordered select-sm sm:select-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900 text-xs sm:text-sm"
            >
              <option value="">-- Unassigned (Delegate later) --</option>
              {availableWorkers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.phone || 'Ground Worker'})
                </option>
              ))}
            </select>
          </div>

          {/* Priority & Deadline Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Flag size={13} className="text-primary" /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="select select-bordered select-sm w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 text-slate-900"
              >
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟡 High</option>
                <option value="MEDIUM">🔵 Medium</option>
                <option value="LOW">⚪ Low</option>
              </select>
            </div>

            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                <Clock size={13} className="text-primary" /> Target Deadline
              </label>
              <select
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(e.target.value)}
                className="select select-bordered select-sm w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 text-slate-900"
              >
                <option value="1">1 Hour</option>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
                <option value="8">8 Hours</option>
                <option value="12">12 Hours</option>
                <option value="24">24 Hours</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 pb-safe">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost text-slate-500">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !departmentId}
              className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 px-4 border-none touch-active"
            >
              {submitting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                'Create & Broadcast Task'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CreateTaskModal;
