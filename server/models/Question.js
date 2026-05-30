const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  body: {
    type: String,
    default: ''
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  answers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  views: {
    type: Number,
    default: 0
  },
  viewUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isClosed: {
    type: Boolean,
    default: false
  },
  closeReason: String,
  isProtected: {
    type: Boolean,
    default: false
  },
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer'
  },
  isBounty: {
    type: Boolean,
    default: false
  },
  bountyAmount: {
    type: Number,
    default: 0
  },
  bountyCreator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bountyWinner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bountyExpiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

questionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

questionSchema.virtual('voteScore').get(function() {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

questionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Question', questionSchema);
