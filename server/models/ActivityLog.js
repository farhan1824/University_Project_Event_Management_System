const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

activityLogSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
