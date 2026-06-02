const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { auth } = require('../middleware/auth');

// Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'reputation', role } = req.query;
    
    let sortOption = { reputation: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };

    const filter = {};
    if (role) filter.role = role;

    const users = await User.find(filter)
      .select('-password')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's questions
    const questions = await Question.find({ author: req.params.id })
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get user's answers
    const answers = await Answer.find({ author: req.params.id })
      .populate('question', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate stats
    const totalUpvotesOnQuestions = questions.reduce((sum, q) => sum + (q.upvotes?.length || 0), 0);
    const totalUpvotesOnAnswers = answers.reduce((sum, a) => sum + (a.upvotes?.length || 0), 0);
    const acceptedAnswers = answers.filter(a => a.isAccepted).length;
    const verifiedAnswers = answers.filter(a => a.isVerifiedByGuru).length;
    const totalViews = questions.reduce((sum, q) => sum + (q.views || 0), 0);

    // Recent activity (last 10 items)
    const recentActivity = [];
    for (const q of questions.slice(0, 5)) {
      recentActivity.push({
        type: 'question',
        _id: q._id,
        title: q.title,
        createdAt: q.createdAt,
        voteScore: (q.upvotes?.length || 0) - (q.downvotes?.length || 0),
        answerCount: q.answers?.length || 0,
        tags: q.tags,
      });
    }
    for (const a of answers.slice(0, 5)) {
      recentActivity.push({
        type: 'answer',
        _id: a._id,
        questionId: a.question?._id,
        questionTitle: a.question?.title,
        createdAt: a.createdAt,
        voteScore: (a.upvotes?.length || 0) - (a.downvotes?.length || 0),
        isAccepted: a.isAccepted,
        isVerifiedByGuru: a.isVerifiedByGuru,
        isAIGenerated: a.isAIGenerated,
      });
    }
    recentActivity.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      ...user.toObject(),
      questions,
      answers,
      stats: {
        totalQuestions: questions.length,
        totalAnswers: answers.length,
        totalBadges: user.badges?.length || 0,
        reputation: user.reputation || 0,
        totalUpvotes: totalUpvotesOnQuestions + totalUpvotesOnAnswers,
        acceptedAnswers,
        verifiedAnswers,
        totalViews,
      },
      recentActivity: recentActivity.slice(0, 10),
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's questions
router.get('/:id/questions', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const questions = await Question.find({ author: req.params.id })
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments({ author: req.params.id });

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's answers
router.get('/:id/answers', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const answers = await Answer.find({ author: req.params.id })
      .populate('question', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments({ author: req.params.id });

    res.json({
      answers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add question to favorites
router.post('/favorites/:questionId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const questionId = req.params.questionId;

    const index = user.favorites.indexOf(questionId);
    if (index === -1) {
      user.favorites.push(questionId);
    } else {
      user.favorites.splice(index, 1);
    }

    await user.save();
    res.json({ favorites: user.favorites });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's favorites
router.get('/:id/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'favorites',
        populate: { path: 'tags', select: 'name' }
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's badges
router.get('/:id/badges', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('badges name avatar');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.badges);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
