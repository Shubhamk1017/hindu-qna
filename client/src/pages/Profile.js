import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FiAward, FiMessageSquare, FiEdit, FiCalendar, FiArrowUp,
  FiStar, FiCheckCircle, FiEye, FiTrendingUp,
  FiShield, FiUser, FiExternalLink
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

// ── Animated counter hook ─────────────────────────────────────
function useCountUp(end, duration = 1600) {
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
function ProfileStat({ icon: Icon, label, value, color, delay = 0 }) {
  const { count, ref } = useCountUp(value);
  return (
    <div
      ref={ref}
      className="group bg-white border border-gray-100 rounded-2xl p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-11 h-11 rounded-xl mx-auto mb-3 flex items-center justify-center ${color} group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={20} />
      </div>
      <div className="text-[32px] font-serif font-bold text-gray-900 leading-none">{count}</div>
      <div className="text-[14px] text-gray-400 mt-1.5">{label}</div>
    </div>
  );
}

// ── Role Badge ────────────────────────────────────────────────
function RoleBadge({ role, size = 'md' }) {
  const styles = {
    admin: 'bg-red-50 text-red-600 border-red-100',
    acharya: 'bg-purple-50 text-purple-600 border-purple-100',
    guru: 'bg-amber-50 text-amber-600 border-amber-100',
    scholar: 'bg-blue-50 text-blue-600 border-blue-100',
    user: 'bg-gray-50 text-gray-500 border-gray-100',
  };
  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-[11px] px-2.5 py-1',
    lg: 'text-[13px] px-3 py-1',
  };
  return (
    <span className={`inline-flex items-center gap-1 font-semibold uppercase tracking-wider rounded-full border ${styles[role] || styles.user} ${sizes[size]}`}>
      {role === 'admin' && <FiShield size={9} />}
      {role}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function UserAvatar({ name, avatar, size = 'xl' }) {
  const sizes = {
    lg: 'w-14 h-14 text-[18px]',
    xl: 'w-20 h-20 text-[28px]',
    '2xl': 'w-28 h-28 text-[40px]',
  };
  const colors = [
    'bg-brand text-white', 'bg-purple-500 text-white', 'bg-blue-500 text-white',
    'bg-emerald-500 text-white', 'bg-amber-500 text-white', 'bg-rose-500 text-white',
  ];
  const colorIndex = (name || 'U').charCodeAt(0) % colors.length;

  if (avatar) {
    return <img src={avatar} alt={name} className={`${sizes[size]} rounded-full object-cover ring-4 ring-white shadow-lg`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-bold ring-4 ring-white shadow-lg ${colors[colorIndex]}`}>
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-10">
      <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-6 animate-pulse">
        <div className="flex items-center gap-6">
          <div className="skeleton w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-32" />
            <div className="flex gap-2 mt-2">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-16 rounded-full" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-100">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="text-center space-y-2">
              <div className="skeleton h-8 w-16 mx-auto" />
              <div className="skeleton h-3 w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Row ──────────────────────────────────────────────
function ActivityRow({ item }) {
  const isQuestion = item.type === 'question';
  const getIcon = () => {
    if (isQuestion) return <FiMessageSquare size={14} />;
    if (item.isAccepted) return <FiCheckCircle size={14} />;
    if (item.isVerifiedByGuru) return <FiStar size={14} />;
    return <FiEdit size={14} />;
  };
  const getStyle = () => {
    if (isQuestion) return 'bg-brand-50 text-brand border-brand-100';
    if (item.isAccepted) return 'bg-emerald-50 text-emerald-500 border-emerald-100';
    if (item.isVerifiedByGuru) return 'bg-purple-50 text-purple-500 border-purple-100';
    if (item.isAIGenerated) return 'bg-sky-50 text-sky-500 border-sky-100';
    return 'bg-brand-50 text-brand border-brand-100';
  };
  const getLabel = () => {
    if (isQuestion) return 'Asked';
    if (item.isAccepted) return 'Accepted';
    if (item.isVerifiedByGuru) return 'Verified';
    if (item.isAIGenerated) return 'AI';
    return 'Answered';
  };

  const link = isQuestion
    ? `/questions/${item._id}`
    : (item.questionId ? `/questions/${item.questionId}` : '#');

  if (!link || link === '#') return null;

  return (
    <Link
      to={link}
      className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200 group"
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${getStyle()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[11px] font-semibold uppercase tracking-wider ${getStyle().split(' ').slice(1, 2).join(' ')}`}>
            {getLabel()}
          </span>
          <span className="text-[10px] text-gray-300">·</span>
          <span className="text-[12px] text-gray-400">
            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          </span>
        </div>
        <p className="text-[15px] font-medium text-gray-800 group-hover:text-brand transition-colors line-clamp-1">
          {isQuestion ? item.title : item.questionTitle}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          {item.voteScore > 0 && (
            <span className="text-[12px] text-gray-400 flex items-center gap-0.5">
              <FiArrowUp size={10} /> {item.voteScore}
            </span>
          )}
          {isQuestion && item.answerCount != null && (
            <span className="text-[12px] text-gray-400">{item.answerCount} answers</span>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="flex gap-1">
              {item.tags.slice(0, 2).map(t => (
                <span key={t._id || t.name} className="text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  {t.name || t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Tab Config ────────────────────────────────────────────────
const TABS = [
  { id: 'activity', label: 'Activity', icon: FiTrendingUp },
  { id: 'questions', label: 'Questions', icon: FiMessageSquare },
  { id: 'answers', label: 'Answers', icon: FiEdit },
  { id: 'badges', label: 'Badges', icon: FiAward },
];

// ── Profile ───────────────────────────────────────────────────
const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');

  useEffect(() => {
    fetchProfile();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/users/${id}`);
      setProfile(res.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  if (loading) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gray-100 flex items-center justify-center">
          <FiUser size={28} className="text-gray-300" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-gray-900 mb-2">User Not Found</h1>
        <p className="text-gray-500 text-[16px]">This user doesn't exist or has been removed.</p>
      </div>
    );
  }

  const stats = profile.stats || {};
  const isOwnProfile = currentUser?._id === id;
  const questions = profile.questions || [];
  const answers = profile.answers || [];
  const recentActivity = profile.recentActivity || [];
  const badges = profile.badges || [];

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'gold': return 'bg-amber-50 text-amber-600 border-amber-200 shadow-amber-100';
      case 'silver': return 'bg-gray-50 text-gray-600 border-gray-200 shadow-gray-100';
      case 'special': return 'bg-purple-50 text-purple-600 border-purple-200 shadow-purple-100';
      default: return 'bg-orange-50 text-orange-600 border-orange-200 shadow-orange-100';
    }
  };

  const getBadgeIcon = (type) => {
    switch (type) {
      case 'gold': return '🏆';
      case 'silver': return '🥈';
      case 'special': return '⭐';
      default: return '🎖️';
    }
  };

  return (
    <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* ── Profile Header ─────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden mb-8 animate-fade-in-up">
        {/* Cover gradient */}
        <div className="h-32 sm:h-40 relative" style={{ background: 'linear-gradient(135deg, #FFFBF5 0%, #FDF0E0 40%, #F5ECD8 100%)' }}>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E07B2A\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand/[0.03] select-none pointer-events-none" style={{ fontSize: '200px', lineHeight: 1 }}>ॐ</div>
        </div>

        {/* Profile info */}
        <div className="relative px-6 sm:px-8 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 -mt-10 sm:-mt-12">
            <UserAvatar name={profile.name} avatar={profile.avatar} size="2xl" />
            <div className="flex-1 sm:pb-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-serif text-[32px] sm:text-[36px] font-bold text-gray-900 leading-none">
                  {profile.name}
                </h1>
                <RoleBadge role={profile.role} size="lg" />
              </div>
              <div className="flex items-center gap-4 mt-2 text-[14px] text-gray-400">
                <span className="flex items-center gap-1">
                  <FiCalendar size={12} />
                  Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                {isOwnProfile && (
                  <Link to="/settings" className="flex items-center gap-1 text-brand hover:text-brand-600 transition-colors">
                    <FiEdit size={11} /> Edit profile
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-8">
            <ProfileStat icon={FiMessageSquare} label="Questions" value={stats.totalQuestions || 0} color="bg-brand-50 text-brand" delay={0} />
            <ProfileStat icon={FiEdit} label="Answers" value={stats.totalAnswers || 0} color="bg-purple-50 text-purple-600" delay={60} />
            <ProfileStat icon={FiStar} label="Upvotes" value={stats.totalUpvotes || 0} color="bg-amber-50 text-amber-600" delay={120} />
            <ProfileStat icon={FiShield} label="Verified" value={stats.verifiedAnswers || 0} color="bg-amber-50 text-amber-600" delay={140} />
            <ProfileStat icon={FiAward} label="Badges" value={stats.totalBadges || 0} color="bg-emerald-50 text-emerald-600" delay={180} />
          </div>
        </div>
      </div>

      {/* ── Secondary Stats ────────────────────────── */}
      {(stats.acceptedAnswers > 0 || stats.verifiedAnswers > 0 || stats.totalViews > 0) && (
        <div className="grid grid-cols-3 gap-3 mb-8 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          {stats.acceptedAnswers > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <FiCheckCircle size={16} className="text-emerald-500" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Accepted</div>
                <div className="text-[18px] font-bold text-gray-800">{stats.acceptedAnswers}</div>
              </div>
            </div>
          )}
          {stats.verifiedAnswers > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <FiShield size={16} className="text-purple-500" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Verified</div>
                <div className="text-[18px] font-bold text-gray-800">{stats.verifiedAnswers}</div>
              </div>
            </div>
          )}
          {stats.totalViews > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FiEye size={16} className="text-blue-500" />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Views</div>
                <div className="text-[18px] font-bold text-gray-800">{stats.totalViews.toLocaleString()}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="border-b border-gray-100 px-3 pt-3 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = tab.id === 'questions' ? questions.length
              : tab.id === 'answers' ? answers.length
              : tab.id === 'badges' ? badges.length
              : recentActivity.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-[15px] font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap ${
                  isActive ? 'text-brand bg-brand-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`ml-0.5 text-[12px] font-medium px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-gray-400'
                }`}>
                  {count}
                </span>
                {isActive && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand rounded-full" />}
              </button>
            );
          })}
        </div>

        <div className="p-6 sm:p-8">
          {/* ── Activity Tab ────────────────────────── */}
          {activeTab === 'activity' && (
            <div>
              {recentActivity.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
                    <FiTrendingUp size={22} className="text-gray-300" />
                  </div>
                  <p className="text-[16px] font-medium text-gray-700">No activity yet</p>
                  <p className="text-[14px] text-gray-400 mt-1">Questions and answers will appear here</p>
                  <Link to="/questions" className="inline-flex items-center gap-2 mt-4 text-[14px] font-medium text-brand hover:text-brand-600 transition-colors">
                    Ask a question <FiExternalLink size={12} />
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((item, i) => (
                    <div key={`${item.type}-${item._id}-${i}`} className="animate-fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                      <ActivityRow item={item} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Questions Tab ───────────────────────── */}
          {activeTab === 'questions' && (
            <div>
              {questions.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-50 flex items-center justify-center">
                    <FiMessageSquare size={22} className="text-brand/40" />
                  </div>
                  <p className="text-[16px] font-medium text-gray-700">No questions asked yet</p>
                  <p className="text-[14px] text-gray-400 mt-1">Questions will appear here once asked</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div
                      key={q._id}
                      className="flex gap-5 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* Vote/Answer counts */}
                      <div className="flex flex-col items-center gap-1 min-w-[52px]">
                        <div className={`text-[18px] font-bold ${q.upvotes?.length > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {q.upvotes?.length || 0}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">votes</div>
                        <div className={`text-[18px] font-bold mt-1 ${q.answers?.length > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {q.answers?.length || 0}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">ans</div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <Link to={`/questions/${q._id}`} className="text-[17px] font-semibold text-gray-800 hover:text-brand transition-colors line-clamp-2 leading-snug">
                          {q.title}
                        </Link>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {q.tags?.map(tag => (
                            <span key={tag._id} className="text-[12px] font-medium bg-brand-50 text-brand px-2 py-0.5 rounded-md border border-brand-100/50">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                        <div className="text-[13px] text-gray-400 mt-2.5">
                          Asked {formatDistanceToNow(new Date(q.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Answers Tab ─────────────────────────── */}
          {activeTab === 'answers' && (
            <div>
              {answers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center">
                    <FiEdit size={22} className="text-purple-400" />
                  </div>
                  <p className="text-[16px] font-medium text-gray-700">No answers given yet</p>
                  <p className="text-[14px] text-gray-400 mt-1">Answers will appear here once provided</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {answers.map((a, i) => (
                    <div
                      key={a._id}
                      className="flex gap-5 p-5 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* Vote count */}
                      <div className="flex flex-col items-center gap-1 min-w-[52px]">
                        <div className={`text-[18px] font-bold ${a.upvotes?.length > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {a.upvotes?.length || 0}
                        </div>
                        <div className="text-[10px] text-gray-400 uppercase">votes</div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {a.isAccepted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                              <FiCheckCircle size={9} /> Accepted
                            </span>
                          )}
                          {a.isVerifiedByGuru && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                              <FiShield size={9} /> Guru Verified
                            </span>
                          )}
                          {a.isAIGenerated && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                              🤖 AI
                            </span>
                          )}
                        </div>
                        <Link to={`/questions/${a.question?._id}`} className="text-[17px] font-semibold text-gray-800 hover:text-brand transition-colors line-clamp-1">
                          {a.question?.title || 'Question'}
                        </Link>
                        <p className="text-[14px] text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {a.body?.substring(0, 200)}{a.body?.length > 200 ? '...' : ''}
                        </p>
                        <div className="text-[13px] text-gray-400 mt-2.5">
                          Answered {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Badges Tab ──────────────────────────── */}
          {activeTab === 'badges' && (
            <div>
              {badges.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                    <FiAward size={22} className="text-amber-400" />
                  </div>
                  <p className="text-[16px] font-medium text-gray-700">No badges yet</p>
                  <p className="text-[14px] text-gray-400 mt-1">Earn badges by contributing to the community</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {badges.map((badge, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-4 p-5 rounded-xl border transition-all duration-200 hover:shadow-md animate-fade-in-up ${getBadgeStyle(badge.type)}`}
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <span className="text-3xl">{getBadgeIcon(badge.type)}</span>
                      <div>
                        <div className="text-[16px] font-semibold">{badge.name}</div>
                        <div className="text-[13px] opacity-60 mt-0.5 capitalize">{badge.type} badge</div>
                        {badge.awardedAt && (
                          <div className="text-[12px] opacity-50 mt-0.5">
                            Awarded {formatDistanceToNow(new Date(badge.awardedAt), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
