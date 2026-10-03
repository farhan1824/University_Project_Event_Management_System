import React, { useState } from 'react';
import { eventAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { Calendar, MapPin, X, Plus, Sparkles } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-modal p-5 sm:p-6 animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-slate-900">Create New Event</h3>
              <p className="text-xs text-slate-500">Launch a new event command center</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-slate-400 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Event Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Annual Tech Symposium 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input input-bordered input-sm sm:input-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900"
            />
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
              <MapPin size={13} className="text-primary" /> Location / Venue
            </label>
            <input
              type="text"
              placeholder="e.g. University Main Auditorium & Grounds"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input input-bordered input-sm sm:input-md w-full bg-slate-50 focus:bg-white rounded-xl border-slate-200 focus:border-indigo-600 text-slate-900"
            />
          </div>

          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-slate-600 mb-1 block">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief summary of the event schedule and goals..."
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
                'Launch Event'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CreateEventModal;
