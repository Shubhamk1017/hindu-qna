/**
 * WhatsApp Group Lister
 *
 * A standalone script that uses your existing WhatsApp session to list
 * all groups you're a member of, along with their group IDs.
 *
 * Usage:
 *   cd server
 *   node scripts/list-groups.js
 *
 * If no session exists yet, it will show a QR code to scan.
 * The session is saved in server/whatsapp-session/ so you only scan once.
 */

const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './whatsapp-session' }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
    ],
  },
});

// ── QR code handler (only needed on first run) ──────────────────
client.on('qr', async (qr) => {
  console.log('\n📱 Scan this QR code with WhatsApp on your phone:');
  console.log('   Open WhatsApp → Linked Devices → Link a Device\n');

  try {
    // Print the raw QR string (can be decoded by any QR reader tool)
    console.log('▶  Raw QR text (paste into a QR decoder if needed):');
    console.log(qr);

    // Save QR as an image file
    const dataUrl = await QRCode.toDataURL(qr, { width: 400, margin: 2 });
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('./whatsapp-qr.png', base64Data, 'base64');
    console.log('\n📁 QR image saved to: server/whatsapp-qr.png');
    console.log('   Open this file and scan it with your phone.\n');
  } catch (err) {
    console.error('QR generation error:', err.message);
  }
});

// ── Ready — list all groups ─────────────────────────────────────
client.on('ready', async () => {
  console.log('\n✅ WhatsApp authenticated successfully!\n');

  try {
    const chats = await client.getChats();
    const groups = chats.filter((chat) => chat.isGroup);

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Found ${groups.length} WhatsApp group(s)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    if (groups.length === 0) {
      console.log('  You are not a member of any groups yet.');
      console.log('  Create a group in WhatsApp first, then run this script again.\n');
    } else {
      groups.forEach((group, i) => {
        console.log(`  ${i + 1}. ${group.name}`);
        console.log(`     📎 Group ID: ${group.id._serialized}`);
        console.log(`     👥 ${group.participants.length} members`);
        console.log('');
      });

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log('  To use with Pariprashna:');
      console.log('  1. Copy the Group ID of your chosen group');
      console.log('  2. Set it as WHATSAPP_GROUP_ID in server/.env');
      console.log('  3. Restart the server');
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }
  } catch (err) {
    console.error('Error fetching chats:', err.message);
  }

  await client.destroy();
  process.exit(0);
});

// ── Timeout guard (exit after 2 min if no scan) ────────────────
setTimeout(() => {
  console.log('\n⏱  Timed out waiting for QR scan (2 minutes).');
  console.log('   Run the script again when you\'re ready to scan.\n');
  client.destroy();
  process.exit(1);
}, 120000);

// ── Error handlers ─────────────────────────────────────────────
client.on('auth_failure', (msg) => {
  console.error('\n❌ Authentication failed:', msg);
  console.log('Try deleting the server/whatsapp-session/ directory and re-run.\n');
  process.exit(1);
});

client.on('disconnected', (reason) => {
  console.log('\nDisconnected:', reason);
  process.exit(1);
});

console.log('Initializing WhatsApp client...');
client.initialize();
