const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const { auth, adminAuth } = require('../middleware/auth');

// Public stats for homepage
router.get('/public-stats', async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      questions: await Question.countDocuments(),
      answers: await Answer.countDocuments({ isAIGenerated: false }),
      tags: await Tag.countDocuments()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = {
      users: await User.countDocuments(),
      questions: await Question.countDocuments(),
      answers: await Answer.countDocuments(),
      tags: await Tag.countDocuments(),
      pendingGurus: await User.countDocuments({ role: 'user', isApprovedGuru: true }),
      gurus: await User.countDocuments({ role: { $in: ['guru', 'acharya'] } })
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
router.put('/users/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'User role updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve guru
router.post('/gurus/approve', adminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'guru';
    user.badges.push({
      name: 'Approved Guru',
      type: 'special'
    });
    await user.save();

    res.json({ message: 'Guru approved' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject guru
router.post('/gurus/reject', adminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = 'user';
    await user.save();

    res.json({ message: 'Guru rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete content
router.delete('/content/:type/:id', adminAuth, async (req, res) => {
  try {
    const { type, id } = req.params;

    if (type === 'question') {
      await Question.findByIdAndDelete(id);
      await Answer.deleteMany({ question: id });
    } else if (type === 'answer') {
      await Answer.findByIdAndDelete(id);
    } else if (type === 'user') {
      await User.findByIdAndDelete(id);
    } else if (type === 'tag') {
      await Tag.findByIdAndDelete(id);
    }

    res.json({ message: 'Content deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending reports
router.get('/reports', adminAuth, async (req, res) => {
  try {
    // Placeholder for reports
    res.json({ reports: [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update site settings
router.put('/settings', adminAuth, async (req, res) => {
  try {
    // Placeholder for settings
    res.json({ message: 'Settings updated' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get pending AI answers for verification
router.get('/ai-answers/pending', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const answers = await Answer.find({ 
      isAIGenerated: true, 
      isVerifiedByAdmin: false 
    })
    .populate('author', 'name avatar')
    .populate({
      path: 'question',
      populate: { path: 'author', select: 'name avatar' }
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

    const total = await Answer.countDocuments({ 
      isAIGenerated: true, 
      isVerifiedByAdmin: false 
    });

    res.json({
      answers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify AI answer
router.post('/ai-answers/:answerId/verify', adminAuth, async (req, res) => {
  try {
    const { note } = req.body;
    const answer = await Answer.findById(req.params.answerId);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (!answer.isAIGenerated) {
      return res.status(400).json({ message: 'This is not an AI answer' });
    }

    answer.isVerifiedByAdmin = true;
    answer.adminVerifiedBy = req.user._id;
    answer.adminVerifiedAt = new Date();
    answer.adminNote = note || 'Verified by admin';
    await answer.save();

    res.json({ message: 'AI answer verified and now visible to all users' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject AI answer (hide it completely)
router.post('/ai-answers/:answerId/reject', adminAuth, async (req, res) => {
  try {
    const answer = await Answer.findById(req.params.answerId);
    
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    if (!answer.isAIGenerated) {
      return res.status(400).json({ message: 'This is not an AI answer' });
    }

    // Remove from question
    await Question.findByIdAndUpdate(answer.question, {
      $pull: { answers: answer._id }
    });

    await answer.deleteOne();

    res.json({ message: 'AI answer rejected and removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all AI answers (verified and pending)
router.get('/ai-answers/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = { isAIGenerated: true };
    if (status === 'verified') query.isVerifiedByAdmin = true;
    if (status === 'pending') query.isVerifiedByAdmin = false;

    const answers = await Answer.find(query)
      .populate('author', 'name avatar')
      .populate({
        path: 'question',
        populate: { path: 'author', select: 'name avatar' }
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Answer.countDocuments(query);

    res.json({
      answers,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
