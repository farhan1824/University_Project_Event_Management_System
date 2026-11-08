const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Department = require('../models/Department');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const TeamMembership = require('../models/TeamMembership');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Calculate operational health and stats for an event from MongoDB
async function calculateEventHealth(eventId) {
  const allTasks = await Task.find({ eventId }).populate('assignedTo', 'name phone avatar').lean();
  const allIssues = await Issue.find({ eventId }).lean();
  const departments = await Department.find({ eventId }).populate('leaderId', 'name phone email avatar').lean();
  const allMemberships = await TeamMembership.find({ eventId }).lean();
  const now = new Date();

  // Overdue detection
  const updatedTasks = allTasks.map(task => {
    const isOverdue = task.deadline && new Date(task.deadline) < now && task.status !== 'COMPLETED';
    let currentStatus = task.status;
    if (isOverdue && task.status !== 'OVERDUE' && task.status !== 'BLOCKED') {
      currentStatus = 'OVERDUE';
    }
    return { ...task, status: currentStatus, id: task._id.toString() };
  });

  const totalTasks = updatedTasks.length;
  const completedTasks = updatedTasks.filter(t => t.status === 'COMPLETED').length;
  const inProgressTasks = updatedTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const notStartedTasks = updatedTasks.filter(t => t.status === 'NOT_STARTED').length;
  const overdueTasks = updatedTasks.filter(t => t.status === 'OVERDUE').length;
  const blockedTasks = updatedTasks.filter(t => t.status === 'BLOCKED').length;

  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Department-by-Department Progress
  const departmentStats = departments.map(dept => {
    const deptIdStr = dept._id.toString();
    const deptTasks = updatedTasks.filter(t => t.departmentId.toString() === deptIdStr);
    const deptCompleted = deptTasks.filter(t => t.status === 'COMPLETED').length;
    const deptTotal = deptTasks.length;
    const progress = deptTotal > 0 ? Math.round((deptCompleted / deptTotal) * 100) : 0;
    const membersCount = allMemberships.filter(tm => tm.departmentId.toString() === deptIdStr).length;
    const openIssuesCount = allIssues.filter(i => i.departmentId.toString() === deptIdStr && i.status !== 'RESOLVED').length;

    return {
      id: deptIdStr,
      name: dept.name,
      colorCode: dept.colorCode,
      leader: dept.leaderId ? {
        id: dept.leaderId._id ? dept.leaderId._id.toString() : dept.leaderId.toString(),
        name: dept.leaderId.name,
        phone: dept.leaderId.phone
      } : null,
      totalTasks: deptTotal,
      completedTasks: deptCompleted,
      progress,
      membersCount,
      openIssuesCount
    };
  });

  // Critical & Escalated Issues (Only issues escalated by Team Leaders)
  const criticalIssues = allIssues
    .filter(i => i.status !== 'RESOLVED' && i.isEscalated === true)
    .map(i => {
      const dept = departments.find(d => d._id.toString() === i.departmentId.toString());
      return {
        ...i,
        id: i._id.toString(),
        departmentName: dept ? dept.name : 'Unknown'
      };
    });

  const openIssues = allIssues.filter(i => i.status !== 'RESOLVED');

  // Operational Health Calculation
  let healthStatus = 'ON_TRACK';
  let healthLabel = '🟢 On Track';
  let healthMessage = 'Operations are proceeding according to schedule.';

  if (criticalIssues.length > 0 || blockedTasks >= 2) {
    healthStatus = 'CRITICAL';
    healthLabel = '🔴 Critical';
    healthMessage = `${criticalIssues.length} critical issue(s) or blocked task(s) require immediate organizer intervention.`;
  } else if (overdueTasks > 0 || openIssues.length > 0 || blockedTasks === 1) {
    healthStatus = 'ATTENTION_NEEDED';
    healthLabel = '🟡 Attention Needed';
    healthMessage = `${overdueTasks} task(s) overdue or pending problem resolutions.`;
  }

  // Upcoming Deadlines
  const upcomingDeadlines = updatedTasks
    .filter(t => t.status !== 'COMPLETED' && t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5)
    .map(t => {
      const dept = departments.find(d => d._id.toString() === t.departmentId.toString());
      return {
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        status: t.status,
        priority: t.priority,
        departmentName: dept ? dept.name : 'Unknown',
        assigneeName: t.assignedTo ? t.assignedTo.name : 'Unassigned'
      };
    });

  return {
    healthStatus,
    healthLabel,
    healthMessage,
    overallProgress,
    stats: {
      total: totalTasks,
      completed: completedTasks,
      inProgress: inProgressTasks,
      notStarted: notStartedTasks,
      overdue: overdueTasks,
      blocked: blockedTasks,
      openIssues: openIssues.length,
      escalatedIssues: criticalIssues.length
    },
    departmentStats,
    criticalIssues,
    upcomingDeadlines
  };
}

// Get all events (Filtered by creator or collaboration for EVENT_CREATOR)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let eventFilter = {};
    if (req.user.role === 'EVENT_CREATOR') {
      eventFilter = {
        $or: [
          { createdBy: req.user._id },
          { collaborators: req.user._id }
        ]
      };
    } else if (req.user.role === 'TEAM_LEADER' || req.user.role === 'WORKER') {
      const leadingDepts = await Department.find({ leaderId: req.user._id }).select('eventId').lean();
      const memberships = await TeamMembership.find({ userId: req.user._id }).select('eventId').lean();
      const eventIds = [
        ...leadingDepts.map(d => d.eventId),
        ...memberships.map(m => m.eventId)
      ];
      if (eventIds.length > 0) {
        eventFilter = { _id: { $in: eventIds } };
      }
    }

    const events = await Event.find(eventFilter).sort({ createdAt: -1 }).lean();
    const enrichedEvents = await Promise.all(events.map(async evt => {
      const health = await calculateEventHealth(evt._id);
      return {
        ...evt,
        id: evt._id.toString(),
        isOwner: evt.createdBy.toString() === req.user._id.toString(),
        isCollaborator: evt.collaborators && evt.collaborators.some(c => c.toString() === req.user._id.toString()),
        healthStatus: health.healthStatus,
        healthLabel: health.healthLabel,
        overallProgress: health.overallProgress,
        stats: health.stats
      };
    }));
    res.json({ success: true, data: enrichedEvents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
});

// Get single event by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const healthData = await calculateEventHealth(event._id);
    const departments = await Department.find({ eventId: event._id }).populate('leaderId', 'name email phone avatar').lean();

    res.json({
      success: true,
      data: {
        event: { ...event, id: event._id.toString() },
        health: healthData,
        departments: departments.map(d => ({ ...d, id: d._id.toString() }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch event details' });
  }
});

// Create new event (Event Creator)
router.post('/', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const { name, description, location, startDate, endDate } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Event name is required' });
    }

    const newEvent = await Event.create({
      name,
      description: description || '',
      location: location || 'TBD',
      startDate: startDate || new Date(),
      endDate: endDate || new Date(Date.now() + 86400000),
      createdBy: req.user._id,
      status: 'ACTIVE'
    });

    // Activity Log
    await ActivityLog.create({
      eventId: newEvent._id,
      userId: req.user._id,
      userName: req.user.name,
      action: 'EVENT_CREATED',
      details: `Created new event "${newEvent.name}"`
    });

    res.status(201).json({
      success: true,
      data: { ...newEvent.toObject(), id: newEvent._id.toString() },
      message: 'Event created successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

// Update event (Owner or Collaborator)
router.put('/:id', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isOwner = event.createdBy.toString() === req.user._id.toString();
    const isCollab = event.collaborators && event.collaborators.some(c => c.toString() === req.user._id.toString());
    if (!isOwner && !isCollab) {
      return res.status(403).json({ success: false, message: 'Unauthorized to update this event' });
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, data: { ...updated.toObject(), id: updated._id.toString() }, message: 'Event updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
});

// Delete event (Original Owner Only)
router.delete('/:id', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (event.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the original event creator can delete this event' });
    }

    await Event.findByIdAndDelete(req.params.id);
    await Department.deleteMany({ eventId: req.params.id });
    await Task.deleteMany({ eventId: req.params.id });
    await Issue.deleteMany({ eventId: req.params.id });
    res.json({ success: true, message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
});

module.exports = router;
