import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { FiBook, FiAlertCircle, FiEye, FiEdit3, FiLoader, FiHelpCircle, FiChevronRight } from 'react-icons/fi';
import ScriptureInput from '../components/ScriptureAutocomplete';
import toast from 'react-hot-toast';

function suggestTags(title, body) {
  const text = `${title} ${body}`.toLowerCase();
  const matched = [];
  if (/bhagavad\s*gita|gita|krishna.*arjuna|chapter.*verse/i.test(text)) matched.push('bhagavad-gita');
  if (/bhagavatam|bhagavata|srimad|purana/i.test(text)) matched.push('srimad-bhagavatam');
  if (/\\bdharma\b|duty|righteous|moral|ethics?|varna|ashrama/i.test(text)) matched.push('dharma');
  if (/\\bkarma\b|action.*consequence|fruitive|works?/i.test(text)) matched.push('karma');
  if (/\\byoga\b|asana|pranayama|patanjali|hatha/i.test(text)) matched.push('yoga');
  if (/\\bmeditat|dhyana|contemplat|mindful/i.test(text)) matched.push('meditation');
  if (/\\bvedanta\b|brahman|atman|advaita|shankara/i.test(text)) matched.push('vedanta');
  if (/\\bworship|puja|ritual|ceremony|offering/i.test(text)) matched.push('worship');
  if (/\\bmantra|chant|japa|gayatri|\\bom\\b|hare krishna/i.test(text)) matched.push('mantras');
  if (/\\bphilosophy|sankhya|nyaya|mimamsa/i.test(text)) matched.push('philosophy');
  if (/\\bfestival|diwali|holi|navratri|ekadashi|janmashtami/i.test(text)) matched.push('festivals');
  if (/\\bdeity|god|goddess|vishnu|shiva|rama|krishna|lakshmi/i.test(text)) matched.push('deities');
  if (matched.length === 0) matched.push('philosophy');
  return matched.slice(0, 3);
}

const TAG_COLORS = {
  'bhagavad-gita': 'from-orange-50 to-amber-50 text-orange-700 border-orange-200',
  'srimad-bhagavatam': 'from-blue-50 to-cyan-50 text-blue-700 border-blue-200',
  'vedanta': 'from-purple-50 to-violet-50 text-purple-700 border-purple-200',
  'dharma': 'from-green-50 to-emerald-50 text-green-700 border-green-200',
  'karma': 'from-rose-50 to-pink-50 text-rose-700 border-rose-200',
  'yoga': 'from-yellow-50 to-amber-50 text-yellow-700 border-yellow-200',
  'meditation': 'from-indigo-50 to-blue-50 text-indigo-700 border-indigo-200',
  'worship': 'from-red-50 to-orange-50 text-red-700 border-red-200',
  'mantras': 'from-teal-50 to-cyan-50 text-teal-700 border-teal-200',
  'philosophy': 'from-gray-50 to-slate-50 text-gray-700 border-gray-200',
  'festivals': 'from-pink-50 to-rose-50 text-pink-700 border-pink-200',
  'deities': 'from-amber-50 to-yellow-50 text-amber-700 border-amber-200',
};

const AskQuestion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const suggestedTags = useMemo(() => suggestTags(title, body), [title, body]);

  const titleCharsLeft = 300 - title.length;
  const titlePercent = (title.length / 300) * 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to ask a question');
    if (title.trim().length < 15) return toast.error('Title must be at least 15 characters');

    setLoading(true);
    try {
      const res = await api.post('/questions', { title, body });
      toast.success('Question posted!');
      navigate(`/questions/${res.data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error posting question');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-[740px] mx-auto px-6 py-8 animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-500 flex items-center justify-center shadow-lg shadow-brand/20">
            <span className="text-white text-[22px] font-serif font-bold">?</span>
          </div>
          <div>
            <h1 className="font-serif text-[32px] font-bold text-gray-900 leading-none">Ask a Question</h1>
            <p className="text-[15px] text-gray-400 mt-1.5">Share your curiosity about Hindu scripture and philosophy</p>
          </div>
        </div>
      </div>

      {/* Guidelines */}
      <div className="relative bg-gradient-to-br from-brand-50 to-amber-50/30 border border-brand-100/60 rounded-2xl p-6 mb-8 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
        <div className="relative flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 mt-0.5">
            <FiBook size={18} className="text-brand" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">Before you ask</h3>
            <ul className="space-y-1.5">
              {[
                'Search existing questions to avoid duplicates',
                'Provide sufficient context and detail for meaningful answers',
                'Tags are assigned automatically based on your question',
                'Only verified experts can post official answers',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[14px] text-gray-600">
                  <FiChevronRight size={12} className="text-brand/40 mt-0.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <label className="block text-[15px] font-semibold text-gray-900 mb-1">
            Question Title
          </label>
          <p className="text-[13px] text-gray-400 mb-3">Be specific and concise — like you're asking a scholar directly.</p>
          <div className={`relative transition-all duration-200 ${focusedField === 'title' ? 'scale-[1.005]' : ''}`}>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onFocus={() => setFocusedField('title')}
                onBlur={() => setFocusedField(null)}
                className="w-full border-2 border-gray-200 rounded-xl px-5 py-3.5 bg-white text-[16px] outline-none transition-all duration-200 pr-20 placeholder:text-gray-300 focus:border-brand focus:ring-4 focus:ring-brand/5"
                placeholder="e.g. What is the significance of Ekadashi fasting?"
                required
                minLength="15"
                maxLength="300"
              />
              {/* Character counter */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <div className="hidden sm:block w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      title.length === 0 ? 'w-0' :
                      title.length < 15 ? 'bg-amber-400' :
                      title.length > 280 ? 'bg-red-400' :
                      'bg-brand'
                    }`}
                    style={{ width: `${Math.min(titlePercent, 100)}%` }}
                  ></div>
                </div>
                <span className={`text-[12px] font-medium ${
                  title.length === 0 ? 'text-gray-300' :
                  title.length < 15 ? 'text-amber-500' :
                  title.length > 280 ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {titleCharsLeft}
                </span>
              </div>
            </div>
          </div>
          {title.length > 0 && title.length < 15 && (
            <p className="text-[12px] text-amber-500 mt-1.5 flex items-center gap-1 animate-fade-in-up">
              <FiAlertCircle size={11} />
              Minimum 15 characters ({15 - title.length} more needed)
            </p>
          )}
        </div>

        {/* Body */}
        <div className="animate-fade-in-up relative z-10" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-[15px] font-semibold text-gray-900">
              Question Details
            </label>
            {/* Preview toggle */}
            {body.trim() && (
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                  showPreview
                    ? 'bg-brand text-white shadow-sm'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                {showPreview ? <FiEdit3 size={13} /> : <FiEye size={13} />}
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            )}
          </div>
          <p className="text-[13px] text-gray-400 mb-3">Provide context, background, and what you've already researched. Markdown is supported.</p>

          {showPreview && body.trim() ? (
            <div className="min-h-[200px] border-2 border-brand/20 rounded-xl p-6 bg-white prose prose-sm max-w-none transition-all duration-200">
              <MarkdownRenderer content={body} />
            </div>
          ) : (
            <ScriptureInput
              value={body}
              onChange={(val) => setBody(typeof val === 'string' ? val : val.target?.value || val)}
              placeholder="Describe your question in detail... Include relevant context, what you've already read, and what specifically you'd like to know."
              rows={6}
              className={`w-full border-2 rounded-xl px-5 py-4 bg-white text-[15px] outline-none resize-y min-h-[180px] leading-relaxed transition-all duration-200 placeholder:text-gray-300 focus:ring-4 focus:ring-brand/5 ${
                focusedField === 'body' ? 'border-brand' : 'border-gray-200'
              }`}
              onFocus={() => setFocusedField('body')}
              onBlur={() => setFocusedField(null)}
            />
          )}
        </div>

        {/* Auto-suggested tags */}
        {suggestedTags.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            <label className="block text-[15px] font-semibold text-gray-900 mb-1">Suggested Tags</label>
            <p className="text-[13px] text-gray-400 mb-3 flex items-center gap-1.5">
              <FiHelpCircle size={12} />
              Auto-detected from your question. Guru/admin can edit later.
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags.map((tag, i) => (
                <div
                  key={tag}
                  className={`animate-fade-in-up inline-flex items-center gap-1.5 bg-gradient-to-br ${TAG_COLORS[tag] || 'from-gray-50 to-slate-50 text-gray-700 border-gray-200'} border px-4 py-2 rounded-xl text-[13px] font-medium shadow-sm tag-chip`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <span className="opacity-50">#</span>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="text-[13px] text-gray-400 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand"></div>
            Questions are public and editable by gurus
          </div>
          <button
            type="submit"
            disabled={loading || title.trim().length < 15}
            className="relative bg-gradient-to-r from-brand to-brand-500 text-white px-8 py-3 rounded-xl text-[15px] font-medium hover:from-brand-500 hover:to-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group"
          >
            <span className={`inline-flex items-center gap-2 transition-all duration-300 ${loading ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>
              Submit Question
              <FiChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
            {loading && (
              <span className="absolute inset-0 flex items-center justify-center">
                <FiLoader size={20} className="animate-spin" />
              </span>
            )}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AskQuestion;
