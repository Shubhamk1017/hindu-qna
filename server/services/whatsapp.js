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
const { execSync } = require('child_process');

// ── Constants ───────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const RECONNECT_DELAY_MS = 10000;
const MAX_RECONNECT_ATTEMPTS = 10;

// ── State ───────────────────────────────────────────────────────────────────
let client = null;
let isReady = false;
let latestQR = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let isInitializing = false;

// Lazy-load mongoose models to avoid circular deps at startup
let WhatsAppMessage;
let Question;

function getModels() {
  if (!WhatsAppMessage) WhatsAppMessage = require('../models/WhatsAppMessage');
  if (!Question) Question = require('../models/Question');
  return { WhatsAppMessage, Question };
}

// ── Platform-aware Puppeteer configuration ───────────────────────────────────
function getPuppeteerConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const isMacOS = process.platform === 'darwin';

  const config = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu',
    ],
  };

  // Production (Render/Linux): use @sparticuz/chromium
  if (isProduction) {
    try {
      const chromium = require('@sparticuz/chromium');
      config.executablePath = chromium.executablePath;
      config.args = chromium.args.concat(config.args);
      console.log('[WhatsApp] Using @sparticuz/chromium for production');
    } catch (err) {
      console.error('[WhatsApp] @sparticuz/chromium not found, using bundled puppeteer');
    }
  }

  // macOS: add flags that work on macOS (no --single-process, no --no-zygote)
  if (isMacOS && !isProduction) {
    config.args.push('--disable-extensions');
    config.args.push('--disable-background-networking');
  }

  return config;
}

// ── Kill orphaned Chrome processes from previous sessions ────────────────────
function killOrphanedChromeProcesses() {
  try {
    const result = execSync(
      "ps aux | grep -i 'chrome.*whatsapp-session' | grep -v grep | awk '{print $2}'",
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();

    if (result) {
      const pids = result.split('\n').filter(Boolean);
      console.log(`[WhatsApp] Killing ${pids.length} orphaned Chrome process(es): ${pids.join(', ')}`);
      pids.forEach((pid) => {
        try {
          process.kill(parseInt(pid), 'SIGKILL');
        } catch (e) {
          // Process may have already exited
        }
      });
      // Wait for processes to fully die
      execSync('sleep 1', { timeout: 3000 });
    }
  } catch (e) {
    // No orphaned processes found — this is normal
  }
}

// ── Clean stale lock files ───────────────────────────────────────────────────
function cleanStaleLocks() {
  const fs = require('fs');
  const path = require('path');
  const lockDir = path.join(__dirname, '..', 'whatsapp-session', 'session');
  const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];

  lockFiles.forEach((file) => {
    const filePath = path.join(lockDir, file);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[WhatsApp] Removed stale lock: ${file}`);
      }
    } catch (e) {
      // Ignore — file may be locked by Chrome
    }
  });
}

// ── Initialize the WhatsApp client ───────────────────────────────────────────
function initClient() {
  if (client) {
    console.log('[WhatsApp] Client already exists, skipping initialization');
    return client;
  }

  if (isInitializing) {
    console.log('[WhatsApp] Initialization already in progress, skipping');
    return null;
  }

  isInitializing = true;
  reconnectAttempts = 0;

  // Clean up before starting
  killOrphanedChromeProcesses();
  cleanStaleLocks();

  console.log('[WhatsApp] Initializing client...');

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
    puppeteer: getPuppeteerConfig(),
  });

  // ── Event handlers ──────────────────────────────────────────────────────

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
    isInitializing = false;
    latestQR = null;
    reconnectAttempts = 0;
    console.log('[WhatsApp] ✅ Client is ready and authenticated!');
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Authenticated successfully.');
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] ❌ Auth failure:', msg);
    isReady = false;
    isInitializing = false;
    // Auth failures are not recoverable — need fresh QR scan
    scheduleReconnect(true);
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] ⚠️ Disconnected:', reason);
    isReady = false;
    isInitializing = false;
    // Destroy old client before reconnecting
    destroyClient().then(() => {
      scheduleReconnect(false);
    });
  });

  // ── Message listener ────────────────────────────────────────────────────
  client.on('message_create', async (msg) => {
    try {
      await handleMessage(msg);
    } catch (err) {
      console.error('[WhatsApp] Error handling message:', err.message);
    }
  });

  // ── Start initialization with retry ─────────────────────────────────────
  initializeWithRetry(client, 0);

  return client;
}

// ── Initialize with retry logic ──────────────────────────────────────────────
async function initializeWithRetry(clientRef, attempt) {
  try {
    await clientRef.initialize();
    // Success — isInitializing will be cleared by 'ready' or 'auth_failure' events
  } catch (err) {
    console.error(`[WhatsApp] Initialization error (attempt ${attempt + 1}/${MAX_RETRIES}):`, err.message);

    if (attempt < MAX_RETRIES - 1) {
      console.log(`[WhatsApp] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(() => {
        if (client === clientRef && !isReady) {
          initializeWithRetry(clientRef, attempt + 1);
        }
      }, RETRY_DELAY_MS);
    } else {
      console.error('[WhatsApp] ❌ All initialization attempts failed.');
      isInitializing = false;
      // Clean up and try reconnecting later
      await destroyClient();
      scheduleReconnect(true);
    }
  }
}

// ── Schedule auto-reconnect ──────────────────────────────────────────────────
function scheduleReconnect(instantRetry) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error(`[WhatsApp] ❌ Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Manual re-init needed.`);
    return;
  }

  reconnectAttempts++;
  const delay = instantRetry ? RECONNECT_DELAY_MS : RECONNECT_DELAY_MS * reconnectAttempts;

  console.log(`[WhatsApp] Scheduling reconnect (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${delay / 1000}s...`);

  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    console.log('[WhatsApp] Attempting reconnect...');
    client = null;
    isInitializing = false;
    isReady = false;
    initClient();
  }, delay);
}

// ── Destroy client safely ────────────────────────────────────────────────────
async function destroyClient() {
  if (client) {
    try {
      await client.destroy();
    } catch (e) {
      // Ignore destroy errors
    }
    client = null;
  }
  isReady = false;
}

// ── Handle incoming WhatsApp message ─────────────────────────────────────────
async function handleMessage(msg) {
  const { WhatsAppMessage, Question } = getModels();
  const groupId = process.env.WHATSAPP_GROUP_ID;

  // Only process messages from the configured group
  if (!groupId || msg.from !== groupId) return;

  // Check if this is a reply to one of our messages
  const quotedMsg = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;

  if (!quotedMsg || !quotedMsg.fromMe) {
    return;
  }

  // Extract question ID from the quoted message body
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
  console.log(`[WhatsApp] ✅ Pending answer received from ${senderName} for question ${questionId}`);
}

// ── Send a formatted question to the WhatsApp group ──────────────────────────
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
    console.log(`[WhatsApp] ✅ Question sent to group: ${question.title}`);
    return true;
  } catch (err) {
    console.error('[WhatsApp] ❌ Error sending to group:', err.message);
    return false;
  }
}

// ── Get the current connection status ────────────────────────────────────────
function getStatus() {
  return {
    isReady,
    hasQR: !!latestQR,
    groupId: process.env.WHATSAPP_GROUP_ID || null,
    reconnectAttempts,
    isInitializing,
  };
}

// ── Get the latest QR code as a base64 data URL ─────────────────────────────
function getQR() {
  return latestQR;
}

// ── Disconnect the client gracefully ─────────────────────────────────────────
async function disconnect() {
  clearTimeout(reconnectTimer);
  reconnectAttempts = MAX_RECONNECT_ATTEMPTS; // Prevent auto-reconnect
  await destroyClient();
  console.log('[WhatsApp] Disconnected gracefully');
}

module.exports = {
  initClient,
  sendQuestionToGroup,
  getStatus,
  getQR,
  disconnect,
};
