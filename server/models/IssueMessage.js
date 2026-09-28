const mongoose = require('mongoose');

const issueMessageSchema = new mongoose.Schema({
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, required: true },
  message: { type: String, required: true, trim: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

issueMessageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('IssueMessage', issueMessageSchema);
