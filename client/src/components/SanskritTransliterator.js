import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiCopy, FiCheck, FiX, FiEdit3 } from 'react-icons/fi';
import { transliterate } from '../utils/transliterate';

/**
 * SanskritTransliterator — a floating popup tool that converts
 * romanized Sanskrit (IAST/ITRANS) to Devanāgarī in real time.
 *
 * Props:
 *   onInsert  (text: string) => void   — called when user clicks Insert
 *   onClose   () => void               — called to close the popup
 *   anchorRef React.RefObject          — element to position near
 */
export default function SanskritTransliterator({ onInsert, onClose, anchorRef }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const popupRef = useRef(null);
  const inputRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Real-time transliteration
  useEffect(() => {
    setOutput(transliterate(input));
  }, [input]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Position popup near the anchor
  const updatePosition = useCallback(() => {
    if (!anchorRef?.current || !popupRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 360)),
    });
  }, [anchorRef]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target) &&
          anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = () => {
    onInsert?.(output);
    setInput('');
    setOutput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose?.();
    }
    if (e.key === 'Enter' && !e.shiftKey && output) {
      e.preventDefault();
      handleInsert();
    }
  };

  return (
    <div
      ref={popupRef}
      className="fixed z-[9999] w-[340px] bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#3A342E] rounded-xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden animate-dropdown-in"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-[#2A2520]">
        <div className="flex items-center gap-2">
          <span className="text-[15px]">🕉</span>
          <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">
            Sanskrit Transliterator
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <FiX size={14} />
        </button>
      </div>

      {/* Input */}
      <div className="px-4 pt-3 pb-2">
        <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 block">
          Romanized (IAST / ITRANS)
        </label>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. bhagavad gita"
          className="w-full border border-gray-200 dark:border-[#3A342E] rounded-lg px-3 py-2 text-[14px] text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-[#141110] placeholder:text-gray-300 dark:placeholder:text-gray-500 outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all font-mono"
        />
      </div>

      {/* Output */}
      <div className="px-4 pb-1">
        <label className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 block">
          Devanāgarī
        </label>
        <div className="min-h-[36px] border border-gray-200 dark:border-[#3A342E] rounded-lg px-3 py-2 bg-brand-50/30 dark:bg-brand/5 border-brand-100/30 dark:border-brand/20">
          {output ? (
            <span className="text-[18px] font-serif text-gray-800 dark:text-gray-200 leading-relaxed" style={{ fontFamily: "'Noto Sans Devanagari', 'Sanskrit Text', serif" }}>
              {output}
            </span>
          ) : (
            <span className="text-[13px] text-gray-300 dark:text-gray-600 italic">
              Type above to see Devanāgarī...
            </span>
          )}
        </div>
      </div>

      {/* Examples */}
      {!input && (
        <div className="px-4 py-1.5">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
            <span><span className="font-mono text-brand">karma</span> → कर्म</span>
            <span><span className="font-mono text-brand">shiva</span> → शिव</span>
            <span><span className="font-mono text-brand">.t</span> → ट &nbsp;<span className="font-mono text-brand">.d</span> → ड</span>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-[#2A2520] bg-gray-50/50 dark:bg-[#141110]/50">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] transition-all"
        >
          {copied ? <FiCheck size={12} className="text-green-500" /> : <FiCopy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={handleInsert}
          disabled={!output}
          className="flex items-center gap-1.5 text-[12px] font-medium text-white bg-brand hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 rounded-lg transition-all hover:shadow-sm"
        >
          <FiEdit3 size={11} />
          Insert
        </button>
      </div>
    </div>
  );
}
