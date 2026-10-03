const express = require('express');
const router = express.Router();
const IssueMessage = require('../models/IssueMessage');
const Issue = require('../models/Issue');
const { authMiddleware } = require('../middleware/auth');

// Get messages for an issue chat
router.get('/issue/:issueId', authMiddleware, async (req, res) => {
  try {
    const messages = await IssueMessage.find({ issueId: req.params.issueId }).sort({ createdAt: 1 }).lean();
    res.json({
      success: true,
      data: messages.map(m => ({ 
        ...m, 
        id: m._id.toString(),
        _id: m._id.toString(),
        issueId: m.issueId.toString()
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// Post a message (AJAX fallback)
router.post('/issue/:issueId', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const newMsg = await IssueMessage.create({
      issueId: issue._id,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: message.trim()
    });

    const formattedMsg = { 
      ...newMsg.toObject(), 
      id: newMsg._id.toString(),
      _id: newMsg._id.toString(),
      issueId: issue._id.toString(),
      createdAt: newMsg.createdAt ? newMsg.createdAt.toISOString() : new Date().toISOString()
    };

    if (req.io) {
      req.io.to(`issue_${issue._id.toString()}`).emit('new_issue_message', formattedMsg);
      req.io.to(`issue_${issue._id.toString()}`).emit('receive_issue_message', formattedMsg);
    }

    res.status(201).json({
      success: true,
      data: formattedMsg
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

module.exports = router;
