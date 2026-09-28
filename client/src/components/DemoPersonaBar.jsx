import React from 'react';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, Users, ShieldAlert, CheckCircle2, UserCheck } from 'lucide-react';

export const DemoPersonaBar = () => {
  const { user, availableUsers, switchPersona, resetDemoState } = useAuth();

  if (!availableUsers || availableUsers.length === 0) return null;

  // Group personas by role
  const creators = availableUsers.filter(u => u.role === 'EVENT_CREATOR');
  const leaders = availableUsers.filter(u => u.role === 'TEAM_LEADER');
  const workers = availableUsers.filter(u => u.role === 'WORKER');

  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 bg-base-300/95 backdrop-blur-md border-t border-base-content/10 px-3 py-2 shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        
        {/* Left: Role Switcher Label */}
        <div className="flex items-center gap-2">
          <div className="badge badge-primary badge-sm gap-1 font-mono uppercase tracking-wider hidden sm:inline-flex">
            <Users size={12} />
            1-Click Demo Switcher
          </div>
          <span className="text-xs text-base-content/70 hidden md:inline">
            Active: <strong className="text-primary font-semibold">{user?.name}</strong> ({user?.role?.replace('_', ' ')})
          </span>
        </div>

        {/* Center: Persona Quick Switch Buttons */}
        <div className="flex items-center flex-wrap gap-1.5 overflow-x-auto py-1">
          {/* Event Creator */}
          {creators.map(u => (
            <button
              key={u.id}
              onClick={() => switchPersona(u)}
              className={`btn btn-xs gap-1.5 transition-all ${
                user?.id === u.id
                  ? 'btn-primary shadow-lg ring-2 ring-primary/40'
                  : 'btn-ghost bg-base-200/80 hover:bg-base-200'
              }`}
              title={`${u.name} - Full Event Management & Escalation Hub`}
            >
              <span>👑</span>
              <span className="font-medium">{u.name.split(' ')[0]}</span>
              <span className="badge badge-xs badge-neutral hidden lg:inline">Creator</span>
            </button>
          ))}

          <div className="divider divider-horizontal mx-0 hidden sm:flex"></div>

          {/* Team Leaders */}
          {leaders.map(u => (
            <button
              key={u.id}
              onClick={() => switchPersona(u)}
              className={`btn btn-xs gap-1.5 transition-all ${
                user?.id === u.id
                  ? 'btn-secondary shadow-lg ring-2 ring-secondary/40'
                  : 'btn-ghost bg-base-200/80 hover:bg-base-200'
              }`}
              title={`${u.name} - Team Leader Dashboard & Task Delegator`}
            >
              <span>👔</span>
              <span className="font-medium">{u.name.split(' ')[0]}</span>
              <span className="badge badge-xs badge-neutral hidden lg:inline">Leader</span>
            </button>
          ))}

          <div className="divider divider-horizontal mx-0 hidden sm:flex"></div>

          {/* Workers */}
          {workers.slice(0, 2).map(u => (
            <button
              key={u.id}
              onClick={() => switchPersona(u)}
              className={`btn btn-xs gap-1.5 transition-all ${
                user?.id === u.id
                  ? 'btn-accent shadow-lg ring-2 ring-accent/40 text-slate-950 font-semibold'
                  : 'btn-ghost bg-base-200/80 hover:bg-base-200'
              }`}
              title={`${u.name} - Mobile-First Worker Task Interface`}
            >
              <span>👷</span>
              <span className="font-medium">{u.name.split(' ')[0]}</span>
              <span className="badge badge-xs badge-neutral hidden lg:inline">Worker</span>
            </button>
          ))}
        </div>

        {/* Right: Reset Demo button */}
        <button
          onClick={() => {
            if (window.confirm('Reset all demo events, tasks, and issue escalation chat to original state?')) {
              resetDemoState();
            }
          }}
          className="btn btn-xs btn-ghost text-base-content/60 hover:text-warning gap-1"
          title="Reset database to fresh presentation demo state"
        >
          <RefreshCw size={12} />
          <span className="text-xs hidden sm:inline">Reset Demo</span>
        </button>

      </div>
    </div>
  );
};

export default DemoPersonaBar;
