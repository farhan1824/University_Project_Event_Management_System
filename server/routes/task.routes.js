const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Department = require('../models/Department');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware } = require('../middleware/auth');

// Get tasks with filtering
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, departmentId, assignedTo, status, myTasksOnly } = req.query;
    const filter = {};
    if (eventId) filter.eventId = eventId;
    if (departmentId) filter.departmentId = departmentId;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (myTasksOnly === 'true') filter.assignedTo = req.user._id;
    if (status) filter.status = status;

    const tasks = await Task.find(filter)
      .populate('departmentId', 'name colorCode')
      .populate('assignedTo', 'name phone avatar')
      .populate('createdBy', 'name')
      .lean();

    const activeIssues = await Issue.find({
      taskId: { $in: tasks.map(t => t._id) },
      status: { $ne: 'RESOLVED' }
    }).lean();

    const now = new Date();

    const enriched = tasks.map(task => {
      let currentStatus = task.status;
      if (task.deadline && new Date(task.deadline) < now && task.status !== 'COMPLETED' && task.status !== 'BLOCKED') {
        currentStatus = 'OVERDUE';
      }

      const activeIssue = activeIssues.find(i => i.taskId && i.taskId.toString() === task._id.toString());

      return {
        ...task,
        id: task._id.toString(),
        status: currentStatus,
        departmentName: task.departmentId ? task.departmentId.name : 'Unknown',
        departmentColor: task.departmentId ? task.departmentId.colorCode : '#6b7280',
        assignee: task.assignedTo ? {
          id: task.assignedTo._id.toString(),
          name: task.assignedTo.name,
          phone: task.assignedTo.phone,
          avatar: task.assignedTo.avatar
        } : null,
        creator: task.createdBy ? {
          id: task.createdBy._id.toString(),
          name: task.createdBy.name
        } : null,
        activeIssue: activeIssue ? {
          id: activeIssue._id.toString(),
          title: activeIssue.title,
          priority: activeIssue.priority,
          isEscalated: activeIssue.isEscalated,
          status: activeIssue.status
        } : null
      };
    });

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

// Get single task
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('departmentId')
      .populate('assignedTo')
      .populate('createdBy')
      .lean();

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const issues = await Issue.find({ taskId: task._id }).lean();

    res.json({
      success: true,
      data: {
        ...task,
        id: task._id.toString(),
        issues: issues.map(i => ({ ...i, id: i._id.toString() }))
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { eventId, departmentId, title, description, assignedTo, priority, deadline } = req.body;
    if (!eventId || !departmentId || !title) {
      return res.status(400).json({ success: false, message: 'Event, Department, and Title are required' });
    }

    const newTask = await Task.create({
      eventId,
      departmentId,
      title: title.trim(),
      description: description ? description.trim() : '',
      assignedTo: assignedTo || null,
      createdBy: req.user._id,
      priority: priority || 'MEDIUM',
      status: 'NOT_STARTED',
      progress: 0,
      deadline: deadline || new Date(Date.now() + 14400000)
    });

    if (assignedTo) {
      await Notification.create({
        userId: assignedTo,
        eventId,
        taskId: newTask._id,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You were assigned to "${title}" by ${req.user.name}.`
      });
    }

    await ActivityLog.create({
      eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_CREATED',
      details: `Created task "${title}"`
    });

    res.status(201).json({
      success: true,
      data: { ...newTask.toObject(), id: newTask._id.toString() },
      message: 'Task created successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});

// 1-Tap Action: START Task
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.status = 'IN_PROGRESS';
    task.progress = task.progress === 0 ? 10 : task.progress;
    await task.save();

    await ActivityLog.create({
      eventId: task.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_STARTED',
      details: `Started working on "${task.title}"`
    });

    res.json({
      success: true,
      data: { ...task.toObject(), id: task._id.toString() },
      message: 'Task started'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to start task' });
  }
});

// Worker: Submit Proof of Completion
router.post('/:id/submit-proof', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { proofImage, proofNotes } = req.body;

    task.status = 'PENDING_APPROVAL';
    task.progress = 90;
    task.proofImage = proofImage || null;
    task.proofNotes = proofNotes || '';
    task.submittedAt = new Date();
    await task.save();

    // Notify Department Team Leader
    const dept = await Department.findById(task.departmentId);
    if (dept && dept.leaderId) {
      await Notification.create({
        userId: dept.leaderId,
        eventId: task.eventId,
        taskId: task._id,
        type: 'TASK_PROOF_SUBMITTED',
        title: '📸 Task Proof Submitted',
        message: `${req.user.name} submitted proof for "${task.title}". Please review and approve.`
      });
    }

    await ActivityLog.create({
      eventId: task.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_PROOF_SUBMITTED',
      details: `Submitted completion proof for "${task.title}"`
    });

    res.json({
      success: true,
      data: { ...task.toObject(), id: task._id.toString() },
      message: 'Proof submitted for Team Leader approval'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to submit proof' });
  }
});

// Team Leader / Creator: APPROVE Task
router.post('/:id/approve', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.status = 'COMPLETED';
    task.progress = 100;
    task.completedAt = new Date();
    task.approvedBy = req.user._id;
    await task.save();

    // Auto resolve any open issues on this task
    await Issue.updateMany(
      { taskId: task._id, status: { $ne: 'RESOLVED' } },
      { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: req.user.name }
    );

    // Notify Worker
    if (task.assignedTo) {
      await Notification.create({
        userId: task.assignedTo,
        eventId: task.eventId,
        taskId: task._id,
        type: 'TASK_APPROVED',
        title: '✅ Task Approved',
        message: `Your proof for "${task.title}" was approved by ${req.user.name}. Great job!`
      });
    }

    await ActivityLog.create({
      eventId: task.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_APPROVED',
      details: `Approved completion proof for task "${task.title}"`
    });

    res.json({
      success: true,
      data: { ...task.toObject(), id: task._id.toString() },
      message: 'Task approved and marked completed'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to approve task' });
  }
});

// Team Leader / Creator: REJECT / Request Rework
router.post('/:id/reject', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const { feedbackNotes } = req.body;

    task.status = 'IN_PROGRESS';
    task.progress = 50;
    task.feedbackNotes = feedbackNotes || 'Proof insufficient. Please redo and resubmit.';
    await task.save();

    // Notify Worker
    if (task.assignedTo) {
      await Notification.create({
        userId: task.assignedTo,
        eventId: task.eventId,
        taskId: task._id,
        type: 'TASK_REWORK_REQUESTED',
        title: '⚠️ Rework Requested',
        message: `${req.user.name} requested changes on "${task.title}": ${feedbackNotes || 'Please review and resubmit proof.'}`
      });
    }

    await ActivityLog.create({
      eventId: task.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_REWORK_REQUESTED',
      details: `Requested changes for task "${task.title}"`
    });

    res.json({
      success: true,
      data: { ...task.toObject(), id: task._id.toString() },
      message: 'Rework requested. Worker notified.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to reject task' });
  }
});

// Direct Action: COMPLETE Task (Fallback)
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.status = 'COMPLETED';
    task.progress = 100;
    task.completedAt = new Date();
    await task.save();

    // Auto resolve any open issues on this task
    await Issue.updateMany(
      { taskId: task._id, status: { $ne: 'RESOLVED' } },
      { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: req.user.name }
    );

    // Notify Department Team Leader
    const dept = await Department.findById(task.departmentId);
    if (dept && dept.leaderId) {
      await Notification.create({
        userId: dept.leaderId,
        eventId: task.eventId,
        taskId: task._id,
        type: 'TASK_COMPLETED',
        title: '✓ Task Completed',
        message: `${req.user.name} marked "${task.title}" as completed.`
      });
    }

    await ActivityLog.create({
      eventId: task.eventId,
      userId: req.user._id,
      userName: req.user.name,
      action: 'TASK_COMPLETED',
      details: `Completed task "${task.title}"`
    });

    res.json({
      success: true,
      data: { ...task.toObject(), id: task._id.toString() },
      message: 'Task marked completed'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to complete task' });
  }
});

// Update task (Assign worker, change status, etc.)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) return res.status(404).json({ success: false, message: 'Task not found' });

    const wasUnassigned = !existingTask.assignedTo;
    const isNewAssignee = req.body.assignedTo && (!existingTask.assignedTo || existingTask.assignedTo.toString() !== req.body.assignedTo);

    const updated = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('departmentId', 'name colorCode')
      .populate('assignedTo', 'name phone avatar')
      .populate('createdBy', 'name');

    if (isNewAssignee && req.body.assignedTo) {
      await Notification.create({
        userId: req.body.assignedTo,
        eventId: updated.eventId,
        taskId: updated._id,
        type: 'TASK_ASSIGNED',
        title: 'New Task Assigned',
        message: `You were assigned to "${updated.title}" by ${req.user.name}.`
      });

      await ActivityLog.create({
        eventId: updated.eventId,
        userId: req.user._id,
        userName: req.user.name,
        action: 'TASK_ASSIGNED',
        details: `Assigned task "${updated.title}" to ${updated.assignedTo ? updated.assignedTo.name : 'Worker'}`
      });
    }

    res.json({
      success: true,
      data: {
        ...updated.toObject(),
        id: updated._id.toString(),
        assignee: updated.assignedTo ? {
          id: updated.assignedTo._id.toString(),
          name: updated.assignedTo.name,
          phone: updated.assignedTo.phone,
          avatar: updated.assignedTo.avatar
        } : null
      },
      message: 'Task updated successfully'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

module.exports = router;
