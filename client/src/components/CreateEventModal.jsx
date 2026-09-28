import React, { useState } from 'react';
import { eventAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { Calendar, MapPin, X, Plus } from 'lucide-react';

export const CreateEventModal = ({ isOpen, onClose }) => {
  const { loadEvents, switchEvent } = useEvent();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSubmitting(true);
      const res = await eventAPI.create({
        name: name.trim(),
        description: description.trim(),
        location: location.trim() || 'Central Venue',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 86400000).toISOString()
      });

      if (res.data.success) {
        await loadEvents();
        switchEvent(res.data.data.id);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-2xl w-full max-w-md shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/20 text-primary">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-base-content">Create New Event</h3>
              <p className="text-xs text-base-content/60">Spawn a new isolated event command dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Event Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Sports Day 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm w-full bg-base-100 rounded-xl"
            />
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block flex items-center gap-1">
              <MapPin size={13} /> Location / Venue
            </label>
            <input
              type="text"
              placeholder="e.g. Main University Stadium & Indoor Arena"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input input-bordered input-sm w-full bg-base-100 rounded-xl"
            />
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1 block">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of event schedule and departments involved..."
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
              className="btn btn-sm btn-primary rounded-xl font-bold px-5"
            >
              {submitting ? <span className="loading loading-spinner loading-xs"></span> : <Plus size={16} />}
              Initialize Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventModal;
