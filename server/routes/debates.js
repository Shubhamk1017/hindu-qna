const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Debate = require('../models/Debate');
const User = require('../models/User');
const Tag = require('../models/Tag');
const DebateComment = require('../models/DebateComment');
const { auth, guruAuth } = require('../middleware/auth');

// ─── Get all debates (with filters + pagination) ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12, status, category, sort = 'newest' } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;

    let sortOption = { createdAt: -1 };
    if (sort === 'popular') sortOption = { likes: -1 };
    if (sort === 'active') sortOption = { updatedAt: -1 };

    const debates = await Debate.find(query)
      .populate('creator', 'name avatar reputation role')
      .populate('sideA.participants', 'name avatar')
      .populate('sideB.participants', 'name avatar')
      .populate('judge', 'name avatar reputation role')
      .populate('tags', 'name')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Debate.countDocuments(query);

    res.json({
      debates,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error('[Debates] Error fetching debates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get single debate ──────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id)
      .populate('creator', 'name avatar reputation role')
      .populate('sideA.participants', 'name avatar reputation role')
      .populate('sideB.participants', 'name avatar reputation role')
      .populate('arguments.author', 'name avatar reputation role')
      .populate('judge', 'name avatar reputation role')
      .populate('moderator', 'name avatar role')
      .populate('tags', 'name');

    if (!debate) {
      return res.status(404).json({ message: 'Debate not found' });
    }

    res.json(debate);
  } catch (error) {
    console.error('[Debates] Error fetching debate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Create a new debate ────────────────────────────────────────────────────
router.post('/', auth, [
  body('title').trim().isLength({ min: 15, max: 300 }).withMessage('Title must be 15-300 characters'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('sideALabel').trim().isLength({ min: 3, max: 100 }).withMessage('Side A label required'),
  body('sideBLabel').trim().isLength({ min: 3, max: 100 }).withMessage('Side B label required'),
  body('category').optional().isIn(['philosophy', 'scripture', 'practice', 'social']),
  body('tags').optional().isArray({ max: 5 }),
  body('maxRounds').optional().isInt({ min: 1, max: 5 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, sideALabel, sideBLabel, category, tags: tagNames, maxRounds, joinSide } = req.body;

    // Process tags
    const tagIds = [];
    if (tagNames && tagNames.length > 0) {
      for (const tagName of tagNames) {
        let tag = await Tag.findOne({ name: tagName.toLowerCase() });
        if (!tag) {
          tag = new Tag({ name: tagName.toLowerCase() });
          await tag.save();
        }
        tagIds.push(tag._id);
      }
    }

    const debate = new Debate({
      title,
      description: description || '',
      category: category || 'philosophy',
      creator: req.user._id,
      sideA: {
        label: sideALabel,
        participants: joinSide === 'A' ? [req.user._id] : [],
      },
      sideB: {
        label: sideBLabel,
        participants: joinSide === 'B' ? [req.user._id] : [],
      },
      maxRounds: maxRounds || 3,
      tags: tagIds,
    });

    await debate.save();

    const populated = await Debate.findById(debate._id)
      .populate('creator', 'name avatar reputation role')
      .populate('sideA.participants', 'name avatar')
      .populate('sideB.participants', 'name avatar')
      .populate('tags', 'name');

    res.status(201).json(populated);
  } catch (error) {
    console.error('[Debates] Error creating debate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Join a side ────────────────────────────────────────────────────────────
router.post('/:id/join', auth, [
  body('side').isIn(['A', 'B']).withMessage('Side must be A or B'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    if (debate.status !== 'open') {
      return res.status(400).json({ message: 'Debate is no longer accepting participants' });
    }

    const userId = req.user._id.toString();

    // Check if already on a side
    const onSideA = debate.sideA.participants.some(p => p.toString() === userId);
    const onSideB = debate.sideB.participants.some(p => p.toString() === userId);
    if (onSideA || onSideB) {
      return res.status(400).json({ message: 'You have already joined this debate' });
    }

    const { side } = req.body;
    const sideKey = side === 'A' ? 'sideA' : 'sideB';

    if (debate[sideKey].participants.length >= debate.maxParticipantsPerSide) {
      return res.status(400).json({ message: `Side ${side} is full (max ${debate.maxParticipantsPerSide} participants)` });
    }

    debate[sideKey].participants.push(req.user._id);

    // Auto-transition to 'active' if both sides have at least 1 participant
    if (debate.sideA.participants.length >= 1 && debate.sideB.participants.length >= 1 && debate.status === 'open') {
      debate.status = 'active';
    }

    await debate.save();

    const populated = await Debate.findById(debate._id)
      .populate('sideA.participants', 'name avatar')
      .populate('sideB.participants', 'name avatar');

    res.json({ message: `Joined side ${side}`, debate: populated });
  } catch (error) {
    console.error('[Debates] Error joining debate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Submit an argument ─────────────────────────────────────────────────────
router.post('/:id/argue', auth, [
  body('body').trim().isLength({ min: 50, max: 5000 }).withMessage('Argument must be 50-5000 characters'),
  body('scriptureRefs').optional().isArray({ max: 10 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    if (debate.status !== 'active') {
      return res.status(400).json({ message: 'Debate is not currently active for arguments' });
    }

    const userId = req.user._id.toString();

    // Determine which side the user is on
    const onSideA = debate.sideA.participants.some(p => p.toString() === userId);
    const onSideB = debate.sideB.participants.some(p => p.toString() === userId);

    if (!onSideA && !onSideB) {
      return res.status(403).json({ message: 'You must join a side before submitting arguments' });
    }

    const side = onSideA ? 'A' : 'B';

    // Check if user already argued in this round
    const existingArg = debate.arguments.find(
      a => a.author.toString() === userId && a.round === debate.currentRound
    );
    if (existingArg) {
      return res.status(400).json({ message: `You already submitted your argument for round ${debate.currentRound}` });
    }

    const { body: argBody, scriptureRefs } = req.body;

    debate.arguments.push({
      author: req.user._id,
      body: argBody,
      round: debate.currentRound,
      side,
      scriptureRefs: scriptureRefs || [],
      reactions: { pranam: [], pramana: [], yukti: [], sanka: [] }
    });

    // Check if this round is complete (both sides have submitted for this round)
    const roundArgs = debate.arguments.filter(a => a.round === debate.currentRound);
    const sideAArgs = roundArgs.filter(a => a.side === 'A');
    const sideBArgs = roundArgs.filter(a => a.side === 'B');

    // Round is complete when at least one person from each side has argued
    if (sideAArgs.length > 0 && sideBArgs.length > 0) {
      if (debate.currentRound >= debate.maxRounds) {
        // All rounds complete → move to voting/verdict phase
        debate.status = 'voting';
        debate.votingEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      } else {
        debate.currentRound += 1;
      }
    }

    await debate.save();

    const populated = await Debate.findById(debate._id)
      .populate('arguments.author', 'name avatar reputation role');

    res.json({
      message: 'Argument submitted',
      debate: populated,
    });
  } catch (error) {
    console.error('[Debates] Error submitting argument:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Vote on a debate ───────────────────────────────────────────────────────
router.post('/:id/vote', auth, [
  body('side').isIn(['A', 'B']).withMessage('Vote must be for side A or B'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    if (debate.status !== 'voting') {
      return res.status(400).json({ message: 'Debate is not in voting phase' });
    }

    // Check if voting period has expired
    if (debate.votingEndsAt && new Date() > debate.votingEndsAt) {
      return res.status(400).json({ message: 'Voting period has ended' });
    }

    const userId = req.user._id.toString();

    // Check if already voted
    const votedA = debate.votes.sideA.some(v => v.toString() === userId);
    const votedB = debate.votes.sideB.some(v => v.toString() === userId);
    if (votedA || votedB) {
      return res.status(400).json({ message: 'You have already voted on this debate' });
    }

    // Participants cannot vote on their own debate
    const isParticipant = debate.sideA.participants.some(p => p.toString() === userId) ||
                          debate.sideB.participants.some(p => p.toString() === userId);
    if (isParticipant) {
      return res.status(400).json({ message: 'Debate participants cannot vote' });
    }

    const { side } = req.body;
    const voteKey = side === 'A' ? 'sideA' : 'sideB';
    debate.votes[voteKey].push(req.user._id);

    await debate.save();

    res.json({
      message: `Voted for side ${side}`,
      votes: {
        sideA: debate.votes.sideA.length,
        sideB: debate.votes.sideB.length,
      },
    });
  } catch (error) {
    console.error('[Debates] Error voting:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Like/unlike a debate ────────────────────────────────────────────────────
router.post('/:id/like', auth, async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    const userIndex = debate.likes.indexOf(req.user._id);
    if (userIndex === -1) {
      debate.likes.push(req.user._id);
    } else {
      debate.likes.splice(userIndex, 1);
    }

    await debate.save();
    res.json({ likesCount: debate.likes.length, hasLiked: userIndex === -1 });
  } catch (error) {
    console.error('[Debates] Error liking debate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Share a debate ─────────────────────────────────────────────────────────
router.post('/:id/share', async (req, res) => {
  try {
    const debate = await Debate.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    if (!debate) return res.status(404).json({ message: 'Debate not found' });
    res.json({ sharesCount: debate.sharesCount });
  } catch (error) {
    console.error('[Debates] Error incrementing share:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Apply to judge a debate ─────────────────────────────────────────────────
router.post('/:id/judge/apply', auth, async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    if (!['guru', 'acharya'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only qualified experts (Gurus/Acharyas) can judge debates' });
    }

    if (debate.judge) {
      return res.status(400).json({ message: 'A judge has already been assigned to this debate' });
    }

    // Check if the judge is a participant
    const userId = req.user._id.toString();
    const isParticipant = debate.sideA.participants.some(p => p.toString() === userId) ||
                          debate.sideB.participants.some(p => p.toString() === userId);
    if (isParticipant) {
      return res.status(400).json({ message: 'You cannot judge a debate you are participating in' });
    }

    debate.judge = req.user._id;
    await debate.save();

    const populated = await Debate.findById(debate._id)
      .populate('judge', 'name avatar reputation role');

    res.json({ message: 'Assigned as judge', debate: populated });
  } catch (error) {
    console.error('[Debates] Error applying as judge:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Submit Judge Verdict ────────────────────────────────────────────────────
router.post('/:id/judge/verdict', auth, [
  body('verdictText').trim().isLength({ min: 10, max: 2000 }).withMessage('Verdict text must be 10-2000 characters'),
  body('winner').isIn(['sideA', 'sideB', 'draw']).withMessage('Verdict winner must be sideA, sideB, or draw'),
  body('scriptureReferences').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    if (!debate.judge || debate.judge.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You are not authorized to submit a verdict for this debate' });
    }

    if (debate.status === 'closed') {
      return res.status(400).json({ message: 'This debate is already concluded' });
    }

    const { verdictText, winner, scriptureReferences } = req.body;

    debate.judgeVerdict = {
      verdictText,
      winner,
      scriptureReferences: scriptureReferences || [],
      decidedAt: new Date()
    };
    debate.winner = winner;
    debate.status = 'closed';

    await debate.save();

    // Award reputation bonus (+50 points) to winner side participants
    if (winner !== 'draw' && winner) {
      const winnerIds = debate[winner].participants;
      await User.updateMany(
        { _id: { $in: winnerIds } },
        { $inc: { reputation: 50 } }
      );
    }

    res.json({ message: 'Verdict submitted', debate });
  } catch (error) {
    console.error('[Debates] Error submitting verdict:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── React to debate argument ────────────────────────────────────────────────
router.post('/:id/arguments/:argId/react', auth, [
  body('reactionType').isIn(['pranam', 'pramana', 'yukti', 'sanka']).withMessage('Invalid reaction type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    const arg = debate.arguments.id(req.params.argId);
    if (!arg) return res.status(404).json({ message: 'Argument not found' });

    const { reactionType } = req.body;
    const userId = req.user._id;

    if (!arg.reactions) {
      arg.reactions = { pranam: [], pramana: [], yukti: [], sanka: [] };
    }

    // Toggle reaction
    const userIndex = arg.reactions[reactionType].indexOf(userId);
    if (userIndex === -1) {
      arg.reactions[reactionType].push(userId);
    } else {
      arg.reactions[reactionType].splice(userIndex, 1);
    }

    await debate.save();
    res.json({ reactions: arg.reactions });
  } catch (error) {
    console.error('[Debates] Error reacting to argument:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get all comments for a debate ───────────────────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await DebateComment.find({ debate: req.params.id })
      .populate('author', 'name avatar reputation role')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    console.error('[Debates] Error fetching comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Post comment on a debate ────────────────────────────────────────────────
router.post('/:id/comments', auth, [
  body('body').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1-1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    const comment = new DebateComment({
      debate: debate._id,
      author: req.user._id,
      body: req.body.body
    });

    await comment.save();

    const populated = await DebateComment.findById(comment._id)
      .populate('author', 'name avatar reputation role');

    res.status(201).json(populated);
  } catch (error) {
    console.error('[Debates] Error creating comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Like comment ───────────────────────────────────────────────────────────
router.post('/:id/comments/:commentId/like', auth, async (req, res) => {
  try {
    const comment = await DebateComment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const userIndex = comment.upvotes.indexOf(req.user._id);
    if (userIndex === -1) {
      comment.upvotes.push(req.user._id);
    } else {
      comment.upvotes.splice(userIndex, 1);
    }

    await comment.save();
    res.json({ likesCount: comment.upvotes.length, hasLiked: userIndex === -1 });
  } catch (error) {
    console.error('[Debates] Error liking comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Close debate manually (fallback/moderator override) ──────────────────────
router.post('/:id/close', guruAuth, async (req, res) => {
  try {
    const debate = await Debate.findById(req.params.id);
    if (!debate) return res.status(404).json({ message: 'Debate not found' });

    if (debate.status === 'closed') {
      return res.status(400).json({ message: 'Debate is already closed' });
    }

    const votesA = debate.votes.sideA.length;
    const votesB = debate.votes.sideB.length;

    if (votesA > votesB) {
      debate.winner = 'sideA';
    } else if (votesB > votesA) {
      debate.winner = 'sideB';
    } else {
      debate.winner = 'draw';
    }

    debate.status = 'closed';
    await debate.save();

    // Award reputation to winning side participants
    if (debate.winner !== 'draw' && debate.winner) {
      const winnerKey = debate.winner;
      const winnerIds = debate[winnerKey].participants;
      await User.updateMany(
        { _id: { $in: winnerIds } },
        { $inc: { reputation: 25 } }
      );
    }

    res.json({
      message: 'Debate closed',
      winner: debate.winner,
      votes: { sideA: votesA, sideB: votesB },
    });
  } catch (error) {
    console.error('[Debates] Error closing debate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get debate stats (public) ──────────────────────────────────────────────
router.get('/stats/overview', async (req, res) => {
  try {
    const [total, active, voting, closed] = await Promise.all([
      Debate.countDocuments(),
      Debate.countDocuments({ status: 'active' }),
      Debate.countDocuments({ status: 'voting' }),
      Debate.countDocuments({ status: 'closed' }),
    ]);

    res.json({ total, active, voting, closed });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
