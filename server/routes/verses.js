const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

// ─── Book mapping ──────────────────────────────────────────────
const BOOK_ALIASES = {
  bg:   ['bg', 'bhagavad', 'bhagavadgita', 'bhagavad-gita', 'gita'],
  sb:   ['sb', 'srimad', 'bhagavatam', 'srimadbhagavatam', 'srimad-bhagavatam'],
  cc:   ['cc', 'caitanya', 'caitanyacaritamrta', 'caitanya-caritamrta', 'caritamrta'],
  iso:  ['iso', 'isopanishad', 'sriisopanishad', 'sri-isopanishad'],
  noi:  ['noi', 'nectar', 'nectarofinstruction', 'nectar-of-instruction'],
};

const BOOK_LABELS = {
  bg:  'Bhagavad Gita',
  sb:  'Srimad Bhagavatam',
  cc:  'Caitanya-caritamrta',
  iso: 'Sri Isopanishad',
  noi: 'Nectar of Instruction',
};

// ─── MongoDB connection (lazy singleton) ───────────────────────
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

// ─── Parse a reference string into a query object ─────────────
function parseReference(q) {
  const cleaned = q.trim();

  // Try to extract book code and numbers
  // Matches: BG2.3, BG 2.3, bg 2.3, SB1.2.3, SB 1.2.3, gita 2.3, etc.
  const match = cleaned.match(/^([a-zA-Z -]+?)[\s.]*(\d+(?:\.\d+)*)$/);
  if (!match) return null;

  let rawBook = match[1].toLowerCase().replace(/[\s-]/g, '');
  const rawParts = match[2].split('.');
  const numParts = rawParts.map(Number);

  // Resolve book code from alias
  let bookCode = null;
  for (const [code, aliases] of Object.entries(BOOK_ALIASES)) {
    if (aliases.some(a => a === rawBook || rawBook.startsWith(a) || a.startsWith(rawBook))) {
      bookCode = code;
      break;
    }
  }
  if (!bookCode) return null;

  const query = { book: bookCode };

  // Assign positional fields based on part count.
  // chapter/canto/part are numbers, verse/mantra is a string in the DB.
  // Only the highest-positioned identifier (verse/mantra) is kept as string.
  switch (bookCode) {
    case 'bg':
      if (rawParts.length >= 1) query.chapter = numParts[0];
      if (rawParts.length >= 2) query.verse = rawParts[1]; // string
      break;
    case 'sb':
      if (rawParts.length >= 1) query.canto = numParts[0];
      if (rawParts.length >= 2) query.chapter = numParts[1];
      if (rawParts.length >= 3) query.verse = rawParts[2]; // string
      break;
    case 'cc':
      if (rawParts.length >= 1) query.part = numParts[0];
      if (rawParts.length >= 2) query.chapter = numParts[1];
      if (rawParts.length >= 3) query.verse = rawParts[2]; // string
      break;
    case 'iso':
      if (rawParts.length >= 1) query.mantra = rawParts[0]; // string
      break;
    case 'noi':
      if (rawParts.length >= 1) query.verse = rawParts[0]; // string
      break;
    default:
      if (rawParts.length >= 1) query.chapter = numParts[0];
      if (rawParts.length >= 2) query.verse = rawParts[1];
  }

  return query;
}

// ─── Search verses by reference ───────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const { q, s: searchText } = req.query;

    // If a search text is provided (not reference), do full-text search
    if (searchText && !q) {
      const db = await getVedabaseDB();
      const collection = db.collection('verses');

      const results = await collection
        .find(
          { $text: { $search: searchText } },
          {
            projection: {
              score: { $meta: 'textScore' },
              book: 1, chapter: 1, verse: 1, canto: 1, part: 1,
              translation: 1, sanskrit: 1, iast: 1, url: 1,
            },
          }
        )
        .sort({ score: { $meta: 'textScore' } })
        .limit(10)
        .toArray();

      return res.json({
        verses: results.map(v => ({
          ...v,
          label: verseLabel(v),
          bookName: BOOK_LABELS[v.book] || v.book,
        })),
      });
    }

    // Reference-based search
    if (!q) {
      return res.json({ verses: [] });
    }

    const query = parseReference(q);
    if (!query) {
      // If can't parse, do a fallback full-text search
      const db = await getVedabaseDB();
      const collection = db.collection('verses');
      const results = await collection
        .find({ $text: { $search: q } }, {
          projection: {
            score: { $meta: 'textScore' },
            book: 1, chapter: 1, verse: 1, canto: 1, part: 1,
            translation: 1, sanskrit: 1, iast: 1, url: 1,
          },
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(8)
        .toArray();

      return res.json({
        verses: results.map(v => ({
          ...v,
          label: verseLabel(v),
          bookName: BOOK_LABELS[v.book] || v.book,
        })),
      });
    }

    const db = await getVedabaseDB();
    const collection = db.collection('verses');

    const results = await collection
      .find(query)
      .project({
        book: 1, chapter: 1, verse: 1, canto: 1, part: 1,
        translation: 1, sanskrit: 1, iast: 1, url: 1,
      })
      .limit(8)
      .toArray();

    res.json({
      verses: results.map(v => ({
        ...v,
        label: verseLabel(v),
        bookName: BOOK_LABELS[v.book] || v.book,
      })),
    });
  } catch (error) {
    console.error('[Verses] Search error:', error.message);
    res.status(500).json({ message: 'Server error', verses: [] });
  }
});

// ─── Get all available books (for the autocomplete dropdown) ──
router.get('/books', async (req, res) => {
  res.json({
    books: Object.entries(BOOK_LABELS).map(([code, name]) => ({
      code: code.toUpperCase(),
      name,
      aliases: BOOK_ALIASES[code].slice(0, 3),
    })),
  });
});

// ─── Format a verse reference label (reused) ──────────────────
function verseLabel(v) {
  if (v.book === 'bg') return `Bhagavad Gita ${v.chapter}.${v.verse}`;
  if (v.book === 'sb') return `Srimad Bhagavatam ${v.canto}.${v.chapter}.${v.verse}`;
  if (v.book === 'cc') return `Caitanya-caritamrta ${v.part} ${v.chapter}.${v.verse}`;
  if (v.book === 'iso') return `Sri Isopanishad Mantra ${v.mantra || v.verse}`;
  if (v.book === 'noi') return `Nectar of Instruction ${v.verse}`;
  return v.pageTitle || v.url || 'Unknown';
}

module.exports = router;
