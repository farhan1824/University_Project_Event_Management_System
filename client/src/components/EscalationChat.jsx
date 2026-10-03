import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useEvent } from '../context/EventContext';
import { issueAPI, messageAPI, authAPI } from '../services/api';
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
  Check,
  AtSign,
  Lock,
  Radio
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

  // @ Mention State
  const [allUsers, setAllUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState([]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load Issue details and messages
  const loadIssueAndMessages = async (issueId) => {
    try {
      setLoading(true);
      const res = await issueAPI.getById(issueId);
      if (res.data.success) {
        setIssueData(res.data.data);
        const msgs = (res.data.data.messages || []).map(m => ({
          ...m,
          id: m.id || m._id,
          issueId: m.issueId || issueId
        }));
        setMessages(msgs);
      }
    } catch (e) {
      console.error('Failed to load issue chat:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load all registered users for @mention autocomplete
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await authAPI.getUsers();
        if (res.data.success) {
          setAllUsers(res.data.data || []);
        }
      } catch (e) {
        console.error('Failed to load users for mentions', e);
      }
    };
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeIssueChat) {
      loadIssueAndMessages(activeIssueChat);

      if (socket) {
        const joinRoom = () => {
          socket.emit('join_issue_chat', {
            issueId: activeIssueChat,
            userId: user?.id,
            userName: user?.name,
            role: user?.role
          });
        };

        joinRoom();
        socket.on('connect', joinRoom);

        // Listen for new messages across both event names
        const handleNewMessage = (newMsg) => {
          if (!newMsg) return;
          const incomingIssueId = String(newMsg.issueId || '');
          if (incomingIssueId && incomingIssueId !== String(activeIssueChat)) {
            return;
          }

          setMessages((prev) => {
            const newId = String(newMsg.id || newMsg._id || '');
            // Prevent duplicate message if already in state
            if (newId && prev.some((m) => String(m.id || m._id || '') === newId)) {
              return prev;
            }
            // Replace optimistic temp message if matched
            const optimisticIndex = prev.findIndex(
              (m) => m._tempId && (m.senderId === newMsg.senderId || m.senderName === newMsg.senderName) && m.message === newMsg.message
            );
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = {
                ...newMsg,
                id: newMsg.id || newMsg._id
              };
              return updated;
            }
            return [...prev, { ...newMsg, id: newMsg.id || newMsg._id }];
          });
          setTimeout(scrollToBottom, 50);
        };

        const handleUserTyping = ({ userName, isTyping }) => {
          if (isTyping && userName !== user?.name) {
            setTypingUser(userName);
          } else {
            setTypingUser(null);
          }
        };

        socket.on('receive_issue_message', handleNewMessage);
        socket.on('new_issue_message', handleNewMessage);
        socket.on('user_typing_status', handleUserTyping);
        socket.on('user_typing', handleUserTyping);

        return () => {
          socket.off('connect', joinRoom);
          socket.off('receive_issue_message', handleNewMessage);
          socket.off('new_issue_message', handleNewMessage);
          socket.off('user_typing_status', handleUserTyping);
          socket.off('user_typing', handleUserTyping);
          socket.emit('leave_issue_chat', { issueId: activeIssueChat, userId: user?.id });
        };
      }
    }
  }, [activeIssueChat, socket, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Handle Input with @ Mentions detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);

    // Emit typing status
    if (socket && activeIssueChat) {
      socket.emit('typing_issue_chat', {
        issueId: activeIssueChat,
        userName: user?.name,
        isTyping: value.length > 0
      });
    }

    // Check if cursor is at an '@' mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\s]*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  // Filter mention suggestions
  const mentionSuggestions = mentionQuery !== null
    ? allUsers.filter(u => 
        u.name.toLowerCase().includes(mentionQuery) || 
        (u.email && u.email.toLowerCase().includes(mentionQuery))
      ).slice(0, 5)
    : [];

  // Handle selecting a user from @ autocomplete
  const handleSelectMention = (targetUser) => {
    const cursorPos = inputRef.current?.selectionStart || inputText.length;
    const textBeforeCursor = inputText.slice(0, cursorPos);
    const textAfterCursor = inputText.slice(cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const newTextBefore = textBeforeCursor.slice(0, atIndex) + `@${targetUser.name} `;
      setInputText(newTextBefore + textAfterCursor);
      if (!mentionedUserIds.includes(targetUser.id)) {
        setMentionedUserIds(prev => [...prev, targetUser.id]);
      }
    }
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeIssueChat) return;

    const messageText = inputText.trim();
    const currentMentioned = [...mentionedUserIds];
    setInputText('');
    setMentionQuery(null);
    setMentionedUserIds([]);

    // Optimistic temporary message for instant local rendering
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const optimisticMsg = {
      _tempId: tempId,
      id: tempId,
      _id: tempId,
      issueId: activeIssueChat,
      senderId: user?.id,
      senderName: user?.name,
      senderRole: user?.role,
      message: messageText,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      if (socket && socket.connected) {
        socket.emit('send_issue_message', {
          issueId: activeIssueChat,
          senderId: user?.id,
          senderName: user?.name,
          senderRole: user?.role,
          message: messageText,
          mentionedUserIds: currentMentioned
        });
      } else {
        const res = await messageAPI.send({
          issueId: activeIssueChat,
          message: messageText
        });
        if (res.data.success && res.data.data) {
          const savedMsg = res.data.data;
          setMessages((prev) =>
            prev.map((m) => (m._tempId === tempId ? { ...savedMsg, id: savedMsg.id || savedMsg._id } : m))
          );
        }
      }
    } catch (e) {
      console.error('Failed to send message', e);
    }
  };

  // Escalate issue
  const handleEscalateIssue = async () => {
    if (!activeIssueChat) return;
    try {
      setEscalating(true);
      await issueAPI.escalate(activeIssueChat, {
        escalationNote: `${user.name} (${user.role.replace('_', ' ')}) escalated this problem to Event Creator for urgent intervention.`
      });
      refreshEventData();
      loadIssueAndMessages(activeIssueChat);
    } catch (e) {
      console.error('Failed to escalate issue', e);
    } finally {
      setEscalating(false);
    }
  };

  // Resolve issue
  const handleResolveIssue = async () => {
    if (!activeIssueChat) return;
    try {
      setResolving(true);
      await issueAPI.resolve(activeIssueChat, {
        resolutionNote: `Resolved by ${user.name} (${user.role.replace('_', ' ')})`
      });
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

  // Helper to format message with highlighted @mentions
  const renderMessageContent = (text) => {
    const parts = text.split(/(@[a-zA-Z0-9_\s.-]+(?=[.,!?\s]|$))/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md bg-indigo-100 text-indigo-700 font-bold text-xs">
            <AtSign size={11} />
            {part.slice(1)}
          </span>
        );
      }
      return part;
    });
  };

  if (!activeIssueChat) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200 text-left">
        
        {/* Header: Issue Summary & Hierarchy Badge */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 rounded-2xl text-white shadow-sm ${
                isResolved ? 'bg-emerald-600' : isEscalated ? 'bg-rose-600 animate-pulse' : 'bg-amber-500'
              }`}>
                {isResolved ? <CheckCircle2 size={20} /> : isEscalated ? <ShieldAlert size={20} /> : <AlertOctagon size={20} />}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge badge-sm font-bold shadow-xs ${
                    isResolved ? 'badge-success text-white' : isEscalated ? 'badge-error text-white font-mono' : 'badge-warning text-slate-900'
                  }`}>
                    {isResolved ? 'RESOLVED' : isEscalated ? '🔴 ESCALATED' : '🟡 LOCAL DEPT'}
                  </span>
                  <span className="badge badge-sm bg-white text-slate-700 border border-slate-200 font-semibold">
                    {issueData?.category || 'Problem'}
                  </span>
                  <span className="text-xs text-slate-500">
                    Dept: <strong className="text-indigo-600">{issueData?.departmentId?.name || issueData?.departmentName || 'Department'}</strong>
                  </span>
                </div>
                <h2 className="font-display font-bold text-base sm:text-lg text-slate-900 mt-1 leading-snug">
                  {issueData?.title || 'Operational Issue'}
                </h2>
              </div>
            </div>

            <button onClick={closeIssueChat} className="btn btn-ghost btn-circle btn-sm text-slate-500 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>

          {/* Attached Task Context */}
          {issueData?.taskId && (
            <div className="bg-white rounded-xl p-2.5 border border-slate-200 text-xs flex items-center justify-between shadow-xs">
              <span className="text-slate-600 truncate">
                Attached Task: <strong className="text-slate-900 font-semibold">{issueData.taskId?.title || 'Task'}</strong>
              </span>
              <span className={`badge badge-xs font-bold ${issueData.taskId?.status === 'BLOCKED' ? 'badge-error text-white' : 'badge-info text-white'}`}>
                {issueData.taskId?.status || 'BLOCKED'}
              </span>
            </div>
          )}

          {/* Connected Participants Channel Status */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
            <div className="flex items-center gap-1.5 text-slate-600 flex-wrap">
              {isEscalated ? (
                <>
                  <Radio size={14} className="text-rose-600 animate-pulse shrink-0" />
                  <span className="font-bold text-rose-600">Escalated Channel:</span>
                  <span className="font-medium text-slate-800">
                    Worker ({issueData?.reportedBy?.name || 'Worker'}) ↔ Team Leader ↔ Event Creator
                  </span>
                </>
              ) : (
                <>
                  <Lock size={13} className="text-amber-600 shrink-0" />
                  <span className="font-bold text-amber-700">Local Department Room:</span>
                  <span className="font-medium text-slate-800">
                    Worker ({issueData?.reportedBy?.name || 'Worker'}) ↔ Team Leader
                  </span>
                  <span className="text-[10px] text-slate-400 italic">(Creator not in channel)</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Banner (Escalate or Resolve) */}
        <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          {!isResolved && !isEscalated && (user.role === 'TEAM_LEADER' || user.role === 'EVENT_CREATOR') && (
            <button
              onClick={handleEscalateIssue}
              disabled={escalating}
              className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white font-bold gap-1 rounded-xl shadow-xs border-none touch-active"
              title="Escalate problem to Event Creator"
            >
              <ShieldAlert size={14} />
              {escalating ? 'Escalating...' : '🚨 Escalate to Event Creator'}
            </button>
          )}

          {!isResolved && (
            <button
              onClick={handleResolveIssue}
              disabled={resolving}
              className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 ml-auto rounded-xl shadow-xs border-none touch-active"
            >
              <CheckCircle2 size={14} />
              {resolving ? 'Resolving...' : '✓ Mark Issue as RESOLVED'}
            </button>
          )}

          {isResolved && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Issue resolved by {issueData?.resolvedBy || 'Team'}</span>
            </div>
          )}
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400">
              No messages in this thread yet. Send a message to start communicating.
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
                    <div className="w-8 h-8 rounded-full ring-1 ring-slate-200">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.senderName}`} alt={msg.senderName} />
                    </div>
                  </div>
                  
                  <div className="chat-header text-xs flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-slate-900">{msg.senderName}</span>
                    <span className={`badge badge-xs font-bold ${
                      isCreator ? 'bg-purple-100 text-purple-800' : isLeader ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {msg.senderRole?.replace('_', ' ')}
                    </span>
                    <time className="text-[10px] text-slate-400 font-mono">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>

                  <div className={`chat-bubble text-sm leading-relaxed rounded-2xl shadow-xs ${
                    isSystemNote 
                      ? 'bg-slate-200 text-slate-900 border border-slate-300 font-mono text-xs'
                      : isMe 
                        ? 'bg-indigo-600 text-white font-medium' 
                        : isCreator 
                          ? 'bg-purple-700 text-white font-medium' 
                          : 'bg-white text-slate-900 border border-slate-200'
                  }`}>
                    {renderMessageContent(msg.message)}
                  </div>
                </div>
              );
            })
          )}
          {typingUser && (
            <div className="text-xs text-slate-500 italic flex items-center gap-1.5 pl-2">
              <span className="loading loading-dots loading-xs text-primary"></span>
              <span>{typingUser} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Creator Quick Instruction Chips */}
        {user.role === 'EVENT_CREATOR' && isEscalated && !isResolved && (
          <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[10px] uppercase font-bold text-indigo-700 shrink-0 flex items-center gap-0.5">
              <Sparkles size={12} /> Presets:
            </span>
            <button 
              onClick={() => sendQuickInstruction("Use the backup equipment from Central Storage. Reallocating immediately.")}
              className="badge bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 cursor-pointer text-[11px] py-2 whitespace-nowrap text-slate-700 font-medium"
            >
              📦 Backup in Storage
            </button>
            <button 
              onClick={() => sendQuickInstruction("Approving 2 additional ground workers to assist your team.")}
              className="badge bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 cursor-pointer text-[11px] py-2 whitespace-nowrap text-slate-700 font-medium"
            >
              👥 Assign Extra Workers
            </button>
            <button 
              onClick={() => sendQuickInstruction("Emergency purchase authorized. Keep the invoice receipt.")}
              className="badge bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-slate-200 cursor-pointer text-[11px] py-2 whitespace-nowrap text-slate-700 font-medium"
            >
              💳 Purchase Approved
            </button>
          </div>
        )}

        {/* @ Mention Autocomplete Popup */}
        {mentionQuery !== null && mentionSuggestions.length > 0 && (
          <div className="mx-3 mb-1 bg-white border border-slate-200 rounded-2xl shadow-modal p-2 z-20 animate-in slide-in-from-bottom-2">
            <div className="text-[10px] font-bold uppercase text-slate-400 px-2.5 py-1 flex items-center gap-1">
              <AtSign size={12} className="text-primary" /> Mention Team Member:
            </div>
            <div className="space-y-1">
              {mentionSuggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectMention(u)}
                  className="w-full text-left p-2 rounded-xl hover:bg-indigo-50 hover:text-indigo-700 flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200 shrink-0">
                      <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} alt={u.name} />
                    </div>
                    <span className="font-bold text-slate-800 truncate">{u.name}</span>
                  </div>
                  <span className="badge badge-xs bg-slate-100 text-slate-600 font-mono uppercase shrink-0">
                    {u.role === 'EVENT_CREATOR' ? '👑 CREATOR' : u.role === 'TEAM_LEADER' ? '👔 LEADER' : '👷 WORKER'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Input Box with @ Mention prompt */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex flex-col gap-1.5 pb-safe">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (mentionQuery !== null && mentionSuggestions.length > 0) {
                  if (e.key === 'Tab' || e.key === 'Enter') {
                    if (mentionSuggestions[mentionIndex]) {
                      e.preventDefault();
                      handleSelectMention(mentionSuggestions[mentionIndex]);
                    }
                  }
                }
              }}
              placeholder={
                user.role === 'EVENT_CREATOR' 
                  ? "Provide instructions... (Type @ to mention leader or worker)"
                  : user.role === 'TEAM_LEADER'
                    ? "Reply to worker... (Type @ to mention)"
                    : "Message your Team Leader... (Type @ to mention)"
              }
              className="input input-sm sm:input-md input-bordered flex-1 bg-slate-50 focus:bg-white rounded-2xl border-slate-200 focus:border-primary text-xs sm:text-sm text-slate-900"
              disabled={isResolved}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isResolved}
              className="btn btn-sm sm:btn-md bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-4 font-bold border-none shadow-sm touch-active disabled:bg-slate-200 disabled:text-slate-400"
            >
              <Send size={16} />
            </button>
          </div>
          
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <AtSign size={10} className="text-primary" />
              Tip: Type <strong>@</strong> to mention any worker, team leader, or creator
            </span>
          </div>
        </form>

      </div>
    </div>
  );
};

export default EscalationChat;
