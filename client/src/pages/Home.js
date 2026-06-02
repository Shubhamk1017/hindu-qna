import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import QuestionCard from '../components/QuestionCard';
import TopExperts from '../components/TopExperts';
import RecentActivity from '../components/RecentActivity';
import { FiTrendingUp, FiArrowRight, FiBook, FiMessageSquare, FiUsers, FiHelpCircle, FiCheckCircle, FiSearch, FiSend, FiStar, FiMessageCircle, FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

const SCRIPTURES = [
  { code: 'BG', name: 'Bhagavad Gita', desc: 'The song of God — Krishna\'s guidance to Arjuna on dharma, karma, and yoga.', color: 'bg-orange-50 text-orange-700 border-orange-200', link: '/questions?tag=bhagavad-gita' },
  { code: 'SB', name: 'Srimad Bhagavatam', desc: 'The essence of all Puranas — stories of Vishnu and his divine pastimes.', color: 'bg-blue-50 text-blue-700 border-blue-200', link: '/questions?tag=srimad-bhagavatam' },
  { code: 'VN', name: 'Vedanta', desc: 'The philosophical end of the Vedas — exploring Brahman, Atman, and reality.', color: 'bg-purple-50 text-purple-700 border-purple-200', link: '/questions?tag=vedanta' },
  { code: 'DH', name: 'Dharma', desc: 'Duty, righteousness, and the moral law that sustains the universe.', color: 'bg-green-50 text-green-700 border-green-200', link: '/questions?tag=dharma' },
];

const EXPLORE_TEXTS = [
  { name: 'Bhagavad Gita', icon: '📖', desc: '18 chapters of Krishna\'s wisdom on duty, devotion, and liberation.', link: '/questions?tag=bhagavad-gita', color: 'from-orange-500/10 to-amber-500/10', border: 'border-orange-200/60' },
  { name: 'Upanishads', icon: '🕉', desc: 'The philosophical core of the Vedas — dialogues on Brahman and Atman.', link: '/questions?tag=vedanta', color: 'from-purple-500/10 to-violet-500/10', border: 'border-purple-200/60' },
  { name: 'Vedas', icon: '📜', desc: 'The oldest sacred hymns — Rig, Yajur, Sama, and Atharva.', link: '/questions?tag=vedas', color: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-200/60' },
  { name: 'Puranas', icon: '🏛', desc: '18 great texts of mythology, cosmology, and devotion.', link: '/questions?tag=puranas', color: 'from-emerald-500/10 to-teal-500/10', border: 'border-emerald-200/60' },
];

const HOW_IT_WORKS = [
  { icon: FiHelpCircle, title: 'Ask', desc: 'Post your question about Hindu scripture, philosophy, or practice.' },
  { icon: FiSearch, title: 'AI Guides', desc: 'Our AI assistant helps you explore vedabase.io scriptures instantly.' },
  { icon: FiUsers, title: 'Experts Answer', desc: 'Verified pandits and scholars provide authoritative, cited answers.' },
  { icon: FiCheckCircle, title: 'Verified', desc: 'Answers are reviewed and verified for scriptural accuracy.' },
];

const SHLOKA_LIST = [
  {
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥ ४७ ॥',
    translation: 'You have the right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Neither consider yourself the cause of the results, nor attachment to inaction.',
    reference: 'Bhagavad Gita 2.47',
  },
  {
    sanskrit: 'अर्जुन उवाच\nअपरं भवतो जन्म परं जन्म विवस्वतः ।\nकथमेतद्विजानीयां त्वमादौ प्रोक्तवानिति ॥ ४ ॥',
    translation: 'Arjuna said: You were born later, yet You were born before. How can I understand this — that You spoke this in the beginning?',
    reference: 'Bhagavad Gita 7.26',
  },
  {
    sanskrit: 'नैनं छिन्दन्ति शस्त्राणि नैनं दहति पावकः ।\nन चैनं क्लेदयन्त्यापो न शोषयति मारुतः ॥ २३ ॥',
    translation: 'The soul cannot be pierced by any weapon, nor burned by fire, nor moistened by water, nor dried by the wind.',
    reference: 'Bhagavad Gita 2.23',
  },
  {
    sanskrit: 'यदा भूतपृथग्भावमेकस्थमनुपश्यति ।\nतत एव च विस्तारं ब्रह्म सम्यप्नुयात्तदा ॥',
    translation: 'When one sees that every being is the same and sees the expansion of the one Brahman everywhere, then one attains Brahman.',
    reference: 'Bhagavad Gita 13.30',
  },
];

const FALLBACK_SHLOKA = SHLOKA_LIST[0];

const cleanSanskrit = (text) => {
  if (!text) return '';
  return text.replace(/^Devanagari\s*/i, '').trim();
};

const formatShloka = (text) => {
  const cleaned = cleanSanskrit(text);
  const lines = cleaned.split(/\n/).filter(Boolean);
  if (lines.length <= 1) {
    const parts = cleaned.split(/।\s*/);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const mainLines = parts.slice(0, -1).map(p => p.trim() + ' ।');
      if (lastPart.trim()) mainLines.push(lastPart.trim());
      return mainLines;
    }
    return [cleaned];
  }
  return lines;
};

const SectionLabel = ({ children, light = false }) => (
  <div className="flex items-center justify-center gap-3 mb-3">
    <div className={`h-px w-8 bg-gradient-to-r from-transparent ${light ? 'to-white/20' : 'to-brand/40'}`}></div>
    <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${light ? 'text-white/50' : 'text-brand/70'}`}>{children}</span>
    <div className={`h-px w-8 bg-gradient-to-l from-transparent ${light ? 'to-white/20' : 'to-brand/40'}`}></div>
  </div>
);

// ── Animated counter hook ────────────────────────────────────
function useCountUp(end, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(!startOnView);
  const ref = useRef(null);

  const start = useCallback(() => setStarted(true), []);

  useEffect(() => {
    if (!startOnView || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) start(); },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [startOnView, start]);

  useEffect(() => {
    if (!started || end === 0) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return { count, ref };
}

// ── Scroll reveal hook ───────────────────────────────────────
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

// ── Stat Counter Component ───────────────────────────────────
function StatCounter({ icon: Icon, label, value, color, glow }) {
  const { count, ref } = useCountUp(value, 2000);
  return (
    <div ref={ref} className="group flex items-center gap-4 py-8 px-8 transition-all duration-300 hover:bg-gray-50/50">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${glow}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-[32px] font-serif font-bold text-gray-900 leading-none">{count}</div>
        <div className="text-[14px] text-gray-400 mt-1">{label}</div>
      </div>
    </div>
  );
}

// ── Reveal Section Wrapper ───────────────────────────────────
function RevealSection({ children, className = '', delay = 0 }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const Home = () => {
  const [stats, setStats] = useState({ questions: 0, users: 0, answers: 0, tags: 0 });
  const [hotQuestions, setHotQuestions] = useState([]);
  const [recentAnswers, setRecentAnswers] = useState([]);
  const [dailyShloka, setDailyShloka] = useState(FALLBACK_SHLOKA);
  const [shlokaIndex, setShlokaIndex] = useState(0);
  const [shlokaFading, setShlokaFading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, questionsRes, shlokaRes, activityRes] = await Promise.all([
          api.get('/admin/public-stats'),
          api.get('/questions?sort=views&limit=5'),
          api.get('/admin/daily-shloka').catch(() => ({ data: null })),
          api.get('/activity?limit=8').catch(() => ({ data: { activities: [] } }))
        ]);
        setStats(statsRes.data);
        setHotQuestions(questionsRes.data.questions || []);
        if (shlokaRes.data) {
          // If API returns a shloka, add it to the rotation list
          const apiShloka = shlokaRes.data;
          if (apiShloka.sanskrit && !SHLOKA_LIST.some(s => s.sanskrit === apiShloka.sanskrit)) {
            SHLOKA_LIST.unshift(apiShloka);
          }
          setDailyShloka(SHLOKA_LIST[0]);
        }
        const activities = activityRes.data.activities || [];
        setRecentAnswers(activities.filter(a => a.type === 'answer').slice(0, 4));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Auto-rotate shlokas
  useEffect(() => {
    const interval = setInterval(() => {
      setShlokaFading(true);
      setTimeout(() => {
        setShlokaIndex(prev => {
          const next = (prev + 1) % SHLOKA_LIST.length;
          setDailyShloka(SHLOKA_LIST[next]);
          return next;
        });
        setShlokaFading(false);
      }, 500);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const cycleShloka = () => {
    setShlokaFading(true);
    setTimeout(() => {
      setShlokaIndex(prev => {
        const next = (prev + 1) % SHLOKA_LIST.length;
        setDailyShloka(SHLOKA_LIST[next]);
        return next;
      });
      setShlokaFading(false);
    }, 400);
  };

  const statItems = [
    { icon: FiHelpCircle, label: 'Questions', value: stats.questions || 0, color: 'bg-brand-50 text-brand', glow: 'shadow-brand/10' },
    { icon: FiMessageSquare, label: 'Answers', value: stats.answers || 0, color: 'bg-purple-50 text-purple-600', glow: 'shadow-purple-500/10' },
    { icon: FiCheckCircle, label: 'Verified', value: stats.verifiedAnswers || 0, color: 'bg-green-50 text-green-600', glow: 'shadow-green-500/10' },
    { icon: FiUsers, label: 'Experts', value: stats.experts || 0, color: 'bg-blue-50 text-blue-600', glow: 'shadow-blue-500/10' },
  ];

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #FFFBF5 0%, #FDF0E0 40%, #F5ECD8 100%)' }}>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E07B2A\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-[10%] w-96 h-96 bg-brand/[0.06] rounded-full blur-[100px] animate-float-slow"></div>
        <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-brand/[0.04] rounded-full blur-[80px] animate-float-slow" style={{ animationDelay: '3s' }}></div>

        {/* Floating dots */}
        <div className="absolute top-20 right-[20%] w-2 h-2 bg-brand/20 rounded-full animate-float"></div>
        <div className="absolute top-32 left-[25%] w-1.5 h-1.5 bg-brand/15 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-[30%] w-1 h-1 bg-brand/20 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute top-40 right-[35%] w-1 h-1 bg-brand/10 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>

        {/* Spinning Om ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
          <div className="animate-spin-slow text-brand/[0.015] text-[500px] leading-none">ॐ</div>
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 py-28 md:py-36">
          <div className="max-w-[760px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm border border-brand/10 rounded-full px-5 py-2 text-[14px] text-brand/80 font-medium mb-10 shadow-sm animate-fade-in-up">
              <FiBook size={14} />
              Verified Knowledge. Scriptural Integrity.
            </div>
            <h1 className="font-serif text-[clamp(40px,5.5vw,64px)] font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              A temple of{' '}
              <span className="relative inline-block">
                <span className="text-brand">verified Hindu knowledge</span>
                <svg className="absolute -bottom-1.5 left-0 w-full h-3 text-brand/20" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0 9 Q50 0 100 6 T200 4" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>
            <p className="text-gray-500 text-[18px] max-w-[560px] mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Ask questions on dharma, scripture, and philosophy. Only verified
              pandits and scholars can answer — ensuring every response meets
              the highest standards of authenticity.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/questions" className="group flex items-center gap-2.5 bg-brand text-white px-9 py-3.5 rounded-xl text-[16px] font-medium hover:bg-brand-600 transition-all duration-300 shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0">
                <FiTrendingUp size={17} className="group-hover:rotate-12 transition-transform duration-300" />
                Browse Questions
              </Link>
              <Link to="/questions/ask" className="group flex items-center gap-2.5 bg-white/80 backdrop-blur-sm text-gray-700 px-9 py-3.5 rounded-xl text-[16px] font-medium border border-gray-200/80 hover:border-brand/30 hover:text-brand transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                Ask a Question
                <FiArrowRight size={17} className="group-hover:translate-x-0.5 transition-transform duration-300" />
              </Link>
              <Link to="/chat" className="group flex items-center gap-2.5 bg-white/80 backdrop-blur-sm text-gray-700 px-9 py-3.5 rounded-xl text-[16px] font-medium border border-gray-200/80 hover:border-brand/30 hover:text-brand transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                <FiSend size={17} className="group-hover:rotate-12 transition-transform duration-300" />
                AI Chat
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS ROW — Animated Counters
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4">
          {statItems.map((item, i) => (
            <div key={item.label} className={`${i < statItems.length - 1 ? 'border-r border-gray-100' : ''}`}>
              <StatCounter {...item} />
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURED SHLOKA — Auto-rotating
          ═══════════════════════════════════════════════════════════════════════ */}
      <RevealSection>
        <div className="max-w-[1200px] mx-auto px-6 py-16">
          <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFBF5 0%, #FFF5E6 30%, #FDF0E0 60%, #F5E8D0 100%)' }}>
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23E07B2A\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}></div>
            <div className="absolute top-0 right-0 w-80 h-80 bg-brand/[0.04] rounded-full blur-3xl -translate-y-1/3 translate-x-1/4"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/[0.03] rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand/[0.03] select-none pointer-events-none animate-float-slow" style={{ fontSize: '280px', lineHeight: 1 }}>ॐ</div>
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-brand/10 rounded-tl-xl"></div>
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-brand/10 rounded-tr-xl"></div>
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-brand/10 rounded-bl-xl"></div>
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-brand/10 rounded-br-xl"></div>

            <div className="relative p-10 md:p-14">
              <div className="flex flex-col md:flex-row items-center gap-10 md:gap-14">
                <div className="flex-1 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-5">
                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-brand/40"></div>
                    <span className="text-[11px] font-bold text-brand/70 uppercase tracking-[0.2em]">Featured Shloka</span>
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-brand/40"></div>
                    <button
                      onClick={cycleShloka}
                      className="ml-2 p-1 rounded-full text-brand/40 hover:text-brand hover:bg-brand/5 transition-all duration-200"
                      title="Next shloka"
                    >
                      <FiRefreshCw size={12} className={shlokaFading ? 'animate-spin' : ''} />
                    </button>
                  </div>

                  {/* Shloka with crossfade */}
                  <div className={`relative mb-8 mt-6 transition-all duration-500 ${shlokaFading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                    <span className="absolute -left-4 -top-4 text-6xl text-brand/10 font-serif leading-none select-none">"</span>
                    <div className="relative z-10 px-3">
                      {formatShloka(dailyShloka.sanskrit).map((line, i, arr) => (
                        <p
                          key={`${shlokaIndex}-${i}`}
                          className={`font-serif leading-[1.9] ${
                            i === arr.length - 1 && arr.length > 1
                              ? 'text-[22px] md:text-[28px] text-brand/80 mt-1.5'
                               : 'text-[28px] md:text-[36px] text-gray-900'
                          }`}
                          style={{ letterSpacing: '0.03em' }}
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                    <span className="absolute -right-1 bottom-0 text-6xl text-brand/10 font-serif leading-none select-none rotate-180">"</span>
                  </div>

                  <p className={`text-[17px] text-gray-600 italic leading-relaxed mb-5 max-w-[540px] mx-auto md:mx-0 transition-all duration-500 ${shlokaFading ? 'opacity-0' : 'opacity-100'}`}>
                    "{dailyShloka.translation}"
                  </p>

                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <div className="w-8 h-0.5 bg-brand/30 rounded-full"></div>
                    <span className="text-[14px] font-semibold text-brand tracking-wide">{dailyShloka.reference}</span>
                    <div className="flex gap-1 ml-2">
                      {SHLOKA_LIST.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setShlokaFading(true);
                            setTimeout(() => {
                              setShlokaIndex(i);
                              setDailyShloka(SHLOKA_LIST[i]);
                              setShlokaFading(false);
                            }, 400);
                          }}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === shlokaIndex ? 'bg-brand w-4' : 'bg-brand/20 hover:bg-brand/40'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="hidden md:block relative">
                  <div className="w-px h-40 bg-gradient-to-b from-transparent via-brand/20 to-transparent"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-brand/30 rounded-full animate-pulse"></div>
                </div>

                <div className="w-full md:w-auto md:min-w-[340px]">
                  <div className="flex items-center justify-center md:justify-start gap-3 mb-5">
                    <div className="h-px w-10 bg-gradient-to-r from-transparent to-brand/40"></div>
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.2em]">Browse by Topic</span>
                    <div className="h-px w-10 bg-gradient-to-l from-transparent to-brand/40"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    {SCRIPTURES.map((s) => (
                      <Link key={s.code} to={s.link} className={`group border rounded-2xl px-4 py-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${s.color}`}>
                        <div className="text-[12px] font-bold opacity-50 mb-1 group-hover:opacity-80 transition-opacity">{s.code}</div>
                        <div className="text-[15px] font-semibold leading-tight">{s.name}</div>
                        <div className="text-[13px] opacity-60 mt-1.5 leading-snug max-h-0 overflow-hidden opacity-0 group-hover:max-h-16 group-hover:opacity-60 transition-all duration-300">{s.desc}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          EXPLORE SCRIPTURES
          ═══════════════════════════════════════════════════════════════════════ */}
      <RevealSection>
        <div className="max-w-[1200px] mx-auto px-6 pb-16">
          <div className="text-center mb-10">
            <SectionLabel>Explore Scriptures</SectionLabel>
            <h2 className="font-serif text-[30px] md:text-[36px] font-bold text-gray-900 mt-4">
              Dive into the wisdom of the Vedas
            </h2>
            <p className="text-[16px] text-gray-400 mt-3 max-w-[500px] mx-auto">
              Browse questions across the major texts and traditions of Sanatan Dharma
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {EXPLORE_TEXTS.map((text, i) => (
              <RevealSection key={text.name} delay={i * 100}>
                <Link
                  to={text.link}
                  className={`group relative bg-gradient-to-br ${text.color} border ${text.border} rounded-2xl p-7 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden block`}
                >
                  <div className="absolute top-0 right-0 w-28 h-28 bg-white/30 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-white/50 transition-colors duration-300"></div>
                  <div className="relative">
                    <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform duration-300 inline-block">{text.icon}</span>
                    <h3 className="font-serif text-[17px] font-semibold text-gray-900 mb-2.5">{text.name}</h3>
                    <p className="text-[13px] text-gray-500 leading-relaxed mb-5">{text.desc}</p>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand group-hover:gap-2.5 transition-all duration-300">
                      Explore <FiArrowRight size={13} />
                    </span>
                  </div>
                </Link>
              </RevealSection>
            ))}
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          HOW IT WORKS
          ═══════════════════════════════════════════════════════════════════════ */}
      <RevealSection>
        <div className="relative overflow-hidden border-y border-gray-100" style={{ background: 'linear-gradient(180deg, #FAF8F4 0%, #F5F0E8 100%)' }}>
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E07B2A\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>
          <div className="relative max-w-[1200px] mx-auto px-6 py-20">
            <div className="text-center mb-14">
              <SectionLabel>How It Works</SectionLabel>
              <h2 className="font-serif text-[30px] md:text-[36px] font-bold text-gray-900 mt-4">
                From question to verified answer
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <RevealSection key={step.title} delay={i * 120}>
                    <div className="relative group">
                      {i < HOW_IT_WORKS.length - 1 && (
                        <div className="hidden md:block absolute top-9 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-px">
                          <div className="w-full h-full bg-gradient-to-r from-brand/20 via-brand/30 to-brand/20 border-t border-dashed border-brand/15"></div>
                        </div>
                      )}
                      <div className="text-center relative z-10">
                        <div className="relative inline-flex mb-6">
                          <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200/80 flex items-center justify-center shadow-sm group-hover:shadow-lg group-hover:border-brand/20 transition-all duration-300 group-hover:-translate-y-1">
                            <Icon size={26} className="text-brand transition-transform duration-300 group-hover:scale-110" />
                          </div>
                          <span className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">{i + 1}</span>
                        </div>
                        <h3 className="font-serif text-[18px] font-semibold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-[15px] text-gray-500 leading-relaxed max-w-[220px] mx-auto">{step.desc}</p>
                      </div>
                    </div>
                  </RevealSection>
                );
              })}
            </div>
          </div>
        </div>
      </RevealSection>

      {/* ═══════════════════════════════════════════════════════════════════════
          TRENDING + SIDEBAR
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="max-w-[1200px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
          <div className="space-y-10">
            {/* Trending */}
            <RevealSection>
              <div>
                <div className="flex items-center justify-between mb-7">
                  <div>
                    <h2 className="font-serif text-[24px] font-bold text-gray-900 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
                        <FiTrendingUp className="text-brand" size={18} />
                      </div>
                      Trending Questions
                    </h2>
                    <p className="text-[15px] text-gray-400 mt-1.5 ml-[48px]">Most active discussions in the community</p>
                  </div>
                  <Link to="/questions" className="group text-[14px] text-brand font-medium hover:text-brand-600 flex items-center gap-1 shrink-0 transition-colors duration-200">
                    All questions
                    <FiArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="bg-white border border-gray-100 rounded-xl p-5 animate-pulse">
                        <div className="flex gap-5">
                          <div className="flex flex-col gap-2 min-w-[40px]">
                            <div className="skeleton w-7 h-3.5" />
                            <div className="skeleton w-5 h-2.5" />
                          </div>
                          <div className="flex-1 space-y-2.5">
                            <div className="skeleton h-4 w-3/4" />
                            <div className="skeleton h-3 w-full" />
                            <div className="skeleton h-3 w-1/2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : hotQuestions.length === 0 ? (
                  <div className="text-center py-16 bg-white border border-gray-100 rounded-xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-brand/5 to-brand/10 flex items-center justify-center">
                      <FiMessageSquare size={24} className="text-brand/40" />
                    </div>
                    <p className="text-gray-700 font-medium">No questions yet</p>
                    <p className="text-[14px] text-gray-400 mt-1 mb-5">Be the first to ask a question!</p>
                    <Link to="/questions/ask" className="inline-flex items-center gap-1.5 bg-brand text-white px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-brand-600 transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                      Ask a question <FiArrowRight size={13} />
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {hotQuestions.map((question, i) => (
                      <div key={question._id} className="animate-fade-in-scale" style={{ animationDelay: `${i * 60}ms` }}>
                        <QuestionCard question={question} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </RevealSection>

            {/* Recent Answers */}
            {recentAnswers.length > 0 && (
              <RevealSection>
                <div>
                  <div className="flex items-center justify-between mb-7">
                    <div>
                      <h2 className="font-serif text-[24px] font-bold text-gray-900 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                          <FiCheckCircle className="text-green-600" size={18} />
                        </div>
                        Recent Answers
                      </h2>
                      <p className="text-[15px] text-gray-400 mt-1.5 ml-[48px]">Latest responses from the community</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {recentAnswers.map((answer, i) => (
                      <Link
                        key={`answer-${answer._id}-${i}`}
                        to={`/questions/${answer.questionId}`}
                        className="group bg-white border border-gray-100 rounded-xl p-5 transition-all duration-300 hover:border-gray-200/80 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold border ${
                            answer.isAccepted ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            answer.isVerifiedByGuru ? 'bg-purple-50 text-purple-600 border-purple-100' :
                            answer.isAIGenerated ? 'bg-sky-50 text-sky-600 border-sky-100' :
                            'bg-brand-50 text-brand border-brand-100'
                          }`}>
                            {answer.isAccepted ? <FiCheckCircle size={12} /> : <FiMessageCircle size={12} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[14px] font-medium text-gray-800 leading-snug line-clamp-2 group-hover:text-brand transition-colors duration-200">
                              {answer.questionTitle}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] text-gray-400">
                          <span className="font-medium text-gray-500">{answer.author?.name || 'Someone'}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}</span>
                          {answer.voteScore > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5 text-brand/70">
                                <FiStar size={10} /> {answer.voteScore}
                              </span>
                            </>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </RevealSection>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="flex flex-col gap-8">
            <TopExperts />
            <RecentActivity />
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <div className="font-serif text-[16px] font-semibold mb-5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                  <FiBook className="text-brand" size={14} />
                </div>
                Quick Links
              </div>
              <div className="space-y-1">
                {[
                  { to: '/tags', label: 'Browse all tags' },
                  { to: '/chat', label: 'AI Scripture Assistant' },
                  { to: '/questions/ask', label: 'Ask a question' },
                ].map((link) => (
                  <Link key={link.to} to={link.to} className="group/link flex items-center gap-2.5 text-[14px] text-gray-500 hover:text-brand transition-all duration-200 py-2 px-2 -mx-2 rounded-lg hover:bg-brand/5">
                    <FiArrowRight size={11} className="text-brand/40 group-hover/link:text-brand group-hover/link:translate-x-0.5 transition-all duration-200" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          JOIN THE COMMUNITY CTA
          ═══════════════════════════════════════════════════════════════════════ */}
      <RevealSection>
        <div className="relative overflow-hidden border-t border-gray-100" style={{ background: 'linear-gradient(160deg, #FFFBF5 0%, #FDF0E0 40%, #F5ECD8 100%)' }}>
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23E07B2A\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 40L40 0H20L0 20M40 40V20L20 40\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand/[0.02] select-none pointer-events-none animate-spin-slow" style={{ fontSize: '300px', lineHeight: 1 }}>ॐ</div>

          <div className="relative max-w-[1200px] mx-auto px-6 py-20 text-center">
            <SectionLabel>Join the Community</SectionLabel>
            <h2 className="font-serif text-[30px] md:text-[36px] font-bold text-gray-900 mt-5 mb-4">
              Begin your spiritual journey
            </h2>
            <p className="text-[17px] text-gray-500 max-w-[520px] mx-auto mb-10 leading-relaxed">
              Ask questions, explore scriptures, and connect with verified scholars
              and a community of seekers.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/register" className="group flex items-center gap-2.5 bg-brand text-white px-9 py-4 rounded-xl text-[16px] font-medium hover:bg-brand-600 transition-all duration-300 shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0">
                <FiUsers size={17} className="group-hover:scale-110 transition-transform duration-300" />
                Create Free Account
              </Link>
              <Link to="/questions" className="group flex items-center gap-2.5 bg-white/80 backdrop-blur-sm text-gray-700 px-9 py-4 rounded-xl text-[16px] font-medium border border-gray-200/80 hover:border-brand/30 hover:text-brand transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
                Browse as Guest
                <FiExternalLink size={15} className="group-hover:translate-x-0.5 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </RevealSection>
    </div>
  );
};

export default Home;
