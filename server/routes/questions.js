const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// AI answer generation function
async function generateAIAnswer(questionId, title, body) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    if (!process.env.GEMINI_API_KEY) return;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    const prompt = `You are a Hinduism expert. Answer this question concisely.

Question: ${title}
Details: ${body}

Rules:
1. Cite scriptures with chapter/verse
2. Format shlokas in \`\`\`sanskrit code blocks
3. Mention source websites at the end
4. Keep answer focused and helpful

Sources to cite: Hinduism Stack Exchange, The Spiritual Scientist, Vedic Scriptures Online, ISKCON Desire Tree, Hindu Website`;

    const result = await model.generateContent(prompt);
    const aiMessage = result.response.text();

    // Create AI answer
    const aiAnswer = new Answer({
      body: aiMessage,
      author: '6a1a933ab71040abda4679d1', // System/AI user
      question: questionId,
      isAIGenerated: true,
      aiModel: 'gemini-2.5-flash',
      isVerifiedByAdmin: false
    });

    await aiAnswer.save();

    // Add to question's answers
    await Question.findByIdAndUpdate(questionId, {
      $push: { answers: aiAnswer._id }
    });

    console.log(`AI answer generated for question ${questionId}`);
  } catch (error) {
    console.error('AI answer generation error:', error.message);
  }
}

// Get all questions
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'newest', tag, search } = req.query;
    
    let query = {};
    
    if (tag) {
      const tagDoc = await Tag.findOne({ name: tag });
      if (tagDoc) {
        query.tags = tagDoc._id;
      }
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'votes') sortOption = { upvotes: -1 };
    if (sort === 'views') sortOption = { views: -1 };
    if (sort === 'unanswered') {
      query.answers = { $size: 0 };
    }

    const questions = await Question.find(query)
      .populate('author', 'name avatar reputation')
      .populate('tags', 'name')
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Question.countDocuments(query);

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single question
router.get('/:id', async (req, res) => {
  try {
    let userId = null;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'hindu-qna-secret');
        userId = decoded.userId;
      } catch (e) {}
    }

    const question = await Question.findById(req.params.id)
      .populate('author', 'name avatar reputation badges')
      .populate('tags', 'name description')
      .populate({
        path: 'answers',
        populate: [
          { path: 'author', select: 'name avatar reputation' },
          { path: 'verifiedBy', select: 'name avatar' },
          { path: 'adminVerifiedBy', select: 'name avatar' },
          {
            path: 'comments',
            populate: { path: 'author', select: 'name avatar' }
          }
        ],
        options: { sort: { isAccepted: -1, isVerifiedByAdmin: -1, upvotes: -1 } }
      })
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'name avatar' }
      });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // All answers visible to everyone (AI answers show pending badge until verified)
    const filteredAnswers = question.answers;

    question.answers = filteredAnswers;

    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Increment view count (called once per session)
router.post('/:id/view', async (req, res) => {
  try {
    await Question.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create question
router.post('/', auth, [
  body('title').trim().isLength({ min: 15, max: 300 }),
  body('body').optional().trim(),
  body('tags').isArray({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, body = '', tags } = req.body;

    // Find or create tags
    const tagIds = [];
    for (const tagName of tags) {
      let tag = await Tag.findOne({ name: tagName.toLowerCase() });
      if (!tag) {
        tag = new Tag({ name: tagName.toLowerCase() });
        await tag.save();
      }
      tag.count += 1;
      await tag.save();
      tagIds.push(tag._id);
    }

    const question = new Question({
      title,
      body,
      author: req.user._id,
      tags: tagIds
    });

    await question.save();

    // Add to user's questions
    req.user.questions.push(question._id);
    await req.user.save();

    // Add reputation
    req.user.reputation += 5;
    await req.user.save();

    // Auto-generate AI answer in background
    generateAIAnswer(question._id, title, body).catch(err => 
      console.error('AI answer generation failed:', err.message)
    );

    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update question
router.put('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, body, tags } = req.body;
    
    if (title) question.title = title;
    if (body) question.body = body;
    if (tags) {
      // Update tags
      for (const tagId of question.tags) {
        const tag = await Tag.findById(tagId);
        if (tag) {
          tag.count -= 1;
          await tag.save();
        }
      }
      
      const tagIds = [];
      for (const tagName of tags) {
        let tag = await Tag.findOne({ name: tagName.toLowerCase() });
        if (!tag) {
          tag = new Tag({ name: tagName.toLowerCase() });
          await tag.save();
        }
        tag.count += 1;
        await tag.save();
        tagIds.push(tag._id);
      }
      question.tags = tagIds;
    }

    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete question
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Remove tags
    for (const tagId of question.tags) {
      const tag = await Tag.findById(tagId);
      if (tag) {
        tag.count -= 1;
        await tag.save();
      }
    }

    // Remove answers
    await Answer.deleteMany({ question: question._id });

    // Remove from user
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { questions: question._id }
    });

    await question.deleteOne();
    res.json({ message: 'Question deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Vote on question
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'upvote' or 'downvote'
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot vote on your own question' });
    }

    const upvoteIndex = question.upvotes.findIndex(id => id.toString() === req.user._id.toString());
    const downvoteIndex = question.downvotes.findIndex(id => id.toString() === req.user._id.toString());

    if (type === 'upvote') {
      if (upvoteIndex === -1) {
        question.upvotes.push(req.user._id);
        if (downvoteIndex !== -1) {
          question.downvotes.splice(downvoteIndex, 1);
        }
      } else {
        question.upvotes.splice(upvoteIndex, 1);
      }
    } else if (type === 'downvote') {
      if (downvoteIndex === -1) {
        question.downvotes.push(req.user._id);
        if (upvoteIndex !== -1) {
          question.upvotes.splice(upvoteIndex, 1);
        }
      } else {
        question.downvotes.splice(downvoteIndex, 1);
      }
    }

    await question.save();
    res.json({ upvotes: question.upvotes.length, downvotes: question.downvotes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept answer
router.post('/:id/accept/:answerId', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only question author can accept answers' });
    }

    const answer = await Answer.findById(req.params.answerId);
    if (!answer) {
      return res.status(404).json({ message: 'Answer not found' });
    }

    // Unaccept previous accepted answer
    if (question.acceptedAnswer) {
      await Answer.findByIdAndUpdate(question.acceptedAnswer, { isAccepted: false });
    }

    // Accept new answer
    answer.isAccepted = true;
    await answer.save();

    question.acceptedAnswer = answer._id;
    await question.save();

    // Add reputation to answer author
    await User.findByIdAndUpdate(answer.author, { $inc: { reputation: 15 } });

    res.json({ message: 'Answer accepted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
