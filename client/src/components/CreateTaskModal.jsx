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
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-2xl w-full max-w-lg shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <PlusCircle size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-base-content">Create Operational Task</h3>
              <p className="text-xs text-base-content/60">Assign work to department workers with a strict deadline</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          
          {/* Department Selection */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 flex items-center gap-1">
              <Layers size={13} /> Department
            </label>
            <select
              required
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="select select-bordered select-sm w-full bg-base-100 rounded-xl"
            >
              <option value="" disabled>Select Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Task Title */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Task Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rig Main Stage Moving Heads & Dimmer Packs"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input input-bordered input-sm w-full bg-base-100 rounded-xl"
            />
          </div>

          {/* Assign Worker & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 flex items-center gap-1">
                <User size={13} /> Assign To
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="select select-bordered select-sm w-full bg-base-100 rounded-xl"
              >
                <option value="">Unassigned (Any Worker)</option>
                {availableWorkers.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.phone})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 flex items-center gap-1">
                <Flag size={13} /> Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="select select-bordered select-sm w-full bg-base-100 rounded-xl font-medium"
              >
                <option value="CRITICAL">🔴 CRITICAL</option>
                <option value="HIGH">🟠 HIGH</option>
                <option value="MEDIUM">🔵 MEDIUM</option>
                <option value="LOW">⚪ LOW</option>
              </select>
            </div>
          </div>

          {/* Deadline Window */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 flex items-center gap-1">
              <Clock size={13} /> Deadline Target
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '2 Hours', val: '2' },
                { label: '4 Hours', val: '4' },
                { label: '8 Hours', val: '8' },
                { label: '24 Hours', val: '24' }
              ].map((d) => (
                <button
                  type="button"
                  key={d.val}
                  onClick={() => setDeadlineHours(d.val)}
                  className={`btn btn-xs rounded-lg ${
                    deadlineHours === d.val ? 'btn-primary' : 'btn-outline border-base-content/20'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Instructions / Description
            </label>
            <textarea
              rows={2}
              placeholder="Specify technical details, equipment required, and locations..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea textarea-bordered w-full bg-base-100 rounded-xl text-xs"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-content/10">
            <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !title.trim() || !departmentId}
              className="btn btn-sm btn-primary rounded-xl font-bold px-5"
            >
              {submitting ? <span className="loading loading-spinner loading-xs"></span> : <PlusCircle size={16} />}
              Assign Task
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
