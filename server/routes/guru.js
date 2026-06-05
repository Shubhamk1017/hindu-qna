const express = require('express');
const router = express.Router();
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth, guruAuth } = require('../middleware/auth');

// Get guru dashboard
router.get('/dashboard', guruAuth, async (req, res) => {
  try {
    const { search } = req.query;

    // Build filter for pending — exclude guru's own answers
    const pendingFilter = { isVerifiedByGuru: false, author: { $ne: req.user._id } };
    const verifiedFilter = { verifiedBy: req.user._id, isVerifiedByGuru: true };

    // If search is provided, filter by question title
    if (search) {
      const matchingQuestions = await Question.find({
        title: { $regex: search, $options: 'i' }
      }).select('_id');
      const qIds = matchingQuestions.map(q => q._id);
      pendingFilter.question = { $in: qIds };
      verifiedFilter.question = { $in: qIds };
    }

    const [pendingVerifications, verifiedByMe, weeklyCount] = await Promise.all([
      Answer.find(pendingFilter)
        .populate('author', 'name avatar reputation')
        .populate({ path: 'question', select: 'title tags guruVerifiedCount', populate: { path: 'tags', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(50),
      Answer.find(verifiedFilter)
        .populate('author', 'name avatar reputation')
        .populate({ path: 'question', select: 'title tags guruVerifiedCount', populate: { path: 'tags', select: 'name' } })
        .sort({ verifiedAt: -1 })
        .limit(50),
      // Answers verified this week
      Answer.countDocuments({
        verifiedBy: req.user._id,
        verifiedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
    ]);

    // Get total reputation impact from verified answers
    const verifiedAnswers = await Answer.find({ verifiedBy: req.user._id }).select('author');
    const totalRepImpact = verifiedAnswers.length * 25;

    const stats = {
      pendingCount: await Answer.countDocuments(pendingFilter),
      verifiedCount: await Answer.countDocuments(verifiedFilter),
      totalAnswers: await Answer.countDocuments(),
      weeklyVerified: weeklyCount,
      reputationImpact: totalRepImpact,
    };

    res.json({
      pendingVerifications,
      verifiedByMe,
      stats
    });
  } catch (error) {
    console.error('[Guru] Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending verifications
router.get('/pending', guruAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const answers = await Answer.find({ isVerifiedByGuru: false })
      .populate('author', 'name avatar reputation')
      .populate({
        path: 'question',
        populate: { path: 'tags', select: 'name' }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments({ isVerifiedByGuru: false });

    res.json({
      answers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify answer
router.post('/verify/:answerId', guruAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const answer = await Answer.findById(req.params.answerId);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.isVerifiedByGuru) {
      return res.status(400).json({ message: 'Answer already verified' });
    }

    // Prevent self-verification
    if (answer.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot verify your own answer' });
    }

    answer.isVerifiedByGuru = true;
    answer.verifiedBy = req.user._id;
    answer.verifiedAt = new Date();
    answer.verificationNote = note;
    await answer.save();

    // Add reputation to answer author
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 25 } });

    // Increment guru verified count on the question
    await Question.findByIdAndUpdate(answer.question, { $inc: { guruVerifiedCount: 1 } });

    // Add badges (use $push to avoid Mongoose `type` reserved-field issues)
    try {
      const answerAuthor = await User.findById(answer.author);
      if (!answerAuthor.badges || !answerAuthor.badges.some(b => b.name === 'Guru Verified')) {
        await User.findByIdAndUpdate(answer.author, {
          $push: { badges: { name: 'Guru Verified', type: 'gold', awardedAt: new Date() } }
        });
      }
    } catch (badgeErr) {
      console.error('[Guru] Badge error (non-fatal):', badgeErr.message);
    }

    try {
      const guru = await User.findById(req.user._id);
      if (!guru.badges || !guru.badges.some(b => b.name === 'Verification Expert')) {
        await User.findByIdAndUpdate(req.user._id, {
          $push: { badges: { name: 'Verification Expert', type: 'silver', awardedAt: new Date() } }
        });
      }
    } catch (badgeErr) {
      console.error('[Guru] Badge error (non-fatal):', badgeErr.message);
    }

    res.json({ message: 'Answer verified successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Unverify answer
router.post('/unverify/:answerId', guruAuth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.answerId);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.verifiedBy.toString() !== req.user._id.toString() && req.user.role !== 'acharya') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    answer.isVerifiedByGuru = false;
    answer.verifiedBy = undefined;
    answer.verifiedAt = undefined;
    answer.verificationNote = undefined;
    await answer.save();

    // Decrement guru verified count on the question
    await Question.findByIdAndUpdate(answer.question, { $inc: { guruVerifiedCount: -1 } });

    // Remove reputation
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: -25 } });

    res.json({ message: 'Verification removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get verified answers by guru
router.get('/verified', guruAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const answers = await Answer.find({ verifiedBy: req.user._id })
      .populate('author', 'name avatar')
      .populate('question', 'title')
      .sort({ verifiedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments({ verifiedBy: req.user._id });

    res.json({
      answers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all gurus
router.get('/list', async (req, res) => {
  try {
    const gurus = await User.find({ role: { $in: ['guru', 'acharya'] } })
      .select('name avatar reputation badges role')
      .sort({ reputation: -1 });

    res.json(gurus);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Feature answer (acharya only)
router.post('/feature/:answerId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'acharya' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acharya privileges required' });
    }

    const answer = await Answer.findById(req.params.answerId);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    // Add featured badge
    try {
      const author = await User.findById(answer.author);
      if (!author.badges || !author.badges.some(b => b.name === 'Featured Answer')) {
        await User.findByIdAndUpdate(answer.author, {
          $push: { badges: { name: 'Featured Answer', type: 'gold', awardedAt: new Date() } }
        });
      }
    } catch (badgeErr) {
      console.error('[Guru] Featured badge error (non-fatal):', badgeErr.message);
    }

    res.json({ message: 'Answer featured' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
