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
  ShieldCheck
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
    <header className="sticky top-0 z-30 bg-base-200/90 backdrop-blur-md border-b border-base-content/10 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Brand & Event Selector */}
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-lg shadow-md shadow-primary/30">
              ⚡
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display font-bold text-lg tracking-tight leading-none bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                EventOps
              </h1>
              <span className="text-[10px] text-base-content/50 uppercase tracking-widest font-semibold">
                Operational Command
              </span>
            </div>
          </div>

          {/* Event Selector Dropdown */}
          <div className="dropdown">
            <label tabIndex={0} className="btn btn-sm btn-outline border-base-content/20 bg-base-100/50 hover:bg-base-100 flex items-center gap-2 max-w-[200px] sm:max-w-xs truncate normal-case">
              <Calendar size={14} className="text-primary shrink-0" />
              <span className="truncate font-medium text-xs sm:text-sm">
                {currentEvent ? currentEvent.name : 'Select Event'}
              </span>
              <ChevronDown size={14} className="opacity-50 shrink-0" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-2xl bg-base-200 border border-base-content/15 rounded-2xl w-72 sm:w-80 mt-2">
              <li className="menu-title text-xs font-bold uppercase tracking-wider text-base-content/60 px-3 py-1">
                Active Events ({events.length})
              </li>
              {events.map((evt) => (
                <li key={evt.id}>
                  <button
                    onClick={() => switchEvent(evt.id)}
                    className={`flex items-start justify-between p-2.5 rounded-xl transition-all ${
                      selectedEventId === evt.id ? 'bg-primary/15 text-primary font-bold' : 'hover:bg-base-300'
                    }`}
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold">{evt.name}</span>
                      <span className="text-[11px] text-base-content/60">{evt.location}</span>
                    </div>
                    <HealthBadge status={evt.healthStatus} label={evt.healthStatus === 'CRITICAL' ? '🔴' : evt.healthStatus === 'ATTENTION_NEEDED' ? '🟡' : '🟢'} size="sm" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Health Status, Live Socket, Notifications, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Active Event Health Indicator */}
          {currentEventData?.health && (
            <div className="hidden lg:flex items-center gap-2 bg-base-100/70 border border-base-content/10 px-3 py-1 rounded-xl">
              <span className="text-xs text-base-content/60">Event Health:</span>
              <HealthBadge 
                status={currentEventData.health.healthStatus} 
                label={currentEventData.health.healthLabel} 
                size="sm" 
              />
            </div>
          )}

          {/* WebSockets Real-time status */}
          <div className="tooltip tooltip-bottom" data-tip={isConnected ? 'Live Real-time WebSockets Connected' : 'Connecting to live updates...'}>
            <div className={`p-1.5 rounded-lg flex items-center gap-1 text-xs font-mono ${isConnected ? 'text-success bg-success/10' : 'text-warning bg-warning/10'}`}>
              {isConnected ? <Wifi size={14} className="animate-pulse" /> : <WifiOff size={14} />}
              <span className="hidden xl:inline text-[10px] uppercase font-bold">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
            </div>
          </div>

          {/* Notifications Dropdown */}
          <div className="dropdown dropdown-end">
            <label 
              tabIndex={0} 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="btn btn-ghost btn-circle btn-sm relative"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="badge badge-error badge-xs absolute -top-0.5 -right-0.5 text-[10px] font-bold text-white px-1.5 py-0.5 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </label>
            <div tabIndex={0} className="dropdown-content z-50 card card-compact w-80 sm:w-96 p-0 shadow-2xl bg-base-200 border border-base-content/15 rounded-2xl mt-2">
              <div className="card-body p-3">
                <div className="flex items-center justify-between border-b border-base-content/10 pb-2">
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <Bell size={14} className="text-primary" />
                    Event Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-[11px] text-primary hover:underline">
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto space-y-2 py-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-base-content/50">
                      No notifications for this event yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-2.5 rounded-xl cursor-pointer text-left transition-colors border ${
                          notif.read ? 'bg-base-100/40 border-transparent opacity-75' : 'bg-base-100 border-primary/20 shadow-sm'
                        } hover:bg-base-300`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className={notif.type.includes('CRITICAL') ? 'text-error flex items-center gap-1' : 'text-primary'}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-base-content/50">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-base-content/80 mt-1 line-clamp-2">
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
            <label tabIndex={0} className="btn btn-ghost btn-sm p-1 gap-2 rounded-2xl border border-base-content/10 flex items-center">
              <div className="avatar">
                <div className="w-7 h-7 rounded-full bg-base-300 ring-1 ring-primary/40">
                  <img src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} alt={user?.name} />
                </div>
              </div>
              <div className="hidden sm:flex flex-col text-left pr-1">
                <span className="text-xs font-bold leading-tight truncate max-w-[100px]">{user?.name}</span>
                <span className="text-[9px] font-mono text-base-content/60 uppercase">
                  {user?.role === 'EVENT_CREATOR' ? '👑 CREATOR' : user?.role === 'TEAM_LEADER' ? '👔 LEADER' : '👷 WORKER'}
                </span>
              </div>
              <ChevronDown size={12} className="opacity-50" />
            </label>
            <ul tabIndex={0} className="dropdown-content z-50 menu p-2 shadow-2xl bg-base-200 border border-base-content/15 rounded-2xl w-64 mt-2 space-y-1">
              <div className="px-3 py-2.5 border-b border-base-content/10">
                <div className="font-bold text-base-content text-sm">{user?.name}</div>
                <div className="text-[11px] text-base-content/60 truncate mt-0.5">{user?.email}</div>
                <div className="mt-1.5">
                  <span className="badge badge-primary badge-sm font-bold text-[10px] tracking-wide">
                    {user?.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {isCreator && (
                <li>
                  <button
                    onClick={() => setIsRoleModalOpen(true)}
                    className="text-xs font-bold text-primary flex items-center gap-2 py-2"
                  >
                    <ShieldCheck size={15} /> Manage Roles & Teams
                  </button>
                </li>
              )}

              <li>
                <button
                  onClick={logout}
                  className="text-xs font-bold text-error flex items-center gap-2 py-2 hover:bg-error/15"
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
