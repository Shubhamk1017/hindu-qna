import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  FiArrowLeft, FiUsers, FiClock, FiMessageSquare, FiCheckCircle,
  FiSend, FiThumbsUp, FiZap, FiShield, FiAward, FiHeart, FiShare2, FiBookOpen
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const ROUND_LABELS = ['Opening Statements', 'Rebuttals', 'Closing Arguments', 'Extended Round', 'Final Round'];
const STATUS_LABELS = { open: 'Seeking Debaters', active: 'In Progress', voting: 'Vote Now', concluded: 'Concluded' };

const STATUS_COLORS = {
  open: 'bg-blue-50/80 text-blue-600 border-blue-100/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40',
  active: 'bg-green-50/80 text-green-600 border-green-100/60 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/40',
  voting: 'bg-amber-50/80 text-amber-600 border-amber-100/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
  closed: 'bg-gray-50/80 text-gray-500 border-gray-200/60 dark:bg-gray-950/30 dark:text-gray-400 dark:border-gray-900/40',
};

const EMOJI_REACTIONS = [
  { type: 'pranam', emoji: '🙏', label: 'Pranam' },
  { type: 'pramana', emoji: '📜', label: 'Pramana' },
  { type: 'yukti', emoji: '💡', label: 'Yukti' },
  { type: 'sanka', emoji: '❓', label: 'Sanka' }
];

const DebateDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debate, setDebate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [argText, setArgText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const [showVerdictModal, setShowVerdictModal] = useState(false);
  const [verdictForm, setVerdictForm] = useState({
    verdictText: '',
    winner: 'sideA',
    scriptureReferences: ''
  });

  const fetchDebate = async () => {
    try {
      const res = await api.get(`/debates/${id}`);
      setDebate(res.data);
    } catch {
      toast.error('Debate not found');
      navigate('/debates');
    }
    setLoading(false);
  };

  const fetchComments = useCallback(async (silent = false) => {
    if (!silent) setLoadingComments(true);
    try {
      const res = await api.get(`/debates/${id}/comments`);
      setComments(res.data || []);
    } catch {
      console.error('Failed to load comments');
    }
    if (!silent) setLoadingComments(false);
  }, [id]);

  useEffect(() => {
    fetchDebate();
    fetchComments();
  }, [id, fetchComments]);

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto animate-pulse py-6">
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
        <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded mb-8" />
        <div className="grid grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!debate) return null;

  const userId = user?._id || user?.id;
  const onSideA = debate.sideA?.participants?.some(p => (p._id || p) === userId);
  const onSideB = debate.sideB?.participants?.some(p => (p._id || p) === userId);
  const userSide = onSideA ? 'A' : onSideB ? 'B' : null;
  const isParticipant = !!userSide;

  const votesA = debate.votes?.sideA?.length || 0;
  const votesB = debate.votes?.sideB?.length || 0;
  const totalVotes = votesA + votesB;
  const votePercentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;

  const hasVoted = user && (
    debate.votes?.sideA?.some(v => (v._id || v) === userId) ||
    debate.votes?.sideB?.some(v => (v._id || v) === userId)
  );

  const alreadyArguedThisRound = user && debate.arguments?.some(
    a => (a.author?._id || a.author) === userId && a.round === debate.currentRound
  );

  const hasLiked = user && debate.likes?.includes(userId);

  // Group arguments by round
  const rounds = [];
  for (let r = 1; r <= (debate.currentRound || 1); r++) {
    const roundArgs = (debate.arguments || []).filter(a => a.round === r);
    rounds.push({
      number: r,
      label: ROUND_LABELS[r - 1] || `Round ${r}`,
      sideA: roundArgs.filter(a => a.side === 'A'),
      sideB: roundArgs.filter(a => a.side === 'B'),
    });
  }

  const handleJoin = async (side) => {
    if (!user) return navigate('/login');
    try {
      await api.post(`/debates/${id}/join`, { side });
      toast.success(`Joined Side ${side}!`);
      fetchDebate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to join');
    }
  };

  const handleArgue = async (e) => {
    e.preventDefault();
    if (!user || !userSide) return;
    if (argText.trim().length < 50) {
      return toast.error('Your argument must be at least 50 characters');
    }
    setSubmitting(true);
    try {
      await api.post(`/debates/${id}/argue`, { body: argText });
      toast.success('Argument submitted!');
      setArgText('');
      fetchDebate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit argument');
    }
    setSubmitting(false);
  };

  const handleVote = async (side) => {
    if (!user) return navigate('/login');
    try {
      await api.post(`/debates/${id}/vote`, { side });
      toast.success('Vote cast!');
      fetchDebate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to vote');
    }
  };

  const handleLike = async () => {
    if (!user) return navigate('/login');
    try {
      const res = await api.post(`/debates/${id}/like`);
      toast.success(res.data.hasLiked ? 'Added to liked debates' : 'Removed from liked debates');
      fetchDebate();
    } catch {
      toast.error('Failed to update like status');
    }
  };

  const handleShare = async () => {
    try {
      await api.post(`/debates/${id}/share`);
      navigator.clipboard.writeText(window.location.href);
      toast.success('Debate link copied to clipboard!');
      fetchDebate();
    } catch {
      toast.error('Failed to copy debate link');
    }
  };

  const handleApplyJudge = async () => {
    if (!user) return navigate('/login');
    try {
      await api.post(`/debates/${id}/judge/apply`);
      toast.success('You are now the Judge (Madhyastha) of this debate!');
      fetchDebate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply as judge');
    }
  };

  const handleReact = async (argId, reactionType) => {
    if (!user) return navigate('/login');
    try {
      await api.post(`/debates/${id}/arguments/${argId}/react`, { reactionType });
      fetchDebate();
    } catch {
      toast.error('Failed to record reaction');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!commentText.trim()) return;
    try {
      await api.post(`/debates/${id}/comments`, { body: commentText });
      toast.success('Comment posted!');
      setCommentText('');
      fetchComments(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const handleLikeComment = async (commentId) => {
    if (!user) return navigate('/login');
    
    // Optimistic Update to prevent flickering and provide instant feedback
    setComments(prevComments =>
      prevComments.map(c => {
        if (c._id === commentId) {
          const hasLiked = c.upvotes?.includes(userId);
          const newUpvotes = hasLiked
            ? c.upvotes.filter(id => id !== userId)
            : [...(c.upvotes || []), userId];
          return { ...c, upvotes: newUpvotes };
        }
        return c;
      })
    );

    try {
      await api.post(`/debates/${id}/comments/${commentId}/like`);
      fetchComments(true);
    } catch {
      fetchComments(true); // Revert to server truth on error
      toast.error('Failed to like comment');
    }
  };

  const handleVerdictSubmit = async (e) => {
    e.preventDefault();
    try {
      const scriptureRefsArray = verdictForm.scriptureReferences
        .split(',')
        .map(ref => ref.trim())
        .filter(ref => ref.length > 0);

      await api.post(`/debates/${id}/judge/verdict`, {
        verdictText: verdictForm.verdictText,
        winner: verdictForm.winner,
        scriptureReferences: scriptureRefsArray
      });

      toast.success('Verdict submitted! Debate successfully closed.');
      setShowVerdictModal(false);
      fetchDebate();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit verdict');
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto py-8 px-4 sm:px-6 animate-fade-in-up">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/4 -z-10 w-96 h-96 bg-brand-200/15 dark:bg-brand-900/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -z-10 w-80 h-80 bg-amber-200/15 dark:bg-amber-900/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Back link & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          to="/debates"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-brand dark:text-gray-400 dark:hover:text-brand transition-colors group"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" size={16} />
          <span>Back to Arena</span>
        </Link>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-300 shadow-sm active:scale-95 ${
              hasLiked
                ? 'bg-red-50/90 border-red-200 text-red-600 dark:bg-red-950/45 dark:border-red-900/50 dark:text-red-400 scale-[1.03] shadow-red-100/10 dark:shadow-none'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850'
            }`}
          >
            <FiHeart className={hasLiked ? 'fill-red-500 text-red-500' : ''} size={16} />
            <span>{debate.likes?.length || 0}</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-850 transition-all duration-300 shadow-sm active:scale-95"
          >
            <FiShare2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="relative bg-white/80 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200/80 dark:border-gray-850/80 rounded-3xl p-6 sm:p-8 mb-8 shadow-[0_8px_30px_rgb(0,0,0,0.03)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand-300 via-brand-500 to-amber-500 rounded-t-3xl" />
        
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-lg border shadow-sm ${STATUS_COLORS[debate.status] || 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[debate.status] || debate.status}
          </span>
          <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 capitalize bg-gray-50 dark:bg-gray-850/60 px-3 py-1 rounded-lg border border-gray-100 dark:border-gray-800">
            {debate.category}
          </span>
          {debate.status === 'active' && (
            <span className="text-xs font-bold text-brand bg-brand-50/80 dark:bg-brand-950/35 border border-brand-100/50 dark:border-brand-900/30 px-3 py-1.5 rounded-lg flex items-center gap-2 ml-auto shadow-sm shadow-brand-100/10 dark:shadow-none animate-pulse-glow">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              Round {debate.currentRound} of {debate.maxRounds}
            </span>
          )}
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 leading-tight">
          {debate.title}
        </h1>

        {debate.description && (
          <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
            {debate.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-5 text-[13px] text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6.5 h-6.5 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[11px] font-bold border border-brand/20">
              {debate.creator?.name?.charAt(0).toUpperCase()}
            </div>
            <span>Proposed by <span className="font-bold text-gray-900 dark:text-gray-200 hover:text-brand dark:hover:text-brand transition-colors">{debate.creator?.name}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <FiClock className="text-gray-400" size={14} />
            {formatDistanceToNow(new Date(debate.createdAt), { addSuffix: true })}
          </div>
          <div className="flex items-center gap-2">
            <FiMessageSquare className="text-gray-400" size={14} />
            {debate.arguments?.length || 0} arguments
          </div>
        </div>
      </div>
      {/* Judge Banner */}
      {debate.judge ? (
        <div className="relative overflow-hidden bg-amber-50/80 dark:bg-amber-950/10 border border-amber-200/70 dark:border-amber-900/30 rounded-2xl p-5 mb-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="absolute top-0 left-0 h-full w-[4px] bg-amber-500" />
          <div className="flex items-center gap-4 pl-2">
            <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shadow-inner">
              ⚖️
            </div>
            <div>
              <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-0.5">
                Madhyastha (Arbitrator Assigned)
              </h3>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {debate.judge.name} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">• {debate.judge.role}</span>
              </p>
            </div>
          </div>
          {user && debate.judge._id === userId && debate.status !== 'closed' && (
            <button
              onClick={() => {
                setVerdictForm({ verdictText: '', winner: 'sideA', scriptureReferences: '' });
                setShowVerdictModal(true);
              }}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 whitespace-nowrap self-end sm:self-auto"
            >
              <FiAward size={15} />
              Deliver Nirnaya (Verdict)
            </button>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden bg-gray-50/90 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-850 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 flex items-center justify-center text-xl shadow-inner">
              👥
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-0.5">
                Seeking Madhyastha (Judge)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                A qualified Expert, Guru, or Acharya can arbitrate this debate.
              </p>
            </div>
          </div>
          {user && ['guru', 'acharya'].includes(user.role) && !isParticipant && (
            <button
              onClick={handleApplyJudge}
              className="bg-gray-950 text-white dark:bg-white dark:text-gray-900 px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-900 dark:hover:bg-gray-50 shadow-sm transition-all duration-300 active:scale-95 whitespace-nowrap self-end sm:self-auto"
            >
              Apply to Arbitrate
            </button>
          )}
        </div>
      )}

      {/* Pinned Judge Verdict (Nirnaya) Scroll */}
      {debate.status === 'closed' && debate.judgeVerdict && debate.judgeVerdict.verdictText && (
        <div className="relative bg-gradient-to-br from-amber-50/30 via-white to-amber-50/20 dark:from-amber-950/15 dark:via-gray-900/50 dark:to-amber-950/5 border-2 border-amber-400/50 dark:border-amber-500/40 rounded-3xl p-6 sm:p-8 mb-8 shadow-md">
          {/* Scroll design highlights */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 dark:bg-amber-400/5 rounded-bl-full pointer-events-none" />
          <div className="hidden sm:block absolute top-4 right-4 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/40 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider select-none shadow-sm">
            Nirnaya Scroll
          </div>

          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center text-2xl flex-shrink-0 shadow-lg shadow-amber-500/20 select-none">
              📜
            </div>
            <div className="flex-1 sm:pr-16 pr-0">
              <h3 className="font-serif text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
                Scholarly Nirnaya (Verdict)
              </h3>
              <p className="text-[12px] text-gray-400 dark:text-gray-500 mb-5">
                Decreed by <span className="font-bold text-gray-800 dark:text-gray-300">{debate.judge?.name || 'Assigned Judge'}</span> • {new Date(debate.judgeVerdict.decidedAt).toLocaleDateString()}
              </p>
              
              <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed mb-6 font-medium">
                <MarkdownRenderer content={debate.judgeVerdict.verdictText} />
              </div>

              {debate.judgeVerdict.scriptureReferences?.length > 0 && (
                <div className="pt-4 border-t border-gray-150 dark:border-gray-850">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <FiBookOpen size={13} />
                    <span>Cited Pramanas (Scriptures)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {debate.judgeVerdict.scriptureReferences.map((ref, i) => (
                      <span key={i} className="text-xs font-semibold bg-amber-50/80 border border-amber-200/50 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/35 dark:text-amber-300 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                        📖 {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shastrartha Arena (Purvapaksha vs Siddhanta) */}
      <div className="relative bg-gradient-to-br from-blue-50/15 via-white/50 to-brand-50/15 dark:from-blue-950/5 dark:via-gray-900/40 dark:to-brand-950/5 border border-gray-200/80 dark:border-gray-850/80 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
        <div className="text-center mb-6">
          <h2 className="font-serif text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Shastrartha Arena
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Proponent (Purvapaksha) vs Opponent (Siddhantin)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
          {/* Side A: Proponent */}
          <div className={`md:col-span-5 bg-white/90 dark:bg-gray-900/80 rounded-2xl p-5 border transition-all duration-300 ${
            debate.winner === 'sideA' 
              ? 'border-green-500 shadow-md ring-2 ring-green-500/20' 
              : 'border-gray-200/60 dark:border-gray-800'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-bold bg-blue-50/80 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-100/50 dark:border-blue-900/35 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Purvapaksha (Proponent)
              </span>
              {debate.winner === 'sideA' && (
                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                  <FiAward size={12} /> Winner
                </span>
              )}
            </div>
            <h3 className="font-serif text-lg font-extrabold text-gray-900 dark:text-white leading-snug mb-3">
              {debate.sideA?.label}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {(debate.sideA?.participants || []).map(p => (
                <Link key={p._id} to={`/profile/${p._id}`} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-brand/30 dark:hover:border-brand/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                  <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-black">
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                  {p.name}
                </Link>
              ))}
              {debate.status === 'open' && !isParticipant && (debate.sideA?.participants?.length || 0) < debate.maxParticipantsPerSide && (
                <button
                  onClick={() => handleJoin('A')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-305 dark:border-gray-700 text-xs font-bold text-gray-500 hover:text-brand hover:border-brand/40 dark:hover:border-gray-600 transition-colors"
                >
                  <FiUsers size={12} /> Join Purvapaksha
                </button>
              )}
            </div>
          </div>

          {/* VS Divider */}
          <div className="md:col-span-1 flex md:flex-col items-center justify-center gap-2 my-2 md:my-0">
            <div className="h-px w-full md:w-px md:h-12 bg-gray-250 dark:bg-gray-850" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-r from-brand to-amber-500 text-white font-serif font-black flex items-center justify-center shadow-md shadow-brand/20 ring-4 ring-white dark:ring-gray-900 text-xs select-none">
              VS
            </div>
            <div className="h-px w-full md:w-px md:h-12 bg-gray-250 dark:bg-gray-850" />
          </div>

          {/* Side B: Responder */}
          <div className={`md:col-span-5 bg-white/90 dark:bg-gray-900/80 rounded-2xl p-5 border transition-all duration-300 ${
            debate.winner === 'sideB' 
              ? 'border-green-500 shadow-md ring-2 ring-green-500/20' 
              : 'border-gray-200/60 dark:border-gray-800'
          }`}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[10px] font-bold bg-brand-50/80 text-brand dark:bg-brand-950/40 dark:text-brand-300 border border-brand-100/50 dark:border-brand-900/35 px-2.5 py-1 rounded-md uppercase tracking-wider">
                Siddhantin (Responder)
              </span>
              {debate.winner === 'sideB' && (
                <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm">
                  <FiAward size={12} /> Winner
                </span>
              )}
            </div>
            <h3 className="font-serif text-lg font-extrabold text-gray-900 dark:text-white leading-snug mb-3">
              {debate.sideB?.label}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {(debate.sideB?.participants || []).map(p => (
                <Link key={p._id} to={`/profile/${p._id}`} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-850 border border-gray-100 dark:border-gray-800 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-brand/30 dark:hover:border-brand/30 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                  <div className="w-5 h-5 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center text-[10px] font-black">
                    {p.name?.charAt(0).toUpperCase()}
                  </div>
                  {p.name}
                </Link>
              ))}
              {debate.status === 'open' && !isParticipant && (debate.sideB?.participants?.length || 0) < debate.maxParticipantsPerSide && (
                <button
                  onClick={() => handleJoin('B')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-305 dark:border-gray-700 text-xs font-bold text-gray-500 hover:text-brand hover:border-brand/40 dark:hover:border-gray-600 transition-colors"
                >
                  <FiUsers size={12} /> Join Siddhantin
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Community Vote / Status Bar */}
        {(debate.status === 'voting' || debate.status === 'closed') && (
          <div className="mt-8 pt-6 border-t border-gray-150 dark:border-gray-850">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FiUsers className="text-gray-400" size={16} />
                <span>{debate.status === 'voting' ? 'Community Vote Shastrartha' : 'Final Community Tally'}</span>
              </h4>
              <span className="text-[12px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-805 border border-gray-200/40 dark:border-gray-750 px-3 py-1 rounded-full">
                {totalVotes} total votes
              </span>
            </div>

            <div className="mb-4">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-blue-600 dark:text-blue-400">{votePercentA}% Support ({votesA} votes)</span>
                <span className="text-brand dark:text-brand-300">{100 - votePercentA}% Support ({votesB} votes)</span>
              </div>
              <div className="h-4 bg-gray-100 dark:bg-gray-850 rounded-full overflow-hidden flex ring-2 ring-gray-100/50 dark:ring-gray-800/20">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 relative" style={{ width: `${votePercentA}%` }}>
                  {votePercentA > 15 && <span className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-white tracking-wider animate-fade-in-scale">{votePercentA}%</span>}
                </div>
                <div className="bg-gradient-to-l from-brand to-amber-500 transition-all duration-1000 relative flex-1" style={{ width: `${100 - votePercentA}%` }}>
                  {(100 - votePercentA) > 15 && <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-bold text-white tracking-wider animate-fade-in-scale">{100 - votePercentA}%</span>}
                </div>
              </div>
            </div>

            {debate.status === 'voting' && user && !hasVoted && !isParticipant && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <button
                  onClick={() => handleVote('A')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-950/20 transition-all active:scale-[0.98] shadow-sm"
                >
                  Vote Purvapaksha
                </button>
                <button
                  onClick={() => handleVote('B')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-brand-200 text-brand hover:bg-brand-50 dark:border-brand-900/50 dark:text-brand-400 dark:hover:bg-brand-950/20 transition-all active:scale-[0.98] shadow-sm"
                >
                  Vote Siddhantin
                </button>
              </div>
            )}

            {hasVoted && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-green-600 dark:text-green-400 bg-green-50/80 dark:bg-green-950/30 border border-green-100 dark:border-green-900/30 py-2.5 rounded-xl">
                <FiCheckCircle size={14} />
                <span>Your Shastrartha vote has been registered</span>
              </div>
            )}

            {isParticipant && debate.status === 'voting' && (
              <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 text-center">Debaters cannot vote in their own debate.</p>
            )}

            {debate.votingEndsAt && debate.status === 'voting' && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-3 flex items-center justify-center gap-1.5">
                <FiClock size={11} />
                <span>Voting concludes {formatDistanceToNow(new Date(debate.votingEndsAt), { addSuffix: true })}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Arguments Timeline */}
      <div className="space-y-12 mb-12 relative">
        {/* Central connecting vertical line on desktop */}
        <div className="absolute left-1/2 top-4 bottom-4 w-[2px] bg-gray-200/60 dark:bg-gray-800/50 hidden md:block transform -translate-x-1/2" />

        {rounds.map((round) => (
          <div key={round.number} className="relative z-10">
            {/* Round Divider Seal */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-5 py-2 shadow-sm ring-4 ring-gray-100 dark:ring-gray-850/30">
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand to-amber-500 text-white flex items-center justify-center text-xs font-black select-none">
                  {round.number}
                </div>
                <h3 className="font-serif text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">{round.label}</h3>
                {round.number === debate.currentRound && debate.status === 'active' && (
                  <span className="text-[9px] font-black text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/30 px-2 py-0.5 rounded-md uppercase tracking-widest animate-pulse">
                    Active
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
              {/* Side A Arguments (Purvapaksha) */}
              <div className="space-y-6">
                <div className="text-center md:text-right md:pr-4 mb-2">
                  <span className="text-[10px] font-extrabold text-blue-500 uppercase tracking-widest bg-blue-50/40 dark:bg-blue-950/20 px-3 py-1 rounded-full border border-blue-100/30 dark:border-blue-900/20">Purvapaksha Arguments</span>
                </div>
                {round.sideA.length === 0 ? (
                  <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-200/60 dark:border-gray-850/60 rounded-2xl p-6 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {debate.status === 'active' && round.number === debate.currentRound
                        ? 'Awaiting Purvapaksha argument...'
                        : 'No argument submitted'}
                    </p>
                  </div>
                ) : (
                  round.sideA.map((arg) => (
                    <div key={arg._id} className="group bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900/50 transition-all duration-300 card-lift">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-850">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center font-black text-xs border border-blue-100 dark:border-blue-900/30">
                            {arg.author?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {arg.author?.name}
                              </p>
                              {arg.author?.role && ['guru', 'acharya'].includes(arg.author.role) && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider select-none ${
                                  arg.author.role === 'acharya' 
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30 dark:border-amber-900/30' 
                                    : 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200/30 dark:border-orange-900/30'
                                }`}>
                                  {arg.author.role === 'acharya' ? '🕉️ Acharya' : '🧘 Guru'}
                                </span>
                              )}
                              {arg.author?.reputation !== undefined && (
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-850 px-1.5 py-0.5 rounded border border-gray-100/50 dark:border-gray-800/40">
                                  ★ {arg.author.reputation}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDistanceToNow(new Date(arg.createdAt), { addSuffix: true })}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-blue-400 dark:text-blue-500 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-400/10 uppercase tracking-widest">Purvapaksha</span>
                      </div>
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none mb-6 text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        <MarkdownRenderer content={arg.body} />
                      </div>

                      {arg.scriptureRefs?.length > 0 && (
                        <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-850">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <FiBookOpen size={12} className="text-amber-500" /> Cited Pramanas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {arg.scriptureRefs.map((ref, i) => (
                              <span key={i} className="text-[11px] font-semibold bg-amber-50/80 border border-amber-250/40 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm select-none">
                                📖 {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Reactions Pill Panel */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-850 pt-4">
                        {EMOJI_REACTIONS.map((r) => {
                          const reactList = arg.reactions?.[r.type] || [];
                          const hasReacted = user && reactList.includes(userId);
                          const colorMap = {
                            pranam: {
                              active: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40 shadow-sm shadow-orange-100/10',
                              hover: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/20 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 border-transparent hover:border-orange-200/50'
                            },
                            pramana: {
                              active: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40 shadow-sm shadow-teal-100/10',
                              hover: 'hover:bg-teal-50/50 dark:hover:bg-teal-950/20 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 border-transparent hover:border-teal-200/50'
                            },
                            yukti: {
                              active: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 shadow-sm shadow-amber-100/10',
                              hover: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 border-transparent hover:border-amber-200/50'
                            },
                            sanka: {
                              active: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40 shadow-sm shadow-purple-100/10',
                              hover: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 border-transparent hover:border-purple-200/50'
                            }
                          };
                          const classes = colorMap[r.type] || { active: 'bg-gray-100 text-gray-900', hover: 'text-gray-500 hover:bg-gray-50' };

                          return (
                            <button
                              key={r.type}
                              onClick={() => handleReact(arg._id, r.type)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-205 active:scale-90 select-none ${
                                hasReacted ? classes.active : `bg-transparent border-gray-100 dark:border-gray-800/40 ${classes.hover}`
                              }`}
                              title={r.label}
                            >
                              <span>{r.emoji}</span>
                              <span className="hidden sm:inline font-bold">{r.label}</span>
                              {reactList.length > 0 && (
                                <span className="bg-white/90 dark:bg-black/30 border border-gray-200/20 px-1.5 py-0.2 rounded text-[10px] shadow-sm">
                                  {reactList.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Side B Arguments (Siddhantin) */}
              <div className="space-y-6">
                <div className="text-center md:text-left md:pl-4 mb-2">
                  <span className="text-[10px] font-extrabold text-brand uppercase tracking-widest bg-brand-50/40 dark:bg-brand-950/20 px-3 py-1 rounded-full border border-brand-100/30 dark:border-brand-900/20">Siddhantin Arguments</span>
                </div>
                {round.sideB.length === 0 ? (
                  <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-200/60 dark:border-gray-850/60 rounded-2xl p-6 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {debate.status === 'active' && round.number === debate.currentRound
                        ? 'Awaiting Siddhantin argument...'
                        : 'No argument submitted'}
                    </p>
                  </div>
                ) : (
                  round.sideB.map((arg) => (
                    <div key={arg._id} className="group bg-white dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-850 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-900/50 transition-all duration-300 card-lift">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-850">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-400 flex items-center justify-center font-black text-xs border border-brand-100 dark:border-brand-900/30">
                            {arg.author?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {arg.author?.name}
                              </p>
                              {arg.author?.role && ['guru', 'acharya'].includes(arg.author.role) && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 uppercase tracking-wider select-none ${
                                  arg.author.role === 'acharya' 
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/30 dark:border-amber-900/30' 
                                    : 'bg-orange-100 text-orange-850 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200/30 dark:border-orange-900/30'
                                }`}>
                                  {arg.author.role === 'acharya' ? '🕉️ Acharya' : '🧘 Guru'}
                                </span>
                              )}
                              {arg.author?.reputation !== undefined && (
                                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-850 px-1.5 py-0.5 rounded border border-gray-100/50 dark:border-gray-800/40">
                                  ★ {arg.author.reputation}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDistanceToNow(new Date(arg.createdAt), { addSuffix: true })}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-extrabold text-brand bg-brand-500/5 px-2 py-0.5 rounded border border-brand-400/10 uppercase tracking-widest">Siddhantin</span>
                      </div>
                      
                      <div className="prose prose-sm dark:prose-invert max-w-none mb-6 text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        <MarkdownRenderer content={arg.body} />
                      </div>

                      {arg.scriptureRefs?.length > 0 && (
                        <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-850">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <FiBookOpen size={12} className="text-amber-500" /> Cited Pramanas
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {arg.scriptureRefs.map((ref, i) => (
                              <span key={i} className="text-[11px] font-semibold bg-amber-50/80 border border-amber-250/40 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900/30 dark:text-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm select-none">
                                📖 {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Reactions Pill Panel */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-850 pt-4">
                        {EMOJI_REACTIONS.map((r) => {
                          const reactList = arg.reactions?.[r.type] || [];
                          const hasReacted = user && reactList.includes(userId);
                          const colorMap = {
                            pranam: {
                              active: 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40 shadow-sm shadow-orange-100/10',
                              hover: 'hover:bg-orange-50/50 dark:hover:bg-orange-950/20 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 border-transparent hover:border-orange-200/50'
                            },
                            pramana: {
                              active: 'bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/40 shadow-sm shadow-teal-100/10',
                              hover: 'hover:bg-teal-50/50 dark:hover:bg-teal-950/20 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 border-transparent hover:border-teal-200/50'
                            },
                            yukti: {
                              active: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40 shadow-sm shadow-amber-100/10',
                              hover: 'hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 border-transparent hover:border-amber-200/50'
                            },
                            sanka: {
                              active: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/40 shadow-sm shadow-purple-100/10',
                              hover: 'hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 border-transparent hover:border-purple-200/50'
                            }
                          };
                          const classes = colorMap[r.type] || { active: 'bg-gray-100 text-gray-900', hover: 'text-gray-500 hover:bg-gray-50' };

                          return (
                            <button
                              key={r.type}
                              onClick={() => handleReact(arg._id, r.type)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-205 active:scale-90 select-none ${
                                hasReacted ? classes.active : `bg-transparent border-gray-100 dark:border-gray-800/40 ${classes.hover}`
                              }`}
                              title={r.label}
                            >
                              <span>{r.emoji}</span>
                              <span className="hidden sm:inline font-bold">{r.label}</span>
                              {reactList.length > 0 && (
                                <span className="bg-white/90 dark:bg-black/30 border border-gray-200/20 px-1.5 py-0.2 rounded text-[10px] shadow-sm">
                                  {reactList.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submit Argument */}
      {debate.status === 'active' && isParticipant && !alreadyArguedThisRound && (
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md border-l-4 border-l-brand border border-gray-200/80 dark:border-gray-850/80 rounded-3xl p-6 sm:p-8 mb-12 shadow-sm">
          <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-white mb-2">
            Submit Your Argument for Round {debate.currentRound}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
            You are presenting for <span className="font-black text-brand dark:text-brand-300 uppercase">Side {userSide} ({userSide === 'A' ? debate.sideA?.label : debate.sideB?.label})</span>
          </p>
          <form onSubmit={handleArgue}>
            <textarea
              value={argText}
              onChange={(e) => setArgText(e.target.value)}
              placeholder="Present your logical argument. Cite scriptural pramanas where applicable..."
              rows={6}
              className="w-full px-4 py-3 rounded-2xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all resize-none mb-4 shadow-inner"
              minLength={50}
              maxLength={5000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">{argText.length}/5000 chars</span>
              <button
                type="submit"
                disabled={submitting || argText.trim().length < 50}
                className="bg-gradient-to-r from-brand to-amber-500 hover:from-brand-500 hover:to-amber-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-500/10 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-2"
              >
                <FiSend size={14} />
                {submitting ? 'Submitting...' : 'Submit Argument'}
              </button>
            </div>
          </form>
        </div>
      )}

      {debate.status === 'active' && isParticipant && alreadyArguedThisRound && (
        <div className="bg-gray-50/60 dark:bg-gray-900/30 border border-gray-200/80 dark:border-gray-855 rounded-3xl p-6 sm:p-8 mb-12 text-center shadow-sm">
          <FiCheckCircle size={36} className="text-green-500 dark:text-green-400 mx-auto mb-4 animate-bounce" />
          <h3 className="font-serif text-lg font-bold text-gray-900 dark:text-white mb-2">
            Argument Registered
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-550">
            Waiting for the opponent to submit their argument for Round {debate.currentRound}.
          </p>
        </div>
      )}

      {/* Participate CTA */}
      {debate.status === 'open' && !isParticipant && (
        <div className="bg-gradient-to-br from-brand-50/20 via-white/40 to-amber-50/20 dark:from-brand-950/10 dark:via-gray-950/40 dark:to-amber-950/5 border border-brand-100/50 dark:border-brand-900/30 rounded-3xl p-8 sm:p-10 text-center mb-12 shadow-sm">
          <h3 className="font-serif text-2xl font-black text-gray-900 dark:text-white mb-3">
            Participate in this Shastrartha
          </h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto leading-relaxed">
            Enter the debate arena. Defend your chosen stance with logical consistency, rigorous pramanas, and clarity of thought.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => handleJoin('A')}
              className="flex-1 py-3.5 px-6 rounded-xl border border-blue-250 bg-white hover:bg-blue-50 text-blue-700 font-bold dark:bg-gray-900 dark:border-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-950/20 transition-all shadow-sm active:scale-95 hover:-translate-y-0.5"
            >
              Join Purvapaksha — {debate.sideA?.label}
            </button>
            <button
              onClick={() => handleJoin('B')}
              className="flex-1 py-3.5 px-6 rounded-xl border border-brand-200 bg-white hover:bg-brand-50 text-brand font-bold dark:bg-gray-900 dark:border-brand-900/50 dark:text-brand-300 dark:hover:bg-brand-950/20 transition-all shadow-sm active:scale-95 hover:-translate-y-0.5"
            >
              Join Siddhantin — {debate.sideB?.label}
            </button>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="border-t border-gray-200/80 dark:border-gray-850 pt-12 mb-12">
        <h3 className="font-serif text-xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
          <FiMessageSquare size={18} className="text-gray-400" />
          <span>Spectator Discussion ({comments.length})</span>
        </h3>

        {user ? (
          <form onSubmit={handleAddComment} className="mb-10">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your logical thoughts or reflections on this debate..."
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none transition-all resize-none mb-3 shadow-sm"
              maxLength={1000}
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="bg-gray-950 text-white dark:bg-white dark:text-gray-900 px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-900 dark:hover:bg-gray-50 transition-all hover:-translate-y-0.5 active:scale-95 shadow-md shadow-gray-950/10 dark:shadow-none disabled:opacity-50 disabled:transform-none disabled:shadow-none"
              >
                Post Comment
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-gray-50/80 dark:bg-gray-900/30 border border-gray-200/60 dark:border-gray-850 rounded-2xl p-6 text-center mb-10">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Please <Link to="/login" className="text-brand font-bold hover:underline">login</Link> to join the discussion.
            </p>
          </div>
        )}

        {loadingComments ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full" />
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl w-full" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">No comments yet. Start the conversation!</p>
        ) : (
          <div className="space-y-5">
            {comments.map((c) => {
              const hasLikedComment = user && c.upvotes?.includes(userId);
              const isGuruComment = ['guru', 'acharya'].includes(c.author?.role);

              return (
                <div key={c._id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center font-black text-xs border border-brand/20 flex-shrink-0 mt-1 shadow-sm">
                    {c.author?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-2xl p-5 border transition-all duration-300 ${
                      isGuruComment 
                        ? 'bg-amber-500/5 dark:bg-amber-950/15 border-amber-300/40 dark:border-amber-900/40 ring-1 ring-amber-500/5 shadow-sm' 
                        : 'bg-gray-50/90 dark:bg-gray-900/45 border-gray-150 dark:border-gray-850'
                    }`}>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{c.author?.name}</span>
                        {c.author?.role && ['guru', 'acharya'].includes(c.author.role) && (
                          <span className={`text-[8px] font-black tracking-widest px-2 py-0.5 rounded border uppercase select-none ${
                            c.author.role === 'acharya'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-250/30'
                              : 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/30'
                          }`}>
                            {c.author.role}
                          </span>
                        )}
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 ml-auto">
                          {formatDistanceToNow(new Date(c.createdAt))} ago
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                        {c.body}
                      </p>
                    </div>
                    <div className="mt-2 ml-2">
                      <button
                        onClick={() => handleLikeComment(c._id)}
                        className={`flex items-center gap-1 text-[11px] font-bold transition-colors ${
                          hasLikedComment ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                        }`}
                      >
                        <FiHeart className={hasLikedComment ? 'fill-current' : ''} size={13} />
                        <span>{c.upvotes?.length || 0} Likes</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verdict (Nirnaya) Modal */}
      {showVerdictModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/50 dark:bg-black/75 backdrop-blur-sm" onClick={() => setShowVerdictModal(false)} />
          <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 animate-fade-in-scale">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-t-3xl" />
            <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-gray-800">
              <h2 className="font-serif text-2xl font-black text-gray-900 dark:text-white mb-2">
                Deliver Nirnaya (Verdict)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Seal the outcome of the Shastrartha. Provide scriptural references (pramanas) and rigorous logical reasoning.
              </p>
            </div>
            <form onSubmit={handleVerdictSubmit} className="p-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                  Select Winner *
                </label>
                <select
                  value={verdictForm.winner}
                  onChange={(e) => setVerdictForm({ ...verdictForm, winner: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none cursor-pointer font-bold shadow-sm"
                >
                  <option value="sideA">Purvapaksha — {debate.sideA?.label}</option>
                  <option value="sideB">Siddhantin — {debate.sideB?.label}</option>
                  <option value="draw">Draw / Both arguments balanced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                  Verdict Analysis & Scholarly Exposition *
                </label>
                <textarea
                  value={verdictForm.verdictText}
                  onChange={(e) => setVerdictForm({ ...verdictForm, verdictText: e.target.value })}
                  placeholder="Provide your rigorous judgment analysis, evaluating the logic and scriptures cited by both sides..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none resize-none shadow-sm"
                  minLength={10}
                  maxLength={2000}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                  Scripture References (Comma-separated)
                </label>
                <input
                  type="text"
                  value={verdictForm.scriptureReferences}
                  onChange={(e) => setVerdictForm({ ...verdictForm, scriptureReferences: e.target.value })}
                  placeholder="e.g., Rigveda 1.1.1, Bhagavad Gita 2.47, Brahma Sutra 1.1.2"
                  className="w-full px-4 py-3 rounded-xl border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-[15px] focus:border-brand focus:ring-4 focus:ring-brand/10 outline-none shadow-sm"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVerdictModal(false)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold border border-gray-250 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850/80 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/10 hover:shadow-lg transition-all active:scale-[0.98]"
                >
                  Deliver Verdict
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebateDetail;
