import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FiSend, FiMessageSquare, FiCopy, FiCheck, FiPlus, FiTrash2, FiBook,
  FiExternalLink, FiX, FiTag, FiLoader
} from 'react-icons/fi';
import toast from 'react-hot-toast';

const SUGGESTED_TOPICS = [
  { label: 'Bhagavad Gita', query: 'What is the Bhagavad Gita about?' },
  { label: 'Karma Yoga', query: 'What is Karma Yoga according to Krishna?' },
  { label: 'Dharma', query: 'What is dharma in Hinduism?' },
  { label: 'Meditation', query: 'How does meditation work in Hindu tradition?' },
  { label: 'Vedanta', query: 'What is Vedanta philosophy?' },
  { label: 'Namajapa', query: 'What is the significance of chanting mantras?' },
];

const FOLLOW_UP_CHIPS = [
  'Tell me more',
  'What scriptures mention this?',
  'How does this apply daily?',
  'Explain the Sanskrit terms',
];

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      title="Copy message"
    >
      {copied ? <FiCheck size={14} className="text-green-500" /> : <FiCopy size={14} />}
    </button>
  );
}

// ── Ask Community Modal ───────────────────────────────────────
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
      // fetchTags on open
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

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const tag = customTag.toLowerCase().trim().replace(/\s+/g, '-');
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
      setCustomTag('');
    }
  };

  const handlePost = async () => {
    if (title.trim().length < 15) {
      toast.error('Title must be at least 15 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/ai/post-to-community', {
        title: title.trim(),
        body: body.trim(),
        tags: selectedTags.length > 0 ? selectedTags : ['hinduism'],
        chatContext: aiResponse,
      });
      toast.success('Question posted to the community!');
      onPosted?.();
      onClose();
      navigate(`/questions/${res.data.question._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error posting question');
    }
    setLoading(false);
  };

  if (!open) return null;

  const tagPool = [...new Set([...suggestedTags, ...allTags])];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <FiExternalLink size={16} className="text-brand" />
            </div>
            <div>
              <h3 className="font-serif text-[17px] font-bold text-gray-900">Ask the Community</h3>
              <p className="text-[12px] text-gray-400">Post this question for verified scholars to answer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <FiX size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide">Question Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What is your question?"
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-3 text-[15px] text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
              maxLength={300}
            />
            <div className="text-[11px] text-gray-400 mt-1 text-right">{title.length}/300</div>
          </div>

          {/* Body */}
          <div>
            <label className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide">
              Details <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add more context, scriptural references, or what you've already explored..."
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 resize-none transition-all"
              rows={4}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
              <FiTag size={11} /> Tags
            </label>
            <p className="text-[12px] text-gray-400 mt-0.5 mb-2">Select or add tags to help others find your question</p>

            {fetchingTags ? (
              <div className="flex items-center gap-2 text-[12px] text-gray-400 py-2">
                <FiLoader size={12} className="animate-spin" /> Suggesting tags...
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tagPool.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-all duration-200 ${
                      selectedTags.includes(tag)
                        ? 'bg-brand text-white border-brand shadow-sm'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand/40 hover:text-brand'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Custom tag input */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                placeholder="Add custom tag..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
              />
              <button
                onClick={addCustomTag}
                disabled={!customTag.trim()}
                className="px-3 py-1.5 text-[12px] font-medium text-brand bg-brand-50 border border-brand-100 rounded-lg hover:bg-brand-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Add
              </button>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <span className="text-[11px] text-gray-400">Selected:</span>
                {selectedTags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-brand bg-brand-50 px-2 py-0.5 rounded-full">
                    {tag}
                    <button onClick={() => toggleTag(tag)} className="hover:text-red-500 transition-colors">
                      <FiX size={9} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* AI Context Preview */}
          {aiResponse && (
            <div>
              <label className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide">AI Context (from chat)</label>
              <div className="mt-1.5 text-[13px] text-gray-500 bg-gray-50 border border-gray-100 p-3 rounded-xl max-h-24 overflow-y-auto leading-relaxed">
                {aiResponse.substring(0, 300)}{aiResponse.length > 300 ? '...' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={() => navigate('/questions/ask')}
            className="text-[13px] text-gray-500 hover:text-brand transition-colors flex items-center gap-1"
          >
            <FiExternalLink size={11} /> Use full form instead
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePost}
              disabled={loading || title.trim().length < 15}
              className="px-5 py-2 text-[14px] font-medium text-white bg-brand hover:bg-brand-600 rounded-xl shadow-lg shadow-brand-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1.5"
            >
              {loading ? (
                <><FiLoader size={13} className="animate-spin" /> Posting...</>
              ) : (
                <><FiExternalLink size={13} /> Post to Community</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const AIChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => `session_${Date.now()}`);
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Ask Community modal state
  const [askModal, setAskModal] = useState({ open: false, userQuestion: '', aiResponse: '' });

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [loading]);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/ai/sessions');
      setSessions(res.data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const loadSession = async (session) => {
    setActiveSession(session.sessionId);
    setSessionId(session.sessionId);
    try {
      const res = await api.get(`/ai/history/${session.sessionId}`);
      setMessages(res.data.messages || []);
    } catch (error) {
      console.error('Error loading session:', error);
      setMessages([]);
    }
  };

  const startNewChat = () => {
    setSessionId(`session_${Date.now()}`);
    setActiveSession(null);
    setMessages([]);
    inputRef.current?.focus();
  };

  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/sessions/${sessionId}`);
      setSessions(sessions.filter(s => s.sessionId !== sessionId));
      if (activeSession === sessionId) startNewChat();
      toast.success('Session deleted');
    } catch (error) {
      toast.error('Error deleting session');
    }
  };

  const handleSend = async (e, customInput) => {
    e?.preventDefault();
    const msg = customInput || input.trim();
    if (!msg || loading) return;

    const userMessage = msg;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: userMessage, sessionId });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.message,
        relatedQuestions: res.data.relatedQuestions,
        timestamp: new Date()
      }]);
      fetchSessions();
    } catch (error) {
      toast.error('Error getting response');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Find the user question that corresponds to an AI answer
  const findUserQuestionForAssistant = (assistantIndex) => {
    // Walk backwards from the assistant message to find the preceding user message
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content;
    }
    return '';
  };

  const openAskModal = (assistantIndex) => {
    const userQ = findUserQuestionForAssistant(assistantIndex);
    const aiA = messages[assistantIndex].content;
    setAskModal({ open: true, userQuestion: userQ, aiResponse: aiA });
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FiMessageSquare className="text-brand" size={28} />
          </div>
          <h1 className="font-serif text-[26px] font-bold text-gray-900 mb-2">AI Scripture Assistant</h1>
          <p className="text-gray-500 mb-6">Please login to use the AI chat feature.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex bg-white">
      {/* Sidebar */}
      <div className="w-72 border-r border-gray-200 flex flex-col bg-cream/50 shrink-0">
        {/* New Chat Button */}
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={startNewChat}
            className="w-full flex items-center justify-center gap-2 bg-brand text-white py-2.5 rounded-xl text-[15px] font-medium hover:bg-brand-500 transition-colors"
          >
            <FiPlus size={16} />
            New Chat
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <div className="text-center text-gray-400 text-[14px] py-8 px-4">
              No conversations yet
            </div>
          )}
          {sessions.map(session => (
            <div
              key={session.sessionId}
              onClick={() => loadSession(session)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                activeSession === session.sessionId
                  ? 'bg-brand-50 border border-brand-100'
                  : 'hover:bg-white border border-transparent'
              }`}
            >
              <FiMessageSquare size={14} className={activeSession === session.sessionId ? 'text-brand' : 'text-gray-400'} />
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-gray-900 truncate">
                  {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                onClick={(e) => deleteSession(e, session.sessionId)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all"
              >
                <FiTrash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-[13px] text-gray-400">
            <FiBook size={12} />
            Answers from vedabase.io scriptures
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="h-full flex flex-col items-center justify-center px-8">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-5">
                <FiBook className="text-brand" size={28} />
              </div>
              <h2 className="font-serif text-[26px] font-bold text-gray-900 mb-2 text-center">
                Ask Pariprashna
              </h2>
              <p className="text-gray-500 text-center mb-8 max-w-md leading-relaxed">
                Your AI guide to Hindu scriptures. Ask about dharma, karma, yoga, or any Vedic concept.
                Responses are grounded in Bhagavad Gita, Srimad Bhagavatam, and other texts.
              </p>

              {/* Topic Chips */}
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic.label}
                    onClick={() => handleSend(null, topic.query)}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-2 text-[14px] text-gray-700 hover:border-brand hover:text-brand hover:bg-brand-50 transition-all"
                  >
                    <FiMessageSquare size={12} />
                    {topic.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages List */
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                    {/* Avatar + Name */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
                          <FiBook className="text-white" size={13} />
                        </div>
<span className="text-[13px] font-medium text-gray-500">Pariprashna</span>
                        <span className="text-[12px] text-gray-400">{formatTime(msg.timestamp)}</span>
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`rounded-2xl px-5 py-3.5 ${
                      msg.role === 'user'
                        ? 'bg-brand text-white rounded-tr-md'
                        : 'bg-gray-50 border border-gray-200 text-gray-900 rounded-tl-md'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-li:my-0.5">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      ) : (
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {/* Actions (assistant only) */}
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-3 mt-2 ml-9">
                        <CopyButton text={msg.content} />
                        <button
                          onClick={() => openAskModal(index)}
                          className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-brand px-2.5 py-1 rounded-lg hover:bg-brand-50 border border-transparent hover:border-brand-100 transition-all duration-200"
                          title="Not satisfied? Ask the community"
                        >
                          <FiExternalLink size={12} />
                          Ask the Community
                        </button>
                      </div>
                    )}

                    {/* Related Questions */}
                    {msg.role === 'assistant' && msg.relatedQuestions?.length > 0 && index === messages.length - 1 && (
                      <div className="mt-3 ml-9">
                        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Related Questions</p>
                        <div className="space-y-1">
                          {msg.relatedQuestions.map(q => (
                            <a
                              key={q._id}
                              href={`/questions/${q._id}`}
                              className="block text-[14px] text-brand hover:text-brand-500 hover:underline"
                            >
                              {q.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* User timestamp */}
                    {msg.role === 'user' && (
                      <div className="text-right mt-1">
                        <span className="text-[12px] text-gray-400">{formatTime(msg.timestamp)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiBook className="text-white" size={13} />
                      </div>
                      <span className="text-[13px] font-medium text-gray-500">Pariprashna</span>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-md px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-2 h-2 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                        <span className="text-[14px] text-gray-400">Searching scriptures...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggested Follow-ups */}
              {!loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <div className="flex flex-wrap gap-2 ml-9">
                  {FOLLOW_UP_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleSend(null, chip)}
                      className="text-[13px] text-gray-500 border border-gray-200 rounded-full px-3 py-1.5 hover:border-brand hover:text-brand hover:bg-brand-50 transition-all"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder-gray-400"
                placeholder="Ask about Hinduism, scriptures, dharma..."
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  input.trim() && !loading
                    ? 'bg-brand text-white hover:bg-brand-500 shadow-sm'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                <FiSend size={16} />
              </button>
            </div>
            <p className="text-[12px] text-gray-400 text-center mt-2">
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
