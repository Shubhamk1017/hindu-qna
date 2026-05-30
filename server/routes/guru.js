const express = require('express');
const router = express.Router();
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth, guruAuth } = require('../middleware/auth');

// Get guru dashboard
router.get('/dashboard', guruAuth, async (req, res) => {
  try {
    const pendingVerifications = await Answer.find({ isVerifiedByGuru: false })
      .populate('author', 'name avatar')
      .populate('question', 'title')
      .sort({ createdAt: -1 })
      .limit(20);

    const verifiedByMe = await Answer.find({ verifiedBy: req.user._id })
      .populate('author', 'name avatar')
      .populate('question', 'title')
      .sort({ verifiedAt: -1 })
      .limit(20);

    const stats = {
      pendingCount: await Answer.countDocuments({ isVerifiedByGuru: false }),
      verifiedCount: await Answer.countDocuments({ verifiedBy: req.user._id }),
      totalAnswers: await Answer.countDocuments()
    };

    res.json({
      pendingVerifications,
      verifiedByMe,
      stats
    });
  } catch (error) {
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

    answer.isVerifiedByGuru = true;
    answer.verifiedBy = req.user._id;
    answer.verifiedAt = new Date();
    answer.verificationNote = note;
    await answer.save();

    // Add reputation to answer author
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 25 } });

    // Add badge if first verification received
    const answerAuthor = await User.findById(answer.author);
    const hasVerifiedBadge = answerAuthor.badges.some(b => b.name === 'Guru Verified');
    if (!hasVerifiedBadge) {
      answerAuthor.badges.push({
        name: 'Guru Verified',
        type: 'gold'
      });
      await answerAuthor.save();
    }

    // Add verification badge to guru
    const guru = await User.findById(req.user._id);
    const hasGuruBadge = guru.badges.some(b => b.name === 'Verification Expert');
    if (!hasGuruBadge) {
      guru.badges.push({
        name: 'Verification Expert',
        type: 'silver'
      });
      await guru.save();
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
    const author = await User.findById(answer.author);
    if (!author.badges.some(b => b.name === 'Featured Answer')) {
      author.badges.push({
        name: 'Featured Answer',
        type: 'gold'
      });
      await author.save();
    }

    res.json({ message: 'Answer featured' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
