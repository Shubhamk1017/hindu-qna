/**
 * vedabase.io Full Content Scraper
 * 
 * Scrapes all books with permission from vedabase.io / BBT
 * Stores everything into MongoDB Atlas
 * 
 * Books covered:
 *  bg  → Bhagavad-gītā As It Is         (18 chapters, ~700 verses)
 *  sb  → Śrīmad-Bhāgavatam              (12 cantos, ~18,000 verses)
 *  cc  → Śrī Caitanya-caritāmṛta        (3 parts, ~11,555 verses)
 *  iso → Śrī Īśopaniṣad                  (18 mantras)
 *  noi → Nectar of Instruction           (11 verses)
 *  bns → Bhakti-rasāmṛta-sindhu         (4 waves)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const pLimit = require('p-limit');

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const CONFIG = {
  MONGO_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb+srv://<user>:<password>@cluster0.mongodb.net/",
  DB_NAME: "vedabase",
  BASE_URL: "https://vedabase.io/en/library",
  // Be respectful — don't hammer their server
  CONCURRENCY: 3,         // max parallel requests
  DELAY_MS: 800,          // delay between requests (ms)
  RETRY_ATTEMPTS: 3,      // retries on failure
  RETRY_DELAY_MS: 2000,   // delay before retry
};

// ─── BOOK STRUCTURE ───────────────────────────────────────────────────────────

const BOOKS = {
  bg: {
    name: "Bhagavad-gītā As It Is",
    short: "BG",
    // 18 chapters
    chapters: Array.from({ length: 18 }, (_, i) => i + 1),
    urlFn: (chapter, verse) =>
      verse
        ? `${CONFIG.BASE_URL}/bg/${chapter}/${verse}/`
        : `${CONFIG.BASE_URL}/bg/${chapter}/`,
  },

  sb: {
    name: "Śrīmad-Bhāgavatam",
    short: "SB",
    // 12 cantos — chapters per canto
    cantos: {
      1: 19, 2: 10, 3: 33, 4: 31, 5: 26,
      6: 19, 7: 15, 8: 24, 9: 24, 10: 90,
      11: 31, 12: 13,
    },
    urlFn: (canto, chapter, verse) =>
      verse
        ? `${CONFIG.BASE_URL}/sb/${canto}/${chapter}/${verse}/`
        : `${CONFIG.BASE_URL}/sb/${canto}/${chapter}/`,
  },

  cc: {
    name: "Śrī Caitanya-caritāmṛta",
    short: "CC",
    // adi / madhya / antya
    parts: {
      adi:    17,
      madhya: 25,
      antya:  20,
    },
    urlFn: (part, chapter, verse) =>
      verse
        ? `${CONFIG.BASE_URL}/cc/${part}/${chapter}/${verse}/`
        : `${CONFIG.BASE_URL}/cc/${part}/${chapter}/`,
  },

  iso: {
    name: "Śrī Īśopaniṣad",
    short: "ISO",
    mantras: 18,
    urlFn: (mantra) => `${CONFIG.BASE_URL}/iso/${mantra}/`,
  },

  noi: {
    name: "Nectar of Instruction",
    short: "NOI",
    verses: 11,
    urlFn: (verse) => `${CONFIG.BASE_URL}/noi/${verse}/`,
  },
};

// ─── HTTP HELPER ──────────────────────────────────────────────────────────────

async function fetchPage(url, attempt = 1) {
  try {
    await sleep(CONFIG.DELAY_MS);
    const res = await fetch(url, {
      headers: {
        "User-Agent": "VedicChatbot-Scraper/1.0 (Authorized by BBT/vedabase.io)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      if (res.status === 404) return null; // verse doesn't exist
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } catch (err) {
    if (attempt < CONFIG.RETRY_ATTEMPTS) {
      console.warn(`  ↻ Retry ${attempt}/${CONFIG.RETRY_ATTEMPTS} for ${url}`);
      await sleep(CONFIG.RETRY_DELAY_MS * attempt);
      return fetchPage(url, attempt + 1);
    }
    console.error(`  ✗ Failed after ${CONFIG.RETRY_ATTEMPTS} attempts: ${url}`);
    return null;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── PARSER ───────────────────────────────────────────────────────────────────

/**
 * Parse a verse page from vedabase.io
 * Returns a structured document ready for MongoDB
 */
function parseVersePage(html, url) {
  const $ = cheerio.load(html);
  const doc = { url, scrapedAt: new Date() };

  // ── Sanskrit / Devanagari text
  doc.sanskrit = $(".r-verse-text, .verse-text, [class*='devanagari'], .r-devanagari")
    .first().text().trim() || null;

  // ── IAST transliteration
  doc.iast = $(".r-transliteration, .transliteration, [class*='iast']")
    .first().text().trim() || null;

  // ── Word-for-word synonyms
  const synonyms = [];
  $(".r-synonyms .r-synonym, .synonyms .synonym, [class*='synonym-item']").each((_, el) => {
    const word = $(el).find(".r-word, .word, [class*='word']").text().trim();
    const meaning = $(el).find(".r-meaning, .meaning, [class*='meaning']").text().trim();
    if (word || meaning) synonyms.push({ word, meaning });
  });
  // fallback: grab the whole synonyms block as raw text
  if (synonyms.length === 0) {
    const rawSynonyms = $(".r-synonyms, .synonyms, [class*='synonyms']").first().text().trim();
    if (rawSynonyms) doc.synonymsRaw = rawSynonyms;
  } else {
    doc.synonyms = synonyms;
  }

  // ── Translation
  doc.translation = $(".r-translation, .translation, [class*='translation']")
    .first().text().trim() || null;

  // ── Purport (full commentary)
  const purportParagraphs = [];
  $(".r-purport p, .purport p, [class*='purport'] p").each((_, el) => {
    const text = $(el).text().trim();
    if (text) purportParagraphs.push(text);
  });
  if (purportParagraphs.length > 0) {
    doc.purport = purportParagraphs.join("\n\n");
  } else {
    // fallback: whole purport block
    const rawPurport = $(".r-purport, .purport, [class*='purport']").first().text().trim();
    if (rawPurport) doc.purport = rawPurport;
  }

  // ── Audio URL (if present)
  const audioEl = $("audio source, [class*='audio'] source, a[href*='.mp3']");
  if (audioEl.length) {
    doc.audioUrl = audioEl.attr("src") || audioEl.attr("href") || null;
  }

  // ── Page title (fallback for reference)
  doc.pageTitle = $("title").text().trim() || $("h1").first().text().trim() || null;

  return doc;
}

/**
 * Get all verse numbers for a chapter by scraping the chapter index page
 */
async function getVerseList(chapterUrl) {
  const html = await fetchPage(chapterUrl);
  if (!html) return [];

  const $ = cheerio.load(html);
  const verses = [];

  // vedabase.io links verses like /en/library/bg/2/47/ or /en/library/sb/1/1/1/
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    // Match verse-level URLs (ends with /number/ or /number-number/)
    const match = href.match(/\/(\d[\d-]*)\/$/);
    if (match && href.includes(chapterUrl.replace(CONFIG.BASE_URL, ""))) {
      const verseNum = match[1];
      if (!verses.includes(verseNum)) verses.push(verseNum);
    }
  });

  return verses;
}

// ─── SCRAPERS PER BOOK ────────────────────────────────────────────────────────

async function* scrapeUrls(urls) {
  const limit = pLimit(CONFIG.CONCURRENCY);
  const tasks = urls.map((url) =>
    limit(async () => {
      const html = await fetchPage(url);
      if (!html) return null;
      return { url, html };
    })
  );

  for (const task of tasks) {
    const result = await task;
    if (result) yield result;
  }
}

async function buildBGUrls() {
  console.log("\n📖 Building Bhagavad Gita URL list...");
  const urls = [];
  for (const chapter of BOOKS.bg.chapters) {
    const chapterUrl = BOOKS.bg.urlFn(chapter);
    const verses = await getVerseList(chapterUrl);
    if (verses.length === 0) {
      // fallback: try verse 1 through 46
      for (let v = 1; v <= 46; v++) {
        urls.push({ book: "bg", chapter, verse: String(v), url: BOOKS.bg.urlFn(chapter, v) });
      }
    } else {
      for (const verse of verses) {
        urls.push({ book: "bg", chapter, verse, url: BOOKS.bg.urlFn(chapter, verse) });
      }
    }
  }
  console.log(`  → ${urls.length} BG verse URLs`);
  return urls;
}

async function buildSBUrls() {
  console.log("\n📖 Building Srimad Bhagavatam URL list...");
  const urls = [];
  for (const [canto, numChapters] of Object.entries(BOOKS.sb.cantos)) {
    for (let chapter = 1; chapter <= numChapters; chapter++) {
      const chapterUrl = BOOKS.sb.urlFn(canto, chapter);
      const verses = await getVerseList(chapterUrl);
      if (verses.length === 0) {
        for (let v = 1; v <= 44; v++) {
          urls.push({ book: "sb", canto: Number(canto), chapter, verse: String(v), url: BOOKS.sb.urlFn(canto, chapter, v) });
        }
      } else {
        for (const verse of verses) {
          urls.push({ book: "sb", canto: Number(canto), chapter, verse, url: BOOKS.sb.urlFn(canto, chapter, verse) });
        }
      }
    }
  }
  console.log(`  → ${urls.length} SB verse URLs`);
  return urls;
}

async function buildCCUrls() {
  console.log("\n📖 Building Caitanya-caritamrta URL list...");
  const urls = [];
  for (const [part, numChapters] of Object.entries(BOOKS.cc.parts)) {
    for (let chapter = 1; chapter <= numChapters; chapter++) {
      const chapterUrl = BOOKS.cc.urlFn(part, chapter);
      const verses = await getVerseList(chapterUrl);
      if (verses.length === 0) {
        for (let v = 1; v <= 250; v++) {
          urls.push({ book: "cc", part, chapter, verse: String(v), url: BOOKS.cc.urlFn(part, chapter, v) });
        }
      } else {
        for (const verse of verses) {
          urls.push({ book: "cc", part, chapter, verse, url: BOOKS.cc.urlFn(part, chapter, verse) });
        }
      }
    }
  }
  console.log(`  → ${urls.length} CC verse URLs`);
  return urls;
}

async function buildISOUrls() {
  console.log("\n📖 Building Isopanishad URL list...");
  const urls = [];
  for (let mantra = 1; mantra <= BOOKS.iso.mantras; mantra++) {
    urls.push({ book: "iso", mantra, url: BOOKS.iso.urlFn(mantra) });
  }
  return urls;
}

async function buildNOIUrls() {
  console.log("\n📖 Building Nectar of Instruction URL list...");
  const urls = [];
  for (let verse = 1; verse <= BOOKS.noi.verses; verse++) {
    urls.push({ book: "noi", verse, url: BOOKS.noi.urlFn(verse) });
  }
  return urls;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🕉  Vedabase.io Scraper Starting...");
  console.log("━".repeat(50));

  // Connect to MongoDB
  const client = new MongoClient(CONFIG.MONGO_URI);
  await client.connect();
  const db = client.db(CONFIG.DB_NAME);
  const collection = db.collection("verses");

  // Create indexes for fast chatbot queries
  await collection.createIndex({ book: 1, chapter: 1, verse: 1 });
  await collection.createIndex({ book: 1 });
  await collection.createIndex({ url: 1 }, { unique: true });
  // Full-text search index on translation + purport
  await collection.createIndex({
    translation: "text",
    purport: "text",
    sanskrit: "text",
  }, {
    weights: { translation: 10, purport: 5, sanskrit: 3 },
    name: "verse_text_search",
  });

  console.log("✓ MongoDB connected & indexes created");

  let totalScraped = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  async function processUrlList(urlList, label) {
    console.log(`\n⏳ Scraping ${label} (${urlList.length} URLs)...`);
    let count = 0;

    for await (const { url, html } of scrapeUrls(urlList.map((u) => u.url))) {
      const meta = urlList.find((u) => u.url === url);
      const parsed = parseVersePage(html, url);

      // Skip if we got essentially nothing
      if (!parsed.translation && !parsed.sanskrit && !parsed.purport) {
        totalSkipped++;
        continue;
      }

      const doc = { ...meta, ...parsed };

      try {
        await collection.updateOne(
          { url },
          { $set: doc },
          { upsert: true }
        );
        totalScraped++;
        count++;
        if (count % 50 === 0) {
          process.stdout.write(`  → ${count}/${urlList.length} done\r`);
        }
      } catch (err) {
        console.error(`  ✗ DB error for ${url}: ${err.message}`);
        totalFailed++;
      }
    }

    console.log(`  ✓ ${label} done: ${count} verses saved`);
  }

  // ── Parse --book argument
  const bookArg = process.argv.find(a => a.startsWith('--book='));
  const bookFlag = process.argv.includes('--book') ? process.argv[process.argv.indexOf('--book') + 1] : null;
  const targetBook = bookArg ? bookArg.split('=')[1] : bookFlag;

  // ── Run scrapers (filter by --book if specified)
  const scrapers = [
    { key: 'bg',  fn: buildBGUrls,  label: 'Bhagavad Gita' },
    { key: 'sb',  fn: buildSBUrls,  label: 'Srimad Bhagavatam' },
    { key: 'cc',  fn: buildCCUrls,  label: 'Caitanya-caritamrta' },
    { key: 'iso', fn: buildISOUrls, label: 'Isopanishad' },
    { key: 'noi', fn: buildNOIUrls, label: 'Nectar of Instruction' },
  ];

  for (const s of scrapers) {
    if (targetBook && targetBook !== s.key) continue;
    const urls = await s.fn();
    await processUrlList(urls, s.label);
  }

  // ── Final report
  console.log("\n" + "━".repeat(50));
  console.log("🕉  Scraping Complete!");
  console.log(`  ✓ Saved:   ${totalScraped}`);
  console.log(`  ⊘ Skipped: ${totalSkipped}`);
  console.log(`  ✗ Failed:  ${totalFailed}`);
  console.log(`  📦 Total in DB: ${await collection.countDocuments()}`);

  await client.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
