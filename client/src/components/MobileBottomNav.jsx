import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare, 
  Users, 
  Layers, 
  PlusCircle, 
  ShieldAlert,
  Flame,
  Camera
} from 'lucide-react';

export const MobileBottomNav = ({ activeTab, onSelectTab, onQuickAction }) => {
  const { user } = useAuth();
  const { currentEventData } = useEvent();

  if (!user) return null;

  const role = user.role;
  const criticalIssuesCount = currentEventData?.criticalIssues?.length || 0;
  const totalIssuesCount = currentEventData?.departments?.reduce(
    (acc, d) => acc + (d.issues?.filter(i => i.status !== 'RESOLVED').length || 0), 
    0
  ) || 0;

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-slate-200 shadow-bottom-nav pb-safe">
      <div className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
        
        {/* WORKER BOTTOM NAV */}
        {role === 'WORKER' && (
          <>
            <button
              onClick={() => onSelectTab && onSelectTab('tasks')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all touch-active ${
                activeTab === 'tasks' || !activeTab
                  ? 'text-primary font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Zap size={20} className={activeTab === 'tasks' || !activeTab ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className="text-[10px]">My Tasks</span>
            </button>

            <button
              onClick={() => onQuickAction && onQuickAction('submit_proof')}
              className="flex flex-col items-center -mt-4 bg-primary text-white p-2.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            >
              <Camera size={22} className="stroke-[2.5]" />
              <span className="text-[9px] font-bold mt-0.5">Proof</span>
            </button>

            <button
              onClick={() => onQuickAction && onQuickAction('report_problem')}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl text-slate-400 hover:text-slate-600 transition-all touch-active"
            >
              <AlertTriangle size={20} className="text-amber-500" />
              <span className="text-[10px]">Report</span>
            </button>

            <button
              onClick={() => onQuickAction && onQuickAction('open_chat')}
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl text-slate-400 hover:text-slate-600 transition-all touch-active"
            >
              <MessageSquare size={20} />
              <span className="text-[10px]">Chat</span>
            </button>
          </>
        )}

        {/* TEAM LEADER BOTTOM NAV */}
        {role === 'TEAM_LEADER' && (
          <>
            <button
              onClick={() => onSelectTab && onSelectTab('tasks')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all touch-active ${
                activeTab === 'tasks' || !activeTab
                  ? 'text-primary font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CheckCircle2 size={20} className={activeTab === 'tasks' || !activeTab ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className="text-[10px]">Tasks</span>
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('triage')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl relative transition-all touch-active ${
                activeTab === 'triage'
                  ? 'text-warning font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <AlertTriangle size={20} className="text-amber-500" />
              <span className="text-[10px]">Triage</span>
              {totalIssuesCount > 0 && (
                <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => onQuickAction && onQuickAction('create_task')}
              className="flex flex-col items-center -mt-4 bg-primary text-white p-2.5 rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            >
              <PlusCircle size={22} className="stroke-[2.5]" />
              <span className="text-[9px] font-bold mt-0.5">New Task</span>
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('roster')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all touch-active ${
                activeTab === 'roster'
                  ? 'text-primary font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users size={20} />
              <span className="text-[10px]">Roster</span>
            </button>
          </>
        )}

        {/* EVENT CREATOR BOTTOM NAV */}
        {role === 'EVENT_CREATOR' && (
          <>
            <button
              onClick={() => onSelectTab && onSelectTab('overview')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all touch-active ${
                activeTab === 'overview' || !activeTab
                  ? 'text-primary font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Flame size={20} className={activeTab === 'overview' || !activeTab ? 'stroke-[2.5]' : 'stroke-2'} />
              <span className="text-[10px]">Overview</span>
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('escalations')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl relative transition-all touch-active ${
                activeTab === 'escalations'
                  ? 'text-error font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ShieldAlert size={20} className={criticalIssuesCount > 0 ? 'text-rose-500 animate-pulse' : ''} />
              <span className="text-[10px]">Escalations</span>
              {criticalIssuesCount > 0 && (
                <span className="absolute top-0 right-1.5 badge badge-xs badge-error text-white font-bold px-1 text-[9px]">
                  {criticalIssuesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('departments')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all touch-active ${
                activeTab === 'departments'
                  ? 'text-primary font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers size={20} />
              <span className="text-[10px]">Depts</span>
            </button>

            <button
              onClick={() => onSelectTab && onSelectTab('users')}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-2xl transition-all touch-active ${
                activeTab === 'users'
                  ? 'text-primary font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Users size={20} />
              <span className="text-[10px]">Team</span>
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default MobileBottomNav;
