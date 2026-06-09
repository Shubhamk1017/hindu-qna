import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FiMessageSquare, FiUsers, FiClock, FiPlus,
  FiArrowRight, FiCheckCircle, FiHeart,
  FiZap, FiShare2, FiShield
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: '', label: 'All Categories', icon: '🔮' },
  { value: 'philosophy', label: 'Philosophy', icon: '🧘' },
  { value: 'scripture', label: 'Scripture', icon: '📜' },
  { value: 'practice', label: 'Practice', icon: '🙏' },
  { value: 'social', label: 'Social', icon: '🏛' },
];

const STATUS_COLORS = {
  open: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
  active: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/30',
  voting: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
  closed: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-900/30',
};

const STATUS_LABELS = {
  open: 'Seeking Debaters',
  active: 'In Progress',
  voting: 'Vote Now',
  closed: 'Concluded',
};

const ROUND_LABELS = ['Opening', 'Rebuttal', 'Closing', 'Extended', 'Final'];

function DebateCard({ debate }) {
  const totalVotes = (debate.votes?.sideA?.length || 0) + (debate.votes?.sideB?.length || 0);
  const votesA = debate.votes?.sideA?.length || 0;
  const votesB = debate.votes?.sideB?.length || 0;
  const votePercent = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;

  const statusStripColor = 
    debate.status === 'active' 
      ? 'from-emerald-400 to-teal-500' 
      : debate.status === 'voting' 
        ? 'from-amber-400 to-amber-500' 
        : debate.status === 'open'
          ? 'from-blue-400 to-indigo-500'
          : 'from-gray-300 to-gray-400';

  return (
    <Link
      to={`/debates/${debate._id}`}
      className="group relative block bg-white/80 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200/80 dark:border-gray-850/80 rounded-3xl p-6 transition-all duration-300 hover:border-brand/40 hover:shadow-[0_15px_35px_rgba(224,123,42,0.08)] dark:hover:shadow-[0_15px_35px_rgba(224,123,42,0.15)] hover:-translate-y-1 overflow-hidden"
    >
      <div className={`absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r ${statusStripColor}`} />
      
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${STATUS_COLORS[debate.status]}`}>
              {STATUS_LABELS[debate.status]}
            </span>
            <span className="text-[11px] font-bold text-gray-450 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-850 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-800">
              {debate.category}
            </span>
          </div>
          <h3 className="font-serif text-lg font-extrabold text-gray-900 dark:text-white leading-snug group-hover:text-brand transition-colors duration-200 line-clamp-2">
            {debate.title}
          </h3>
          
          {/* Judge / Madhyastha Badge */}
          {debate.judge ? (
            <div className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-900/30">
              <span>⚖️ Judge: {debate.judge.name}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 mt-3 text-[11px] text-gray-400 dark:text-gray-500 font-bold italic bg-gray-50 dark:bg-gray-850 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800/50">
              <span>⚖️ Seeking Madhyastha</span>
            </div>
          )}
        </div>
        {debate.status === 'voting' && (
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center border border-amber-100 dark:border-amber-900/20 shadow-sm animate-pulse-glow">
            <FiZap size={16} className="text-amber-500" />
          </div>
        )}
      </div>

      {/* Sides Info (Purvapaksha vs Siddhanta) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50/30 dark:bg-blue-950/10 rounded-2xl px-3.5 py-2.5 border border-blue-100/30 dark:border-blue-900/20">
          <p className="text-[9px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest mb-1">Purvapaksha</p>
          <p className="text-[13px] font-extrabold text-gray-800 dark:text-gray-200 line-clamp-1 leading-tight">{debate.sideA?.label}</p>
          <div className="flex items-center gap-1 mt-2">
            <FiUsers size={10} className="text-blue-400" />
            <span className="text-[10px] font-bold text-blue-500">{debate.sideA?.participants?.length || 0} debaters</span>
          </div>
        </div>
        <div className="bg-brand-50/20 dark:bg-brand-950/10 rounded-2xl px-3.5 py-2.5 border border-brand-100/20 dark:border-brand-900/20">
          <p className="text-[9px] font-black text-brand-500 dark:text-brand-400 uppercase tracking-widest mb-1">Siddhantin</p>
          <p className="text-[13px] font-extrabold text-gray-800 dark:text-gray-200 line-clamp-1 leading-tight">{debate.sideB?.label}</p>
          <div className="flex items-center gap-1 mt-2">
            <FiUsers size={10} className="text-brand-500" />
            <span className="text-[10px] font-bold text-brand">{debate.sideB?.participants?.length || 0} debaters</span>
          </div>
        </div>
      </div>

      {/* Vote Bar (For voting or closed states) */}
      {(debate.status === 'voting' || debate.status === 'closed') && totalVotes > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5">
            <span>{votesA} votes</span>
            <span>{votesB} votes</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden flex ring-1 ring-gray-100 dark:ring-gray-800/10">
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-500" style={{ width: `${votePercent}%` }} />
            <div className="bg-gradient-to-l from-brand to-amber-500 transition-all duration-500" style={{ width: `${100 - votePercent}%` }} />
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-850 pt-3.5 mt-2">
        <div className="flex items-center gap-3 text-[12px] text-gray-400 dark:text-gray-500 font-semibold">
          <span className="flex items-center gap-1" title="Arguments">
            <FiMessageSquare size={12} className="text-gray-400" />
            {debate.arguments?.length || 0}
          </span>
          <span className="flex items-center gap-1" title="Spectator Likes">
            <FiHeart size={12} className="text-red-400/80 fill-red-400/10" />
            {debate.likes?.length || 0}
          </span>
          <span className="flex items-center gap-1" title="Shares">
            <FiShare2 size={12} />
            {debate.sharesCount || 0}
          </span>
          {debate.status === 'active' && (
            <span className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 pl-3 text-brand">
              Round {debate.currentRound}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-450 dark:text-gray-500">
          <span>{formatDistanceToNow(new Date(debate.createdAt))} ago</span>
          <FiArrowRight size={13} className="text-gray-300 group-hover:text-brand group-hover:translate-x-1 transition-all duration-300" />
        </div>
      </div>

      {/* Winner Badge (Concluded Debate Scroll Style) */}
      {debate.status === 'closed' && debate.winner && (
        <div className="mt-3.5 pt-3.5 border-t border-gray-100 dark:border-gray-850/80">
          {debate.winner === 'draw' ? (
            <div className="text-[12px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-850 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
              🤝 Nirnaya: Draw / Equally Balanced Arguments
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-green-600 dark:text-green-400 bg-green-500/5 px-3 py-1.5 rounded-lg border border-green-500/10">
              <FiCheckCircle size={14} />
              <span>Winner: {debate.winner === 'sideA' ? debate.sideA?.label : debate.sideB?.label}</span>
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

const Debates = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debates, setDebates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    title: '',
    description: '',
    sideALabel: '',
    sideBLabel: '',
    category: 'philosophy',
    maxRounds: 3,
    joinSide: 'A',
  });

  const fetchDebates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12, sort: sortOrder });
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const res = await api.get(`/debates?${params}`);
      setDebates(res.data.debates || []);
      setTotalPages(res.data.totalPages || 1);
    } catch {
      toast.error('Failed to load debates');
    }
    setLoading(false);
  }, [page, statusFilter, categoryFilter, sortOrder]);

  useEffect(() => {
    fetchDebates();
  }, [fetchDebates]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to create a debate');
      return navigate('/login');
    }
    try {
      await api.post('/debates', form);
      toast.success('Debate created!');
      setShowCreateModal(false);
      setForm({ title: '', description: '', sideALabel: '', sideBLabel: '', category: 'philosophy', maxRounds: 3, joinSide: 'A' });
      fetchDebates();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.msg || err?.response?.data?.message || 'Failed to create debate';
      toast.error(msg);
    }
  };

  return (
    <div className="relative max-w-[1200px] mx-auto py-4">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-10 -z-10 w-96 h-96 bg-brand-200/10 dark:bg-brand-900/5 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute top-40 right-20 -z-10 w-80 h-80 bg-amber-200/10 dark:bg-amber-900/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
        <div>
          <h1 className="font-serif text-[32px] md:text-[38px] font-black text-gray-950 dark:text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50/80 dark:bg-brand/10 border border-brand-100/50 dark:border-brand-900/20 flex items-center justify-center shadow-sm">
              <FiMessageSquare className="text-brand" size={24} />
            </div>
            Shastrartha Arena
          </h1>
          <p className="text-[14px] md:text-[15px] text-gray-550 dark:text-gray-400 mt-1.5 ml-[60px] max-w-2xl leading-relaxed">
            Rigorous philosophical debates on Dharma, Nyaya, scriptural interpretation, and sacred traditions.
          </p>
        </div>
        <button
          onClick={() => user ? setShowCreateModal(true) : navigate('/login')}
          className="flex items-center gap-2 bg-gradient-to-r from-brand to-amber-500 hover:from-brand-500 hover:to-amber-600 text-white px-6 py-3.5 rounded-xl text-[14px] font-bold hover:shadow-lg hover:shadow-brand/20 transition-all duration-300 active:scale-95 sm:self-center self-start"
        >
          <FiPlus size={16} />
          Start a Shastrartha
        </button>
      </div>

      {/* Filters & Categories Box */}
      <div className="bg-white/40 dark:bg-gray-900/20 border border-gray-200/60 dark:border-gray-850/60 rounded-3xl p-5 mb-8 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-gray-450 dark:text-gray-500 mr-2">Status:</span>
            {['', 'open', 'active', 'voting', 'closed'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all duration-200 active:scale-95 ${
                  statusFilter === s
                    ? 'bg-brand/10 text-brand border-brand/30 shadow-sm'
                    : 'bg-white dark:bg-gray-900 text-gray-550 dark:text-gray-450 border-gray-200/70 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-850 hover:border-gray-300'
                }`}
              >
                {s === '' ? 'All States' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="h-px bg-gray-150 dark:bg-gray-850/80" />

          {/* Categories bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-450 dark:text-gray-500 mr-2">Category:</span>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => { setCategoryFilter(c.value); setPage(1); }}
                  className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition-all duration-200 active:scale-95 ${
                    categoryFilter === c.value
                      ? 'bg-brand/10 text-brand border-brand/30 shadow-sm'
                      : 'bg-white dark:bg-gray-900 text-gray-550 dark:text-gray-450 border-gray-200/70 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-850 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1.5 select-none">{c.icon}</span> {c.label}
                </button>
              ))}
            </div>

            {/* Sorting control */}
            <div className="flex items-center gap-2.5 bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800/80 rounded-xl px-4 py-2 shadow-sm self-end sm:self-auto">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
                className="text-[13px] bg-transparent outline-none text-gray-700 dark:text-gray-300 font-bold cursor-pointer"
              >
                <option value="newest">Newest Arena</option>
                <option value="popular">Most Spectators</option>
                <option value="active">Recently Active</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Debates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white/80 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-850 rounded-3xl p-6 animate-pulse">
              <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
              <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-5" />
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="h-16 bg-gray-100/70 dark:bg-gray-850 rounded-2xl" />
                <div className="h-16 bg-gray-100/70 dark:bg-gray-850 rounded-2xl" />
              </div>
              <div className="h-4 w-1/2 bg-gray-100/70 dark:bg-gray-850 rounded mt-3" />
            </div>
          ))}
        </div>
      ) : debates.length === 0 ? (
        <div className="text-center py-20 bg-white/60 dark:bg-gray-900/35 border border-gray-200/80 dark:border-gray-850/80 rounded-3xl backdrop-blur-sm shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/15 flex items-center justify-center border border-brand-100/10 dark:border-brand-900/20">
            <FiMessageSquare size={32} className="text-brand/50" />
          </div>
          <h3 className="font-serif text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">No debates found</h3>
          <p className="text-[15px] text-gray-400 dark:text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
            The Shastrartha Arena is currently empty for these filters. Propose a new topic to invite community debate!
          </p>
          <button
            onClick={() => user ? setShowCreateModal(true) : navigate('/login')}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-brand to-amber-500 text-white px-6 py-3.5 rounded-xl text-[14px] font-bold hover:shadow-lg transition-all active:scale-95"
          >
            <FiPlus size={16} />
            Start a Shastrartha
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {debates.map((debate, i) => (
            <div key={debate._id} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
              <DebateCard debate={debate} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-xl text-[14px] font-bold border transition-all duration-205 active:scale-90 shadow-sm ${
                page === i + 1
                  ? 'bg-brand border-brand text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-500 border-gray-250 dark:border-gray-800 hover:border-brand/40 dark:hover:border-brand/30 hover:bg-gray-50 dark:hover:bg-gray-850'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Create Debate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/75 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white dark:bg-[#1C1814] rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-850 animate-fade-in-scale">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand to-amber-500 rounded-t-3xl" />
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-850">
              <h2 className="font-serif text-[22px] font-black text-gray-900 dark:text-gray-100">Start a Shastrartha</h2>
              <p className="text-[13px] text-gray-450 dark:text-gray-500 mt-1">Propose a debate topic, specifying the opposing stances</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 sm:p-8 space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Topic Statement *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Does Advaita Vedanta hold logic higher than ritual karma?"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all shadow-inner"
                  required
                  minLength={15}
                  maxLength={300}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Context or Rules Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Provide context, references, or background guidelines for this Shastrartha..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all resize-none shadow-inner"
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">Purvapaksha (Stance A) *</label>
                  <input
                    type="text"
                    value={form.sideALabel}
                    onChange={(e) => setForm({ ...form, sideALabel: e.target.value })}
                    placeholder="e.g., Advaita prioritizes logic"
                    className="w-full px-4 py-3 rounded-xl border border-blue-100 bg-blue-50/30 dark:bg-blue-950/15 dark:border-blue-900/30 text-gray-900 dark:text-gray-100 text-[14px] focus:border-blue-400 focus:ring-4 focus:ring-blue-200/20 outline-none transition-all shadow-inner"
                    required
                    minLength={3}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand mb-2">Siddhantin (Stance B) *</label>
                  <input
                    type="text"
                    value={form.sideBLabel}
                    onChange={(e) => setForm({ ...form, sideBLabel: e.target.value })}
                    placeholder="e.g., Ritual karma is essential base"
                    className="w-full px-4 py-3 rounded-xl border border-brand-100 bg-brand-50/10 dark:bg-brand-950/15 dark:border-brand-900/30 text-gray-900 dark:text-gray-100 text-[14px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all shadow-inner"
                    required
                    minLength={3}
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-[14px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none cursor-pointer shadow-sm font-semibold"
                  >
                    {CATEGORIES.filter(c => c.value).map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Exposition Rounds</label>
                  <select
                    value={form.maxRounds}
                    onChange={(e) => setForm({ ...form, maxRounds: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-[14px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none cursor-pointer shadow-sm font-semibold"
                  >
                    <option value={1}>1 Round (Quick)</option>
                    <option value={2}>2 Rounds</option>
                    <option value={3}>3 Rounds (Standard Shastrartha)</option>
                    <option value={5}>5 Rounds (Mahaprasthana)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">Which stance will you defend?</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, joinSide: 'A' })}
                    className={`flex-1 py-3 rounded-xl text-[13px] font-bold border-2 transition-all active:scale-[0.98] ${
                      form.joinSide === 'A'
                        ? 'border-blue-400 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-blue-200 hover:bg-blue-50/10'
                    }`}
                  >
                    Purvapaksha (Side A)
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, joinSide: 'B' })}
                    className={`flex-1 py-3 rounded-xl text-[13px] font-bold border-2 transition-all active:scale-[0.98] ${
                      form.joinSide === 'B'
                        ? 'border-brand bg-brand-50/20 text-brand'
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 hover:border-brand/40 hover:bg-brand-50/5'
                    }`}
                  >
                    Siddhantin (Side B)
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-850">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 active:scale-[0.98] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-brand to-amber-500 text-white hover:from-brand-500 hover:to-amber-600 transition-all shadow-md shadow-brand/10 hover:shadow-lg active:scale-[0.98]"
                >
                  Propose Debate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Debates;
