const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isAccepted: {
    type: Boolean,
    default: false
  },
  isVerifiedByGuru: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  verificationNote: String,
  isAIGenerated: {
    type: Boolean,
    default: false
  },
  aiModel: String,
  isVerifiedByAdmin: {
    type: Boolean,
    default: false
  },
  adminVerifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminVerifiedAt: Date,
  adminNote: String,
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

answerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

answerSchema.virtual('voteScore').get(function() {
  return this.upvotes.length - this.downvotes.length;
});

answerSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Answer', answerSchema);
