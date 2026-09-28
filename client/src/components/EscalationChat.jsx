import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { issueAPI, messageAPI } from '../services/api';
import { 
  X, 
  Send, 
  AlertOctagon, 
  CheckCircle2, 
  ShieldAlert, 
  Users, 
  Tag, 
  Sparkles,
  Phone,
  Clock,
  Check
} from 'lucide-react';

export const EscalationChat = () => {
  const { user } = useAuth();
  const { socket, activeIssueChat, closeIssueChat } = useSocket();
  const { selectedEventId, refreshEventData } = useEvent();

  const [issueData, setIssueData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const messagesEndRef = useRef(null);

  // Load Issue details and messages
  const loadIssueAndMessages = async (issueId) => {
    try {
      setLoading(true);
      const res = await issueAPI.getById(issueId);
      if (res.data.success) {
        setIssueData(res.data.data);
        setMessages(res.data.data.messages || []);
      }
    } catch (e) {
      console.error('Failed to load issue chat:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeIssueChat) {
      loadIssueAndMessages(activeIssueChat);

      if (socket) {
        socket.emit('join_issue_chat', {
          issueId: activeIssueChat,
          userId: user.id,
          userName: user.name,
          role: user.role
        });

        // Listen for new messages
        const handleNewMessage = (newMsg) => {
          if (newMsg.issueId === activeIssueChat) {
            setMessages((prev) => [...prev, newMsg]);
            scrollToBottom();
          }
        };

        const handleUserTyping = ({ userName, isTyping }) => {
          if (isTyping) {
            setTypingUser(userName);
          } else {
            setTypingUser(null);
          }
        };

        socket.on('new_issue_message', handleNewMessage);
        socket.on('user_typing', handleUserTyping);

        return () => {
          socket.emit('leave_issue_chat', { issueId: activeIssueChat, userId: user.id });
          socket.off('new_issue_message', handleNewMessage);
          socket.off('user_typing', handleUserTyping);
        };
      }
    }
  }, [activeIssueChat, socket, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!activeIssueChat) return null;

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const messageText = inputText.trim();
    setInputText('');

    if (socket) {
      socket.emit('send_issue_message', {
        issueId: activeIssueChat,
        eventId: selectedEventId,
        senderId: user.id,
        senderName: user.name,
        senderRole: user.role,
        message: messageText
      });
      socket.emit('typing_in_issue', { issueId: activeIssueChat, userName: user.name, isTyping: false });
    } else {
      // AJAX fallback
      await messageAPI.send(activeIssueChat, { message: messageText });
      loadIssueAndMessages(activeIssueChat);
    }
  };

  // Team Leader: Escalate Issue
  const handleEscalateIssue = async () => {
    try {
      setEscalating(true);
      await issueAPI.escalate(activeIssueChat, {
        escalationNote: `${user.name} (Team Leader) escalated this critical issue to Event Creator.`
      });
      if (socket) {
        socket.emit('broadcast_issue_update', {
          eventId: selectedEventId,
          issue: { ...issueData, status: 'ESCALATED', isEscalated: true },
          action: 'ESCALATED'
        });
      }
      refreshEventData();
      loadIssueAndMessages(activeIssueChat);
    } catch (e) {
      console.error('Failed to escalate issue', e);
    } finally {
      setEscalating(false);
    }
  };

  // Mark Issue as Resolved
  const handleResolveIssue = async () => {
    try {
      setResolving(true);
      await issueAPI.resolve(activeIssueChat, {
        resolutionNote: `Issue resolved following instructions. Operational work resumed.`
      });
      if (socket) {
        socket.emit('broadcast_issue_update', {
          eventId: selectedEventId,
          issue: { ...issueData, status: 'RESOLVED' },
          action: 'RESOLVED'
        });
      }
      refreshEventData();
      loadIssueAndMessages(activeIssueChat);
    } catch (e) {
      console.error('Failed to resolve issue', e);
    } finally {
      setResolving(false);
    }
  };

  // Quick instructions helper for Event Creator
  const sendQuickInstruction = (text) => {
    setInputText(text);
  };

  const isResolved = issueData?.status === 'RESOLVED';
  const isEscalated = issueData?.isEscalated || issueData?.status === 'ESCALATED';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-base-100 h-full shadow-2xl flex flex-col border-l border-base-content/15 animate-in slide-in-from-right duration-200">
        
        {/* Header: Issue Summary & Controls */}
        <div className="p-4 bg-base-200 border-b border-base-content/10 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl text-white ${isResolved ? 'bg-success' : isEscalated ? 'bg-error animate-pulse' : 'bg-warning text-slate-900'}`}>
                {isResolved ? <CheckCircle2 size={20} /> : <AlertOctagon size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge badge-sm font-bold ${isResolved ? 'badge-success' : isEscalated ? 'badge-error text-white' : 'badge-warning'}`}>
                    {issueData?.status}
                  </span>
                  <span className="badge badge-sm badge-outline">
                    {issueData?.category || 'Problem'}
                  </span>
                  <span className="text-xs text-base-content/60">
                    Dept: <strong className="text-primary">{issueData?.department?.name || 'Department'}</strong>
                  </span>
                </div>
                <h2 className="font-display font-bold text-base sm:text-lg text-base-content mt-1 leading-snug">
                  {issueData?.title || 'Operational Issue'}
                </h2>
              </div>
            </div>

            <button onClick={closeIssueChat} className="btn btn-ghost btn-circle btn-sm">
              <X size={18} />
            </button>
          </div>

          {/* Attached Task Context */}
          {issueData?.task && (
            <div className="bg-base-100/80 rounded-xl p-2.5 border border-base-content/10 text-xs flex items-center justify-between">
              <span className="text-base-content/70 truncate">
                Task: <strong className="text-base-content font-medium">{issueData.task.title}</strong>
              </span>
              <span className={`badge badge-xs ${issueData.task.status === 'BLOCKED' ? 'badge-error' : 'badge-info'}`}>
                {issueData.task.status}
              </span>
            </div>
          )}

          {/* Connected Participants */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-base-content/5">
            <div className="flex items-center gap-1.5 text-base-content/70">
              <Users size={14} className="text-primary" />
              <span>Participants:</span>
              <span className="font-medium text-base-content">
                Worker ({issueData?.reporter?.name || 'Worker'}) ↔ Leader ↔ Creator
              </span>
            </div>
          </div>
        </div>

        {/* Action Banner (Escalate or Resolve) */}
        <div className="bg-base-300/60 px-4 py-2 border-b border-base-content/10 flex items-center justify-between gap-2 flex-wrap">
          {!isResolved && !isEscalated && (user.role === 'TEAM_LEADER' || user.role === 'EVENT_CREATOR') && (
            <button
              onClick={handleEscalateIssue}
              disabled={escalating}
              className="btn btn-xs btn-error text-white font-bold gap-1 shadow-sm"
            >
              <ShieldAlert size={14} />
              {escalating ? 'Escalating...' : '🚨 Escalate to Event Creator'}
            </button>
          )}

          {!isResolved && (
            <button
              onClick={handleResolveIssue}
              disabled={resolving}
              className="btn btn-xs btn-success text-white font-bold gap-1 ml-auto shadow-sm"
            >
              <CheckCircle2 size={14} />
              {resolving ? 'Resolving...' : '✓ Mark Issue as RESOLVED'}
            </button>
          )}

          {isResolved && (
            <div className="flex items-center gap-1 text-xs text-success font-semibold">
              <CheckCircle2 size={16} />
              <span>Issue resolved by {issueData?.resolvedBy || 'Team'}</span>
            </div>
          )}
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-sm text-base-content/50">
              No messages in this escalation thread yet.
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = msg.senderId === user.id;
              const isCreator = msg.senderRole === 'EVENT_CREATOR';
              const isLeader = msg.senderRole === 'TEAM_LEADER';
              const isSystemNote = msg.message.startsWith('[') || msg.message.startsWith('🚨') || msg.message.startsWith('✅');

              return (
                <div
                  key={msg.id || idx}
                  className={`chat ${isMe ? 'chat-end' : 'chat-start'}`}
                >
                  <div className="chat-image avatar">
                    <div className="w-8 h-8 rounded-full bg-base-300 ring-1 ring-base-content/20">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt={msg.senderName} />
                    </div>
                  </div>
                  
                  <div className="chat-header text-xs flex items-center gap-1.5 mb-1">
                    <span className="font-bold">{msg.senderName}</span>
                    <span className={`badge badge-xs ${
                      isCreator ? 'badge-primary' : isLeader ? 'badge-secondary' : 'badge-accent text-slate-900 font-semibold'
                    }`}>
                      {msg.senderRole?.replace('_', ' ')}
                    </span>
                    <time className="text-[10px] opacity-50">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>

                  <div className={`chat-bubble text-sm leading-relaxed ${
                    isSystemNote 
                      ? 'bg-base-300 text-base-content border border-base-content/20 font-mono text-xs'
                      : isMe 
                        ? 'chat-bubble-primary text-white' 
                        : isCreator 
                          ? 'chat-bubble-secondary text-white' 
                          : 'bg-base-200 text-base-content border border-base-content/10'
                  }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          {typingUser && (
            <div className="text-xs text-base-content/50 italic flex items-center gap-1">
              <span className="loading loading-dots loading-xs"></span>
              <span>{typingUser} is typing instructions...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Creator Quick Instruction Chips */}
        {user.role === 'EVENT_CREATOR' && !isResolved && (
          <div className="px-4 py-2 bg-base-200/60 border-t border-base-content/10 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[10px] uppercase font-bold text-primary shrink-0 flex items-center gap-0.5">
              <Sparkles size={12} /> Presets:
            </span>
            <button 
              onClick={() => sendQuickInstruction("Use the backup cable from Central Equipment Room Rack 3. Ask Karim to bring it to stage.")}
              className="badge badge-outline hover:badge-primary cursor-pointer text-[11px] py-2 whitespace-nowrap"
            >
              📦 Backup in Equipment Room
            </button>
            <button 
              onClick={() => sendQuickInstruction("Re-assigning 2 extra workers from Stage to assist immediately.")}
              className="badge badge-outline hover:badge-primary cursor-pointer text-[11px] py-2 whitespace-nowrap"
            >
              👥 Reassign 2 Workers
            </button>
            <button 
              onClick={() => sendQuickInstruction("Emergency purchase approved. Keep cash receipt for reimbursement.")}
              className="badge badge-outline hover:badge-primary cursor-pointer text-[11px] py-2 whitespace-nowrap"
            >
              💳 Purchase Approved
            </button>
          </div>
        )}

        {/* Message Input Box */}
        <form onSubmit={handleSendMessage} className="p-3 bg-base-200 border-t border-base-content/10 flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (socket) {
                socket.emit('typing_in_issue', { issueId: activeIssueChat, userName: user.name, isTyping: e.target.value.length > 0 });
              }
            }}
            placeholder={
              user.role === 'EVENT_CREATOR' 
                ? "Provide operational instructions or assistance..."
                : user.role === 'TEAM_LEADER'
                  ? "Message worker and event creator..."
                  : "Report status or ask clarification..."
            }
            className="input input-sm sm:input-md input-bordered flex-1 bg-base-100 rounded-xl focus:outline-primary"
            disabled={isResolved}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isResolved}
            className="btn btn-sm sm:btn-md btn-primary rounded-xl px-4"
          >
            <Send size={16} />
          </button>
        </form>

      </div>
    </div>
  );
};

export default EscalationChat;
