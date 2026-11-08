const express = require('express');
const router = express.Router();
const CollaborationRequest = require('../models/CollaborationRequest');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const emailService = require('../services/email.service');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Send collaboration request to another Event Creator
router.post('/', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const { receiverEmail, eventId, message } = req.body;

    if (!receiverEmail || !eventId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Recipient email and Event ID are required.' 
      });
    }

    const normalizedEmail = receiverEmail.toLowerCase().trim();

    // Prevent inviting oneself
    if (normalizedEmail === req.user.email.toLowerCase().trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'You cannot send a collaboration request to yourself.' 
      });
    }

    // Verify event ownership or collaborator status
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    const isCollab = event.collaborators && event.collaborators.some(c => c.toString() === req.user._id.toString());
    if (!isOwner && !isCollab) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to invite collaborators to this event.' 
      });
    }

    // Check if target user already exists
    const targetUser = await User.findOne({ email: normalizedEmail });

    // Check if receiver is already a collaborator
    if (targetUser) {
      const alreadyCollaborator = event.collaborators && event.collaborators.some(c => c.toString() === targetUser._id.toString());
      if (alreadyCollaborator || event.createdBy.toString() === targetUser._id.toString()) {
        return res.status(400).json({ 
          success: false, 
          message: 'This user is already an organizer or collaborator on this event.' 
        });
      }
    }

    // Check if a pending request already exists
    const existingPending = await CollaborationRequest.findOne({
      eventId: event._id,
      receiverEmail: normalizedEmail,
      status: 'PENDING'
    });

    if (existingPending) {
      return res.status(400).json({ 
        success: false, 
        message: 'A pending collaboration request has already been sent to this email for this event.' 
      });
    }

    // Create collaboration request
    const request = await CollaborationRequest.create({
      senderId: req.user._id,
      receiverEmail: normalizedEmail,
      receiverId: targetUser ? targetUser._id : null,
      eventId: event._id,
      message: message ? message.trim() : '',
      status: 'PENDING'
    });

    // Send email notification asynchronously
    emailService.sendCollaborationInvite({
      toEmail: normalizedEmail,
      senderName: req.user.name,
      senderEmail: req.user.email,
      eventName: event.name,
      eventDate: event.startDate,
      message: message ? message.trim() : ''
    }).catch(err => console.error('[Collaboration] Background email failed:', err));

    // If target user already exists, create in-app notification
    if (targetUser) {
      await Notification.create({
        userId: targetUser._id,
        eventId: event._id,
        type: 'COLLABORATION_REQUEST',
        title: 'New Collaboration Request',
        message: `${req.user.name} invited you to collaborate and share volunteers on "${event.name}".`
      });
    }

    // Log Activity
    await ActivityLog.create({
      eventId: event._id,
      userId: req.user._id,
      userName: req.user.name,
      action: 'COLLABORATION_INVITE_SENT',
      details: `Sent collaboration invite to ${normalizedEmail} for event "${event.name}"`
    });

    res.status(201).json({
      success: true,
      data: { ...request.toObject(), id: request._id.toString() },
      message: `Collaboration invitation sent to ${normalizedEmail}.`
    });
  } catch (err) {
    console.error('[Collaboration Request Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to send collaboration request.' });
  }
});

// Get pending collaboration requests for current user (to pop up modal upon login)
router.get('/pending', authMiddleware, async (req, res) => {
  try {
    const userEmail = req.user.email.toLowerCase().trim();
    const requests = await CollaborationRequest.find({
      $or: [
        { receiverEmail: userEmail },
        { receiverId: req.user._id }
      ],
      status: 'PENDING'
    })
      .populate('senderId', 'name email avatar role')
      .populate('eventId', 'name description location startDate endDate')
      .sort({ createdAt: -1 })
      .lean();

    const formatted = requests.map(r => ({
      ...r,
      id: r._id.toString(),
      sender: r.senderId ? {
        id: r.senderId._id ? r.senderId._id.toString() : r.senderId.toString(),
        name: r.senderId.name,
        email: r.senderId.email,
        avatar: r.senderId.avatar
      } : null,
      event: r.eventId ? {
        id: r.eventId._id ? r.eventId._id.toString() : r.eventId.toString(),
        name: r.eventId.name,
        description: r.eventId.description,
        location: r.eventId.location,
        startDate: r.eventId.startDate,
        endDate: r.eventId.endDate
      } : null
    }));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('[Get Pending Collaborations Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
});

// Respond to a collaboration request (ACCEPT or DECLINE)
router.post('/:id/respond', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const { action } = req.body; // 'ACCEPT' | 'DECLINE'
    if (!['ACCEPT', 'DECLINE'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be ACCEPT or DECLINE.' });
    }

    const request = await CollaborationRequest.findById(req.params.id)
      .populate('eventId')
      .populate('senderId', 'name email');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Collaboration request not found.' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ 
        success: false, 
        message: `This request has already been ${request.status.toLowerCase()}.` 
      });
    }

    const userEmail = req.user.email.toLowerCase().trim();
    const isTarget = request.receiverEmail === userEmail || 
      (request.receiverId && request.receiverId.toString() === req.user._id.toString());

    if (!isTarget) {
      return res.status(403).json({ success: false, message: 'You are not authorized to respond to this request.' });
    }

    if (action === 'ACCEPT') {
      request.status = 'ACCEPTED';
      request.receiverId = req.user._id;
      request.respondedAt = new Date();
      await request.save();

      // Add user to Event's collaborators list
      await Event.findByIdAndUpdate(request.eventId._id, {
        $addToSet: { collaborators: req.user._id }
      });

      // Notify sender
      await Notification.create({
        userId: request.senderId._id,
        eventId: request.eventId._id,
        type: 'COLLABORATION_ACCEPTED',
        title: 'Collaboration Accepted! 🤝',
        message: `${req.user.name} has accepted your collaboration request on "${request.eventId.name}". You now share event management and volunteers.`
      });

      // Log activity
      await ActivityLog.create({
        eventId: request.eventId._id,
        userId: req.user._id,
        userName: req.user.name,
        action: 'COLLABORATION_ACCEPTED',
        details: `${req.user.name} joined as collaborator on "${request.eventId.name}"`
      });

      return res.json({ 
        success: true, 
        message: 'Collaboration accepted successfully!', 
        data: { status: 'ACCEPTED', eventId: request.eventId._id.toString() } 
      });
    } else {
      // DECLINE
      request.status = 'REJECTED';
      request.receiverId = req.user._id;
      request.respondedAt = new Date();
      await request.save();

      // Notify sender
      await Notification.create({
        userId: request.senderId._id,
        eventId: request.eventId._id,
        type: 'COLLABORATION_DECLINED',
        title: 'Collaboration Declined',
        message: `${req.user.name} declined the collaboration request for "${request.eventId.name}".`
      });

      return res.json({ 
        success: true, 
        message: 'Collaboration request declined.', 
        data: { status: 'REJECTED' } 
      });
    }
  } catch (err) {
    console.error('[Respond Collaboration Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to process response.' });
  }
});

// Get collaboration summary for an event (collaborators and sent requests)
router.get('/event/:eventId', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId).populate('collaborators', 'name email avatar phone role').lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    const requests = await CollaborationRequest.find({ eventId })
      .populate('receiverId', 'name email avatar')
      .populate('senderId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        collaborators: event.collaborators || [],
        requests: requests.map(r => ({
          ...r,
          id: r._id.toString()
        }))
      }
    });
  } catch (err) {
    console.error('[Get Event Collaborations Error]:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch event collaborations.' });
  }
});

module.exports = router;

