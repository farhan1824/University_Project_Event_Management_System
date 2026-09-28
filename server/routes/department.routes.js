const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const User = require('../models/User');
const Task = require('../models/Task');
const Issue = require('../models/Issue');
const TeamMembership = require('../models/TeamMembership');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all departments (optionally filtered by eventId or leaderId)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, leaderId } = req.query;
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (leaderId) filter.leaderId = leaderId;
    if (req.user.role === 'TEAM_LEADER' && !leaderId && !eventId) {
      filter.leaderId = req.user._id;
    }

    const departments = await Department.find(filter).populate('leaderId', 'name email phone avatar').lean();
    const tasks = await Task.find(eventId ? { eventId } : {}).lean();
    const memberships = await TeamMembership.find(eventId ? { eventId } : {}).lean();
    const issues = await Issue.find(eventId ? { eventId } : {}).lean();

    const enriched = departments.map(dept => {
      const deptIdStr = dept._id.toString();
      const deptTasks = tasks.filter(t => t.departmentId.toString() === deptIdStr);
      const completedTasks = deptTasks.filter(t => t.status === 'COMPLETED').length;
      const progress = deptTasks.length > 0 ? Math.round((completedTasks / deptTasks.length) * 100) : 0;
      const memberCount = memberships.filter(m => m.departmentId.toString() === deptIdStr).length;
      const openIssues = issues.filter(i => i.departmentId.toString() === deptIdStr && i.status !== 'RESOLVED').length;

      return {
        ...dept,
        id: deptIdStr,
        leader: dept.leaderId ? {
          id: dept.leaderId._id ? dept.leaderId._id.toString() : dept.leaderId.toString(),
          name: dept.leaderId.name,
          phone: dept.leaderId.phone,
          email: dept.leaderId.email
        } : null,
        membersCount: memberCount,
        tasksCount: deptTasks.length,
        completedTasksCount: completedTasks,
        progress,
        openIssuesCount: openIssues
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// Get single department by ID with roster, tasks, issues
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id).populate('leaderId', 'name email phone avatar').lean();
    if (!dept) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const deptLeaderId = dept.leaderId?._id ? dept.leaderId._id.toString() : dept.leaderId?.toString();
    const canSeePhone = req.user.role === 'EVENT_CREATOR' || req.user._id.toString() === deptLeaderId;

    const memberships = await TeamMembership.find({ departmentId: dept._id }).populate('userId', 'name email phone avatar role').lean();
    const members = memberships.map(tm => ({
      membershipId: tm._id.toString(),
      joinedAt: tm.joinedAt,
      id: tm.userId ? tm.userId._id.toString() : 'unknown',
      name: tm.userId ? tm.userId.name : 'Unknown',
      email: tm.userId ? tm.userId.email : '',
      phone: canSeePhone ? (tm.userId ? tm.userId.phone : 'N/A') : 'Protected',
      avatar: tm.userId ? tm.userId.avatar : '',
      role: tm.userId ? tm.userId.role : 'WORKER'
    }));

    const tasks = await Task.find({ departmentId: dept._id }).populate('assignedTo', 'name phone avatar').lean();
    const issues = await Issue.find({ departmentId: dept._id }).lean();

    res.json({
      success: true,
      data: {
        ...dept,
        id: dept._id.toString(),
        leader: dept.leaderId ? {
          id: deptLeaderId,
          name: dept.leaderId.name,
          phone: canSeePhone ? dept.leaderId.phone : 'Protected',
          email: dept.leaderId.email,
          avatar: dept.leaderId.avatar
        } : null,
        members,
        tasks: tasks.map(t => ({ ...t, id: t._id.toString() })),
        issues: issues.map(i => ({ ...i, id: i._id.toString() }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch department details' });
  }
});

// Create new department (Event Creator only)
router.post('/', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const { eventId, name, description, leaderId, colorCode } = req.body;
    if (!eventId || !name) {
      return res.status(400).json({ success: false, message: 'Event ID and Department name are required' });
    }

    const newDept = await Department.create({
      eventId,
      name,
      description: description || '',
      leaderId: leaderId || null,
      colorCode: colorCode || '#3b82f6'
    });

    await ActivityLog.create({
      eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'DEPARTMENT_CREATED',
      details: `Created department "${name}"`
    });

    res.status(201).json({
      success: true,
      data: { ...newDept.toObject(), id: newDept._id.toString() },
      message: 'Department created'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
});

// Update department / Assign Team Leader (Event Creator)
router.put('/:id', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const updated = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, data: { ...updated.toObject(), id: updated._id.toString() }, message: 'Department updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
});

// Add / Invite Worker to Department
router.post('/:id/members', authMiddleware, async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const deptLeaderId = dept.leaderId ? dept.leaderId.toString() : null;
    if (req.user.role !== 'EVENT_CREATOR' && req.user._id.toString() !== deptLeaderId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const { userId, name, email, phone } = req.body;
    let targetUserId = userId;

    if (!targetUserId && email) {
      let existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (!existingUser) {
        existingUser = await User.create({
          name: name || email.split('@')[0],
          email: email.toLowerCase().trim(),
          phone: phone || '+880 1700-000000',
          role: 'WORKER',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`
        });
      }
      targetUserId = existingUser._id;
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'User ID or Email is required' });
    }

    const alreadyMember = await TeamMembership.findOne({ departmentId: dept._id, userId: targetUserId });
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this department' });
    }

    const membership = await TeamMembership.create({
      eventId: dept.eventId,
      departmentId: dept._id,
      userId: targetUserId
    });

    await Notification.create({
      userId: targetUserId,
      eventId: dept.eventId,
      type: 'TEAM_INVITATION',
      title: `Joined ${dept.name}`,
      message: `You were added to the ${dept.name} department by ${req.user.name}.`
    });

    res.status(201).json({
      success: true,
      data: { ...membership.toObject(), id: membership._id.toString() },
      message: 'Member added to department'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to add member' });
  }
});

// Remove Worker from Department
router.delete('/:id/members/:membershipId', authMiddleware, async (req, res) => {
  try {
    await TeamMembership.findByIdAndDelete(req.params.membershipId);
    res.json({ success: true, message: 'Member removed from department' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
});

module.exports = router;
