import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FiCheck, FiX, FiClock, FiShield, FiSearch,
  FiStar, FiChevronRight, FiBookOpen,
  FiTrendingUp, FiExternalLink,
  FiThumbsUp, FiAlertCircle
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ── Animated counter hook ─────────────────────────────────────
function useCountUp(end, duration = 1200) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || end === 0) { setCount(end); return; }
    let startTime = null;
    let raf;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, end, duration]);

  return { count, ref };
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, gradient, delay = 0 }) {
  const { count, ref } = useCountUp(value);
  return (
    <div
      ref={ref}
      className="group relative bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Gradient glow */}
      <div className={`absolute top-0 right-0 w-28 h-28 ${bg} rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color} transition-transform duration-300 group-hover:scale-110 shadow-sm`}>
            <Icon size={20} />
          </div>
          {sub && (
            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#2A2520] px-2.5 py-1 rounded-full border border-gray-100 dark:border-[#3A342E]">
              {sub}
            </span>
          )}
        </div>
        <div className="text-[32px] sm:text-[36px] font-serif font-bold text-gray-900 dark:text-gray-100 leading-none">{count}</div>
        <div className="text-[14px] text-gray-500 dark:text-gray-400 mt-1.5">{label}</div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function AnswerSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full skeleton" />
        <div className="flex-1 space-y-3">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-3 w-2/3" />
          <div className="skeleton h-3 w-1/2" />
          <div className="skeleton h-16 w-full rounded-lg" />
          <div className="flex gap-2">
            <div className="skeleton h-8 w-20 rounded-lg" />
            <div className="skeleton h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Verify Modal ──────────────────────────────────────────────
function VerifyModal({ open, answer, onVerify, onCancel }) {
  const [note, setNote] = useState('');
  const noteRef = useRef(null);

  useEffect(() => {
    if (open && noteRef.current) {
      noteRef.current.focus();
    }
  }, [open]);

  if (!open || !answer) return null;

  const handleVerify = () => {
    onVerify(answer._id, note.trim() || undefined).catch(() => {});
    setNote('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-4 sm:pt-0 px-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-[#1C1814] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1C1814] border-b border-gray-100 dark:border-[#2A2520] px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
              <FiCheck size={18} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-gray-100">Verify Answer</h3>
              <p className="text-[13px] text-gray-400 dark:text-gray-500 mt-0.5">Confirm this answer is accurate and authoritative</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Question */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Question</label>
            <Link
              to={`/questions/${answer.question?._id}`}
              className="block font-semibold text-[15px] text-brand hover:text-brand-600 mt-1.5 transition-colors"
            >
              {answer.question?.title || 'Unknown question'}
            </Link>
          </div>

          {/* Author */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#2A2520] rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0">
              {(answer.author?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-[14px] font-medium text-gray-700 dark:text-gray-300">{answer.author?.name || 'Unknown'}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <FiStar size={10} className="text-amber-400" />
                <span className="text-[12px] text-gray-400 dark:text-gray-500">{answer.author?.reputation || 0} reputation</span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#3A342E]">
              <FiThumbsUp size={11} className="text-brand" />
              <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{answer.voteScore || 0}</span>
            </div>
          </div>

          {/* Answer preview */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Answer</label>
            <div className="mt-1.5 text-[14px] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] p-4 rounded-xl max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {answer.body?.substring(0, 500)}{answer.body?.length > 500 ? '...' : ''}
            </div>
          </div>

          {/* Verification note */}
          <div>
            <label className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center justify-between">
              <span>Verification Note</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal normal-case">{note.length}/200</span>
            </label>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5 mb-2">
              Optional — add context about why this answer is accurate
            </p>
            <textarea
              ref={noteRef}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="e.g. This aligns with the Bhagavad Gita chapter 2, verse 47..."
              className="mt-1.5 w-full border border-gray-200 dark:border-[#3A342E] rounded-xl px-4 py-3 text-[14px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C1814] placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400/40 resize-none transition-all"
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-[#2A2520] bg-gray-50/50 dark:bg-[#1C1814]/50 rounded-b-2xl">
          <button
            onClick={() => { onCancel(); setNote(''); }}
            className="px-4 py-2.5 text-[14px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2520] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleVerify}
            className="px-6 py-2.5 text-[14px] font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:shadow-xl transition-all duration-200 flex items-center gap-2"
          >
            <FiCheck size={14} />
            Verify Answer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── GuruPortal ────────────────────────────────────────────────
const GuruPortal = () => {
  const { user, isGuru } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [verifyModal, setVerifyModal] = useState({ open: false, answer: null });

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const fetchDashboard = useCallback(async () => {
    if (!isGuru()) return;
    setLoading(true);
    try {
      const params = searchDebounce ? `?search=${encodeURIComponent(searchDebounce)}` : '';
      const res = await api.get(`/guru/dashboard${params}`);
      setDashboard(res.data);
    } catch (error) {
      toast.error('Error loading dashboard');
    }
    setLoading(false);
  }, [isGuru, searchDebounce]);

  useEffect(() => {
    if (!isGuru()) return;
    fetchDashboard();
  }, [isGuru, searchDebounce, fetchDashboard]);

  const handleVerify = async (answerId, note) => {
    try {
      await api.post(`/guru/verify/${answerId}`, note ? { note } : {});
      toast.success('Answer verified! 🎉');
      const verifiedAnswer = dashboard.pendingVerifications.find(a => a._id === answerId);
      if (verifiedAnswer) {
        setDashboard(prev => ({
          ...prev,
          pendingVerifications: prev.pendingVerifications.filter(a => a._id !== answerId),
          verifiedByMe: [{ ...verifiedAnswer, isVerifiedByGuru: true, verifiedAt: new Date().toISOString(), verificationNote: note }, ...prev.verifiedByMe],
          stats: {
            ...prev.stats,
            pendingCount: Math.max(0, prev.stats.pendingCount - 1),
            verifiedCount: (prev.stats.verifiedCount || 0) + 1,
            weeklyVerified: (prev.stats.weeklyVerified || 0) + 1,
            reputationImpact: (prev.stats.reputationImpact || 0) + 25,
          }
        }));
      }
      setVerifyModal({ open: false, answer: null });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error verifying answer');
    }
  };

  const handleUnverify = async (answerId) => {
    try {
      await api.post(`/guru/unverify/${answerId}`);
      toast.success('Verification removed');
      setDashboard(prev => {
        const unverified = prev.verifiedByMe.find(a => a._id === answerId);
        return {
          ...prev,
          verifiedByMe: prev.verifiedByMe.filter(a => a._id !== answerId),
          pendingVerifications: unverified
            ? [unverified, ...prev.pendingVerifications]
            : prev.pendingVerifications,
          stats: {
            ...prev.stats,
            verifiedCount: Math.max(0, (prev.stats.verifiedCount || 0) - 1),
            pendingCount: (prev.stats.pendingCount || 0) + 1,
            weeklyVerified: Math.max(0, (prev.stats.weeklyVerified || 0) - 1),
            reputationImpact: Math.max(0, (prev.stats.reputationImpact || 0) - 25),
          }
        };
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error removing verification');
    }
  };

  const getRoleConfig = (role) => {
    const configs = {
      guru: { label: 'Guru', gradient: 'from-amber-500 to-orange-500', icon: '🕉️' },
      acharya: { label: 'Acharya', gradient: 'from-purple-500 to-violet-500', icon: '📿' },
      scholar: { label: 'Scholar', gradient: 'from-blue-500 to-cyan-500', icon: '📚' },
    };
    return configs[role] || configs.guru;
  };

  // ── Access Denied ────────────────────────────
  if (!isGuru()) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center shadow-lg shadow-amber-200/30">
          <FiShield size={36} className="text-amber-500" />
        </div>
        <h1 className="font-serif text-[32px] font-bold text-gray-900 dark:text-gray-100 mb-3">Guru Portal</h1>
        <p className="text-[16px] text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
          This portal is for verified Gurus and Acharyas. You need special privileges to access the answer verification dashboard.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-brand to-brand-500 text-white px-8 py-3 rounded-xl text-[15px] font-medium shadow-lg shadow-brand/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <FiChevronRight size={16} className="rotate-180" />
          Back to Home
        </Link>
      </div>
    );
  }

  const roleConfig = getRoleConfig(user?.role);

  // ── Main Render ──────────────────────────────
  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 animate-fade-in-up">
      {/* ── Hero Section ───────────────────────── */}
      <div className="relative mb-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-brand-50/30 to-transparent dark:from-amber-500/10 dark:via-brand-500/5 dark:to-transparent rounded-2xl" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-amber-400/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-brand-400/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-3xl" />

        <div className="relative px-6 sm:px-10 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200/30">
                <FiShield size={26} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <h1 className="font-serif text-[30px] sm:text-[36px] font-bold text-gray-900 dark:text-gray-100 leading-none">
                    Guru Portal
                  </h1>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-gradient-to-r ${roleConfig.gradient} text-white shadow-sm`}>
                    {roleConfig.icon} {roleConfig.label}
                  </span>
                </div>
                <p className="text-[15px] text-gray-500 dark:text-gray-400 mt-1">
                  Welcome back, <span className="font-semibold text-gray-700 dark:text-gray-300">{user?.name || 'Guru'}</span>. Review and verify answers to maintain quality.
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {dashboard && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
              <StatCard
                icon={FiClock}
                label="Pending Verifications"
                value={dashboard.stats.pendingCount}
                color="bg-amber-50 dark:bg-amber-500/10 text-amber-500"
                bg="bg-amber-400"
                delay={0}
              />
              <StatCard
                icon={FiCheck}
                label="Verified by You"
                value={dashboard.stats.verifiedCount}
                color="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500"
                bg="bg-emerald-400"
                delay={60}
              />
              <StatCard
                icon={FiTrendingUp}
                label="This Week"
                value={dashboard.stats.weeklyVerified}
                sub="verified"
                color="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
                bg="bg-blue-400"
                delay={120}
              />
              <StatCard
                icon={FiStar}
                label="Rep. Impact"
                value={dashboard.stats.reputationImpact}
                sub="points given"
                color="bg-purple-50 dark:bg-purple-500/10 text-purple-500"
                bg="bg-purple-400"
                delay={180}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Loading State ──────────────────────── */}
      {loading && !dashboard ? (
        <div className="space-y-4">
          <div className="skeleton h-12 w-full rounded-xl" />
          {[1, 2, 3].map(i => <AnswerSkeleton key={i} />)}
        </div>
      ) : (
        <>
          {/* ── Tabs & Search ───────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex gap-1 bg-gray-50 dark:bg-[#2A2520] rounded-xl p-1">
              <button
                onClick={() => setActiveTab('pending')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${
                  activeTab === 'pending'
                    ? 'bg-white dark:bg-[#1C1814] text-amber-600 shadow-sm border border-gray-100 dark:border-[#3A342E]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FiClock size={14} />
                Pending
                {dashboard?.stats?.pendingCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'pending' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-gray-100 dark:bg-[#3A342E] text-gray-500'
                  }`}>
                    {dashboard.stats.pendingCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('verified')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${
                  activeTab === 'verified'
                    ? 'bg-white dark:bg-[#1C1814] text-emerald-600 shadow-sm border border-gray-100 dark:border-[#3A342E]'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <FiCheck size={14} />
                Verified
                {dashboard?.stats?.verifiedCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'verified' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-gray-100 dark:bg-[#3A342E] text-gray-500'
                  }`}>
                    {dashboard.stats.verifiedCount}
                  </span>
                )}
              </button>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <FiSearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by question title..."
                className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#2A2520] rounded-xl text-[13px] text-gray-700 dark:text-gray-300 placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 dark:hover:text-gray-400"
                >
                  <FiX size={13} />
                </button>
              )}
            </div>
          </div>

          {/* ── Answer Lists ────────────────────── */}
          {activeTab === 'pending' ? (
            <PendingAnswers
              answers={dashboard?.pendingVerifications || []}
              loading={loading}
              onVerify={(answer) => setVerifyModal({ open: true, answer })}
              searchQuery={searchDebounce}
            />
          ) : (
            <VerifiedAnswers
              answers={dashboard?.verifiedByMe || []}
              loading={loading}
              onUnverify={handleUnverify}
              searchQuery={searchDebounce}
            />
          )}
        </>
      )}

      {/* ── Verify Modal ───────────────────────── */}
      <VerifyModal
        open={verifyModal.open}
        answer={verifyModal.answer}
        onVerify={handleVerify}
        onCancel={() => setVerifyModal({ open: false, answer: null })}
      />
    </div>
  );
};

// ── Pending Answers ───────────────────────────────────────────
function PendingAnswers({ answers, loading, onVerify, searchQuery }) {
  if (loading) {
    return <div className="space-y-4">{ [1, 2].map(i => <AnswerSkeleton key={i} />) }</div>;
  }

  if (answers.length === 0) {
    if (searchQuery) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-[#2A2520] flex items-center justify-center">
            <FiSearch size={24} className="text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="font-serif text-[20px] font-bold text-gray-700 dark:text-gray-300 mb-1">
            No results found
          </h3>
          <p className="text-[14px] text-gray-400 dark:text-gray-500">
            Nothing matches "{searchQuery}" in pending answers.
          </p>
        </div>
      );
    }
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 flex items-center justify-center">
          <FiCheck size={32} className="text-emerald-400" />
        </div>
        <h3 className="font-serif text-[22px] font-bold text-gray-700 dark:text-gray-300 mb-2">
          All caught up!
        </h3>
        <p className="text-[14px] text-gray-400 dark:text-gray-500">
          No pending answers to verify. New answers will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {answers.map((answer, i) => {
        const voteScore = (answer.upvotes?.length || 0) - (answer.downvotes?.length || 0);
        const tags = answer.question?.tags || [];
        return (
          <div
            key={answer._id}
            className="group bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl p-5 sm:p-6 hover:border-amber-200/60 dark:hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-200/10 dark:hover:shadow-black/20 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="flex-1 min-w-0">
                {/* Header: Author + Time */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white dark:ring-[#1C1814]">
                    {(answer.author?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-gray-800 dark:text-gray-200 truncate">
                      {answer.author?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-gray-500">
                      <FiStar size={10} className="text-amber-400" />
                      <span>{answer.author?.reputation || 0} rep</span>
                      <span>·</span>
                      <FiClock size={10} />
                      <span>{formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E]">
                    <FiThumbsUp size={11} className="text-brand" />
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{voteScore}</span>
                  </div>
                </div>

                {/* Question title */}
                <Link
                  to={`/questions/${answer.question?._id}`}
                  className="text-[16px] font-bold text-gray-900 dark:text-gray-100 hover:text-brand dark:hover:text-brand transition-colors line-clamp-1 group/link"
                >
                  {answer.question?.title || 'Unknown question'}
                  <FiExternalLink size={12} className="inline ml-1.5 opacity-0 group-hover/link:opacity-100 transition-opacity text-gray-300 dark:text-gray-500" />
                </Link>

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] px-2 py-0.5 rounded-md"
                      >
                        #{typeof tag === 'object' ? (tag.name || '') : tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Answer preview */}
                <div className="mt-3 text-[13px] text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] p-4 rounded-xl leading-relaxed line-clamp-3">
                  {answer.body?.substring(0, 300)}{answer.body?.length > 300 ? '...' : ''}
                </div>
              </div>

              {/* Action */}
              <div className="flex lg:flex-col items-center lg:justify-center gap-3 shrink-0">
                <button
                  onClick={() => onVerify(answer)}
                  className="flex items-center gap-2 px-6 py-2.5 text-[14px] font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-xl shadow-md shadow-emerald-200/50 dark:shadow-emerald-900/30 hover:shadow-lg transition-all duration-200 w-full justify-center"
                >
                  <FiCheck size={14} />
                  <span className="hidden sm:inline">Verify</span>
                </button>
                <span className="text-[11px] text-gray-300 dark:text-gray-500 hidden lg:block text-center">
                  Click to review
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Verified Answers ──────────────────────────────────────────
function VerifiedAnswers({ answers, loading, onUnverify, searchQuery }) {
  if (loading) {
    return <div className="space-y-4">{ [1, 2].map(i => <AnswerSkeleton key={i} />) }</div>;
  }

  if (answers.length === 0) {
    if (searchQuery) {
      return (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 dark:bg-[#2A2520] flex items-center justify-center">
            <FiSearch size={24} className="text-gray-300 dark:text-gray-500" />
          </div>
          <h3 className="font-serif text-[20px] font-bold text-gray-700 dark:text-gray-300 mb-1">
            No verified results
          </h3>
          <p className="text-[14px] text-gray-400 dark:text-gray-500">
            Nothing matches "{searchQuery}" in your verified answers.
          </p>
        </div>
      );
    }
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 flex items-center justify-center">
          <FiBookOpen size={32} className="text-amber-400" />
        </div>
        <h3 className="font-serif text-[22px] font-bold text-gray-700 dark:text-gray-300 mb-2">
          No verified answers yet
        </h3>
        <p className="text-[14px] text-gray-400 dark:text-gray-500">
          Answers you verify will appear here for tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {answers.map((answer, i) => {
        const voteScore = (answer.upvotes?.length || 0) - (answer.downvotes?.length || 0);
        return (
          <div
            key={answer._id}
            className="group bg-gradient-to-br from-emerald-50/50 to-green-50/30 dark:from-emerald-500/5 dark:to-green-500/5 border border-emerald-100/60 dark:border-emerald-500/15 rounded-2xl p-5 sm:p-6 hover:border-emerald-200/80 dark:hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-200/10 dark:hover:shadow-black/20 transition-all duration-300 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex flex-col lg:flex-row gap-5">
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white dark:ring-[#1C1814]">
                    {(answer.author?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium text-gray-800 dark:text-gray-200 truncate">
                      {answer.author?.name || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2 text-[12px] text-gray-400 dark:text-gray-500">
                      <FiCheck size={10} className="text-emerald-500" />
                      <span>Verified {answer.verifiedAt ? formatDistanceToNow(new Date(answer.verifiedAt), { addSuffix: true }) : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#2A2520] border border-emerald-100 dark:border-emerald-500/20">
                    <FiThumbsUp size={11} className="text-emerald-500" />
                    <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-300">{voteScore}</span>
                  </div>
                </div>

                {/* Question title */}
                <Link
                  to={`/questions/${answer.question?._id}`}
                  className="text-[16px] font-bold text-gray-900 dark:text-gray-100 hover:text-brand dark:hover:text-brand transition-colors line-clamp-1 group/link"
                >
                  {answer.question?.title || 'Unknown question'}
                  <FiExternalLink size={12} className="inline ml-1.5 opacity-0 group-hover/link:opacity-100 transition-opacity text-gray-300 dark:text-gray-500" />
                </Link>

                {/* Verification note */}
                {answer.verificationNote && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-white dark:bg-[#1C1814] border border-emerald-100 dark:border-emerald-500/20 rounded-xl">
                    <FiAlertCircle size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] text-gray-600 dark:text-gray-400 italic leading-relaxed">
                      "{answer.verificationNote}"
                    </p>
                  </div>
                )}

                {/* Answer preview */}
                <div className="mt-3 text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                  {answer.body?.substring(0, 200)}{answer.body?.length > 200 ? '...' : ''}
                </div>
              </div>

              {/* Action */}
              <div className="flex lg:flex-col items-center lg:justify-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    if (window.confirm('Remove verification? The answer will return to the pending queue.')) {
                      onUnverify(answer._id);
                    }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 text-[14px] font-medium text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-xl transition-all duration-200 w-full justify-center border border-red-100 dark:border-red-500/20"
                >
                  <FiX size={14} />
                  <span className="hidden sm:inline">Unverify</span>
                </button>
                <span className="text-[11px] text-emerald-500 hidden lg:block text-center">
                  ✓ Verified
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GuruPortal;
