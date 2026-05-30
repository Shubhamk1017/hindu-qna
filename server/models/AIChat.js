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
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system']
    },
    content: String,
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
