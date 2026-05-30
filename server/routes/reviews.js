const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Get review queues
router.get('/:type', auth, async (req, res) => {
  try {
    const { type } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const reviews = await Review.find({ type, status: 'pending' })
      .populate('post')
      .populate('author', 'name avatar reputation')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ type, status: 'pending' });

    res.json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create review item
router.post('/', auth, async (req, res) => {
  try {
    const { type, postId, postModel } = req.body;

    const review = new Review({
      type,
      post: postId,
      postModel,
      author: req.user._id
    });

    await review.save();
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Review item
router.post('/:id/review', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if already reviewed by this user
    const alreadyReviewed = review.reviewers.some(
      r => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Already reviewed' });
    }

    review.reviewers.push({
      user: req.user._id,
      action
    });

    // Check if we have enough reviews
    if (review.reviewers.length >= 3) {
      const approveCount = review.reviewers.filter(r => r.action === 'approve').length;
      review.status = approveCount >= 2 ? 'approved' : 'rejected';
    }

    await review.save();
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's reviews
router.get('/my-reviews', auth, async (req, res) => {
  try {
    const reviews = await Review.find({ 'reviewers.user': req.user._id })
      .populate('post')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
