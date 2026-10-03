const IssueMessage = require('../models/IssueMessage');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Notification = require('../models/Notification');

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a specific Event Room (for dashboard live updates & notifications)
    socket.on('join_event', ({ eventId, userId, role }) => {
      if (eventId) {
        const room = `event_${eventId}`;
        socket.join(room);
        console.log(`[Socket] User (${userId}, role: ${role}) joined ${room}`);
      }
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[Socket] User (${userId}) registered in personal room: user_${userId}`);
      }
    });

    // Join an Issue Escalation Chat Room
    socket.on('join_issue_chat', ({ issueId, userId, userName, role }) => {
      if (!issueId) return;
      const room = `issue_${issueId}`;
      socket.join(room);
      console.log(`[Socket] ${userName || 'User'} (${role || 'MEMBER'}) entered issue chat: ${room}`);

      // Notify other room members that someone opened the chat
      socket.to(room).emit('user_joined_chat', {
        userId,
        userName,
        role,
        timestamp: new Date().toISOString()
      });
    });

    // Leave an Issue Escalation Room
    socket.on('leave_issue_chat', ({ issueId, userId }) => {
      if (!issueId) return;
      const room = `issue_${issueId}`;
      socket.leave(room);
      console.log(`[Socket] User ${userId} left ${room}`);
    });

    // Real-time Chat Message in Issue Thread with @Mention support
    socket.on('send_issue_message', async ({ issueId, eventId, senderId, senderName, senderRole, message, mentionedUserIds }) => {
      if (!message || !message.trim() || !issueId) return;

      try {
        const newMsg = await IssueMessage.create({
          issueId,
          senderId,
          senderName,
          senderRole,
          message: message.trim()
        });

        const formattedMsg = { 
          ...newMsg.toObject(), 
          id: newMsg._id.toString(),
          _id: newMsg._id.toString(),
          issueId: issueId.toString(),
          createdAt: newMsg.createdAt ? newMsg.createdAt.toISOString() : new Date().toISOString()
        };

        // Broadcast with BOTH event names to ensure all client versions receive it immediately
        io.to(`issue_${issueId}`).emit('new_issue_message', formattedMsg);
        io.to(`issue_${issueId}`).emit('receive_issue_message', formattedMsg);

        const issue = await Issue.findById(issueId);
        const resolvedEventId = eventId || (issue ? issue.eventId : null);

        // Process @Mentions
        let targetUserIds = Array.isArray(mentionedUserIds) ? [...mentionedUserIds] : [];

        // Also detect @[Name] or @Name patterns in the message text
        const mentionMatches = message.match(/@([a-zA-Z0-9_\s.-]+?)(?=[.,!?\s]|$)/g);
        if (mentionMatches && mentionMatches.length > 0) {
          const names = mentionMatches.map(m => m.replace('@', '').trim().toLowerCase());
          const matchedUsers = await User.find({
            name: { $in: names.map(n => new RegExp('^' + n, 'i')) }
          });
          matchedUsers.forEach(u => {
            const uidStr = u._id.toString();
            if (uidStr !== senderId && !targetUserIds.includes(uidStr)) {
              targetUserIds.push(uidStr);
            }
          });
        }

        // Send notifications to all @mentioned users
        for (const uid of targetUserIds) {
          if (uid === senderId) continue;

          await Notification.create({
            userId: uid,
            eventId: resolvedEventId,
            issueId,
            type: 'USER_MENTIONED',
            title: `📢 ${senderName} mentioned you`,
            message: `${senderName} (${senderRole}): "${message.substring(0, 75)}${message.length > 75 ? '...' : ''}"`
          });

          // Direct socket alert to the mentioned user
          io.to(`user_${uid}`).emit('user_mentioned_alert', {
            targetUserId: uid,
            issueId,
            senderName,
            senderRole,
            title: `📢 ${senderName} mentioned you`,
            message: `${senderName}: "${message.substring(0, 75)}"`,
            createdAt: new Date().toISOString()
          });
        }

        // Broadcast general activity alert to event room (if not mentioning someone specifically)
        if (issue && targetUserIds.length === 0 && resolvedEventId) {
          io.to(`event_${resolvedEventId}`).emit('issue_activity_alert', {
            type: 'CHAT_MESSAGE',
            issueId,
            eventId: resolvedEventId,
            senderName,
            senderRole,
            title: `New message in "${issue.title}"`,
            message: `${senderName} (${senderRole}): ${message.substring(0, 60)}...`,
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('[Socket Error] send_issue_message failed:', err);
      }
    });

    // Real-time Typing Indicators (supporting both event signatures)
    socket.on('typing_in_issue', ({ issueId, userName, isTyping }) => {
      if (!issueId) return;
      socket.to(`issue_${issueId}`).emit('user_typing', { userName, isTyping });
      socket.to(`issue_${issueId}`).emit('user_typing_status', { userName, isTyping });
    });

    socket.on('typing_issue_chat', ({ issueId, userName, isTyping }) => {
      if (!issueId) return;
      socket.to(`issue_${issueId}`).emit('user_typing', { userName, isTyping });
      socket.to(`issue_${issueId}`).emit('user_typing_status', { userName, isTyping });
    });

    // Real-time Task Status Change Broadcast
    socket.on('broadcast_task_update', ({ eventId, task, updatedBy }) => {
      if (eventId) {
        io.to(`event_${eventId}`).emit('task_updated', {
          task,
          updatedBy,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Real-time Issue Status / Escalation Broadcast
    socket.on('broadcast_issue_update', ({ eventId, issue, action }) => {
      if (eventId) {
        io.to(`event_${eventId}`).emit('issue_updated', {
          issue,
          action,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketIO };
