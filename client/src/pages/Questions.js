import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import QuestionCard from '../components/QuestionCard';
import TopExperts from '../components/TopExperts';
import RecentActivity from '../components/RecentActivity';
import { FiSearch, FiClock, FiTrendingUp, FiMessageSquare, FiGrid, FiList, FiX, FiFilter, FiArrowUp, FiCheckCircle, FiAlertCircle, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value: 'votes', label: 'Top Voted', icon: FiTrendingUp },
  { value: 'newest', label: 'Newest', icon: FiClock },
  { value: 'unanswered', label: 'Unanswered', icon: FiMessageSquare },
];

const FILTER_TABS = [
  ['all', 'All'],
  ['answered', 'Answered'],
  ['unanswered', 'Unanswered'],
];

const Questions = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [allQuestions, setAllQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'votes');
  const [viewMode, setViewMode] = useState('list');
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const searchTimeoutRef = useRef(null);

  const fetchFavorites = async () => {
    try {
      if (!user?._id) return;
      const res = await api.get(`/users/${user._id}/favorites`);
      const data = res.data || [];
      setFavorites(data.map(f => typeof f === 'string' ? f : f._id));
    } catch {
      setFavorites([]);
    }
  };
  const scrollContainerRef = useRef(null);

  const currentSort = sortBy;

  useEffect(() => {
    fetchQuestions();
    fetchTags();
    if (user) fetchFavorites();
  }, [searchParams, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(searchTimeoutRef.current);
  }, [search]);

  // Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('question-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll-to-top button visibility
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => setShowScrollTop(el.scrollTop > 300);
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/questions?page=${pagination.page}&sort=${currentSort}`);
      setAllQuestions(res.data.questions);
      setPagination({ page: res.data.currentPage, totalPages: res.data.totalPages });
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags((res.data.tags || []).slice(0, 10));
    } catch {
      setTags([]);
    }
  };

  const toggleBookmark = async (questionId) => {
    if (!user) return toast.error('Please login to bookmark');
    try {
      const res = await api.post(`/users/favorites/${questionId}`);
      setFavorites(res.data.favorites || []);
    } catch {
      toast.error('Error updating bookmark');
    }
  };

  const filtered = allQuestions.filter(q => {
    const matchFilter = filter === 'all' ||
      (filter === 'answered' && q.answers?.length > 0) ||
      (filter === 'unanswered' && (!q.answers || q.answers.length === 0));
    const matchSearch = !debouncedSearch ||
      q.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      q.body?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchTag = !selectedTag ||
      q.tags?.some(t => (t.name || t) === selectedTag);
    return matchFilter && matchSearch && matchTag;
  });

  const filterCounts = useMemo(() => ({
    all: allQuestions.length,
    answered: allQuestions.filter(q => q.answers?.length > 0).length,
    unanswered: allQuestions.filter(q => !q.answers || q.answers.length === 0).length,
  }), [allQuestions]);

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    setSearchParams({ sort: newSort, page: 1 });
  };

  const handleTagFilter = (tagName) => {
    setSelectedTag(prev => prev === tagName ? null : tagName);
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const SkeletonCard = () => (
    <div className="bg-white border border-gray-100 rounded-xl p-6 flex gap-6">
      <div className="flex flex-col items-center gap-3 min-w-[44px]">
        <div className="skeleton w-8 h-4" />
        <div className="skeleton w-6 h-3" />
      </div>
      <div className="flex-1 space-y-3">
        <div className="skeleton h-5 w-4/5" />
        <div className="skeleton h-3.5 w-full" />
        <div className="skeleton h-3.5 w-2/3" />
        <div className="flex gap-2 pt-1">
          <div className="skeleton h-5 w-16 rounded-full" />
          <div className="skeleton h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-[calc(100dvh-56px)] flex flex-col">
      {/* Header */}
      <div className="flex items-end justify-between pt-6 sm:pt-10 pb-6 flex-shrink-0 animate-fade-in-up">
        <div>
          <h1 className="font-serif text-[32px] sm:text-[36px] font-bold text-gray-900 tracking-tight leading-none">
            Questions
          </h1>
          <p className="text-[15px] text-gray-400 mt-2 tracking-wide">
            {filtered.length} question{filtered.length !== 1 ? 's' : ''}
            {selectedTag && (
              <span className="inline-flex items-center gap-1 ml-2">
                <span className="text-gray-300">·</span>
                <span className="text-brand font-medium">#{selectedTag}</span>
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="lg:hidden flex items-center gap-2 bg-white border border-gray-200/80 text-gray-500 px-4 py-2.5 rounded-xl text-[15px] hover:bg-gray-50 hover:text-gray-700 transition-all duration-200"
          >
            <FiFilter size={15} />
            Filters
          </button>
          <Link
            to="/questions/ask"
            className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl text-[15px] font-medium hover:bg-brand-600 transition-all duration-200 shadow-[0_1px_2px_rgba(224,123,42,0.3)] hover:shadow-[0_4px_12px_rgba(224,123,42,0.3)] hover:-translate-y-0.5 active:translate-y-0"
          >
            + Ask Question
          </Link>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 lg:gap-10 min-h-0 flex-1">
        {/* Left Column - scrollable */}
        <div
          ref={scrollContainerRef}
          className="min-w-0 overflow-y-auto pr-1 scroll-smooth questions-scroll relative"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Search */}
          <div className={`relative mb-6 transition-all duration-300 ${searchFocused ? 'scale-[1.005]' : ''}`}>
            <FiSearch className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${searchFocused ? 'text-brand' : 'text-gray-300'}`} size={16} />
            <input
              id="question-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search questions..."
              className="w-full pl-11 pr-20 py-3 border border-gray-200/80 rounded-xl bg-white text-[15px] text-gray-800 placeholder:text-gray-350 outline-none search-glow transition-all duration-300"
            />
            {/* Keyboard shortcut hint */}
            {!search && !searchFocused && (
              <kbd className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-300 bg-gray-50 border border-gray-200/80 px-2 py-0.5 rounded font-mono">
                ⌘K
              </kbd>
            )}
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors duration-200"
              >
                <FiX size={15} />
              </button>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6 animate-fade-in-up" style={{ animationDelay: '50ms' }}>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${filter === 'all' ? 'bg-brand-50 border-brand-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`} onClick={() => setFilter('all')}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${filter === 'all' ? 'bg-brand text-white' : 'bg-gray-100 text-gray-400'}`}>
                <FiMessageSquare size={16} />
              </div>
              <div>
                <div className="text-[18px] font-bold text-gray-900 leading-none">{allQuestions.length}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Total</div>
              </div>
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${filter === 'answered' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`} onClick={() => setFilter('answered')}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${filter === 'answered' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <FiCheckCircle size={16} />
              </div>
              <div>
                <div className="text-[18px] font-bold text-gray-900 leading-none">{filterCounts.answered}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Answered</div>
              </div>
            </div>
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer ${filter === 'unanswered' ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`} onClick={() => setFilter('unanswered')}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${filter === 'unanswered' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <FiAlertCircle size={16} />
              </div>
              <div>
                <div className="text-[18px] font-bold text-gray-900 leading-none">{filterCounts.unanswered}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">Unanswered</div>
              </div>
            </div>
          </div>

          {/* Popular Tags - horizontal scroll */}
          <div className="mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 mb-3">
              <FiStar size={14} className="text-brand" />
              <span className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Popular Tags</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {(tags.length > 0 ? tags : ['vedas', 'upanishads', 'bhagavad-gita', 'puranas', 'dharma', 'philosophy', 'vedanta', 'brahman', 'yoga', 'karma']).map((tag, i) => {
                const isSelected = selectedTag === (tag.name || tag);
                const colors = [
                  'from-orange-50 to-amber-50 border-orange-200/60 text-orange-700 hover:border-orange-300',
                  'from-purple-50 to-violet-50 border-purple-200/60 text-purple-700 hover:border-purple-300',
                  'from-blue-50 to-cyan-50 border-blue-200/60 text-blue-700 hover:border-blue-300',
                  'from-emerald-50 to-teal-50 border-emerald-200/60 text-emerald-700 hover:border-emerald-300',
                  'from-rose-50 to-pink-50 border-rose-200/60 text-rose-700 hover:border-rose-300',
                ];
                const colorClass = colors[i % colors.length];
                return (
                  <button
                    key={tag._id || tag.name || tag}
                    onClick={() => handleTagFilter(tag.name || tag)}
                    className={`flex items-center gap-1.5 shrink-0 px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-brand text-white border-brand shadow-sm scale-105'
                        : `bg-gradient-to-br ${colorClass}`
                    }`}
                  >
                    <span className="opacity-60">#</span>{tag.name || tag}
                    {tag.count > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-white/60'}`}>
                        {tag.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort + Filter Bar */}
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 ${showMobileFilters ? '' : 'hidden lg:flex'}`}>
            {/* Sort - animated pill */}
            <div className="flex items-center bg-white border border-gray-200/80 rounded-xl p-0.5 sort-pill">
              {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleSortChange(value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[14px] font-medium transition-all duration-300 ${
                    currentSort === value
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon size={13} className={`transition-transform duration-300 ${currentSort === value ? 'scale-110' : ''}`} />
                  {label}
                </button>
              ))}
            </div>

            {/* Filter Tabs + View Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                {FILTER_TABS.map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFilter(v)}
                    className={`px-3 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-300 ${
                      filter === v
                        ? 'text-gray-900 bg-gray-100/80'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {l}
                    <span className="ml-1 text-[12px] text-gray-300">{filterCounts[v]}</span>
                  </button>
                ))}
              </div>

              <div className="hidden sm:flex items-center border border-gray-200/80 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all duration-300 ${viewMode === 'list' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-300 hover:text-gray-500'}`}
                >
                  <FiList size={14} />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-2 rounded-md transition-all duration-300 ${viewMode === 'compact' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-300 hover:text-gray-500'}`}
                >
                  <FiGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Active Tag Filter */}
          {selectedTag && (
            <div className="flex items-center gap-2.5 mb-5 animate-slide-in">
              <span className="text-[14px] text-gray-400 tracking-wide uppercase">Filter</span>
              <span className="inline-flex items-center gap-1.5 bg-brand/5 text-brand border border-brand/15 px-3.5 py-1.5 rounded-full text-[14px] font-medium">
                #{selectedTag}
                <button onClick={() => setSelectedTag(null)} className="hover:text-brand-700 transition-colors">
                  <FiX size={12} />
                </button>
              </span>
              <button
                onClick={() => setSelectedTag(null)}
                className="text-[13px] text-gray-350 hover:text-gray-500 transition-colors duration-200"
              >
                Clear
              </button>
            </div>
          )}

          {/* Questions List */}
          {loading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-fade-in-scale" style={{ animationDelay: `${i * 80}ms` }}>
                  <SkeletonCard />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-white border border-gray-100 rounded-xl animate-fade-in-up">
              <div className="w-18 h-18 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 flex items-center justify-center">
                <FiSearch size={28} className="text-brand/40" />
              </div>
              <h3 className="font-serif text-[20px] font-semibold text-gray-800 mb-2">
                {debouncedSearch ? 'No results found' : 'No questions yet'}
              </h3>
              <p className="text-[15px] text-gray-400 mb-8 max-w-[320px] mx-auto leading-relaxed">
                {debouncedSearch
                  ? `Nothing matches "${debouncedSearch}". Try a different search term.`
                  : 'Start a conversation — ask the first question.'}
              </p>
              {!debouncedSearch ? (
                <Link
                  to="/questions/ask"
                  className="inline-flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-xl text-[15px] font-medium hover:bg-brand-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                >
                  + Ask a Question
                </Link>
              ) : (
                <button
                  onClick={() => { setSearch(''); setSelectedTag(null); setFilter('all'); }}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 text-gray-500 px-6 py-3 rounded-xl text-[15px] font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <div className={viewMode === 'compact' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'flex flex-col gap-4'}>
              {filtered.map((question, idx) => (
                <div
                  key={question._id}
                  className="animate-fade-in-scale"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <QuestionCard
                    question={question}
                    compact={viewMode === 'compact'}
                    bookmarked={favorites.includes(question._id)}
                    onToggleBookmark={toggleBookmark}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-1.5 mt-12 mb-4">
              <button
                onClick={() => {
                  const p = Math.max(1, pagination.page - 1);
                  setSearchParams({ sort: currentSort, page: p });
                  setPagination(prev => ({ ...prev, page: p }));
                }}
                disabled={pagination.page === 1}
                className="page-btn px-4 py-2 rounded-xl border border-gray-200/80 text-[14px] font-medium text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) pageNum = i + 1;
                else if (pagination.page <= 3) pageNum = i + 1;
                else if (pagination.page >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                else pageNum = pagination.page - 2 + i;
                return (
                  <button
                    key={pageNum}
                    onClick={() => {
                      setSearchParams({ sort: currentSort, page: pageNum });
                      setPagination(prev => ({ ...prev, page: pageNum }));
                    }}
                    className={`page-btn w-9 h-9 rounded-xl text-[14px] font-medium ${
                      pageNum === pagination.page
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'text-gray-400 hover:bg-white hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  const p = Math.min(pagination.totalPages, pagination.page + 1);
                  setSearchParams({ sort: currentSort, page: p });
                  setPagination(prev => ({ ...prev, page: p }));
                }}
                disabled={pagination.page === pagination.totalPages}
                className="page-btn px-4 py-2 rounded-xl border border-gray-200/80 text-[14px] font-medium text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {/* Scroll to top */}
          <button
            onClick={scrollToTop}
            className={`fixed bottom-6 right-6 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:shadow-xl transition-all duration-300 z-10 ${
              showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
          >
            <FiArrowUp size={16} />
          </button>
        </div>

        {/* Right Sidebar - sticky */}
        <div className={`flex flex-col gap-8 lg:sticky lg:top-16 lg:self-start lg:max-h-[calc(100dvh-80px)] lg:overflow-y-auto sidebar-scroll ${showMobileFilters ? '' : 'hidden lg:flex'}`} style={{ scrollbarWidth: 'thin' }}>
          {/* Tags */}
          <div className="bg-white border border-gray-100 rounded-xl p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-[15px] font-semibold text-gray-800 tracking-wide uppercase flex items-center gap-2">
                <FiStar size={14} className="text-brand" />
                Tags
              </span>
              <Link to="/tags" className="text-[13px] text-gray-400 hover:text-brand transition-colors duration-200">
                View all
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {(tags.length > 0 ? tags : ['vedas', 'upanishads', 'bhagavad-gita', 'puranas', 'dharma', 'philosophy', 'vedanta', 'brahman']).map((tag, i) => {
                const isSelected = selectedTag === (tag.name || tag);
                const colors = [
                  'bg-orange-50 text-orange-600 border-orange-100 hover:border-orange-200 hover:bg-orange-100',
                  'bg-purple-50 text-purple-600 border-purple-100 hover:border-purple-200 hover:bg-purple-100',
                  'bg-blue-50 text-blue-600 border-blue-100 hover:border-blue-200 hover:bg-blue-100',
                  'bg-emerald-50 text-emerald-600 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-100',
                  'bg-rose-50 text-rose-600 border-rose-100 hover:border-rose-200 hover:bg-rose-100',
                  'bg-amber-50 text-amber-600 border-amber-100 hover:border-amber-200 hover:bg-amber-100',
                ];
                return (
                  <button
                    key={tag._id || tag.name || tag}
                    onClick={() => handleTagFilter(tag.name || tag)}
                    className={`tag-chip text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-all duration-200 ${
                      isSelected
                        ? 'bg-brand text-white border-brand shadow-sm scale-105'
                        : colors[i % colors.length]
                    }`}
                    style={{ animationDelay: `${150 + i * 30}ms` }}
                  >
                    #{tag.name || tag}
                    {tag.count > 0 && (
                      <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-white/60'}`}>
                        {tag.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <TopExperts />
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Questions;
