const mongoose = require('mongoose');

const whatsappMessageSchema = new mongoose.Schema({
  // Link to the question this is answering
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  // The answer text received via WhatsApp
  answerText: {
    type: String,
    required: true,
  },
  // WhatsApp sender info
  senderPhone: {
    type: String,
    default: '',
  },
  senderName: {
    type: String,
    default: '',
  },
  // The WhatsApp message ID for deduplication
  whatsappMessageId: {
    type: String,
    unique: true,
    sparse: true,
  },
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // Which guru user this answer is assigned to (set on approval)
  assignedGuru: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Admin who approved/rejected
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewedAt: Date,
  rejectionReason: String,
  // Reference to the Answer created on the main site
  publishedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
whatsappMessageSchema.index({ status: 1, createdAt: -1 });
whatsappMessageSchema.index({ question: 1 });

module.exports = mongoose.model('WhatsAppMessage', whatsappMessageSchema);
