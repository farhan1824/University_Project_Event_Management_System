import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Phone, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export const CollectPhoneModal = () => {
  const { user, updateUser } = useAuth();
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Determine if phone number collection is required
  const needsPhone = user && (!user.phone || user.phone.trim() === '' || user.phone === '+880 1700-000000');

  if (!needsPhone) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.trim().length < 6) {
      setError('Please enter a valid phone number with at least 6 digits.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const formattedPhone = phone.trim();
      const res = await authAPI.updateProfile({ phone: formattedPhone });

      if (res.data.success) {
        updateUser({ phone: formattedPhone });
      } else {
        setError(res.data.message || 'Failed to update phone number.');
      }
    } catch (err) {
      console.error('Failed to save phone number:', err);
      setError('Network error updating phone number. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-base-200 border border-base-content/20 rounded-3xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200 text-left space-y-4">
        
        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/20 text-primary shadow-inner">
            <Phone size={24} />
          </div>
          <div>
            <span className="badge badge-primary badge-xs font-mono uppercase font-bold tracking-wider mb-1">
              Required Profile Setup
            </span>
            <h3 className="font-display font-black text-lg sm:text-xl text-base-content">
              Enter Your Phone Number
            </h3>
          </div>
        </div>

        <p className="text-xs text-base-content/70 leading-relaxed">
          Welcome, <strong>{user.name}</strong>! For on-ground field coordination, emergency task notifications, and direct WhatsApp escalation, please provide your active phone number.
        </p>

        {error && (
          <div className="p-2.5 rounded-xl bg-error/20 border border-error/30 text-error text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label className="label-text font-bold text-xs uppercase tracking-wider text-base-content/70 mb-1.5 flex items-center gap-1.5">
              <Phone size={13} /> Active Mobile Number *
            </label>
            <input
              type="tel"
              required
              autoFocus
              placeholder="e.g. +880 1711-223344 or 01711223344"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              className="input input-bordered w-full bg-base-100 rounded-2xl font-mono text-sm focus:border-primary"
            />
            <span className="text-[11px] text-base-content/50 block mt-1">
              Your phone will be visible to your Team Leader & Organizer for direct coordination.
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || !phone.trim()}
            className="btn btn-primary w-full rounded-2xl font-bold gap-2 shadow-lg shadow-primary/20"
          >
            {submitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <span>Save & Continue to Dashboard</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default CollectPhoneModal;
