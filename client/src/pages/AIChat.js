import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';import { FiSend, FiMessageSquare, FiCopy, FiCheck, FiPlus, FiTrash2, FiBook,
  FiExternalLink, FiX, FiTag, FiThumbsUp, FiThumbsDown, FiMenu,
  FiDownload, FiSearch, FiTrendingUp,
  FiChevronRight, FiSun, FiMoon, FiAlertCircle
} from 'react-icons/fi';
import ScriptureInput from '../components/ScriptureAutocomplete';
import toast from 'react-hot-toast';

const SUGGESTED_TOPICS = [
  { label: 'Bhagavad Gita', query: 'What is the Bhagavad Gita about?', icon: '📜', color: 'from-amber-400 to-orange-500' },
  { label: 'Karma Yoga', query: 'What is Karma Yoga according to Krishna?', icon: '🌀', color: 'from-blue-400 to-cyan-500' },
  { label: 'Dharma', query: 'What is dharma in Hinduism?', icon: '⚖️', color: 'from-green-400 to-emerald-500' },
  { label: 'Meditation', query: 'How does meditation work in Hindu tradition?', icon: '🧘', color: 'from-purple-400 to-violet-500' },
  { label: 'Vedanta', query: 'What is Vedanta philosophy?', icon: '🔮', color: 'from-rose-400 to-pink-500' },
  { label: 'Mantras', query: 'What is the significance of chanting mantras?', icon: '🔔', color: 'from-teal-400 to-cyan-500' },
];

const QUICK_ACTIONS = [
  { label: 'Explain a Verse', query: 'Can you explain Bhagavad Gita verse 2.47?' },
  { label: 'Compare Teachings', query: 'How do the paths of karma, bhakti, and jnana compare?' },
  { label: 'Daily Wisdom', query: 'Share a practical teaching from the Bhagavad Gita for daily life' },
];

// ── Helpers ───────────────────────────────────────────────────
function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return formatTime(date);
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupSessionsByDate(sessions) {
  const groups = {};
  const now = new Date();
  sessions.forEach(s => {
    const d = new Date(s.createdAt);
    const diff = now - d;
    let key;
    if (diff < 86400000) key = 'Today';
    else if (diff < 172800000) key = 'Yesterday';
    else if (diff < 604800000) key = 'This Week';
    else key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });
  return groups;
}

// ── Copy Button ──────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Copy message">
      {copied ? <FiCheck size={13} className="text-green-500" /> : <FiCopy size={13} />}
    </button>
  );
}

// ── Ask Community Modal ──────────────────────────────────────
function AskCommunityModal({ open, onClose, userQuestion, aiResponse, onPosted }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTags, setFetchingTags] = useState(false);

  useEffect(() => {
    if (open && userQuestion) {
      setTitle(userQuestion);
      setBody('');
      setSelectedTags([]);
      setCustomTag('');
      (async () => {
        setFetchingTags(true);
        try {
          const res = await api.post('/ai/suggest-tags', {
            title: userQuestion || '',
            body: aiResponse || '',
          });
          setSuggestedTags(res.data.suggested || []);
          setAllTags(res.data.all || []);
          setSelectedTags(res.data.suggested || []);
        } catch {
          setSuggestedTags([]);
          setAllTags(['hinduism']);
        }
        setFetchingTags(false);
      })();
    }
  }, [open, userQuestion, aiResponse]);

  const toggleTag = (tag) => setSelectedTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  );

  const addCustomTag = () => {
    const tag = customTag.toLowerCase().trim().replace(/\s+/g, '-');
    if (tag && !selectedTags.includes(tag)) { setSelectedTags(prev => [...prev, tag]); setCustomTag(''); }
  };

  const handlePost = async () => {
    if (title.trim().length < 15) { toast.error('Title must be at least 15 characters'); return; }
    setLoading(true);
    try {
      const res = await api.post('/ai/post-to-community', {
        title: title.trim(), body: body.trim(),
        tags: selectedTags.length > 0 ? selectedTags : ['hinduism'], chatContext: aiResponse,
      });
      toast.success('Question posted to the community!');
      onPosted?.();
      onClose();
      navigate(`/questions/${res.data.question._id}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Error posting question'); }
    setLoading(false);
  };

  if (!open) return null;
  const tagPool = [...new Set([...suggestedTags, ...allTags])];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white dark:bg-[#1C1814] rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-fade-in-scale" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#2A2520]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand/10 flex items-center justify-center">
              <FiExternalLink size={16} className="text-brand" />
            </div>
            <div>
              <h3 className="font-serif text-[17px] font-bold text-gray-900 dark:text-gray-100">Ask the Community</h3>
              <p className="text-[12px] text-gray-400 dark:text-gray-500">Post this question for verified scholars</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <FiX size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div>
            <label className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Question Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="What is your question?" maxLength={300}
              className="mt-1.5 w-full border border-gray-200 dark:border-[#3A342E] rounded-xl px-4 py-3 text-[15px] text-gray-800 dark:text-gray-200 bg-white dark:bg-[#1C1814] placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all" />
            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 text-right">{title.length}/300</div>
          </div>
          <div>
            <label className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Details <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder="Add more context, scriptural references, or what you've already explored..."
              rows={4}
              className="mt-1.5 w-full border border-gray-200 dark:border-[#3A342E] rounded-xl px-4 py-3 text-[14px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C1814] placeholder:text-gray-300 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 resize-none transition-all" />
          </div>
          <div>
            <label className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide flex items-center gap-1.5"><FiTag size={11} /> Tags</label>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 mt-0.5 mb-2">Select or add tags</p>
            {fetchingTags ? (
              <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2"><FiAlertCircle size={12} className="animate-spin" /> Suggesting tags...</div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tagPool.map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? 'bg-brand text-white border-brand shadow-sm'
                        : 'bg-gray-50 dark:bg-[#2A2520] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-[#3A342E] hover:border-brand/40 hover:text-brand'
                    }`}>{tag}</button>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3">
              <input type="text" value={customTag} onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                placeholder="Add custom tag..."
                className="flex-1 border border-gray-200 dark:border-[#3A342E] rounded-lg px-3 py-1.5 text-[12px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C1814] placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all" />
              <button onClick={addCustomTag} disabled={!customTag.trim()}
                className="px-3 py-1.5 text-[12px] font-medium text-brand bg-brand-50 dark:bg-brand/10 border border-brand-100 dark:border-brand/20 rounded-lg hover:bg-brand-100 dark:hover:bg-brand/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Add</button>
            </div>
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">Selected:</span>
                {selectedTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand bg-brand-50 dark:bg-brand/10 px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="hover:text-red-500 transition-colors"><FiX size={9} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {aiResponse && (
            <div>
              <label className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">AI Context</label>
              <div className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#2A2520] border border-gray-100 dark:border-[#3A342E] p-3 rounded-xl max-h-24 overflow-y-auto leading-relaxed">
                {aiResponse.substring(0, 300)}{aiResponse.length > 300 ? '...' : ''}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-[#2A2520] bg-gray-50/50 dark:bg-[#1C1814]/50">
          <button onClick={() => navigate('/questions/ask')} className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-brand transition-colors flex items-center gap-1">
            <FiExternalLink size={11} /> Full form
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-[14px] font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2A2520] rounded-xl transition-colors">Cancel</button>
            <button onClick={handlePost} disabled={loading || title.trim().length < 15}
              className="px-5 py-2 text-[14px] font-medium text-white bg-brand hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-200 dark:shadow-brand-900/30 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5">
              {loading ? <><FiAlertCircle size={13} className="animate-spin" /> Posting...</> : <><FiExternalLink size={13} /> Post to Community</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AIChat ────────────────────────────────────────────────────
const AIChat = () => {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [askModal, setAskModal] = useState({ open: false, userQuestion: '', aiResponse: '' });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { if (user) fetchSessions(); }, [user]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, [loading]);

  const fetchSessions = async () => {
    try { const res = await api.get('/ai/sessions'); setSessions(res.data); }
    catch { /* ignore */ }
  };

  const loadSession = async (session) => {
    setActiveSession(session.sessionId);
    setSessionId(session.sessionId);
    setSidebarOpen(false);
    try {
      const res = await api.get(`/ai/history/${session.sessionId}`);
      setMessages(res.data.messages || []);
    } catch { setMessages([]); }
  };

  const startNewChat = () => {
    setSessionId(`session_${Date.now()}`);
    setActiveSession(null);
    setMessages([]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const deleteSession = async (e, sessionIdToDelete) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/sessions/${sessionIdToDelete}`);
      setSessions(sessions.filter(s => s.sessionId !== sessionIdToDelete));
      if (activeSession === sessionIdToDelete) startNewChat();
      toast.success('Session deleted');
    } catch { toast.error('Error deleting session'); }
  };

  const handleSend = async (e, customInput) => {
    e?.preventDefault();
    const msg = customInput || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date() }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat', { message: msg, sessionId });
      setMessages(prev => [...prev, {
        role: 'assistant', content: res.data.message,
        sources: res.data.sources || [],
        relatedQuestions: res.data.relatedQuestions,
        timestamp: new Date()
      }]);
      fetchSessions();
    } catch {
      toast.error('Error getting response');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    }
    setLoading(false);
  };

  const handleFeedback = async (msgIndex, feedback) => {
    try {
      await api.post(`/ai/feedback/${sessionId}/${msgIndex}`, { feedback });
      setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, feedback } : m));
      toast.success(feedback === 'helpful' ? 'Glad it helped!' : 'Thanks for the feedback');
    } catch { toast.error('Error recording feedback'); }
  };

  const handleExport = () => {
    const text = messages.map(m =>
      `## ${m.role === 'user' ? 'You' : 'Pariprashna'} (${formatTime(m.timestamp)})\n\n${m.content}`
    ).join('\n\n---\n\n');
    const blob = new Blob([`# Pariprashna AI Chat\n\n${text}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pariprashna-chat-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Chat exported!');
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const findUserQuestion = (assistantIndex) => {
    for (let i = assistantIndex - 1; i >= 0; i--) if (messages[i].role === 'user') return messages[i].content;
    return '';
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center bg-cream dark:bg-[#141110]">
        <div className="text-center px-6">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-brand to-brand-500 flex items-center justify-center shadow-lg shadow-brand/20">
            <FiBook className="text-white" size={32} />
          </div>
          <h1 className="font-serif text-[28px] font-bold text-gray-900 dark:text-gray-100 mb-2">AI Scripture Assistant</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Login to explore Hindu scriptures with AI guidance.</p>
          <button onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-brand text-white px-8 py-3 rounded-xl text-[15px] font-medium hover:bg-brand-500 shadow-lg shadow-brand/20 transition-all">
            Login to Continue <FiChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const groupedSessions = groupSessionsByDate(sessions);

  return (
    <div className="h-[calc(100vh-56px)] flex bg-white dark:bg-[#141110] transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Sidebar ─────────────────────────────── */}
      <div className={`fixed lg:relative z-40 lg:z-auto inset-y-0 left-0 w-72 bg-cream/50 dark:bg-[#1C1814]/80 border-r border-gray-200 dark:border-[#2A2520] flex flex-col shrink-0 transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-3 border-b border-gray-200 dark:border-[#2A2520]">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400">
              <FiX size={16} />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title={dark ? 'Light mode' : 'Dark mode'}>
                {dark ? <FiSun size={14} /> : <FiMoon size={14} />}
              </button>
              {messages.length > 0 && (
                <button onClick={handleExport} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" title="Export chat">
                  <FiDownload size={14} />
                </button>
              )}
            </div>
          </div>
          <button onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand to-brand-500 text-white py-2.5 rounded-xl text-[14px] font-medium hover:from-brand-500 hover:to-brand-600 shadow-sm transition-all">
            <FiPlus size={15} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {sessions.length === 0 && (
            <div className="text-center text-gray-400 dark:text-gray-500 text-[13px] py-8 px-4">
              <FiMessageSquare size={24} className="mx-auto mb-2 opacity-50" />
              No conversations yet
            </div>
          )}
          {Object.entries(groupedSessions).map(([label, group]) => (
            <div key={label}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</div>
              <div className="space-y-0.5">
                {group.map(session => (
                  <div key={session.sessionId} onClick={() => loadSession(session)}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      activeSession === session.sessionId
                        ? 'bg-brand-50 dark:bg-brand/10 border border-brand-100 dark:border-brand/20'
                        : 'hover:bg-white dark:hover:bg-[#2A2520] border border-transparent'
                    }`}>
                    <FiMessageSquare size={13} className={activeSession === session.sessionId ? 'text-brand' : 'text-gray-400 dark:text-gray-500'} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] truncate ${activeSession === session.sessionId ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                        {session.preview || formatDate(session.createdAt)}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(session.createdAt)}</div>
                    </div>
                    <button onClick={(e) => deleteSession(e, session.sessionId)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all">
                      <FiTrash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-gray-200 dark:border-[#2A2520]">
          <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-gray-500">
            <FiBook size={11} /> Answers from vedabase.io
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ──────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ── Welcome Screen ──────────────────── */
            <div className="h-full flex flex-col items-center justify-center px-4 py-6">
              <div className="w-20 h-20 mb-5 rounded-2xl bg-gradient-to-br from-brand to-brand-500 flex items-center justify-center shadow-lg shadow-brand/20">
                <FiBook className="text-white" size={32} />
              </div>
              <h2 className="font-serif text-[32px] font-bold text-gray-900 dark:text-gray-100 mb-1 text-center">
                Ask Pariprashna
              </h2>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 text-center mb-4 max-w-md leading-relaxed">
                Your AI guide to Hindu scriptures. Responses grounded in Vedic texts.
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap justify-center gap-2 mb-5">
                {QUICK_ACTIONS.map(action => (
                  <button key={action.label} onClick={() => handleSend(null, action.query)}
                    className="flex items-center gap-1.5 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#2A2520] rounded-xl px-4 py-2.5 text-[14px] text-gray-600 dark:text-gray-400 hover:border-brand hover:text-brand hover:bg-brand-50 dark:hover:bg-brand/5 transition-all shadow-sm">
                    <FiTrendingUp size={14} /> {action.label}
                  </button>
                ))}
              </div>

              {/* Topic Chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-xl">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button key={topic.label} onClick={() => handleSend(null, topic.query)}
                    className="group flex items-center gap-2 bg-white dark:bg-[#1C1814] border border-gray-200 dark:border-[#2A2520] rounded-xl px-4 py-3 text-[14px] text-gray-700 dark:text-gray-300 hover:border-brand/40 hover:shadow-md transition-all">
                    <span className="text-[18px]">{topic.icon}</span>
                    <span className="font-medium">{topic.label}</span>
                    <FiChevronRight size={14} className="text-gray-300 dark:text-gray-500 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-3 text-[12px] text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><kbd className="text-[10px] bg-gray-100 dark:bg-[#2A2520] px-1.5 py-0.5 rounded font-mono">⌘K</kbd> Toggle palette</span>
                <span>·</span>
                <span className="flex items-center gap-1"><kbd className="text-[10px] bg-gray-100 dark:bg-[#2A2520] px-1.5 py-0.5 rounded font-mono">↵</kbd> Send</span>
              </div>
            </div>
          ) : (
            /* ── Messages List ────────────────────── */
            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 space-y-5">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`} style={{ animationDelay: '0s' }}>
                  <div className={`max-w-[95%] sm:max-w-[88%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-brand to-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FiBook className="text-white" size={13} />
                        </div>
                        <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400">Pariprashna</span>
                        <span className="text-[12px] text-gray-400 dark:text-gray-500">{msg.timestamp ? formatTime(msg.timestamp) : ''}</span>
                      </div>
                    )}
                    <div className={`rounded-2xl px-5 py-4 ${
                      msg.role === 'user'
                        ? 'bg-brand text-white rounded-tr-md shadow-sm'
                        : 'bg-gray-50 dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] text-gray-900 dark:text-gray-100 rounded-tl-md shadow-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-li:my-0.5 prose-a:text-brand prose-code:text-gray-600 dark:prose-code:text-gray-400 text-[15px]">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      ) : (
                        <p className="text-[16px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Actions */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-2 ml-9">
                        <CopyButton text={msg.content} />
                        <div className="flex items-center gap-0.5">
                          <button onClick={() => handleFeedback(index, 'helpful')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              msg.feedback === 'helpful' ? 'text-brand bg-brand-50 dark:bg-brand/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2520]'
                            }`} title="Helpful">
                            <FiThumbsUp size={12} />
                          </button>
                          <button onClick={() => handleFeedback(index, 'unhelpful')}
                            className={`p-1.5 rounded-lg transition-colors ${
                              msg.feedback === 'unhelpful' ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2A2520]'
                            }`} title="Not helpful">
                            <FiThumbsDown size={12} />
                          </button>
                        </div>
                        <button onClick={() => {
                          const q = findUserQuestion(index);
                          setAskModal({ open: true, userQuestion: q, aiResponse: msg.content });
                        }}
                          className="flex items-center gap-1.5 text-[13px] text-gray-400 dark:text-gray-500 hover:text-brand px-2.5 py-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand/10 border border-transparent hover:border-brand-100 dark:hover:border-brand/20 transition-all">
                          <FiExternalLink size={11} /> Ask Community
                        </button>
                      </div>
                    )}

                    {/* Related Questions */}
                    {msg.role === 'assistant' && msg.relatedQuestions?.length > 0 && (
                      <div className="mt-2 ml-9">
                        <p className="text-[12px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                          <FiSearch size={11} /> Related Questions
                        </p>
                        <div className="space-y-1">
                          {msg.relatedQuestions.map(q => (
                            <a key={q._id} href={`/questions/${q._id}`}
                              className="flex items-center gap-2 text-[14px] text-brand hover:text-brand-500 py-1 px-2.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand/5 transition-colors">
                              <FiMessageSquare size={11} />
                              <span className="line-clamp-1">{q.title}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {msg.role === 'user' && (
                      <div className="text-right mt-1"><span className="text-[11px] text-gray-400 dark:text-gray-500">{msg.timestamp ? formatTime(msg.timestamp) : ''}</span></div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex justify-start animate-fade-in-up">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-gradient-to-br from-brand to-brand-500 rounded-lg flex items-center justify-center shadow-sm">
                        <FiBook className="text-white" size={13} />
                      </div>
                      <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Pariprashna</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                        <span className="text-[14px] text-gray-400 dark:text-gray-500">Searching scriptures...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input Area ─────────────────────────── */}
        <div className="border-t border-gray-200 dark:border-[#2A2520] bg-white dark:bg-[#141110] px-3 sm:px-4 py-3">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-[#1C1814] border border-gray-200 dark:border-[#2A2520] rounded-2xl px-4 py-2.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all">
              <button type="button" onClick={() => setSidebarOpen(true)} className="lg:hidden p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2A2520] text-gray-400 dark:text-gray-500">
                <FiMenu size={16} />
              </button>
              <div className="flex-1 min-w-0">
                <ScriptureInput
                  value={input}
                  onChange={(val) => setInput(typeof val === 'string' ? val : val.target?.value || val)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-transparent text-[16px] text-gray-900 dark:text-gray-100 outline-none placeholder-gray-400 dark:placeholder-gray-500 resize-none overflow-hidden"
                  placeholder="Ask about Hinduism, scriptures, dharma... Type @ to reference a verse"
                  disabled={loading}
                  rows={1}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="hidden sm:inline text-[11px] text-gray-300 dark:text-gray-600 bg-white dark:bg-[#2A2520] border border-gray-200 dark:border-[#3A342E] px-1.5 py-0.5 rounded font-mono">↵</kbd>
                <button type="submit" disabled={loading || !input.trim()}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && !loading ? 'bg-brand text-white hover:bg-brand-500 shadow-sm' : 'bg-gray-200 dark:bg-[#2A2520] text-gray-400 dark:text-gray-500'
                  }`}>
                  <FiSend size={16} />
                </button>
              </div>
            </div>
            <p className="text-[12px] text-gray-400 dark:text-gray-500 text-center mt-2">
              Answers grounded in vedabase.io scriptures. Not a substitute for scholarly study.
            </p>
          </form>
        </div>
      </div>

      {/* Ask Community Modal */}
      <AskCommunityModal
        open={askModal.open}
        onClose={() => setAskModal({ open: false, userQuestion: '', aiResponse: '' })}
        userQuestion={askModal.userQuestion}
        aiResponse={askModal.aiResponse}
        onPosted={() => {}}
      />
    </div>
  );
};

export default AIChat;
