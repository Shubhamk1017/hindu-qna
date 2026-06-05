import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  FiUsers, FiSearch, FiAward, FiMessageSquare,
  FiStar, FiClock, FiChevronDown, FiSliders,
  FiFilter, FiX
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const GURU_CONFIG = {
  gradient: 'from-amber-500 to-orange-500',
  bg: 'bg-amber-50 dark:bg-amber-500/10',
  text: 'text-amber-600 dark:text-amber-400',
  border: 'border-amber-200 dark:border-amber-500/20',
  icon: '🕉️',
};

// ── Avatar ────────────────────────────────────────────────────
function ExpertAvatar({ name, avatar, size = 'lg' }) {
  const sizes = {
    sm: 'w-10 h-10 text-[14px]',
    md: 'w-14 h-14 text-[18px]',
    lg: 'w-20 h-20 text-[26px]',
  };
  const config = GURU_CONFIG;

  if (avatar) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden ring-2 ring-white dark:ring-[#1C1814] shadow-lg flex-shrink-0`}>
        <img src={avatar} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }

  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center font-bold text-white shadow-lg flex-shrink-0 ring-2 ring-white dark:ring-[#1C1814]`}>
      {initials}
    </div>
  );
}

// ── Guru Badge ────────────────────────────────────────────────
function GuruBadge() {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border ${GURU_CONFIG.bg} ${GURU_CONFIG.text} ${GURU_CONFIG.border}`}>
      {GURU_CONFIG.icon} Guru
    </span>
  );
}

function ExpertSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full skeleton" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
          <div className="flex gap-4 mt-2">
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-16" />
            <div className="skeleton h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Users / Experts Page ──────────────────────────────────────
const Users = () => {
  const [experts, setExperts] = useState([]);
  const [allExperts, setAllExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('all');
  const [sortBy, setSortBy] = useState('reputation');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchExperts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all expert roles in parallel
      const guruRes = await api.get('/users?role=guru&limit=50');
      setAllExperts(guruRes.data.users || []);
    } catch (error) {
      console.error('Error fetching experts:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchExperts(); }, [fetchExperts]);

  // Filter + sort locally
  useEffect(() => {
    let filtered = [...allExperts];

    // Role filter
    if (activeRole !== 'all') {
      filtered = filtered.filter(u => u.role === activeRole);
    }

    // Search filter
    if (searchDebounce.trim()) {
      const q = searchDebounce.toLowerCase();
      filtered = filtered.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.bio?.toLowerCase().includes(q) ||
        u.expertise?.some(e => e.toLowerCase().includes(q))
      );
    }

    // Sort
    switch (sortBy) {
      case 'reputation':
        filtered.sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        break;
      case 'answers':
        filtered.sort((a, b) => (b.answerCount || 0) - (a.answerCount || 0));
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'name':
        filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      default:
        break;
    }

    setExperts(filtered);
  }, [allExperts, activeRole, sortBy, searchDebounce]);

  const roleTabs = [
    { id: 'all', label: 'All Gurus', icon: FiUsers },
    { id: 'guru', label: 'Top Gurus', icon: FiAward },
  ];

  const sortOptions = [
    { value: 'reputation', label: 'Reputation' },
    { value: 'answers', label: 'Most Answers' },
    { value: 'newest', label: 'Newest' },
    { value: 'name', label: 'Name A-Z' },
  ];

  const roleCounts = {
    all: allExperts.length,
    guru: allExperts.filter(u => u.role === 'guru').length,
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="space-y-6">
          <div className="skeleton h-12 w-64" />
          <div className="skeleton h-6 w-96" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {[1, 2, 3, 4].map(i => <ExpertSkeleton key={i} />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 animate-fade-in-up">
      {/* ── Hero Section ───────────────────────── */}
      <div className="relative mb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50/50 via-amber-50/30 to-transparent dark:from-brand/5 dark:via-amber-500/5 dark:to-transparent rounded-2xl" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative px-6 sm:px-10 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-500 flex items-center justify-center shadow-lg shadow-brand/20">
                  <FiUsers size={22} className="text-white" />
                </div>
                <div>
                  <h1 className="font-serif text-[32px] sm:text-[36px] font-bold text-gray-900 dark:text-gray-100 leading-none">
                    Our Experts
                  </h1>
                  <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1.5">
                    {allExperts.length} verified gurus
                  </p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <FiSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search experts by name or expertise..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#2A2520] rounded-xl text-[14px] text-gray-700 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap gap-6 sm:gap-10 mt-8">
            <div>
              <span className="text-[28px] font-serif font-bold text-gray-900 dark:text-gray-100">{roleCounts.all}</span>
              <span className="text-[13px] text-gray-500 dark:text-gray-400 ml-2">Total</span>
            </div>
            <div>
              <span className="text-[28px] font-serif font-bold text-amber-600">{roleCounts.guru}</span>
              <span className="text-[13px] text-gray-500 dark:text-gray-400 ml-2">Gurus</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Sort ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Role tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {roleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeRole === tab.id;
            const config = tab.id === 'guru' ? GURU_CONFIG : null;
            const accentColor = isActive && config ? config.text : isActive ? 'text-brand' : 'text-gray-400';
            const bgColor = isActive && config ? config.bg : isActive ? 'bg-brand-50 dark:bg-brand/10' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2A2520]';
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRole(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? `${bgColor} ${accentColor} border ${config?.border || 'border-brand-100 dark:border-brand/20'}`
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2A2520] border border-transparent'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/80 dark:bg-[#2A2520]' : 'bg-gray-100 dark:bg-[#2A2520] text-gray-400'
                }`}>
                  {roleCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <FiSliders size={14} className="text-gray-400 hidden sm:block" />
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#2A2520] rounded-xl text-[13px] text-gray-600 dark:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer transition-all"
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <FiChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-[#2A2520] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2A2520]"
          >
            <FiFilter size={14} />
          </button>
        </div>
      </div>

      {/* ── Mobile filter panel ────────────────── */}
      {showMobileFilters && (
        <div className="sm:hidden mb-4 p-4 bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-xl animate-fade-in-up">
          <div className="flex flex-wrap gap-2">
            {roleTabs.map(tab => {
              const isActive = activeRole === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveRole(tab.id); setShowMobileFilters(false); }}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
                    isActive ? 'bg-brand text-white' : 'bg-gray-50 dark:bg-[#2A2520] text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {tab.label} ({roleCounts[tab.id]})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expert Grid ────────────────────────── */}
      {experts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gray-50 dark:bg-[#2A2520] flex items-center justify-center">
            <FiUsers size={32} className="text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="font-serif text-[20px] font-bold text-gray-700 dark:text-gray-300 mb-2">
            {searchQuery ? 'No experts found' : 'No experts yet'}
          </h3>
          <p className="text-[14px] text-gray-400 dark:text-gray-500">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different search term.`
              : 'Verified experts will appear here once they are approved.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {experts.map((user, i) => (
            <ExpertCard key={user._id} user={user} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Expert Card ───────────────────────────────────────────────
function ExpertCard({ user, index }) {
  const config = GURU_CONFIG;
  const joinDate = user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true }) : '';
  const rankColors = ['text-amber-500', 'text-gray-400', 'text-amber-700'];
  const topRank = index < 3;

  return (
    <Link
      to={`/profile/${user._id}`}
      className="group relative bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl p-6 hover:border-brand/20 dark:hover:border-brand/20 hover:shadow-xl hover:shadow-brand/5 dark:hover:shadow-black/20 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top rank indicator */}
      {topRank && (
        <div className={`absolute top-0 right-0 w-16 h-16 ${config.bg} opacity-30 rounded-bl-2xl`} />
      )}

      <div className="relative">
        {/* Header: Avatar + Role */}
        <div className="flex items-start justify-between mb-4">
          <ExpertAvatar name={user.name} avatar={user.avatar} />
          {topRank && (
            <span className={`text-[18px] font-serif font-bold ${rankColors[index]} opacity-50`}>
              #{index + 1}
            </span>
          )}
        </div>

        {/* Name + Role */}
        <div className="mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-[18px] font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand transition-colors">
              {user.name}
            </h3>
            <GuruBadge />
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2 mb-4">
            {user.bio}
          </p>
        )}

        {/* Expertise tags */}
        {user.expertise && user.expertise.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {user.expertise.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-full border ${config.bg} ${config.text} ${config.border}`}
              >
                {tag}
              </span>
            ))}
            {user.expertise.length > 3 && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 px-2 py-1">
                +{user.expertise.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-gray-50 dark:border-[#2A2520]">
          <div className="flex items-center gap-1.5">
            <FiMessageSquare size={13} className="text-gray-300 dark:text-gray-500" />
            <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{user.answerCount || 0}</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">answers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FiStar size={13} className={`${topRank ? 'text-amber-400' : 'text-gray-300 dark:text-gray-500'}`} />
            <span className="text-[14px] font-semibold text-gray-800 dark:text-gray-200">{user.reputation || 0}</span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">rep</span>
          </div>
          {joinDate && (
            <div className="flex items-center gap-1.5">
              <FiClock size={13} className="text-gray-300 dark:text-gray-500" />
              <span className="text-[11px] text-gray-400 dark:text-gray-500">Joined {joinDate}</span>
            </div>
          )}
        </div>

        {/* Hover indicator */}
        <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${config.gradient} rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
      </div>
    </Link>
  );
}

export default Users;
