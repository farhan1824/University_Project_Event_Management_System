const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  colorCode: { type: String, default: '#3b82f6' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

departmentSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('Department', departmentSchema);
