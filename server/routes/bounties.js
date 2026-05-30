const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Create bounty
router.post('/:questionId', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const question = await Question.findById(req.params.questionId);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot bounty your own question' });
    }

    if (question.isBounty) {
      return res.status(400).json({ message: 'Question already has a bounty' });
    }

    if (req.user.reputation < amount) {
      return res.status(400).json({ message: 'Insufficient reputation' });
    }

    // Deduct reputation
    req.user.reputation -= amount;
    await req.user.save();

    // Set bounty
    question.isBounty = true;
    question.bountyAmount = amount;
    question.bountyCreator = req.user._id;
    question.bountyExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await question.save();

    res.json({ message: 'Bounty created' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Award bounty
router.post('/:questionId/award/:answerId', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only question author can award bounty' });
    }

    if (!question.isBounty) {
      return res.status(400).json({ message: 'No bounty on this question' });
    }

    if (question.bountyWinner) {
      return res.status(400).json({ message: 'Bounty already awarded' });
    }

    // Award bounty
    question.bountyWinner = req.params.answerId;
    await question.save();

    // Give reputation to winner
    await User.findByIdAndUpdate(req.params.answerId, {
      $inc: { reputation: question.bountyAmount }
    });

    res.json({ message: 'Bounty awarded' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get active bounties
router.get('/active', async (req, res) => {
  try {
    const bounties = await Question.find({ 
      isBounty: true, 
      bountyExpiresAt: { $gt: new Date() } 
    })
    .populate('author', 'name avatar')
    .populate('bountyCreator', 'name avatar')
    .sort({ bountyAmount: -1 });

    res.json(bounties);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's bounties
router.get('/my-bounties', auth, async (req, res) => {
  try {
    const bounties = await Question.find({ bountyCreator: req.user._id })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(bounties);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
