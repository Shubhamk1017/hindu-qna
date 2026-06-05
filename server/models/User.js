const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'scholar', 'guru', 'acharya', 'admin'],
    default: 'user'
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  expertise: [{
    type: String,
    trim: true
  }],
  phone: {
    type: String,
    default: ''
  },
  provider: {
    type: String,
    enum: ['google', 'github', 'local'],
    default: 'local'
  },
  providerId: String,
  reputation: {
    type: Number,
    default: 0
  },
  badges: [{
    name: String,
    type: { type: String, enum: ['bronze', 'silver', 'gold', 'special'] },
    awardedAt: { type: Date, default: Date.now }
  }],
  privileges: [String],
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  answers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Answer' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  bounties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bounty' }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
