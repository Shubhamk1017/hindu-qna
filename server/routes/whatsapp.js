const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const WhatsAppMessage = require('../models/WhatsAppMessage');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const whatsappService = require('../services/whatsapp');

// ─── WhatsApp Status ─────────────────────────────────────────────────────────
router.get('/status', adminAuth, (req, res) => {
  res.json(whatsappService.getStatus());
});

// ─── QR Code for authentication ──────────────────────────────────────────────
router.get('/qr', adminAuth, (req, res) => {
  const qr = whatsappService.getQR();
  if (!qr) {
    return res.json({ message: 'No QR code available. Client may already be authenticated.', qr: null });
  }
  res.json({ qr });
});

// ─── Initialize WhatsApp client (admin only) ─────────────────────────────────────────
router.post('/init', adminAuth, (req, res) => {
  try {
    whatsappService.initClient();
    res.json({ message: 'WhatsApp client initialization started. Check /status for readiness.' });
  } catch (err) {
    console.error('[WhatsApp] Init error:', err.message);
    if (err.message.includes('Please wait')) {
      return res.status(429).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to initialize WhatsApp client' });
  }
});

// ─── Reset WhatsApp client (admin only) ────────────────────────────────────────────
router.post('/reset', adminAuth, async (req, res) => {
  try {
    await whatsappService.resetClient();
    res.json({ message: 'WhatsApp client reset initiated. Check /status for readiness.' });
  } catch (err) {
    console.error('[WhatsApp] Reset error:', err.message);
    if (err.message.includes('Please wait')) {
      return res.status(429).json({ message: err.message });
    }
    res.status(500).json({ message: 'Failed to reset WhatsApp client' });
  }
});

// ─── Get pending WhatsApp answers ────────────────────────────────────────────
router.get('/answers/pending', adminAuth, async (req, res) => {
  try {
    const messages = await WhatsAppMessage.find({ status: 'pending' })
      .populate('question', 'title author')
      .populate({ path: 'question', populate: { path: 'author', select: 'name avatar' } })
      .sort({ createdAt: -1 });

    res.json({ answers: messages });
  } catch (error) {
    console.error('[WhatsApp] Error fetching pending answers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Get all WhatsApp answers (with pagination) ──────────────────────────────
router.get('/answers', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = status ? { status } : {};

    const messages = await WhatsAppMessage.find(query)
      .populate('question', 'title author')
      .populate({ path: 'question', populate: { path: 'author', select: 'name avatar' } })
      .populate('assignedGuru', 'name avatar role')
      .populate('reviewedBy', 'name')
      .populate('publishedAnswer', '_id')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await WhatsAppMessage.countDocuments(query);

    res.json({
      answers: messages,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
    });
  } catch (error) {
    console.error('[WhatsApp] Error fetching answers:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Approve & Publish a WhatsApp answer ─────────────────────────────────────
// Body: { guruUserId } — which guru gets credit for this answer
router.post('/answers/:id/approve', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { guruUserId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const pendingMsg = await WhatsAppMessage.findById(id);
    if (!pendingMsg) {
      return res.status(404).json({ message: 'Pending answer not found' });
    }
    if (pendingMsg.status !== 'pending') {
      return res.status(400).json({ message: `Message already ${pendingMsg.status}` });
    }

    const question = await Question.findById(pendingMsg.question);
    if (!question) {
      return res.status(404).json({ message: 'Associated question not found' });
    }
    if (question.isClosed) {
      return res.status(400).json({ message: 'Question is closed' });
    }

    // Determine the guru user who gets credit
    let guruUser = null;

    if (guruUserId) {
      if (!mongoose.Types.ObjectId.isValid(guruUserId)) {
        return res.status(400).json({ message: 'Invalid guru user ID' });
      }
      guruUser = await User.findById(guruUserId);
      if (!guruUser) {
        return res.status(404).json({ message: 'Guru user not found' });
      }
    } else {
      // Auto-detect: try to find a user matching the sender's phone or name
      if (pendingMsg.senderPhone) {
        // Normalize phone: strip spaces, dashes, parentheses, leading +
        const normalize = (p) => (p || '').replace(/\D/g, '');
        const rawPhone = normalize(pendingMsg.senderPhone);
        
        // Try exact match first
        guruUser = await User.findOne({ phone: pendingMsg.senderPhone });
        
        // If no match, try normalized (last 10 digits for Indian numbers)
        if (!guruUser && rawPhone.length >= 10) {
          const last10 = rawPhone.slice(-10);
          const allUsers = await User.find({ phone: { $exists: true, $ne: '' } }).select('_id phone').lean();
          const match = allUsers.find(u => normalize(u.phone).slice(-10) === last10);
          if (match) guruUser = await User.findById(match._id);
        }
      }
      // Fallback to admin
      if (!guruUser) {
        guruUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
      }
      // Fallback to guru/acharya
      if (!guruUser) {
        guruUser = await User.findOne({ role: { $in: ['guru', 'acharya'] } }).sort({ createdAt: 1 });
      }
    }

    if (!guruUser) {
      return res.status(400).json({ message: 'No valid user found to assign as answer author' });
    }

    // Create the Answer
    const answer = new Answer({
      body: pendingMsg.answerText,
      author: guruUser._id,
      question: question._id,
      isAIGenerated: false,
      isVerifiedByGuru: ['guru', 'acharya', 'admin'].includes(guruUser.role),
      isVerifiedByAdmin: true,
      adminVerifiedBy: req.user._id,
      adminVerifiedAt: new Date(),
    });

    await answer.save();

    // Link back from question
    question.answers.push(answer._id);
    await question.save();

    // Credit the guru
    guruUser.answers.push(answer._id);
    guruUser.reputation = (guruUser.reputation || 0) + 15;
    await guruUser.save();

    // Update the pending message
    pendingMsg.status = 'approved';
    pendingMsg.assignedGuru = guruUser._id;
    pendingMsg.reviewedBy = req.user._id;
    pendingMsg.reviewedAt = new Date();
    pendingMsg.publishedAnswer = answer._id;
    await pendingMsg.save();

    const populatedAnswer = await Answer.findById(answer._id)
      .populate('author', 'name avatar reputation role');

    console.log(`[WhatsApp] Answer approved and published for question ${question._id} by ${guruUser.name}`);

    res.json({
      message: 'Answer approved and published!',
      answer: populatedAnswer,
      questionUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/questions/${question._id}`,
    });
  } catch (error) {
    console.error('[WhatsApp] Error approving answer:', error.stack);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Reject a WhatsApp answer ────────────────────────────────────────────────
router.post('/answers/:id/reject', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const pendingMsg = await WhatsAppMessage.findById(id);
    if (!pendingMsg) {
      return res.status(404).json({ message: 'Pending answer not found' });
    }

    pendingMsg.status = 'rejected';
    pendingMsg.reviewedBy = req.user._id;
    pendingMsg.reviewedAt = new Date();
    pendingMsg.rejectionReason = reason || '';
    await pendingMsg.save();

    res.json({ message: 'Answer rejected' });
  } catch (error) {
    console.error('[WhatsApp] Error rejecting answer:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Send a question to WhatsApp group manually (admin only) ─────────────────
router.post('/send-question/:questionId', adminAuth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.questionId)
      .populate('tags', 'name');

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const sent = await whatsappService.sendQuestionToGroup(question);
    if (sent) {
      res.json({ message: 'Question sent to WhatsApp group', notificationSent: true });
    } else {
      // Question exists but WhatsApp notification failed — inform admin clearly
      res.json({
        message: 'Question exists but WhatsApp notification could not be sent. The bot may be disconnected or group not configured.',
        notificationSent: false,
      });
    }
  } catch (error) {
    console.error('[WhatsApp] Error sending question:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
