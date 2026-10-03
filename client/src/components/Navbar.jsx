import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { useSocket } from '../context/SocketContext';
import { notificationAPI } from '../services/api';
import HealthBadge from './HealthBadge';
import UserRoleManagementModal from './UserRoleManagementModal';
import { 
  Calendar, 
  Bell, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare, 
  User, 
  Layers,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout, isCreator } = useAuth();
  const { events, selectedEventId, currentEventData, switchEvent } = useEvent();
  const { isConnected, openIssueChat } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Fetch notifications for the current user and active event
  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll({ eventId: selectedEventId });
      if (res.data.success) {
        setNotifications(res.data.data.notifications);
        setUnreadCount(res.data.data.unreadCount);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  useEffect(() => {
    if (user && selectedEventId) {
      fetchNotifications();
    }
  }, [user, selectedEventId]);

  const handleNotificationClick = async (notif) => {
    try {
      await notificationAPI.markRead(notif.id);
      fetchNotifications();
      if (notif.issueId) {
        openIssueChat(notif.issueId);
      }
      setIsNotifOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead({ eventId: selectedEventId });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const currentEvent = events.find(e => e.id === selectedEventId);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-3 sm:px-6 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        
        {/* Left: Brand & Event Selector */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-black text-base sm:text-lg shadow-md shadow-primary/25">
              ⚡
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-black text-base sm:text-lg tracking-tight leading-none text-slate-900">
                Event<span className="text-primary">Ops</span>
              </h1>
              <span className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">
                Mobile Command
              </span>
            </div>
          </div>

          {/* Event Selector Dropdown */}
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-sm btn-outline border-slate-300 hover:border-primary bg-slate-50 hover:bg-white text-slate-800 flex items-center gap-1.5 max-w-[160px] sm:max-w-xs truncate normal-case rounded-xl shadow-xs">
              <Calendar size={14} className="text-primary shrink-0" />
              <span className="truncate font-semibold text-xs sm:text-sm">
                {currentEvent ? currentEvent.name : 'Select Event'}
              </span>
              <ChevronDown size={13} className="text-slate-400 shrink-0" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-modal bg-white border border-slate-200 rounded-2xl w-72 sm:w-80 mt-2">
              <li className="menu-title text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
                Active Events ({events.length})
              </li>
              {events.map((evt) => (
                <li key={evt.id}>
                  <button
                    onClick={() => switchEvent(evt.id)}
                    className={`flex items-start justify-between p-2.5 rounded-xl transition-all ${
                      selectedEventId === evt.id ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-xs sm:text-sm font-semibold">{evt.name}</span>
                      <span className="text-[11px] text-slate-500">{evt.location}</span>
                    </div>
                    <HealthBadge status={evt.healthStatus} label={evt.healthStatus === 'CRITICAL' ? '🔴' : evt.healthStatus === 'ATTENTION_NEEDED' ? '🟡' : '🟢'} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Health Status, Live Socket, Notifications, User Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          
          {/* Active Event Health Indicator (Desktop) */}
          {currentEventData?.health && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">Health:</span>
              <HealthBadge 
                status={currentEventData.health.healthStatus} 
                label={currentEventData.health.healthLabel} 
                size="sm" 
              />
            </div>
          )}

          {/* WebSockets Real-time status */}
          <div className="tooltip tooltip-bottom" data-tip={isConnected ? 'Live Real-time WebSockets Connected' : 'Connecting to live updates...'}>
            <div className={`px-2 py-1 rounded-xl flex items-center gap-1.5 text-xs font-mono border ${
              isConnected 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold">{isConnected ? 'LIVE' : 'SYNCING'}</span>
            </div>
          </div>

          {/* Notifications Dropdown */}
          <div className="dropdown dropdown-end">
            <label 
              tabIndex={0} 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="btn btn-ghost btn-circle btn-sm relative text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="badge badge-error badge-xs absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white px-1.5 py-0.5 shadow-sm animate-bounce">
                  {unreadCount}
                </span>
              )}
            </label>
            <div tabIndex={0} className="dropdown-content z-50 card card-compact w-80 sm:w-96 p-0 shadow-modal bg-white border border-slate-200 rounded-2xl mt-2">
              <div className="card-body p-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <Bell size={14} className="text-primary" />
                    Event Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[11px] font-bold text-primary hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 py-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No notifications for this event yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-2.5 rounded-xl cursor-pointer text-left transition-all border ${
                          notif.read ? 'bg-slate-50/60 border-slate-100 opacity-75' : 'bg-indigo-50/50 border-indigo-100 shadow-xs'
                        } hover:bg-slate-100`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className={notif.type.includes('CRITICAL') ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-primary font-bold'}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* User Account & Role Menu Dropdown */}
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-sm p-1 gap-1.5 sm:gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 shadow-xs flex items-center">
              <div className="avatar">
                <div className="w-7 h-7 rounded-full ring-2 ring-primary/20">
                  <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt={user?.name} />
                </div>
              </div>
              <div className="hidden sm:flex flex-col text-left pr-1">
                <span className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[90px]">{user?.name}</span>
                <span className="text-[9px] font-mono font-bold text-primary uppercase">
                  {user?.role === 'EVENT_CREATOR' ? '👑 CREATOR' : user?.role === 'TEAM_LEADER' ? '👔 LEADER' : '👷 WORKER'}
                </span>
              </div>
              <ChevronDown size={12} className="text-slate-400" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-modal bg-white border border-slate-200 rounded-2xl w-64 mt-2 space-y-1">
              <div className="px-3 py-2.5 border-b border-slate-100">
                <div className="font-bold text-slate-900 text-sm">{user?.name}</div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{user?.email}</div>
                <div className="mt-2">
                  <span className="badge badge-primary badge-sm font-bold text-[10px] tracking-wide shadow-xs">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {isCreator && (
                <li>
                  <button
                    onClick={() => setIsRoleModalOpen(true)}
                    className="text-xs font-bold text-primary flex items-center gap-2 py-2 hover:bg-primary/10 rounded-xl"
                  >
                    <ShieldCheck size={15} /> Manage Roles & Teams
                  </button>
                </li>
              )}

              <li>
                <button
                  onClick={logout}
                  className="text-xs font-bold text-rose-600 flex items-center gap-2 py-2 hover:bg-rose-50 rounded-xl"
                >
                  <LogOut size={15} /> Log Out
                </button>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Role Management Modal (Creator Only) */}
      <UserRoleManagementModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />
    </header>
  );
};

export default Navbar;

