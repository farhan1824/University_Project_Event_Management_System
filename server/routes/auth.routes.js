const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Department = require('../models/Department');
const TeamMembership = require('../models/TeamMembership');
const ActivityLog = require('../models/ActivityLog');
const { authMiddleware, requireRole } = require('../middleware/auth');

// Get all registered users (annotated with their departments)
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find().lean();
    const departments = await Department.find().lean();
    const memberships = await TeamMembership.find().lean();

    const enrichedUsers = users.map(u => {
      const uIdStr = u._id.toString();

      // Find departments where user is Team Leader
      const leadingDepts = departments
        .filter(d => d.leaderId && d.leaderId.toString() === uIdStr)
        .map(d => ({
          id: d._id.toString(),
          name: d.name,
          eventId: d.eventId ? d.eventId.toString() : null
        }));

      // Find departments where user is a team member
      const memberDepts = memberships
        .filter(m => m.userId && m.userId.toString() === uIdStr)
        .map(m => {
          const dept = departments.find(d => d._id.toString() === m.departmentId.toString());
          return dept ? { id: dept._id.toString(), name: dept.name, eventId: dept.eventId ? dept.eventId.toString() : null } : null;
        }).filter(Boolean);

      return {
        ...u,
        id: u._id.toString(),
        leadingDepartments: leadingDepts,
        memberDepartments: memberDepts
      };
    });

    res.json({ success: true, data: enrichedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// Get current authenticated user profile
router.get('/me', authMiddleware, (req, res) => {
  res.json({ success: true, data: req.user });
});

// Real User Login / Register / Sync with Firebase
router.post('/login', async (req, res) => {
  try {
    const { email, name, phone, avatar, uid } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(uid ? [{ authId: uid }] : [])
      ]
    });

    if (!user) {
      // The very first user to register on the platform becomes the EVENT_CREATOR (Super Admin)
      const userCount = await User.countDocuments();
      const assignedRole = userCount === 0 ? 'EVENT_CREATOR' : 'WORKER';

      user = await User.create({
        authId: uid || null,
        name: name || email.split('@')[0],
        email: normalizedEmail,
        phone: phone || null,
        role: assignedRole,
        avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || email)}`,
        status: 'ACTIVE'
      });

      console.log(`[Auth MongoDB] Created user: ${user.name} (${user.email}) as ${user.role}`);
    } else {
      // Update details if provided
      let changed = false;
      if (uid && !user.authId) { user.authId = uid; changed = true; }
      if (avatar && !user.avatar) { user.avatar = avatar; changed = true; }
      if (name && user.name === user.email.split('@')[0]) { user.name = name; changed = true; }

      if (changed) {
        await user.save();
      }
    }

    res.json({ success: true, data: user, message: 'Authenticated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Authentication error' });
  }
});

// Event Creator Only: Promote / Demote User Role
router.put('/users/:id/role', authMiddleware, requireRole('EVENT_CREATOR'), async (req, res) => {
  try {
    const { role } = req.body;
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (targetUser.role === 'EVENT_CREATOR' && role !== 'EVENT_CREATOR') {
      const creatorCount = await User.countDocuments({ role: 'EVENT_CREATOR' });
      if (creatorCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot demote the sole Event Creator' });
      }
    }

    targetUser.role = role;
    await targetUser.save();

    // Log Activity
    await ActivityLog.create({
      eventId: null,
      userId: req.user._id,
      userName: req.user.name,
      action: 'ROLE_UPDATED',
      details: `Updated role of ${targetUser.name} to ${role}`
    });

    res.json({
      success: true,
      data: targetUser,
      message: `${targetUser.name} has been updated to ${role.replace('_', ' ')}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// Update personal profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json({ success: true, data: user, message: 'Profile updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

module.exports = router;
