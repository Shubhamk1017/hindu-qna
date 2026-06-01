const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const AIChat = require('../models/AIChat');
const Question = require('../models/Question');
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
async function searchVerses(query, limit = 5) {
  try {
    const db = await getVedabaseDB();
    const collection = db.collection('verses');

    // Try full-text search first
    const results = await collection
      .find(
        { $text: { $search: query } },
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
      .limit(limit)
      .toArray();

    if (results.length > 0) return results;

    // Fallback: regex search
    const regexResults = await collection
      .find({
        $or: [
          { translation: { $regex: query, $options: 'i' } },
          { purport: { $regex: query, $options: 'i' } },
          { sanskrit: { $regex: query, $options: 'i' } },
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
      const syn = v.synonymsRaw || (v.synonyms?.map((s) => `${s.word}: ${s.meaning}`).join('; ') || '');
      return [
        `[${label}]`,
        v.sanskrit ? `Sanskrit: ${v.sanskrit}` : '',
        v.iast ? `Transliteration: ${v.iast}` : '',
        syn ? `Synonyms: ${syn}` : '',
        v.translation ? `Translation: ${v.translation}` : '',
        v.purport ? `Purport (excerpt): ${v.purport.slice(0, 800)}...` : '',
        `Source: ${v.url}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

// ─── System prompt ───────────────────────────────────────────────────────────
const systemPrompt = `You are a knowledgeable and compassionate Hindu scripture guide, drawing from the complete teachings available on vedabase.io — including the Bhagavad Gita, Srimad Bhagavatam, Caitanya-caritamrta, Isopanishad, Nectar of Instruction, and other Vedic texts.

GUIDELINES:
- Ground every answer in the scripture context provided to you
- Cite the specific book/chapter/verse (e.g. "Bhagavad Gita 2.47")
- Explain Sanskrit terms clearly when they appear
- Keep a warm, devotional, and respectful tone
- For deep questions, include both the verse and relevant purport insights
- End by encouraging the user to read the full purport on vedabase.io
- Cover different traditions and perspectives within Hinduism
- If asked something outside Vedic scripture, gently redirect

You will receive relevant verses from the database as context. Use them as your primary source.`;

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

    // Search vedabase DB for relevant verses (RAG)
    const verses = await searchVerses(message, 5);

    // Search community questions
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

    // Build messages with RAG context
    const verseContext = buildVerseContext(verses);
    const messages = [
      { role: 'system', content: systemPrompt + verseContext + communityContext },
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
      }
    }

    // Fallback message
    if (!assistantMessage) {
      assistantMessage = `Thank you for your question about "${message}". The AI assistant is temporarily unavailable. Please try again later or search the existing questions on the platform.`;
    }

    chat.messages.push({ role: 'assistant', content: assistantMessage });
    chat.context = { relatedQuestions: relatedQuestions.map((q) => q._id) };
    await chat.save();

    res.json({
      message: assistantMessage,
      relatedQuestions,
      sources: verses.map((v) => ({
        label: verseLabel(v),
        translation: v.translation?.slice(0, 120) + '...',
        url: v.url,
      })),
      sessionId: chat.sessionId,
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

module.exports = router;
