const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  authId: { type: String, default: null, index: true }, // Firebase UID
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: null, trim: true },
  role: { 
    type: String, 
    enum: ['EVENT_CREATOR', 'TEAM_LEADER', 'WORKER'], 
    default: 'WORKER',
    required: true 
  },
  avatar: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Map _id to id for frontend compatibility
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('User', userSchema);
