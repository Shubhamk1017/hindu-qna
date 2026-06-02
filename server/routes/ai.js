const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const AIChat = require('../models/AIChat');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const { auth } = require('../middleware/auth');

let genAI;
if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

let groq;
if (process.env.GROQ_API_KEY) {
  const Groq = require('groq-sdk');
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}

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
async function searchVerses(query, limit = 3) {
  try {
    const db = await getVedabaseDB();
    const collection = db.collection('verses');

    // Extract key terms for better matching
    const keywords = query
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .join(' ');

    if (!keywords) return [];

    // Try full-text search with keywords
    const results = await collection
      .find(
        { $text: { $search: keywords } },
        {
          projection: {
            score: { $meta: 'textScore' },
            book: 1, chapter: 1, verse: 1, canto: 1, part: 1,
            translation: 1, purport: 1, sanskrit: 1, iast: 1,
            synonyms: 1, synonymsRaw: 1, url: 1, pageTitle: 1,
          },
        }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit + 2)
      .toArray();

    // Filter by minimum relevance score
    const minScore = 1.0;
    const relevant = results.filter(r => (r.score || 0) >= minScore);

    // If we have good results, use them; otherwise try a targeted search
    if (relevant.length > 0) return relevant.slice(0, limit);

    // Targeted search: look for specific scripture references
    const scriptureMatch = query.match(/\b(bg|gita|bhagavad|sb|bhagavatam|iso|upanishad|noi|nectar)\b/i);
    if (scriptureMatch) {
      const term = scriptureMatch[0].toLowerCase();
      let bookFilter = {};
      if (/bg|gita|bhagavad/i.test(term)) bookFilter = { book: 'bg' };
      else if (/sb|bhagavatam/i.test(term)) bookFilter = { book: 'sb' };
      else if (/iso|upanishad/i.test(term)) bookFilter = { book: 'iso' };
      else if (/noi|nectar/i.test(term)) bookFilter = { book: 'noi' };

      const targeted = await collection
        .find({
          ...bookFilter,
          $or: [
            { translation: { $regex: keywords.split(/\s+/).slice(0, 3).join('|'), $options: 'i' } },
            { purport: { $regex: keywords.split(/\s+/).slice(0, 3).join('|'), $options: 'i' } },
          ],
        })
        .limit(limit)
        .toArray();

      if (targeted.length > 0) return targeted;
    }

    // Last resort: regex search with most important keyword
    const topKeyword = keywords.split(/\s+/)[0];
    if (topKeyword && topKeyword.length > 4) {
      const regexResults = await collection
        .find({
          $or: [
            { translation: { $regex: topKeyword, $options: 'i' } },
            { purport: { $regex: topKeyword, $options: 'i' } },
          ],
        })
        .limit(2)
        .toArray();

      return regexResults;
    }

    return [];
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

  return '\n\n---\nUse ONLY these specific verses when citing:\n\n' +
    verses.map((v) => {
      const label = verseLabel(v);
      const syn = v.synonymsRaw || (v.synonyms?.map((s) => `${s.word}: ${s.meaning}`).join('; ') || '');
      return [
        `VERSE: [${label}]`,
        v.sanskrit ? `Sanskrit: ${v.sanskrit}` : '',
        v.iast ? `Transliteration: ${v.iast}` : '',
        syn ? `Synonyms: ${syn}` : '',
        v.translation ? `Translation: ${v.translation}` : '',
        v.purport ? `Purport: ${v.purport.slice(0, 600)}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

// ─── System prompt ───────────────────────────────────────────────────────────
const systemPrompt = `You are Pariprashna, a knowledgeable and compassionate Hindu scripture guide. You draw from vedabase.io scriptures — Bhagavad Gita, Srimad Bhagavatam, Caitanya-caritamrta, Isopanishad, Nectar of Instruction, and other Vedic texts.

RESPONSE FORMAT:
- Start with a direct, clear answer to the question
- Then provide deeper explanation with scriptural backing
- Use Sanskrit terms with English explanations
- Cite specific verses inline as: **(BG 2.47)** or **(SB 1.1.1)**
- Keep responses focused and well-structured

FORMATTING RULES:
- Use **bold** for key terms and verse references
- Use bullet points or numbered lists for multiple points
- Use > blockquotes for direct verse translations
- Use ### headings to organize long responses
- Keep paragraphs short (2-3 sentences max)

IMPORTANT:
- Only cite verses that are actually provided in the context
- Do NOT fabricate verse references
- Do NOT include "Recommended reading", "Further reading", or any reference lists at the end
- Source links are shown automatically as clickable buttons below your response
- If the scripture context doesn't fully answer the question, say so honestly`;

// ─── Semantic search for related community questions ──────────────────────────
async function semanticSearch(query, limit = 3) {
  try {
    const questions = await Question.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { body: { $regex: query, $options: 'i' } },
      ],
    })
      .populate('tags', 'name')
      .limit(limit);

    return questions;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// ─── Chat endpoint ───────────────────────────────────────────────────────────
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    let chat = await AIChat.findOne({ sessionId });
    if (!chat) {
      chat = new AIChat({
        user: req.user._id,
        sessionId,
        messages: [],
      });
    }

    // Search community questions only
    const relatedQuestions = await semanticSearch(message, 3);

    let communityContext = '';
    if (relatedQuestions.length > 0) {
      communityContext = '\n\nRelated questions from our community:\n';
      relatedQuestions.forEach((q, i) => {
        communityContext += `${i + 1}. ${q.title}\n`;
      });
    }

    chat.messages.push({ role: 'user', content: message });

    let assistantMessage;

    // Build messages
    const fullSystemPrompt = systemPrompt + communityContext;
    const messages = [
      { role: 'system', content: fullSystemPrompt },
      ...chat.messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    ];

    // Try Groq first
    if (groq && process.env.GROQ_API_KEY) {
      try {
        const completion = await groq.chat.completions.create({
          messages,
          model: 'llama-3.1-8b-instant',
          max_tokens: 2000,
          temperature: 0.7,
        });
        assistantMessage = completion.choices[0].message.content;
      } catch (groqError) {
        console.error('Groq API error:', groqError.message);
        console.error('Groq error details:', JSON.stringify(groqError, null, 2));
      }
    }

    // Fallback to Gemini
    if (!assistantMessage && genAI && process.env.GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const chatHistory = chat.messages.slice(-6).map((msg) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        }));
        const chatSession = model.startChat({
          history: [
            { role: 'user', parts: [{ text: 'You are a Hinduism expert.' }] },
            { role: 'model', parts: [{ text: 'Ready to answer Hinduism questions.' }] },
            ...chatHistory,
          ],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 },
        });
        const result = await chatSession.sendMessage(
          systemPrompt + verseContext + communityContext + '\n\nUser question: ' + message
        );
        assistantMessage = result.response.text();
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError.message);
        console.error('Gemini error details:', JSON.stringify(geminiError, null, 2));
      }
    }

    // Fallback message
    if (!assistantMessage) {
      assistantMessage = `Thank you for your question about "${message}". The AI assistant is temporarily unavailable. Please try again later or search the existing questions on the platform.`;
    }

    // Clean up: remove fake links, invented references, and reading recommendation blocks
    // (references are returned separately as sources buttons)
    assistantMessage = assistantMessage
      .replace(/https?:\/\/[^\s)]*/g, '')
      .replace(/en\/library\/[^\s)]+/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/(?:^|\n)(?:Sources?|References?|Recommended reading|Further reading|To learn more|You can also read|For deeper|Please read the full purport):?[\s\S]*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    chat.messages.push({ role: 'assistant', content: assistantMessage });
    chat.context = { relatedQuestions: relatedQuestions.map((q) => q._id) };
    await chat.save();

    res.json({
      message: assistantMessage,
      relatedQuestions,
      sessionId: chat.sessionId
    });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'AI service error' });
  }
});

// ─── Chat history ────────────────────────────────────────────────────────────
router.get('/history/:sessionId', auth, async (req, res) => {
  try {
    const chat = await AIChat.findOne({
      sessionId: req.params.sessionId,
      user: req.user._id,
    });

    if (!chat) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chat.messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Chat sessions ───────────────────────────────────────────────────────────
router.get('/sessions', auth, async (req, res) => {
  try {
    const sessions = await AIChat.find({ user: req.user._id })
      .select('sessionId createdAt')
      .sort({ createdAt: -1 });

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Delete session ──────────────────────────────────────────────────────────
router.delete('/sessions/:sessionId', auth, async (req, res) => {
  try {
    await AIChat.findOneAndDelete({
      sessionId: req.params.sessionId,
      user: req.user._id,
    });

    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Suggest tags for a question ─────────────────────────────────────────────
const Tag = require('../models/Tag');
const User = require('../models/User');

router.post('/suggest-tags', auth, async (req, res) => {
  try {
    const { title, body } = req.body;
    const text = `${title} ${body || ''}`.toLowerCase();

    // Fetch existing tags
    const existingTags = await Tag.find().select('name').lean();
    const tagNames = existingTags.map(t => t.name);

    // Keyword mapping to tags
    const keywordMap = {
      'bhagavad gita': 'bhagavad-gita', 'gita': 'bhagavad-gita', 'krishna': 'bhagavad-gita', 'arjuna': 'bhagavad-gita',
      'bhagavatam': 'srimad-bhagavatam', 'srimad': 'srimad-bhagavatam', 'bhagavat': 'srimad-bhagavatam',
      'vedanta': 'vedanta', 'brahman': 'vedanta', 'atman': 'vedanta', 'advaita': 'vedanta',
      'dharma': 'dharma', 'duty': 'dharma', 'righteousness': 'dharma',
      'karma': 'karma', 'action': 'karma', 'deed': 'karma',
      'yoga': 'yoga', 'meditation': 'yoga', 'union': 'yoga', 'practice': 'yoga',
      'mantra': 'mantras', 'chanting': 'mantras', 'japa': 'mantras', 'om': 'mantras',
      'vedas': 'vedas', 'rig veda': 'vedas', 'sama veda': 'vedas', 'yajur veda': 'vedas',
      'upanishad': 'upanishads', 'upanishads': 'upanishads',
      'purana': 'puranas', 'puranas': 'puranas',
      'avatar': 'avatar', 'incarnation': 'avatar', 'vishnu': 'avatar', 'rama': 'avatar',
      'devotion': 'bhakti', 'bhakti': 'bhakti', 'love': 'bhakti', 'surrender': 'bhakti',
      'liberation': 'moksha', 'moksha': 'moksha', 'salvation': 'moksha', 'freedom': 'moksha',
      'vedic': 'vedic-philosophy', 'philosophy': 'vedic-philosophy',
      'ritual': 'rituals', 'puja': 'rituals', 'ceremony': 'rituals',
      'isopanishad': 'isopanishad', 'isopanishad': 'isopanishad',
      'nectar of instruction': 'nectar-of-instruction', 'noi': 'nectar-of-instruction',
    };

    // Match keywords to suggested tags
    const matched = new Set();
    for (const [keyword, tag] of Object.entries(keywordMap)) {
      if (text.includes(keyword)) matched.add(tag);
    }

    // Also match existing tags directly
    for (const tagName of tagNames) {
      if (text.includes(tagName)) matched.add(tagName);
    }

    // If no matches, suggest general tags
    if (matched.size === 0) {
      matched.add('hinduism');
    }

    // Get full tag objects for matched tags
    const suggestedTags = await Tag.find({
      name: { $in: Array.from(matched) }
    }).select('name').lean();

    // Also suggest top tags as fallback
    const topTags = await Tag.find()
      .sort({ count: -1 })
      .limit(5)
      .select('name')
      .lean();

    res.json({
      suggested: suggestedTags.map(t => t.name),
      all: topTags.map(t => t.name),
    });
  } catch (error) {
    console.error('Tag suggestion error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Post question to community from chat ────────────────────────────────────
router.post('/post-to-community', auth, async (req, res) => {
  try {
    const { title, body, tags, chatContext } = req.body;

    if (!title || title.trim().length < 15) {
      return res.status(400).json({ message: 'Title must be at least 15 characters' });
    }

    // Build body with chat context reference
    let questionBody = body || '';
    if (chatContext) {
      questionBody += `\n\n---\n*This question was explored with the AI Scripture Assistant. The community's verified scholars can provide deeper insights.*`;
    }

    // Find or create tags
    const tagIds = [];
    const tagNames = tags && tags.length > 0 ? tags : ['hinduism'];
    for (const tagName of tagNames) {
      let tag = await Tag.findOne({ name: tagName.toLowerCase().trim() });
      if (!tag) {
        tag = new Tag({ name: tagName.toLowerCase().trim() });
        await tag.save();
      }
      tag.count = (tag.count || 0) + 1;
      await tag.save();
      tagIds.push(tag._id);
    }

    const question = new Question({
      title: title.trim(),
      body: questionBody.trim(),
      author: req.user._id,
      tags: tagIds,
    });

    await question.save();

    // Create AI answer from chat context so it's visible on the question
    if (chatContext) {
      const aiAnswer = new Answer({
        body: chatContext,
        author: req.user._id,
        question: question._id,
        isAIGenerated: true,
        aiModel: 'chat-context',
        isVerifiedByAdmin: false,
      });
      await aiAnswer.save();

      question.answers.push(aiAnswer._id);
      await question.save();
    }

    // Update user
    req.user.questions.push(question._id);
    req.user.reputation = (req.user.reputation || 0) + 5;
    await req.user.save();

    res.status(201).json({
      question,
      message: 'Question posted to the community!',
    });
  } catch (error) {
    console.error('Post to community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
