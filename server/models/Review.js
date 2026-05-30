const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['first_question', 'first_answer', 'late_answer', 'close_vote', 'suggested_edit'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'postModel'
  },
  postModel: {
    type: String,
    required: true,
    enum: ['Question', 'Answer']
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: String,
    reviewedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Review', reviewSchema);
