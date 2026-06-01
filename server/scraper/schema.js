/**
 * MongoDB Schema — Vedabase Database
 * Collection: verses
 *
 * Every document represents one verse/mantra from vedabase.io
 */

// ─── EXAMPLE DOCUMENTS ───────────────────────────────────────────────────────

// Bhagavad Gita verse
const BG_EXAMPLE = {
  _id: "ObjectId(...)",
  book: "bg",                          // book code
  chapter: 2,                          // chapter number
  verse: "47",                         // verse (string — can be "12-13" for combined)
  url: "https://vedabase.io/en/library/bg/2/47/",
  pageTitle: "Bhagavad-gītā As It Is 2.47",

  sanskrit: "karmaṇy evādhikāras te\nmā phaleṣu kadācana\nmā karma-phala-hetur bhūr\nmā te saṅgo 'stv akarmaṇi",
  iast:     "karmaṇy evādhikāras te mā phaleṣu kadācana...",

  synonyms: [
    { word: "karmaṇi",    meaning: "in prescribed duties" },
    { word: "eva",        meaning: "certainly" },
    { word: "adhikāraḥ",  meaning: "right" },
    { word: "te",         meaning: "of you" },
    { word: "mā",         meaning: "never" },
    { word: "phaleṣu",    meaning: "in the fruits" },
    // ...
  ],

  translation: "You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself the cause of the results of your activities, and never be attached to not doing your duty.",

  purport: "There are three considerations here: prescribed duties, capricious work and inaction...\n\n[full commentary text]",

  audioUrl: null,  // or "https://vedabase.io/audio/bg/2/47.mp3"
  scrapedAt: "ISODate(...)",
};

// Srimad Bhagavatam verse
const SB_EXAMPLE = {
  _id: "ObjectId(...)",
  book: "sb",
  canto: 1,
  chapter: 2,
  verse: "6",
  url: "https://vedabase.io/en/library/sb/1/2/6/",
  pageTitle: "Śrīmad-Bhāgavatam 1.2.6",

  sanskrit: "sa vai puṁsāṁ paro dharmo...",
  iast: "sa vai puṁsāṁ paro dharmo yato bhaktir adhokṣaje...",
  synonyms: [/* ... */],
  translation: "The supreme occupation [dharma] for all humanity is that by which men can attain to loving devotional service...",
  purport: "Human life is specifically meant for attaining...",
  audioUrl: "https://vedabase.io/audio/sb/1.2.6.mp3",
  scrapedAt: "ISODate(...)",
};

// Caitanya-caritamrta verse
const CC_EXAMPLE = {
  _id: "ObjectId(...)",
  book: "cc",
  part: "adi",         // adi / madhya / antya
  chapter: 1,
  verse: "1",
  url: "https://vedabase.io/en/library/cc/adi/1/1/",
  sanskrit: "...",
  iast: "...",
  synonyms: [],
  translation: "...",
  purport: "...",
  audioUrl: null,
  scrapedAt: "ISODate(...)",
};

// Isopanishad mantra
const ISO_EXAMPLE = {
  _id: "ObjectId(...)",
  book: "iso",
  mantra: 1,
  url: "https://vedabase.io/en/library/iso/1/",
  sanskrit: "īśāvāsyam idaṁ sarvaṁ...",
  iast: "īśāvāsyam idaṁ sarvaṁ yat kiñca jagatyāṁ jagat...",
  synonyms: [],
  translation: "Everything animate or inanimate that is within the universe is controlled and owned by the Lord...",
  purport: "...",
  audioUrl: null,
  scrapedAt: "ISODate(...)",
};

/**
 * INDEXES (auto-created by scraper.js)
 *
 * 1. { book, chapter, verse }  — exact verse lookup
 * 2. { book }                  — filter by book
 * 3. { url }  (unique)         — deduplication
 * 4. text index on translation + purport + sanskrit — full-text search
 */

/**
 * USEFUL QUERIES
 */

// 1. Get a specific verse
db.verses.findOne({ book: "bg", chapter: 2, verse: "47" });

// 2. Full-text search (for chatbot RAG)
db.verses.find(
  { $text: { $search: "karma duty action detachment" } },
  { score: { $meta: "textScore" }, translation: 1, purport: 1, book: 1, chapter: 1, verse: 1, url: 1 }
).sort({ score: { $meta: "textScore" } }).limit(5);

// 3. All verses of a chapter
db.verses.find({ book: "bg", chapter: 2 }).sort({ verse: 1 });

// 4. All Bhagavatam verses from a canto
db.verses.find({ book: "sb", canto: 1 }).sort({ chapter: 1, verse: 1 });

// 5. Count total verses per book
db.verses.aggregate([
  { $group: { _id: "$book", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

/**
 * ESTIMATED DATABASE SIZE
 *
 * Book                        Verses      ~Size
 * ─────────────────────────────────────────────
 * Bhagavad Gita               ~700        ~50 MB
 * Srimad Bhagavatam           ~18,000     ~2.5 GB
 * Caitanya-caritamrta         ~11,555     ~1.5 GB
 * Isopanishad                 18          ~2 MB
 * Nectar of Instruction       11          ~1 MB
 * ─────────────────────────────────────────────
 * TOTAL                       ~30,284     ~4 GB
 *
 * MongoDB Atlas M10 ($57/mo) handles this comfortably.
 * For free tier (M0 = 512 MB), scrape BG + ISO + NOI first.
 */
