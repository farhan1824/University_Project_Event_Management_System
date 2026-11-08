const mongoose = require('mongoose');

const collaborationRequestSchema = new mongoose.Schema({
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  receiverEmail: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true,
    index: true 
  },
  receiverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null, 
    index: true 
  },
  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true, 
    index: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED'], 
    default: 'PENDING', 
    index: true 
  },
  message: { 
    type: String, 
    default: '', 
    trim: true 
  },
  respondedAt: { 
    type: Date, 
    default: null 
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

collaborationRequestSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

module.exports = mongoose.model('CollaborationRequest', collaborationRequestSchema);

