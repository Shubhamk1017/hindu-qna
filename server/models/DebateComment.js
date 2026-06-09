const mongoose = require('mongoose');

const debateCommentSchema = new mongoose.Schema({
  debate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debate',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: {
    type: String,
    required: true,
    maxlength: 1000
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DebateComment', debateCommentSchema);
