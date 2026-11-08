import React, { useState, useEffect } from 'react';
import { collaborationAPI, eventAPI } from '../services/api';
import { useEvent } from '../context/EventContext';
import { 
  Users, 
  Send, 
  X, 
  Mail, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles,
  UserCheck,
  Calendar
} from 'lucide-react';

export const CollaborationManagerModal = ({ isOpen, onClose }) => {
  const { events, selectedEventId, currentEventData } = useEvent();
  
  const [targetEmail, setTargetEmail] = useState('');
  const [targetEventId, setTargetEventId] = useState(selectedEventId || '');
  const [message, setMessage] = useState('');
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [collaborationsData, setCollaborationsData] = useState({ collaborators: [], requests: [] });
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTargetEventId(selectedEventId || (events[0] ? events[0].id : ''));
      setError(null);
      setSuccessMsg(null);
      setTargetEmail('');
      setMessage('');
      if (selectedEventId) {
        fetchEventCollaborations(selectedEventId);
      }
    }
  }, [isOpen, selectedEventId, events]);

  const fetchEventCollaborations = async (eventId) => {
    try {
      setLoadingData(true);
      const res = await collaborationAPI.getEventCollaborations(eventId);
      if (res.data.success) {
        setCollaborationsData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch event collaborations', err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!targetEmail.trim() || !targetEventId) {
      setError('Please provide a valid creator email and select an event.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      setSuccessMsg(null);

      const res = await collaborationAPI.sendRequest({
        receiverEmail: targetEmail.trim(),
        eventId: targetEventId,
        message: message.trim()
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Collaboration invite sent via email and in-app notification!');
        setTargetEmail('');
        setMessage('');
        fetchEventCollaborations(targetEventId);
      }
    } catch (err) {
      console.error('Failed to send collaboration invite', err);
      setError(err.response?.data?.message || 'Failed to send collaboration invite.');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const activeEvent = events.find(e => e.id === targetEventId) || currentEventData?.event;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-3xl w-full max-w-xl shadow-2xl p-5 sm:p-6 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-base-content/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-primary/20 text-primary">
              <Users size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-base-content">
                Volunteer & Event Collaboration
              </h3>
              <p className="text-xs text-base-content/60">
                Invite other Event Creators to co-manage and share volunteer pools
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-error/20 border border-error/30 text-error text-xs font-semibold flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-3 p-3 rounded-xl bg-success/20 border border-success/30 text-success text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto space-y-5 pr-1">
          
          {/* Form to Invite Creator */}
          <form onSubmit={handleSendInvite} className="bg-base-100 p-4 rounded-2xl border border-base-content/10 space-y-3.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles size={14} /> Send Collaboration Request
            </h4>

            {/* Select Event */}
            <div>
              <label className="label-text font-bold text-xs uppercase text-base-content/70 mb-1 block">
                Target Event
              </label>
              <select
                value={targetEventId}
                onChange={(e) => {
                  setTargetEventId(e.target.value);
                  fetchEventCollaborations(e.target.value);
                }}
                className="select select-bordered w-full rounded-xl text-xs bg-base-200/50"
              >
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({new Date(evt.startDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            {/* Creator Email */}
            <div>
              <label className="label-text font-bold text-xs uppercase text-base-content/70 mb-1 block">
                Creator B's Email Address *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/50" />
                <input
                  type="email"
                  placeholder="e.g. creator2@university.edu"
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  required
                  className="input input-bordered w-full pl-10 rounded-xl text-xs bg-base-200/50"
                />
              </div>
              <p className="text-[11px] text-base-content/50 mt-1">
                Recipient will receive an email invitation and a pop-up confirmation when logging in.
              </p>
            </div>

            {/* Optional Message */}
            <div>
              <label className="label-text font-bold text-xs uppercase text-base-content/70 mb-1 block">
                Message / Collaboration Note (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Let's merge volunteer pools for stage setup and ticketing..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="textarea textarea-bordered w-full rounded-xl text-xs bg-base-200/50"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="btn btn-primary btn-sm w-full rounded-xl text-xs font-bold gap-2 text-white shadow-md shadow-primary/20"
            >
              {sending ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <Send size={14} /> Send Collaboration Request & Email
                </>
              )}
            </button>
          </form>

          {/* Active Collaborators Section */}
          <div className="bg-base-100 p-4 rounded-2xl border border-base-content/10 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UserCheck size={14} className="text-success" /> Active Collaborators on this Event
              </span>
              <span className="badge badge-sm badge-ghost">
                {collaborationsData.collaborators?.length || 0}
              </span>
            </h4>

            {collaborationsData.collaborators?.length === 0 ? (
              <p className="text-xs text-base-content/50 italic py-2 text-center">
                No active collaborators yet on this event.
              </p>
            ) : (
              <div className="space-y-2">
                {collaborationsData.collaborators.map((c) => (
                  <div key={c._id || c.id} className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/50 border border-base-content/5">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={c.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.name}`}
                        alt={c.name}
                        className="w-8 h-8 rounded-xl object-cover bg-base-300"
                      />
                      <div>
                        <p className="font-bold text-xs text-base-content">{c.name}</p>
                        <p className="text-[10px] text-base-content/60">{c.email}</p>
                      </div>
                    </div>
                    <span className="badge badge-success badge-sm font-semibold gap-1 text-[10px]">
                      <CheckCircle2 size={11} /> Co-Organizer
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Invites List */}
          <div className="bg-base-100 p-4 rounded-2xl border border-base-content/10 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/80 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="text-amber-500" /> Pending & Sent Requests
              </span>
              <span className="badge badge-sm badge-ghost">
                {collaborationsData.requests?.length || 0}
              </span>
            </h4>

            {collaborationsData.requests?.length === 0 ? (
              <p className="text-xs text-base-content/50 italic py-2 text-center">
                No requests sent for this event.
              </p>
            ) : (
              <div className="space-y-2">
                {collaborationsData.requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-2.5 rounded-xl bg-base-200/50 border border-base-content/5">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-bold text-xs text-base-content truncate">
                        {r.receiverEmail}
                      </p>
                      <p className="text-[10px] text-base-content/50 truncate">
                        Invited on {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge badge-sm font-bold text-[10px] uppercase ${
                      r.status === 'ACCEPTED'
                        ? 'badge-success'
                        : r.status === 'REJECTED'
                        ? 'badge-error'
                        : 'badge-warning'
                    }`}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-base-content/10 flex justify-end">
          <button type="button" onClick={onClose} className="btn btn-sm btn-ghost">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default CollaborationManagerModal;

