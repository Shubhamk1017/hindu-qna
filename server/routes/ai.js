const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIChat = require('../models/AIChat');
const Question = require('../models/Question');
const { auth } = require('../middleware/auth');

let genAI;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
  console.log('Gemini API key not configured');
}

// System prompt for Hindu Q&A
const systemPrompt = `You are a Hinduism expert. Answer concisely.

IMPORTANT RULES:
1. Cite specific scriptures with chapter/verse (e.g., Bhagavad Gita 2.47)
2. Format shlokas in \`\`\`sanskrit code blocks
3. ALWAYS mention the source website where the information can be verified
4. Be respectful of all traditions

Known reliable sources for Hinduism:
- Hinduism Stack Exchange (hinduism.stackexchange.com)
- The Spiritual Scientist (thespiritualscientist.com)
- Vedic Scriptures Online (vedabase.io)
- Swami Vivekananda writings
- ISKCON Desire Tree (iskcondesiretree.com)
- Hindu Website (hinduwebsite.com)
- Sri Sri Ravi Shankar teachings
- Geeta Press Gorakhpur publications
- Digital Library of India

When you cite a source, format it like:
**Source:** [Website Name](URL)

Example answer format:
"The Gayatri Mantra is from the Rigveda (3.62.10).

\`\`\`sanskrit
ॐ भूर्भुवः स्वः
तत्सवितुर्वरेण्यं
भर्गो देवस्य धीमहि
धियो यो नः प्रचोदयात्
\`\`\`

This mantra is one of the most important Vedic mantras...

**Source:** [Hinduism Stack Exchange](https://hinduism.stackexchange.com/questions/...)"`;

// Semantic search function
async function semanticSearch(query, limit = 5) {
  try {
    const questions = await Question.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { body: { $regex: query, $options: 'i' } }
      ]
    })
    .populate('tags', 'name')
    .limit(limit);

    return questions;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Chat with AI using Google Gemini
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    let chat = await AIChat.findOne({ sessionId });
    if (!chat) {
      chat = new AIChat({
        user: req.user._id,
        sessionId,
        messages: []
      });
    }

    const relatedQuestions = await semanticSearch(message, 3);
    
    let context = '';
    if (relatedQuestions.length > 0) {
      context = '\n\nRelated questions from our community:\n';
      relatedQuestions.forEach((q, i) => {
        context += `${i + 1}. ${q.title}\n`;
      });
    }

    chat.messages.push({ role: 'user', content: message });

    let assistantMessage;

    if (!genAI || !process.env.GEMINI_API_KEY) {
      assistantMessage = `Thank you for your question about "${message}".

The AI assistant is not configured yet. Here's what I can tell you:

**About Hindu Q&A:**
This is a community-driven platform for authentic answers about Hinduism. You can:
- Search existing questions on the topic
- Ask the community directly
- Consult Hindu scriptures like the Bhagavad Gita, Upanishads, or Puranas

**Related questions from our community:**
${relatedQuestions.map((q, i) => `${i + 1}. ${q.title}`).join('\n') || 'No related questions found yet.'}

*Note: To enable AI, add GEMINI_API_KEY to the server .env file*`;
    } else {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const chatHistory = chat.messages.slice(-4).map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));

        const chatSession = model.startChat({
          history: [
            { role: 'user', parts: [{ text: 'You are a Hinduism expert.' }] },
            { role: 'model', parts: [{ text: 'Ready to answer Hinduism questions.' }] },
            ...chatHistory.slice(-4)
          ],
          generationConfig: {
            maxOutputTokens: 4000,
            temperature: 0.7,
          }
        });

        const fullPrompt = systemPrompt + context + '\n\nUser question: ' + message;
        const result = await chatSession.sendMessage(fullPrompt);
        assistantMessage = result.response.text();
      } catch (aiError) {
        console.error('Gemini API error:', aiError.message);
        assistantMessage = `Thank you for your question about "${message}".

I apologize, but the AI service encountered an error. Here's what I can tell you:

**Related questions from our community:**
${relatedQuestions.map((q, i) => `${i + 1}. ${q.title}`).join('\n') || 'No related questions found yet.'}

Please try again later or search the existing questions on the platform.`;
      }
    }

    chat.messages.push({ role: 'assistant', content: assistantMessage });
    chat.context = { relatedQuestions: relatedQuestions.map(q => q._id) };
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

// Get chat history
router.get('/history/:sessionId', auth, async (req, res) => {
  try {
    const chat = await AIChat.findOne({ 
      sessionId: req.params.sessionId,
      user: req.user._id 
    });

    if (!chat) {
      return res.json({ messages: [] });
    }

    res.json({ messages: chat.messages });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's chat sessions
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

// Delete chat session
router.delete('/sessions/:sessionId', auth, async (req, res) => {
  try {
    await AIChat.findOneAndDelete({ 
      sessionId: req.params.sessionId,
      user: req.user._id 
    });

    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
