const express = require('express');
const router = express.Router();
const Tag = require('../models/Tag');
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');

// Get all tags
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = 'popular' } = req.query;
    
    let sortOption = { count: -1 };
    if (sort === 'name') sortOption = { name: 1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };

    const tags = await Tag.find()
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tag.countDocuments();

    res.json({
      tags,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single tag
router.get('/:name', async (req, res) => {
  try {
    const tag = await Tag.findOne({ name: req.params.name });
    
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get questions by tag
router.get('/:name/questions', async (req, res) => {
  try {
    const tag = await Tag.findOne({ name: req.params.name });
    
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    const { page = 1, limit = 20, sort = 'newest' } = req.query;
    
    let sortOption = { createdAt: -1 };
    if (sort === 'votes') sortOption = { upvotes: -1 };
    if (sort === 'views') sortOption = { views: -1 };

    const questions = await Question.find({ tags: tag._id })
      .populate('author', 'name avatar reputation')
      .populate('tags', 'name')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments({ tags: tag._id });

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      tag
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create tag (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const { name, description, wiki } = req.body;

    let tag = await Tag.findOne({ name: name.toLowerCase() });
    if (tag) {
      return res.status(400).json({ message: 'Tag already exists' });
    }

    tag = new Tag({
      name: name.toLowerCase(),
      description,
      wiki
    });

    await tag.save();
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update tag (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin only' });
    }

    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    const { description, wiki, synonyms } = req.body;
    
    if (description) tag.description = description;
    if (wiki) tag.wiki = wiki;
    if (synonyms) tag.synonyms = synonyms;

    await tag.save();
    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
