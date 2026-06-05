/**
 * Sanskrit Transliteration Utility
 *
 * Converts romanized Sanskrit (IAST / ITRANS / Harvard-Kyoto) to Devanāgarī
 * with proper handling of Devanagari orthographic rules:
 *   - Consonants with implicit 'a' at word boundaries
 *   - Consonant clusters with halant (्)
 *   - Vowel signs (mātrās) attached to preceding consonants
 *   - Independent vowels at word start or after vowels
 *   - Special marks (anusvāra, visarga, avagraha)
 *
 * Examples:
 *   karma        → कर्म
 *   bhagavad     → भगवद्
 *   gītā         → गीता
 *   śrīmad       → श्रीमद्
 *   kṛṣṇa        → कृष्ण
 *   oṃ           → ॐ
 *   namo         → नमो
 */

// ─── Mapping tables ────────────────────────────────────────────
// Vowels: [pattern, independent_form, dependent_sign]
const VOWELS = [
  // Order matters — longer patterns first for greedy matching
  ["aum", "ॐ",   "ॐ"],
  ["om",  "ॐ",   "ॐ"],
  ["oṃ",  "ॐ",   "ॐ"],

  ["au",  "औ",   "ौ"],
  ["ai",  "ऐ",   "ै"],
  ["ā",   "आ",   "ा"],
  ["ī",   "ई",   "ी"],
  ["ū",   "ऊ",   "ू"],
  ["ṛ",   "ऋ",   "ृ"],
  ["ṝ",   "ॠ",   "ॄ"],
  ["ḷ",   "ऌ",   "ॢ"],
  ["e",   "ए",   "े"],
  ["o",   "ओ",   "ो"],
  ["a",   "अ",   ""],    // short 'a' is implicit — no visible sign
  ["i",   "इ",   "ि"],
  ["u",   "उ",   "ु"],

  // ITRANS/Harvard-Kyoto patterns
  ["aa",  "आ",   "ा"],
  ["ii",  "ई",   "ी"],
  ["uu",  "ऊ",   "ू"],
  ["Ri",  "ऋ",   "ृ"],
  ["RRi", "ॠ",   "ॄ"],
  ["Li",  "ऌ",   "ॢ"],

  // ITRANS uppercase — single-char shortcuts
  ["A",   "आ",   "ा"],
  ["I",   "ई",   "ी"],
  ["U",   "ऊ",   "ू"],
  ["E",   "ए",   "े"],
  ["O",   "ओ",   "ो"],
  ["R",   "ऋ",   "ृ"],
  ["L",   "ऌ",   "ॢ"],
];

// Consonants: [pattern, devanagari]
const CONSONANTS = [
  ["kh",  "ख"],
  ["gh",  "घ"],
  ["k",   "क"],
  ["g",   "ग"],
  ["ṅ",   "ङ"],

  ["Ch",  "छ"],
  ["ch",  "च"],
  ["jh",  "झ"],
  ["c",   "च"],
  ["j",   "ज"],
  ["ñ",   "ञ"],
  ["~n",  "ञ"],
  ["JN",  "ज्ञ"],  // jñāna → ज्ञान

  ["ṭh",  "ठ"],
  ["ḍh",  "ढ"],
  ["ṭ",   "ट"],
  ["ḍ",   "ड"],
  ["ṇ",   "ण"],
  ["Th",  "ठ"],
  ["Dh",  "ढ"],
  [".th", "ठ"],
  [".dh", "ढ"],
  [".t",  "ट"],
  [".d",  "ड"],
  [".n",  "ण"],
  ["T",   "ट"],
  ["D",   "ड"],
  ["N",   "ण"],

  ["th",  "थ"],
  ["dh",  "ध"],
  ["t",   "त"],
  ["d",   "द"],
  ["n",   "न"],

  ["ph",  "फ"],
  ["bh",  "भ"],
  ["p",   "प"],
  ["b",   "ब"],
  ["m",   "म"],

  ["y",   "य"],
  ["r",   "र"],
  ["l",   "ल"],
  ["v",   "व"],
  ["w",   "व"],

  ["ś",   "श"],
  ["ṣ",   "ष"],
  ["shh", "ष"],
  ["Sh",  "ष"],
  ["sh",  "श"],
  ["s",   "स"],
  ["h",   "ह"],
];

// Special marks: [pattern, devanagari, binds_to_consonant]
const SPECIAL = [
  ["ṃ",  "ं",  true],    // anusvāra
  ["ḥ",  "ः",  true],    // visarga
  [".m", "ं",  true],
  [".h", "ः",  true],
  ["M",  "ं",  true],
  ["H",  "ः",  true],
  ["'",  "ऽ",  false],   // avagraha
];

// ─── Build lookup tables ───────────────────────────────────────

// All phonemes sorted by length desc for greedy matching
const ALL_PHONEMES = [
  ...VOWELS.map(([p]) => ({ pattern: p, type: 'vowel' })),
  ...CONSONANTS.map(([p]) => ({ pattern: p, type: 'consonant' })),
  ...SPECIAL.map(([p]) => ({ pattern: p, type: 'special' })),
].sort((a, b) => b.pattern.length - a.pattern.length);

const VOWEL_MAP = new Map(VOWELS.map(([p, indep]) => [p, indep]));
const SIGN_MAP = new Map(VOWELS.map(([p, _indep, sign]) => [p, sign]));
const CONSONANT_MAP = new Map(CONSONANTS);
const SPECIAL_MAP = new Map(SPECIAL.map(([p, d]) => [p, d]));
const SPECIAL_BINDS = new Set(SPECIAL.filter(([, , b]) => b).map(([p]) => p));

// ─── Tokenizer ─────────────────────────────────────────────────

/**
 * Tokenize romanized text into an array of phoneme tokens.
 * Each token: { pattern, type: 'vowel'|'consonant'|'special'|'other', value }
 */
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;

    // Greedy match against known phonemes
    for (const { pattern, type } of ALL_PHONEMES) {
      if (text.substring(i, i + pattern.length) === pattern) {
        tokens.push({ pattern, type });
        i += pattern.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    // Pass through unknown characters (spaces, punctuation, etc.)
    tokens.push({ pattern: text[i], type: 'other' });
    i++;
  }
  return tokens;
}

// ─── Rendering ─────────────────────────────────────────────────

/**
 * Convert a tokenized phoneme sequence to Devanāgarī.
 */
function render(tokens) {
  const out = [];
  const len = tokens.length;

  for (let i = 0; i < len; i++) {
    const tok = tokens[i];

    if (tok.type === 'consonant') {
      const deva = CONSONANT_MAP.get(tok.pattern);

      // Look ahead: what comes after this consonant?
      const next = tokens[i + 1];

      if (!next || next.type === 'other') {
        // End of word — consonant with halant (no implicit 'a')
        out.push(deva + '्');
      } else if (next.type === 'vowel') {
        // Vowel follows — attach as mātrā, replacing implicit 'a'
        const sign = SIGN_MAP.get(next.pattern);
        out.push(deva + sign);
        i++; // consume the vowel
      } else if (next.type === 'special' && SPECIAL_BINDS.has(next.pattern)) {
        // Special mark (anusvāra, visarga) binds to consonant
        out.push(deva + SPECIAL_MAP.get(next.pattern));
        i++; // consume the special
      } else {
        // Another consonant or non-binding special follows — add halant
        out.push(deva + '्');
      }

    } else if (tok.type === 'vowel') {
      // Independent vowel (at start or after another vowel)
      const indep = VOWEL_MAP.get(tok.pattern);
      out.push(indep);

    } else if (tok.type === 'special') {
      // Standalone special mark
      out.push(SPECIAL_MAP.get(tok.pattern));

    } else {
      // Other (space, punctuation, etc.) — pass through
      out.push(tok.pattern);
    }
  }

  return out.join('');
}

// ─── Main conversion ──────────────────────────────────────────

/**
 * Convert romanized Sanskrit text to Devanāgarī.
 *
 * @param {string} text - Romanized Sanskrit (IAST/ITRANS/Harvard-Kyoto)
 * @returns {string} Devanāgarī text
 *
 * @example
 *   transliterate('karma')             → 'कर्म'
 *   transliterate('bhagavad gītā')     → 'भगवद् गीता'
 *   transliterate('oṃ namo bhagavate') → 'ॐ नमो भगवते'
 *   transliterate('kṛṣṇa')             → 'कृष्ण'
 *   transliterate('jñāna')             → 'ज्ञान'
 */
export function transliterate(text) {
  if (!text) return '';
  const tokens = tokenize(text);
  return render(tokens);
}

export default transliterate;
