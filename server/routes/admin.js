const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const User = require('../models/User');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const Tag = require('../models/Tag');
const { auth, adminAuth } = require('../middleware/auth');

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

function verseLabel(v) {
  if (v.book === 'bg') return `Bhagavad Gita ${v.chapter}.${v.verse}`;
  if (v.book === 'sb') return `Srimad Bhagavatam ${v.canto}.${v.chapter}.${v.verse}`;
  if (v.book === 'cc') return `Caitanya-caritamrta ${v.part} ${v.chapter}.${v.verse}`;
  if (v.book === 'iso') return `Sri Isopanishad Mantra ${v.mantra || v.verse}`;
  if (v.book === 'noi') return `Nectar of Instruction ${v.verse}`;
  return v.pageTitle || v.url;
}

// ─── Daily shloka (public) ───────────────────────────────────────────────────
router.get('/daily-shloka', async (req, res) => {
  try {
    const db = await getVedabaseDB();
    const collection = db.collection('verses');

    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Count total BG verses
    const totalCount = await collection.countDocuments({ book: 'bg' });
    if (totalCount === 0) return res.json(null);

    // Use day of year as seed for consistent daily rotation
    const skip = dayOfYear % totalCount;

    // Fetch BG verse with translation
    const verse = await collection
      .find({ book: 'bg', translation: { $exists: true, $ne: '' } })
      .skip(skip)
      .limit(1)
      .next();

    if (!verse) return res.json(null);

    res.json({
      sanskrit: verse.sanskrit || verse.iast || '',
      translation: verse.translation,
      reference: verseLabel(verse),
      url: verse.url,
    });
  } catch (error) {
    console.error('Daily shloka error:', error.message);
    res.json(null);
  }
});

// Public stats for homepage
router.get('/public-stats', async (req, res) => {
  try {
    const [users, questions, answers, tags, verifiedAnswers, experts] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      Answer.countDocuments({ isAIGenerated: false }),
      Tag.countDocuments(),
      Answer.countDocuments({ isVerifiedByGuru: true }),
      User.countDocuments({ role: { $in: ['guru', 'acharya'] } }),
    ]);
    res.json({ users, questions, answers, tags, verifiedAnswers, experts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      users, questions, answers, tags,
      gurus, pendingVerifications,
      todayUsers, todayQuestions, todayAnswers,
      weekUsers, weekQuestions, weekAnswers,
      aiAnswers, verifiedAnswers, acceptedAnswers
    ] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments(),
      Answer.countDocuments(),
      Tag.countDocuments(),
      User.countDocuments({ role: { $in: ['guru', 'acharya'] } }),
      Answer.countDocuments({ isAIGenerated: true, isVerifiedByAdmin: false }),
      User.countDocuments({ createdAt: { $gte: today } }),
      Question.countDocuments({ createdAt: { $gte: today } }),
      Answer.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisWeek } }),
      Question.countDocuments({ createdAt: { $gte: thisWeek } }),
      Answer.countDocuments({ createdAt: { $gte: thisWeek } }),
      Answer.countDocuments({ isAIGenerated: true }),
      Answer.countDocuments({ isVerifiedByGuru: true }),
      Answer.countDocuments({ isAccepted: true }),
    ]);

    const topTags = await Tag.find()
      .sort({ questionCount: -1 })
      .limit(5)
      .select('name questionCount');

    res.json({
      users, questions, answers, tags, gurus, pendingVerifications,
      todayUsers, todayQuestions, todayAnswers,
      weekUsers, weekQuestions, weekAnswers,
      aiAnswers, verifiedAnswers, acceptedAnswers,
      topTags,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get recent admin activity
router.get('/recent-activity', adminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    const [recentUsers, recentQuestions, recentAnswers] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(limit).select('name email role createdAt avatar').lean(),
      Question.find().sort({ createdAt: -1 }).limit(limit)
        .populate('author', 'name avatar')
        .populate('tags', 'name')
        .select('title createdAt views upvotes downvotes answers')
        .lean(),
      Answer.find().sort({ createdAt: -1 }).limit(limit)
        .populate('author', 'name avatar')
        .populate('question', 'title')
        .select('createdAt isAIGenerated isVerifiedByGuru isAccepted upvotes downvotes')
        .lean(),
    ]);

    const activities = [];

    for (const u of recentUsers) {
      activities.push({ type: 'user_joined', _id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, createdAt: u.createdAt });
    }
    for (const q of recentQuestions) {
      activities.push({
        type: 'question_asked', _id: q._id, title: q.title, author: q.author,
        views: q.views, voteScore: (q.upvotes?.length || 0) - (q.downvotes?.length || 0),
        answerCount: q.answers?.length || 0, tags: q.tags, createdAt: q.createdAt,
      });
    }
    for (const a of recentAnswers) {
      if (!a.question) continue;
      activities.push({
        type: 'answer_posted', _id: a._id, questionId: a.question._id, questionTitle: a.question.title,
        author: a.author, isAIGenerated: a.isAIGenerated, isVerifiedByGuru: a.isVerifiedByGuru,
        isAccepted: a.isAccepted, voteScore: (a.upvotes?.length || 0) - (a.downvotes?.length || 0),
        createdAt: a.createdAt,
      });
    }

    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ activities: activities.slice(0, limit) });
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
    const { role, phone } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    await user.save();

    res.json({ message: 'User updated' });
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
