const User = require('../models/User');
const mongoose = require('mongoose');

/**
 * Authentication Middleware
 * Validates user from headers or bearer tokens via MongoDB
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'];

    let target = null;

    if (userIdHeader) {
      target = userIdHeader;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      target = authHeader.split('Bearer ')[1];
    }

    if (!target) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
    }

    let user = null;

    // Try finding by MongoDB _id if valid ObjectId
    if (mongoose.Types.ObjectId.isValid(target)) {
      user = await User.findById(target);
    }

    // Try finding by Firebase authId or email
    if (!user) {
      user = await User.findOne({
        $or: [
          { authId: target },
          { email: target.toLowerCase() }
        ]
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'User session not found. Please sign in.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[AuthMiddleware Error]:', err);
    res.status(500).json({ success: false, message: 'Internal authentication error' });
  }
}

/**
 * Role-Based Access Control Guard
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
      });
    }

    next();
  };
}

module.exports = { authMiddleware, requireRole };
