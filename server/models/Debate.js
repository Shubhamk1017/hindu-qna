const mongoose = require('mongoose');

const argumentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  body: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 5000,
  },
  round: {
    type: Number,
    required: true,
    min: 1,
  },
  side: {
    type: String,
    enum: ['A', 'B'],
    required: true,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  reactions: {
    pranam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    pramana: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    yukti: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sanka: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  scriptureRefs: [{
    type: String,
    trim: true,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const debateSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 15,
    maxlength: 300,
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000,
  },
  category: {
    type: String,
    enum: ['philosophy', 'scripture', 'practice', 'social'],
    default: 'philosophy',
  },
  status: {
    type: String,
    enum: ['open', 'active', 'voting', 'closed'],
    default: 'open',
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  sideA: {
    label: { type: String, required: true, trim: true },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  sideB: {
    label: { type: String, required: true, trim: true },
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  arguments: [argumentSchema],
  maxRounds: {
    type: Number,
    default: 3,
    min: 1,
    max: 5,
  },
  currentRound: {
    type: Number,
    default: 1,
  },
  votes: {
    sideA: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    sideB: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  judge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  judgeVerdict: {
    verdictText: { type: String, default: '' },
    winner: { type: String, enum: ['sideA', 'sideB', 'draw', null], default: null },
    scriptureReferences: [{ type: String, trim: true }],
    decidedAt: { type: Date }
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  sharesCount: {
    type: Number,
    default: 0
  },
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  winner: {
    type: String,
    enum: ['sideA', 'sideB', 'draw', null],
    default: null,
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag',
  }],
  votingEndsAt: {
    type: Date,
  },
  maxParticipantsPerSide: {
    type: Number,
    default: 3,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

debateSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Virtual for total vote count
debateSchema.virtual('totalVotes').get(function () {
  return (this.votes?.sideA?.length || 0) + (this.votes?.sideB?.length || 0);
});

debateSchema.virtual('totalArguments').get(function () {
  return this.arguments?.length || 0;
});

debateSchema.set('toJSON', { virtuals: true });
debateSchema.set('toObject', { virtuals: true });

// Indexes
debateSchema.index({ status: 1, createdAt: -1 });
debateSchema.index({ category: 1 });
debateSchema.index({ creator: 1 });

module.exports = mongoose.model('Debate', debateSchema);
