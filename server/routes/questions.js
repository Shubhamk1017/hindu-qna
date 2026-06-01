const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { MongoClient } = require('mongodb');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// ─── MongoDB connection for vedabase database ────────────────────────────────
let vedabaseClient;
let vedabaseDb;

async function getVedabaseDB() {
  if (!vedabaseDb) {
    vedabaseClient = new MongoClient(process.env.MONGODB_URI);
    await vedabaseClient.connect();
    vedabaseDb = vedabaseClient.db('vedabase');
  }
  return vedabaseDb;
}

// ─── Search verses from MongoDB (RAG) ────────────────────────────────────────
async function searchVerses(query, limit = 5) {
  try {
    const db = await getVedabaseDB();
    const collection = db.collection('verses');

    const results = await collection
      .find(
        { $text: { $search: query } },
        {
          projection: {
            score: { $meta: 'textScore' },
            book: 1, chapter: 1, verse: 1, canto: 1, part: 1,
            translation: 1, purport: 1, sanskrit: 1, iast: 1,
            url: 1,
          },
        }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .toArray();

    if (results.length > 0) return results;

    const regexResults = await collection
      .find({
        $or: [
          { translation: { $regex: query, $options: 'i' } },
          { purport: { $regex: query, $options: 'i' } },
        ],
      })
      .limit(limit)
      .toArray();

    return regexResults;
  } catch (err) {
    console.error('Vedabase search error:', err.message);
    return [];
  }
}

// ─── Format verse reference ──────────────────────────────────────────────────
function verseLabel(v) {
  if (v.book === 'bg') return `Bhagavad Gita ${v.chapter}.${v.verse}`;
  if (v.book === 'sb') return `Srimad Bhagavatam ${v.canto}.${v.chapter}.${v.verse}`;
  if (v.book === 'cc') return `Caitanya-caritamrta ${v.part} ${v.chapter}.${v.verse}`;
  if (v.book === 'iso') return `Sri Isopanishad Mantra ${v.mantra || v.verse}`;
  if (v.book === 'noi') return `Nectar of Instruction ${v.verse}`;
  return v.pageTitle || v.url;
}

// ─── Build context block from verses ─────────────────────────────────────────
function buildVerseContext(verses) {
  if (verses.length === 0) return '';

  return '\n\n---\nRelevant scripture from vedabase.io:\n\n' +
    verses.map((v) => {
      const label = verseLabel(v);
      return [
        `[${label}]`,
        v.sanskrit ? `Sanskrit: ${v.sanskrit}` : '',
        v.iast ? `Transliteration: ${v.iast}` : '',
        v.translation ? `Translation: ${v.translation}` : '',
        v.purport ? `Purport (excerpt): ${v.purport.slice(0, 600)}...` : '',
        `Source: ${v.url}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

// AI answer generation function using MongoDB RAG
async function generateAIAnswer(questionId, title, body) {
  try {
    const query = title + ' ' + body;
    const verses = await searchVerses(query, 5);
    const verseContext = buildVerseContext(verses);

    const prompt = [
      'You are a knowledgeable Hinduism expert and spiritual teacher. Answer this question thoroughly.',
      '',
      'GUIDELINES:',
      '1. Answer the question comprehensively using your knowledge of Hindu scriptures.',
      '2. When a relevant shloka is provided below, include it with exact Sanskrit text, transliteration, and translation in a ```sanskrit code block.',
      '3. Always cite the vedabase.io source URL when using a provided shloka.',
      '4. If no provided shloka is directly relevant, still answer fully from your knowledge.',
      '5. Be respectful, accurate, and helpful.',
      '',
      `Question: ${title}`,
      `Details: ${body}`,
      '',
      'SCRIPTURE REFERENCE (include when relevant):',
      verseContext || 'No specific verses found in the database for this topic. Answer from your general knowledge.'
    ].join('\n');

    let aiMessage = '';

    // Try Groq first
    if (process.env.GROQ_API_KEY) {
      try {
        const Groq = require('groq-sdk');
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        const completion = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
          max_tokens: 2000,
          temperature: 0.7
        });
        aiMessage = completion.choices[0].message.content;
      } catch (e) {
        console.error('Groq AI answer error:', e.message);
      }
    }

    // Fallback to Gemini
    if (!aiMessage && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        aiMessage = result.response.text();
      } catch (e) {
        console.error('Gemini AI answer error:', e.message);
      }
    }

    if (!aiMessage) return;

    // Create AI answer
    const aiAnswer = new Answer({
      body: aiMessage,
      author: '6a1a933ab71040abda4679d1', // System/AI user
      question: questionId,
      isAIGenerated: true,
      aiModel: 'groq-llama-3.1-8b',
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
    if (sort === 'unverified') {
      // Find questions that have unverified AI answers
      const unverifiedAnswers = await Answer.find({ isAIGenerated: true, isVerifiedByAdmin: false }).distinct('question');
      query._id = { $in: unverifiedAnswers };
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
router.post('/:id/vote', auth, [
  body('type').isIn(['upvote', 'downvote']).withMessage('Vote type must be upvote or downvote')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type } = req.body;
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
