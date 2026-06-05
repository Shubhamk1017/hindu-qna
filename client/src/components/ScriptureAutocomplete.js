import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { FiBook, FiSearch, FiExternalLink } from 'react-icons/fi';
import SanskritTransliterator from './SanskritTransliterator';

// ─── Debounce helper ──────────────────────────────────────────
function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Book icon colors ─────────────────────────────────────────
const BOOK_STYLES = {
  bg:  'from-orange-500 to-amber-600',
  sb:  'from-blue-500 to-cyan-600',
  cc:  'from-purple-500 to-violet-600',
  iso: 'from-emerald-500 to-teal-600',
  noi: 'from-rose-500 to-pink-600',
};

// ─── ScriptureAutocomplete ────────────────────────────────────
export default function ScriptureInput({ value, onChange, placeholder, rows, className, onKeyDown: propsOnKeyDown, inputRef: externalRef, ...props }) {
  const internalRef = useRef(null);
  const textareaRef = externalRef || internalRef;
  const dropdownRef = useRef(null);

  // Transliterator state
  const [showTranslit, setShowTranslit] = useState(false);
  const translitBtnRef = useRef(null);

  // Autocomplete state
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [triggerPos, setTriggerPos] = useState({ top: 0, left: 0 });
  const [availableBooks, setAvailableBooks] = useState([]);

  const debouncedQuery = useDebounce(query, 300);

  // Fetch available books on mount
  useEffect(() => {
    api.get('/verses/books').then(r => {
      setAvailableBooks(r.data.books || []);
    }).catch(() => {});
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    api.get(`/verses/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => {
        setResults(r.data.verses || []);
        setSelectedIdx(0);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Close on click outside
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          textareaRef.current && !textareaRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDropdown]);

  // ── Insert a verse into the text ────────────────────────────
  const insertVerse = useCallback((verse) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const cursorPos = ta.selectionStart;
    const text = value;

    // Find the start of the @trigger
    const beforeCursor = text.substring(0, cursorPos);
    const atIdx = beforeCursor.lastIndexOf('@');
    if (atIdx === -1) return;

    // Build the reference tag
    const refTag = `[${verse.label}](${verse.url || ''})`;
    const newText = text.substring(0, atIdx) + refTag + ' ' + text.substring(cursorPos);

    onChange(newText);
    setShowDropdown(false);
    setQuery('');

    // Move cursor after inserted text
    requestAnimationFrame(() => {
      const newPos = atIdx + refTag.length + 1;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onChange]);

  // ── Handle textarea input ───────────────────────────────────
  const handleChange = (e) => {
    const newVal = e.target.value;
    onChange(newVal);

    const ta = e.target;
    const cursorPos = ta.selectionStart;
    const beforeCursor = newVal.substring(0, cursorPos);

    // Detect @trigger
    const atIdx = beforeCursor.lastIndexOf('@');
    if (atIdx !== -1) {
      const textAfterAt = beforeCursor.substring(atIdx + 1);

      if (textAfterAt.length > 0 && !textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setQuery(textAfterAt);
        setShowDropdown(true);

        // Calculate dropdown position relative to cursor line
        const lineHeight = 22;
        const lines = beforeCursor.substring(0, atIdx).split('\n');
        const currentLine = lines.length;
        const scrollTop = ta.scrollTop;
        const topOffset = currentLine * lineHeight - scrollTop;

        setTriggerPos({ top: Math.max(36, topOffset + lineHeight + 4) });
        return;
      }
    }

    setShowDropdown(false);
    setQuery('');
  };

  // ── Handle keyboard navigation ──────────────────────────────
  const handleKeyDown = (e) => {
    // If dropdown is open with results, intercept navigation keys
    if (showDropdown && results.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIdx(prev => (prev + 1) % Math.min(results.length, 6));
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIdx(prev => (prev - 1 + Math.min(results.length, 6)) % Math.min(results.length, 6));
          return;
        case 'Enter':
        case 'Tab':
          if (selectedIdx >= 0 && selectedIdx < results.length) {
            e.preventDefault();
            insertVerse(results[selectedIdx]);
            return;
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowDropdown(false);
          return;
        default:
          break;
      }
    }

    // Propagate onKeyDown from parent (for Enter-to-submit on comments, etc.)
    if (propsOnKeyDown) {
      propsOnKeyDown(e);
    }
  };

  const handleTranslitInsert = useCallback((devanagari) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    const cursorPos = ta.selectionStart;
    const text = value;
    const newText = text.substring(0, cursorPos) + devanagari + text.substring(cursorPos);
    onChange(newText);
    setShowTranslit(false);
    requestAnimationFrame(() => {
      const newPos = cursorPos + devanagari.length;
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onChange]);

  const isSingleLine = rows <= 1;

  return (
    <div className={`relative z-10 ${isSingleLine ? 'flex items-center gap-1.5' : 'flex flex-col'}`}>
      <textarea
        {...props}
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={`${isSingleLine ? 'min-w-0 flex-1 ' : ''}${className || ''}`}
      />

      {/* Sanskrit Transliterator button */}
      <button
          ref={translitBtnRef}
          type="button"
          onClick={() => setShowTranslit(prev => !prev)}
          className={`${isSingleLine ? 'shrink-0' : 'self-end mt-1.5'} w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-200 ${
            showTranslit
              ? 'bg-brand text-white shadow-sm'
              : 'text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-[#2A2520]/80 hover:bg-gray-100 dark:hover:bg-[#3A342E] hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-[#3A342E]'
          }`}
          title="Sanskrit Transliterator"
        >
          दे
        </button>

      {/* Sanskrit Transliterator popup */}
      {showTranslit && (
        <SanskritTransliterator
          anchorRef={translitBtnRef}
          onInsert={handleTranslitInsert}
          onClose={() => setShowTranslit(false)}
        />
      )}

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-2 right-2 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#3A342E] rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-dropdown-in"
          style={{ top: `${triggerPos.top}px` }}
        >
          {/* Header hint */}
          {query.length < 2 && availableBooks.length > 0 && (
            <div className="px-4 py-3 border-b border-gray-50 dark:border-[#2A2520]">
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">
                Available scriptures
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableBooks.map(book => (
                  <span
                    key={book.code}
                    className="text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#2A2520] px-2 py-0.5 rounded-md border border-gray-100 dark:border-[#3A342E]"
                  >
                    <span className="font-bold text-brand">@</span>{book.code}
                    <span className="text-gray-300 dark:text-gray-500 ml-1">— {book.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
              <span className="text-[13px] text-gray-400">Searching scriptures...</span>
            </div>
          )}

          {/* No results */}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="px-4 py-5 text-center">
              <FiSearch size={18} className="mx-auto mb-2 text-gray-300 dark:text-gray-500" />
              <p className="text-[13px] text-gray-400">No verse found for "<span className="font-medium text-gray-500 dark:text-gray-300">@{query}</span>"</p>
              <p className="text-[11px] text-gray-300 dark:text-gray-500 mt-1">Try: <span className="font-mono">BG2.47</span>, <span className="font-mono">SB1.2.3</span>, <span className="font-mono">CC2.20</span></p>
            </div>
          )}

          {/* Results list */}
          {!loading && results.length > 0 && (
            <div>
              <div className="px-4 py-1.5 border-b border-gray-50 dark:border-[#2A2520]">
                <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  {results.length} verse{results.length > 1 ? 's' : ''} found
                </span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {results.slice(0, 6).map((verse, i) => (
                  <button
                    key={`${verse.book}-${verse.chapter || verse.canto || ''}-${verse.verse || verse.mantra || ''}-${i}`}
                    onClick={() => insertVerse(verse)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    className={`w-full text-left px-4 py-3 transition-colors duration-150 border-b border-gray-50 dark:border-[#2A2520] last:border-b-0 ${
                      i === selectedIdx
                        ? 'bg-amber-50 dark:bg-amber-500/10'
                        : 'hover:bg-gray-50 dark:hover:bg-[#2A2520]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${BOOK_STYLES[verse.book] || 'from-gray-500 to-gray-600'} flex items-center justify-center flex-shrink-0`}>
                        <FiBook size={9} className="text-white" />
                      </div>
                      <span className="text-[13px] font-semibold text-gray-800 dark:text-gray-200">
                        {verse.label}
                      </span>
                      {verse.url && (
                        <FiExternalLink size={10} className="text-gray-300 dark:text-gray-500 ml-auto flex-shrink-0" />
                      )}
                    </div>
                    {verse.translation && (
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed pl-7">
                        {verse.translation.substring(0, 150)}{verse.translation.length > 150 ? '...' : ''}
                      </p>
                    )}
                    {verse.sanskrit && (
                      <p className="text-[12px] text-gray-400 dark:text-gray-500 font-serif mt-0.5 pl-7 line-clamp-1">
                        {verse.sanskrit.substring(0, 80)}{verse.sanskrit.length > 80 ? '...' : ''}
                      </p>
                    )}
                  </button>
                ))}
              </div>
              <div className="px-4 py-2 bg-gray-50 dark:bg-[#2A2520] border-t border-gray-100 dark:border-[#3A342E] flex items-center justify-between">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  <kbd className="px-1 py-0.5 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#3A342E] rounded text-[9px] font-mono mx-0.5">↵</kbd> insert
                  <kbd className="px-1 py-0.5 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#3A342E] rounded text-[9px] font-mono mx-0.5">↑↓</kbd> navigate
                  <kbd className="px-1 py-0.5 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#3A342E] rounded text-[9px] font-mono mx-0.5">esc</kbd> close
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
