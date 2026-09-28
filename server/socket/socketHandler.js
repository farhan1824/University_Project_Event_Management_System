const IssueMessage = require('../models/IssueMessage');
const Issue = require('../models/Issue');

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join a specific Event Room (for dashboard live updates & notifications)
    socket.on('join_event', ({ eventId, userId, role }) => {
      const room = `event_${eventId}`;
      socket.join(room);
      console.log(`[Socket] User (${userId}, role: ${role}) joined ${room}`);
    });

    // Join an Issue Escalation Chat Room
    socket.on('join_issue_chat', ({ issueId, userId, userName, role }) => {
      const room = `issue_${issueId}`;
      socket.join(room);
      console.log(`[Socket] ${userName} (${role}) entered issue chat: ${room}`);

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
      const room = `issue_${issueId}`;
      socket.leave(room);
      console.log(`[Socket] User ${userId} left ${room}`);
    });

    // Real-time Chat Message in Issue Escalation Thread
    socket.on('send_issue_message', async ({ issueId, eventId, senderId, senderName, senderRole, message }) => {
      if (!message || !message.trim()) return;

      try {
        const newMsg = await IssueMessage.create({
          issueId,
          senderId,
          senderName,
          senderRole,
          message: message.trim()
        });

        const formattedMsg = { ...newMsg.toObject(), id: newMsg._id.toString() };

        // Broadcast to everyone in this issue room (Worker, Leader, Creator)
        io.to(`issue_${issueId}`).emit('new_issue_message', formattedMsg);

        // Also create an in-app notification alert for other participants
        const issue = await Issue.findById(issueId);
        if (issue) {
          io.to(`event_${eventId || issue.eventId}`).emit('issue_activity_alert', {
            type: 'CHAT_MESSAGE',
            issueId,
            eventId: eventId || issue.eventId,
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

    // Real-time Typing Indicator
    socket.on('typing_in_issue', ({ issueId, userName, isTyping }) => {
      socket.to(`issue_${issueId}`).emit('user_typing', { userName, isTyping });
    });

    // Real-time Task Status Change Broadcast
    socket.on('broadcast_task_update', ({ eventId, task, updatedBy }) => {
      io.to(`event_${eventId}`).emit('task_updated', {
        task,
        updatedBy,
        timestamp: new Date().toISOString()
      });
    });

    // Real-time Issue Status / Escalation Broadcast
    socket.on('broadcast_issue_update', ({ eventId, issue, action }) => {
      io.to(`event_${eventId}`).emit('issue_updated', {
        issue,
        action,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { setupSocketIO };
