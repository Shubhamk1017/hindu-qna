/**
 * WhatsApp Service
 *
 * Manages the WhatsApp Web.js client connection.
 * - Initializes and authenticates via QR code
 * - Sends formatted questions to a configured WhatsApp group
 * - Listens for messages/replies from gurus in the group
 * - Stores incoming answers as pending WhatsAppMessage documents
 *
 * Environment variables:
 *   WHATSAPP_GROUP_ID  — the WhatsApp group ID to post questions to (format: 1234567890-123456@g.us)
 *   SITE_URL           — base URL of the website (for links in messages)
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

// Use @sparticuz/chromium in production (Render doesn't have system Chrome)
function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  const config = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  };

  if (isProduction) {
    try {
      const chromium = require('@sparticuz/chromium');
      config.executablePath = chromium.executablePath;
      config.args = chromium.args.concat(config.args);
      console.log('[WhatsApp] Using @sparticuz/chromium for production');
    } catch (err) {
      console.error('[WhatsApp] @sparticuz/chromium not found, falling back to bundled puppeteer');
    }
  }

  return config;
}

let client = null;
let isReady = false;
let latestQR = null; // base64 data URL of the latest QR code

// Lazy-load mongoose models to avoid circular deps at startup
let WhatsAppMessage;
let Question;

function getModels() {
  if (!WhatsAppMessage) WhatsAppMessage = require('../models/WhatsAppMessage');
  if (!Question) Question = require('../models/Question');
  return { WhatsAppMessage, Question };
}

/**
 * Initialize the WhatsApp client.
 * Safe to call multiple times — will only create the client once.
 */
function initClient() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: getPuppeteerConfig(),
  });

  client.on('qr', async (qr) => {
    console.log('[WhatsApp] QR code received. Scan to authenticate.');
    try {
      latestQR = await QRCode.toDataURL(qr);
      console.log('[WhatsApp] QR data URL generated (scan via /api/whatsapp/qr endpoint)');
    } catch (err) {
      console.error('[WhatsApp] QR generation error:', err.message);
    }
  });

  client.on('ready', () => {
    isReady = true;
    latestQR = null;
    console.log('[WhatsApp] Client is ready and authenticated!');
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated successfully.');
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Auth failure:', msg);
    isReady = false;
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Disconnected:', reason);
    isReady = false;
    client = null;
  });

  // ── Listen for messages ─────────────────────────────────────────────────
  // message_create fires for ALL messages (including ones from the same
  // authenticated account), while 'message' only fires for others'. We use
  // message_create so the bot can capture replies from its own account when
  // the same WhatsApp number both runs the bot and replies in the group.
  client.on('message_create', async (msg) => {
    try {
      await handleMessage(msg);
    } catch (err) {
      console.error('[WhatsApp] Error handling message:', err.message);
    }
  });

  console.log('[WhatsApp] Initializing client...');
  client.initialize().catch((err) => {
    console.error('[WhatsApp] Initialization error:', err.message);
  });

  return client;
}

/**
 * Handle an incoming WhatsApp message.
 * If it's a reply to one of our question posts, store it as a pending answer.
 */
async function handleMessage(msg) {
  const { WhatsAppMessage, Question } = getModels();
  const groupId = process.env.WHATSAPP_GROUP_ID;

  // Only process messages from the configured group
  if (!groupId || msg.from !== groupId) return;

  // Check if this is a reply to one of our messages.
  // We don't skip fromMe messages here because the bot may be
  // authenticated through the same account that replies — the
  // quoted-message check below is the real signal.
  const quotedMsg = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;

  if (!quotedMsg || !quotedMsg.fromMe) {
    // Not a reply to our question post — skip
    return;
  }

  // Try to extract the question ID from the quoted message body
  const questionIdMatch = quotedMsg.body.match(/🆔\s*([a-f0-9]{24})/i);
  if (!questionIdMatch) return;

  const questionId = questionIdMatch[1];

  // Verify the question exists
  const question = await Question.findById(questionId);
  if (!question) return;

  // Get sender info
  const contact = await msg.getContact();
  const senderName = contact.pushname || contact.name || 'Unknown';
  const senderPhone = contact.number || msg.author || '';

  const answerText = msg.body.trim();
  if (answerText.length < 10) {
    // Too short to be a meaningful answer — could send a reply prompt
    return;
  }

  // Deduplicate by WhatsApp message ID
  const existing = await WhatsAppMessage.findOne({ whatsappMessageId: msg.id.id });
  if (existing) return;

  // Store the pending answer
  const pendingAnswer = new WhatsAppMessage({
    question: questionId,
    answerText,
    senderPhone,
    senderName,
    whatsappMessageId: msg.id.id,
    status: 'pending',
  });

  await pendingAnswer.save();
  console.log(`[WhatsApp] Pending answer received from ${senderName} for question ${questionId}`);
}

/**
 * Send a formatted question message to the WhatsApp group.
 */
async function sendQuestionToGroup(question) {
  if (!isReady || !client) {
    console.log('[WhatsApp] Client not ready. Skipping notification.');
    return false;
  }

  const groupId = process.env.WHATSAPP_GROUP_ID;
  if (!groupId) {
    console.log('[WhatsApp] WHATSAPP_GROUP_ID not configured. Skipping.');
    return false;
  }

  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
  const questionUrl = `${siteUrl}/questions/${question._id}`;

  // Fetch tag names
  let tagNames = '';
  if (question.tags && question.tags.length > 0) {
    const Tag = require('../models/Tag');
    const tags = await Tag.find({ _id: { $in: question.tags } }).select('name');
    tagNames = tags.map((t) => `#${t.name}`).join(' ');
  }

  const message = [
    `🆕 *New Question on Pariprashna*`,
    ``,
    `📝 *${question.title}*`,
    ``,
    question.body ? `${question.body.substring(0, 300)}${question.body.length > 300 ? '...' : ''}` : '',
    ``,
    tagNames ? `📂 ${tagNames}` : '',
    ``,
    `🆔 ${question._id}`,
    ``,
    `💬 *To answer: Reply to this message with your response.*`,
    `🔗 ${questionUrl}`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  try {
    await client.sendMessage(groupId, message);
    console.log(`[WhatsApp] Question sent to group: ${question.title}`);
    return true;
  } catch (err) {
    console.error('[WhatsApp] Error sending to group:', err.message);
    return false;
  }
}

/**
 * Get the current connection status.
 */
function getStatus() {
  return {
    isReady,
    hasQR: !!latestQR,
    groupId: process.env.WHATSAPP_GROUP_ID || null,
  };
}

/**
 * Get the latest QR code as a base64 data URL.
 */
function getQR() {
  return latestQR;
}

/**
 * Disconnect the client gracefully.
 */
async function disconnect() {
  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      // ignore
    }
    client = null;
    isReady = false;
  }
}

module.exports = {
  initClient,
  sendQuestionToGroup,
  getStatus,
  getQR,
  disconnect,
};
