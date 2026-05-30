const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { auth } = require('../middleware/auth');

// Get all users
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'reputation' } = req.query;
    
    let sortOption = { reputation: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'name') sortOption = { name: 1 };

    const users = await User.find()
      .select('-password')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments();

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
    const questions = await require('../models/Question').find({ author: req.params.id })
      .populate('tags', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get user's answers
    const answers = await require('../models/Answer').find({ author: req.params.id })
      .populate('question', 'title')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ ...user.toObject(), questions, answers });
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
