const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Answer = require('../models/Answer');

// GET /api/activity — recent questions + answers merged by date
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 8, 20);

    const [recentQuestions, recentAnswers] = await Promise.all([
      Question.find()
        .populate('author', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Answer.find()
        .populate('author', 'name avatar')
        .populate('question', 'title')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
    ]);

    const activities = [];

    for (const q of recentQuestions) {
      activities.push({
        type: 'question',
        _id: q._id,
        title: q.title,
        author: q.author,
        createdAt: q.createdAt,
        answerCount: q.answers?.length || 0,
        voteScore: (q.upvotes?.length || 0) - (q.downvotes?.length || 0),
      });
    }

    for (const a of recentAnswers) {
      if (!a.question) continue;
      activities.push({
        type: 'answer',
        _id: a._id,
        questionId: a.question._id,
        questionTitle: a.question.title,
        author: a.author,
        createdAt: a.createdAt,
        isAccepted: a.isAccepted,
        isAIGenerated: a.isAIGenerated,
        isVerifiedByGuru: a.isVerifiedByGuru,
        voteScore: (a.upvotes?.length || 0) - (a.downvotes?.length || 0),
      });
    }

    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ activities: activities.slice(0, limit) });
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
