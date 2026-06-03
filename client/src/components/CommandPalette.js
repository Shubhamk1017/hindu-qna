import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import {
  FiSearch, FiHome, FiHelpCircle, FiUsers, FiBook, FiMessageSquare,
  FiSun, FiMoon, FiCommand, FiArrowRight, FiPlus, FiStar, FiSend,
  FiTrendingUp
} from 'react-icons/fi';

const QUICK_ACTIONS = [
  { id: 'home', label: 'Go to Home', icon: FiHome, action: '/' },
  { id: 'questions', label: 'Browse Questions', icon: FiHelpCircle, action: '/questions' },
  { id: 'ask', label: 'Ask a Question', icon: FiPlus, action: '/questions/ask' },
  { id: 'chat', label: 'AI Chat', icon: FiSend, action: '/chat' },
  { id: 'experts', label: 'Top Experts', icon: FiUsers, action: '/users' },
  { id: 'tags', label: 'Browse Tags', icon: FiBook, action: '/tags' },
];

const CommandPalette = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);

  // Filter quick actions
  const filteredActions = QUICK_ACTIONS.filter(a =>
    !query || a.label.toLowerCase().includes(query.toLowerCase())
  );

  // Search questions
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/questions?search=${encodeURIComponent(query)}&limit=5`);
        setResults(res.data.questions || []);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query]);

  const executeAction = useCallback((action) => {
    onClose();
    navigate(action);
  }, [navigate, onClose]);

  const executeQuestion = useCallback((questionId) => {
    onClose();
    navigate(`/questions/${questionId}`);
  }, [navigate, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const totalItems = filteredActions.length + results.length;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        if (selectedIndex < filteredActions.length) {
          executeAction(filteredActions[selectedIndex].action);
        } else {
          const questionIdx = selectedIndex - filteredActions.length;
          if (results[questionIdx]) {
            executeQuestion(results[questionIdx]._id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredActions, results, selectedIndex, executeAction, executeQuestion, onClose]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (overlayRef.current === e.target) onClose();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [open, onClose]);

  if (!open) return null;

  const hasResults = query.trim().length > 0;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40 backdrop-blur-sm animate-fade-in-up"
    >
      <div className="w-full max-w-[580px] bg-white dark:bg-[#1C1814] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2A2520] overflow-hidden animate-fade-in-scale">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-[#2A2520]">
          <FiSearch size={18} className="text-gray-300 dark:text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search questions or type a command..."
            className="flex-1 text-[15px] bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-500"
          />
          <kbd className="text-[11px] text-gray-300 dark:text-gray-500 bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] px-2 py-0.5 rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2 px-2">
          {/* Quick Actions */}
          {filteredActions.length > 0 && (
            <div className="mb-1">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-300 dark:text-gray-500">
                {hasResults ? 'Actions' : 'Quick Actions'}
              </div>
              {filteredActions.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => executeAction(item.action)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all duration-150 ${
                      selectedIndex === idx
                        ? 'bg-brand-50 dark:bg-brand/10 text-brand font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2520]'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedIndex === idx ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-[#2A2520] text-gray-400'
                    }`}>
                      <Icon size={15} />
                    </div>
                    <span className="flex-1 text-left">{item.label}</span>
                    <FiArrowRight size={12} className={`${selectedIndex === idx ? 'text-brand' : 'text-gray-300 dark:text-gray-500'} opacity-0 group-hover:opacity-100`} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Toggle dark mode */}
          <button
            onClick={() => { toggle(); onClose(); }}
            onMouseEnter={() => setSelectedIndex(filteredActions.length + (results.length > 0 ? results.length + 1 : 0))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] transition-all duration-150 ${
              selectedIndex === filteredActions.length + (results.length > 0 ? results.length + 1 : 0)
                ? 'bg-brand-50 dark:bg-brand/10 text-brand font-medium'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2520]'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              selectedIndex === filteredActions.length + (results.length > 0 ? results.length + 1 : 0)
                ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-[#2A2520] text-gray-400'
            }`}>
              {dark ? <FiSun size={15} /> : <FiMoon size={15} />}
            </div>
            <span className="flex-1 text-left">
              {dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            </span>
            <span className="text-[11px] text-gray-300 dark:text-gray-500 bg-gray-50 dark:bg-[#2A2520] px-2 py-0.5 rounded">
              toggle
            </span>
          </button>

          {/* Question Results */}
          {hasResults && (
            <div className="mt-1">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-300 dark:text-gray-500 flex items-center gap-2">
                <FiTrendingUp size={12} />
                Questions
                {searching && <span className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin ml-auto"></span>}
              </div>
              {results.length === 0 && !searching ? (
                <div className="px-3 py-6 text-center text-[14px] text-gray-300 dark:text-gray-500">
                  No questions found for "{query}"
                </div>
              ) : (
                results.map((q, idx) => {
                  const actualIdx = filteredActions.length + idx;
                  return (
                    <button
                      key={q._id}
                      onClick={() => executeQuestion(q._id)}
                      onMouseEnter={() => setSelectedIndex(actualIdx)}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-[14px] text-left transition-all duration-150 ${
                        selectedIndex === actualIdx
                          ? 'bg-brand-50 dark:bg-brand/10 text-brand font-medium'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2A2520]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        selectedIndex === actualIdx ? 'bg-brand text-white' : 'bg-gray-100 dark:bg-[#2A2520] text-gray-400'
                      }`}>
                        <FiHelpCircle size={15} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="line-clamp-1">{q.title}</div>
                        <div className="text-[12px] text-gray-300 dark:text-gray-500 mt-0.5">
                          {(q.upvotes?.length || 0)} votes · {(q.answers?.length || 0)} answers
                        </div>
                      </div>
                      <FiArrowRight size={12} className={`${selectedIndex === actualIdx ? 'text-brand' : 'text-gray-300 dark:text-gray-500'} mt-1 flex-shrink-0`} />
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 dark:border-[#2A2520] flex items-center gap-4 text-[11px] text-gray-300 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] px-1.5 py-0.5 rounded text-[10px] font-mono">↑↓</kbd> Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] px-1.5 py-0.5 rounded text-[10px] font-mono">↵</kbd> Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] px-1.5 py-0.5 rounded text-[10px] font-mono">Esc</kbd> Close
          </span>
          <span className="ml-auto">
            ⌘K to toggle
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
