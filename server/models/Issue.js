const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  category: { 
    type: String, 
    enum: ['Equipment Problem', 'Material Missing', 'Need More Workers', 'Cannot Complete Task', 'Other'], 
    default: 'Equipment Problem' 
  },
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'CRITICAL' 
  },
  status: { 
    type: String, 
    enum: ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED'], 
    default: 'OPEN' 
  },
  isEscalated: { type: Boolean, default: false, index: true },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

issueSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('Issue', issueSchema);
