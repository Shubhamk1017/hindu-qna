const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sessionId: {
    type: String,
    required: true
  },
  preview: {
    type: String,
    default: ''
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system']
    },
    content: String,
    sources: [{
      reference: String,
      translation: String,
      url: String
    }],
    feedback: {
      type: String,
      enum: ['helpful', 'unhelpful', null],
      default: null
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  context: {
    relatedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    relatedAnswers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AIChat', aiChatSchema);
