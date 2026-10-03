const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const Task = require('../models/Task');
const Department = require('../models/Department');
const User = require('../models/User');
const Event = require('../models/Event');
const IssueMessage = require('../models/IssueMessage');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/auth');

// Get issues
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, departmentId, isEscalated, status } = req.query;
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (departmentId) filter.departmentId = departmentId;
    if (isEscalated !== undefined) filter.isEscalated = isEscalated === 'true';
    if (status) filter.status = status;

    const issues = await Issue.find(filter)
      .populate('departmentId', 'name colorCode')
      .populate('taskId', 'title status')
      .populate('reportedBy', 'name role avatar')
      .sort({ createdAt: -1 })
      .lean();

    const issueIds = issues.map(i => i._id);
    const messages = await IssueMessage.find({ issueId: { $in: issueIds } }).lean();

    const enriched = issues.map(iss => {
      const msgCount = messages.filter(m => m.issueId.toString() === iss._id.toString()).length;
      return {
        ...iss,
        id: iss._id.toString(),
        taskTitle: iss.taskId ? iss.taskId.title : 'General Issue',
        departmentName: iss.departmentId ? iss.departmentId.name : 'Unknown',
        departmentColor: iss.departmentId ? iss.departmentId.colorCode : '#ef4444',
        reporterName: iss.reportedBy ? iss.reportedBy.name : 'Anonymous',
        reporterRole: iss.reportedBy ? iss.reportedBy.role : 'WORKER',
        messageCount: msgCount
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch issues' });
  }
});

// Get single issue with full escalation thread
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('departmentId')
      .populate('taskId')
      .populate('reportedBy', 'name role phone avatar email')
      .lean();

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const messages = await IssueMessage.find({ issueId: issue._id }).sort({ createdAt: 1 }).lean();

    let leader = null;
    if (issue.departmentId && issue.departmentId.leaderId) {
      leader = await User.findById(issue.departmentId.leaderId, 'name role phone avatar email').lean();
    }

    // Only include Event Creator if the issue has been escalated!
    let creator = null;
    if (issue.isEscalated) {
      creator = await User.findOne({ role: 'EVENT_CREATOR' }, 'name role phone avatar email').lean();
    }

    res.json({
      success: true,
      data: {
        ...issue,
        id: issue._id.toString(),
        participants: [
          issue.reportedBy ? { ...issue.reportedBy, id: issue.reportedBy._id.toString() } : null,
          leader ? { ...leader, id: leader._id.toString() } : null,
          creator ? { ...creator, id: creator._id.toString() } : null
        ].filter(Boolean),
        messages: messages.map(m => ({ ...m, id: m._id.toString() }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch issue details' });
  }
});

// Report problem (Worker or Leader)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, departmentId, taskId, title, description, category, priority } = req.body;
    if (!eventId || !departmentId || !title) {
      return res.status(400).json({ success: false, message: 'Event, Department, and Title are required' });
    }

    const newIssue = await Issue.create({
      eventId,
      departmentId,
      taskId: taskId || null,
      reportedBy: req.user._id,
      title: title.trim(),
      description: description ? description.trim() : '',
      category: category || 'Equipment Problem',
      priority: priority || 'CRITICAL',
      status: 'OPEN',
      isEscalated: false
    });

    if (taskId) {
      await Task.findByIdAndUpdate(taskId, { status: 'BLOCKED' });
    }

    // Initial message in thread
    const initMsg = await IssueMessage.create({
      issueId: newIssue._id,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: `[PROBLEM REPORTED] ${category}: ${title}. ${description || ''}`
    });

    if (req.io) {
      const formattedInitMsg = {
        ...initMsg.toObject(),
        id: initMsg._id.toString(),
        _id: initMsg._id.toString(),
        issueId: newIssue._id.toString(),
        createdAt: initMsg.createdAt.toISOString()
      };
      req.io.to(`issue_${newIssue._id.toString()}`).emit('new_issue_message', formattedInitMsg);
      req.io.to(`issue_${newIssue._id.toString()}`).emit('receive_issue_message', formattedInitMsg);
      req.io.to(`event_${eventId}`).emit('issue_updated', {
        issue: { ...newIssue.toObject(), id: newIssue._id.toString() },
        action: 'REPORTED',
        timestamp: new Date().toISOString()
      });
    }

    // Notify Team Leader
    const dept = await Department.findById(departmentId);
    if (dept && dept.leaderId && dept.leaderId.toString() !== req.user._id.toString()) {
      await Notification.create({
        userId: dept.leaderId,
        eventId,
        taskId: taskId || null,
        issueId: newIssue._id,
        type: 'PROBLEM_REPORTED',
        title: `⚠️ Problem in ${dept.name}`,
        message: `${req.user.name} reported: "${title}"`
      });
    }

    await ActivityLog.create({
      eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'PROBLEM_REPORTED',
      details: `Reported issue "${title}" in ${dept ? dept.name : 'Department'}`
    });

    res.status(201).json({
      success: true,
      data: { ...newIssue.toObject(), id: newIssue._id.toString() },
      message: 'Problem reported successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to report problem' });
  }
});

// Escalate Issue to Event Creator
router.post('/:id/escalate', authMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const { escalationNote } = req.body;

    issue.status = 'ESCALATED';
    issue.isEscalated = true;
    issue.priority = 'CRITICAL';
    await issue.save();

    const escMsg = await IssueMessage.create({
      issueId: issue._id,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: `🚨 [ESCALATED TO EVENT CREATOR] ${escalationNote || 'Team Leader unable to resolve locally. Requesting organizer intervention.'}`
    });

    if (req.io) {
      const formattedEscMsg = {
        ...escMsg.toObject(),
        id: escMsg._id.toString(),
        _id: escMsg._id.toString(),
        issueId: issue._id.toString(),
        createdAt: escMsg.createdAt.toISOString()
      };
      req.io.to(`issue_${issue._id.toString()}`).emit('new_issue_message', formattedEscMsg);
      req.io.to(`issue_${issue._id.toString()}`).emit('receive_issue_message', formattedEscMsg);
      req.io.to(`event_${issue.eventId.toString()}`).emit('issue_updated', {
        issue: { ...issue.toObject(), id: issue._id.toString() },
        action: 'ESCALATED',
        timestamp: new Date().toISOString()
      });
    }

    const event = await Event.findById(issue.eventId);
    const dept = await Department.findById(issue.departmentId);
    const creator = await User.findOne({ role: 'EVENT_CREATOR' });

    if (creator) {
      await Notification.create({
        userId: creator._id,
        eventId: issue.eventId,
        issueId: issue._id,
        taskId: issue.taskId,
        type: 'CRITICAL_ESCALATION',
        title: `🔴 Critical Escalation: ${dept ? dept.name : 'Department'}`,
        message: `${req.user.name} escalated "${issue.title}". Intervention required.`
      });
    }

    await ActivityLog.create({
      eventId: issue.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'ISSUE_ESCALATED',
      details: `Escalated issue "${issue.title}" to Event Creator`
    });

    res.json({
      success: true,
      data: { ...issue.toObject(), id: issue._id.toString() },
      message: 'Issue escalated to Event Creator'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to escalate issue' });
  }
});

// Resolve Issue
router.post('/:id/resolve', authMiddleware, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const { resolutionNote } = req.body;

    issue.status = 'RESOLVED';
    issue.resolvedAt = new Date();
    issue.resolvedBy = req.user.name;
    await issue.save();

    // Unblock task if no other open issue on this task
    if (issue.taskId) {
      const otherOpenIssues = await Issue.countDocuments({
        taskId: issue.taskId,
        _id: { $ne: issue._id },
        status: { $ne: 'RESOLVED' }
      });
      if (otherOpenIssues === 0) {
        await Task.findByIdAndUpdate(issue.taskId, { status: 'IN_PROGRESS' });
      }
    }

    const resMsg = await IssueMessage.create({
      issueId: issue._id,
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      message: `✅ [ISSUE RESOLVED by ${req.user.name}] ${resolutionNote || 'The operational issue has been resolved. Work resuming.'}`
    });

    if (req.io) {
      const formattedResMsg = {
        ...resMsg.toObject(),
        id: resMsg._id.toString(),
        _id: resMsg._id.toString(),
        issueId: issue._id.toString(),
        createdAt: resMsg.createdAt.toISOString()
      };
      req.io.to(`issue_${issue._id.toString()}`).emit('new_issue_message', formattedResMsg);
      req.io.to(`issue_${issue._id.toString()}`).emit('receive_issue_message', formattedResMsg);
      req.io.to(`event_${issue.eventId.toString()}`).emit('issue_updated', {
        issue: { ...issue.toObject(), id: issue._id.toString() },
        action: 'RESOLVED',
        timestamp: new Date().toISOString()
      });
    }

    await ActivityLog.create({
      eventId: issue.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'ISSUE_RESOLVED',
      details: `Resolved issue "${issue.title}"`
    });

    res.json({
      success: true,
      data: { ...issue.toObject(), id: issue._id.toString() },
      message: 'Issue marked as resolved'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to resolve issue' });
  }
});

module.exports = router;
