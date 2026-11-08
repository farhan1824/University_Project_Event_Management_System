import React, { useState, useEffect } from 'react';
import { collaborationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { 
  Users, 
  Check, 
  X, 
  Calendar, 
  MapPin, 
  Mail, 
  Sparkles,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const CollaborationRequestModal = () => {
  const { user } = useAuth();
  const { refreshEventData } = useEvent();
  const [pendingRequests, setPendingRequests] = useState([]);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Check for pending collaboration requests on mount or when user changes
  useEffect(() => {
    if (user && user.role === 'EVENT_CREATOR') {
      fetchPendingRequests();
    } else {
      setPendingRequests([]);
      setCurrentRequest(null);
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await collaborationAPI.getPending();
      if (res.data.success && res.data.data.length > 0) {
        setPendingRequests(res.data.data);
        setCurrentRequest(res.data.data[0]);
      } else {
        setPendingRequests([]);
        setCurrentRequest(null);
      }
    } catch (err) {
      console.error('Failed to fetch pending collaborations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (action) => {
    if (!currentRequest) return;
    try {
      setActionLoading(true);
      const res = await collaborationAPI.respond(currentRequest.id, action);
      if (res.data.success) {
        setFeedback({
          type: action === 'ACCEPT' ? 'success' : 'info',
          message: action === 'ACCEPT' 
            ? 'Collaboration accepted! You now have full shared access to this event.' 
            : 'Collaboration request declined.'
        });

        // Dissolve modal after short animation/feedback
        setTimeout(() => {
          const remaining = pendingRequests.filter(r => r.id !== currentRequest.id);
          setPendingRequests(remaining);
          setCurrentRequest(remaining.length > 0 ? remaining[0] : null);
          setFeedback(null);
          
          if (action === 'ACCEPT') {
            window.location.reload(); // Refresh to populate collaborated event in switcher
          }
        }, 1200);
      }
    } catch (err) {
      console.error('Error responding to request', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to respond to request.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentRequest) return null;

  const sender = currentRequest.sender || {};
  const event = currentRequest.event || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-base-100 border border-primary/30 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-left animate-in zoom-in-95 duration-200">
        
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-primary to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Users size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-display font-extrabold tracking-tight">
            🤝 Collaboration & Volunteer Sharing
          </h2>
          <p className="text-xs text-white/80 mt-1 max-w-sm mx-auto">
            Another Event Creator has invited you to co-manage an event and share volunteer resources.
          </p>
        </div>

        <div className="p-6 space-y-5">
          {feedback && (
            <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-success/20 text-success border border-success/30' 
                : feedback.type === 'error'
                ? 'bg-error/20 text-error border border-error/30'
                : 'bg-info/20 text-info border border-info/30'
            }`}>
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Inviting Creator Details */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-base-200/60 border border-base-content/10">
            <img 
              src={sender.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sender.name}`} 
              alt={sender.name}
              className="w-12 h-12 rounded-2xl bg-base-300 border border-base-content/10 object-cover shrink-0" 
            />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                Invited By
              </span>
              <h4 className="font-bold text-sm text-base-content truncate">
                {sender.name || 'Event Creator'}
              </h4>
              <p className="text-xs text-base-content/60 truncate flex items-center gap-1">
                <Mail size={12} /> {sender.email}
              </p>
            </div>
          </div>

          {/* Event Details Card */}
          <div className="rounded-2xl border border-base-content/10 bg-base-200/30 p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-display font-bold text-base text-base-content">
                {event.name || 'Event Title'}
              </h3>
              <span className="badge badge-primary badge-sm font-semibold">Shared Event</span>
            </div>

            {event.description && (
              <p className="text-xs text-base-content/70 line-clamp-2">
                {event.description}
              </p>
            )}

            <div className="pt-2 border-t border-base-content/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-base-content/70">
              {event.location && (
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin size={13} className="text-primary shrink-0" />
                  <span className="truncate">{event.location}</span>
                </div>
              )}
              {event.startDate && (
                <div className="flex items-center gap-1.5 truncate">
                  <Calendar size={13} className="text-primary shrink-0" />
                  <span>{new Date(event.startDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Creator's Message */}
          {currentRequest.message && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 italic">
              <strong>"{currentRequest.message}"</strong>
            </div>
          )}

          {/* Collaboration Rights Notice */}
          <div className="p-3 rounded-2xl bg-base-200/80 text-[11px] text-base-content/70 space-y-1">
            <p className="font-bold text-base-content flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> What happens when you accept?
            </p>
            <p>
              You will gain co-management access to this event, enabling you to assign shared volunteers, inspect department progress, and coordinate operations alongside {sender.name}.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleRespond('DECLINE')}
              className="btn btn-ghost flex-1 rounded-2xl text-xs font-bold text-base-content/70 hover:text-error"
            >
              <X size={15} /> Decline
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => handleRespond('ACCEPT')}
              className="btn btn-primary flex-[2] rounded-2xl text-xs font-bold shadow-lg shadow-primary/25 gap-2 text-white"
            >
              {actionLoading ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <>
                  <Check size={16} /> Accept & Collaborate
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default CollaborationRequestModal;

