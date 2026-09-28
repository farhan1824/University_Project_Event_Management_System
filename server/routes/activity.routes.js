const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/auth');

// Get activity logs for an event
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, limit } = req.query;
    const filter = {};
    if (eventId) filter.eventId = eventId;

    let query = ActivityLog.find(filter).sort({ createdAt: -1 });
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const logs = await query.lean();
    res.json({
      success: true,
      data: logs.map(l => ({ ...l, id: l._id.toString() }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
