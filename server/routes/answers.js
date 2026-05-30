const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Create answer - only gurus/scholars/admins can post
router.post('/:questionId', auth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Only gurus, scholars, acharyas, and admins can post answers
    if (!['guru', 'scholar', 'acharya', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only gurus and scholars can post answers' });
    }

    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.isClosed) {
      return res.status(400).json({ message: 'Question is closed' });
    }

    const answer = new Answer({
      body: req.body.body,
      author: req.user._id,
      question: question._id
    });

    await answer.save();

    // Add to question's answers
    question.answers.push(answer._id);
    await question.save();

    // Add to user's answers
    req.user.answers.push(answer._id);
    await req.user.save();

    // Add reputation
    req.user.reputation += 10;
    await req.user.save();

    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'name avatar reputation');

    res.status(201).json(populatedAnswer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update answer
router.put('/:id', auth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    answer.body = req.body.body || answer.body;
    await answer.save();

    res.json(answer);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete answer
router.delete('/:id', auth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove from question
    await Question.findByIdAndUpdate(answer.question, {
      $pull: { answers: answer._id }
    });

    // Remove from user
    await User.findByIdAndUpdate(answer.author, {
      $pull: { answers: answer._id }
    });

    await answer.deleteOne();
    res.json({ message: 'Answer deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Vote on answer
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { type } = req.body;
    const answer = await Answer.findById(req.params.id);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (answer.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot vote on your own answer' });
    }

    const upvoteIndex = answer.upvotes.findIndex(id => id.toString() === req.user._id.toString());
    const downvoteIndex = answer.downvotes.findIndex(id => id.toString() === req.user._id.toString());

    if (type === 'upvote') {
      if (upvoteIndex === -1) {
        answer.upvotes.push(req.user._id);
        if (downvoteIndex !== -1) {
          answer.downvotes.splice(downvoteIndex, 1);
        }
      } else {
        answer.upvotes.splice(upvoteIndex, 1);
      }
    } else if (type === 'downvote') {
      if (downvoteIndex === -1) {
        answer.downvotes.push(req.user._id);
        if (upvoteIndex !== -1) {
          answer.upvotes.splice(upvoteIndex, 1);
        }
      } else {
        answer.downvotes.splice(downvoteIndex, 1);
      }
    }

    await answer.save();
    res.json({ upvotes: answer.upvotes.length, downvotes: answer.downvotes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
