const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  priority: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    default: 'MEDIUM' 
  },
  status: { 
    type: String, 
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'COMPLETED', 'BLOCKED', 'OVERDUE'], 
    default: 'NOT_STARTED' 
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  deadline: { type: Date, required: true },
  proofImage: { type: String, default: null },
  proofNotes: { type: String, default: '' },
  submittedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  feedbackNotes: { type: String, default: '' },
  completedAt: { type: Date, default: null }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

taskSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('Task', taskSchema);
