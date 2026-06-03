const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const User = require('../models/User');

/**
 * POST /api/bot/answers
 *
 * Called by the WhatsApp admin bot to post an answer to the website.
 * Authenticated via a shared BOT_API_KEY (header-only, for security).
 *
 * Expected headers:  x-bot-api-key  (must match BOT_API_KEY in .env)
 * Expected body:     { questionId, answerText, answeredBy }
 *
 *   questionId — the main Pariprashna Question's _id (must be a valid ObjectId)
 *   answerText — the answer body (markdown supported, min 10 chars)
 *   answeredBy — phone number of the admin who wrote it (for logging only)
 */
router.post('/answers', async (req, res) => {
  try {
    // ── Validate API key (header-only — NO query-param fallback) ─────────
    const apiKey = req.headers['x-bot-api-key'];
    if (!apiKey || apiKey !== process.env.BOT_API_KEY) {
      return res.status(401).json({ message: 'Invalid or missing API key' });
    }

    const { questionId, answerText, answeredBy } = req.body;

    // ── Validate input ──────────────────────────────────────────────────
    if (!questionId || !answerText) {
      return res.status(400).json({ message: 'questionId and answerText are required' });
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({ message: 'questionId is not a valid ObjectId' });
    }

    const trimmedText = answerText.trim();
    if (trimmedText.length < 10) {
      return res.status(400).json({ message: 'Answer must be at least 10 characters' });
    }

    // ── Look up the question ────────────────────────────────────────────
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({
        message: 'Question not found. Make sure the questionId belongs to the main site\'s database.',
      });
    }

    if (question.isClosed) {
      return res.status(400).json({ message: 'Question is closed' });
    }

    // ── Determine the author (which user gets credit on the site) ────────
    // Priority:
    //   1. BOT_ADMIN_USER_ID env var (recommended — explicitly configured)
    //   2. Fallback to the first admin found
    //   3. Fallback to the first guru/acharya
    //   4. Fallback to the very first user

    let botUser = null;

    if (process.env.BOT_ADMIN_USER_ID) {
      if (!mongoose.Types.ObjectId.isValid(process.env.BOT_ADMIN_USER_ID)) {
        return res.status(500).json({ message: 'BOT_ADMIN_USER_ID is not a valid ObjectId' });
      }
      botUser = await User.findById(process.env.BOT_ADMIN_USER_ID);
      if (!botUser) {
        return res.status(500).json({
          message: `BOT_ADMIN_USER_ID ${process.env.BOT_ADMIN_USER_ID} not found in the database`,
        });
      }
    } else {
      botUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
      if (!botUser) {
        botUser = await User.findOne({ role: { $in: ['guru', 'acharya'] } }).sort({ createdAt: 1 });
      }
      if (!botUser) {
        botUser = await User.findOne().sort({ createdAt: 1 });
      }
    }

    if (!botUser) {
      return res.status(500).json({ message: 'No user found to assign as answer author' });
    }

    // ── Create the answer using the main site's Answer model ───────────
    const answer = new Answer({
      body: trimmedText,
      author: botUser._id,
      question: question._id,
      isAIGenerated: false,
    });

    await answer.save();

    // Link back from question
    question.answers.push(answer._id);
    await question.save();

    // Credit the author
    botUser.answers.push(answer._id);
    botUser.reputation += 10;
    await botUser.save();

    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'name avatar reputation role');

    console.log(`[Bot] Answer posted by ${answeredBy || 'unknown'} for question ${questionId}`);

    res.status(201).json({
      message: 'Answer posted successfully',
      answer: populatedAnswer,
      questionUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/questions/${question._id}`,
    });
  } catch (error) {
    console.error('[Bot] Error posting answer:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
