const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');

// Get notifications for current user (optionally scoped to event)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, unreadOnly } = req.query;
    const filter = { userId: req.user._id };
    if (eventId) filter.eventId = eventId;
    if (unreadOnly === 'true') filter.read = false;

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).lean();
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({ ...n, id: n._id.toString() })),
        unreadCount
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// Mark single notification as read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const updated = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, data: { ...updated.toObject(), id: updated._id.toString() } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read for current user
router.put('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const { eventId } = req.body;
    const filter = { userId: req.user._id };
    if (eventId) filter.eventId = eventId;

    await Notification.updateMany(filter, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read' });
  }
});

module.exports = router;
