import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiBook, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';

function suggestTags(title, body) {
  const text = `${title} ${body}`.toLowerCase();
  const matched = [];
  if (/bhagavad\s*gita|gita|krishna.*arjuna|chapter.*verse/i.test(text)) matched.push('bhagavad-gita');
  if (/bhagavatam|bhagavata|srimad|purana/i.test(text)) matched.push('srimad-bhagavatam');
  if (/\bdharma\b|duty|righteous|moral|ethics?|varna|ashrama/i.test(text)) matched.push('dharma');
  if (/\bkarma\b|action.*consequence|fruitive|works?/i.test(text)) matched.push('karma');
  if (/\byoga\b|asana|pranayama|patanjali|hatha/i.test(text)) matched.push('yoga');
  if (/\bmeditat|dhyana|contemplat|mindful/i.test(text)) matched.push('meditation');
  if (/\bvedanta\b|brahman|atman|advaita|shankara/i.test(text)) matched.push('vedanta');
  if (/\bworship|puja|ritual|ceremony|offering/i.test(text)) matched.push('worship');
  if (/\bmantra|chant|japa|gayatri|\bom\b|hare krishna/i.test(text)) matched.push('mantras');
  if (/\bphilosophy|sankhya|nyaya|mimamsa/i.test(text)) matched.push('philosophy');
  if (/\bfestival|diwali|holi|navratri|ekadashi|janmashtami/i.test(text)) matched.push('festivals');
  if (/\bdeity|god|goddess|vishnu|shiva|rama|krishna|lakshmi/i.test(text)) matched.push('deities');
  if (matched.length === 0) matched.push('philosophy');
  return matched.slice(0, 3);
}

const AskQuestion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const suggestedTags = suggestTags(title, body);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to ask a question');

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
    <div className="max-w-[680px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="font-serif text-[32px] font-bold text-gray-900 mb-6 flex items-center gap-2.5">
        <span className="text-brand">?</span> Ask a Question
      </div>

      {/* Notice */}
      <div className="bg-brand-50 border border-brand-100 rounded-[10px] p-4 mb-6">
        <div className="text-[14px] font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
          <FiBook size={14} className="text-brand" /> Before you ask
        </div>
        <ul className="text-[14px] text-gray-600 space-y-1 ml-4 list-disc">
          <li>Search existing questions to avoid duplicates</li>
          <li>Provide sufficient context and detail</li>
          <li>Tags are assigned automatically based on your question</li>
          <li>Only verified experts can post official answers</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-[14px] font-semibold text-gray-900 mb-1">Question Title</label>
          <div className="text-[13px] text-gray-400 mb-2">Be specific and concise.</div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-[9px] px-4 py-2.5 bg-white text-[15px] outline-none focus:border-brand transition-colors"
            placeholder="e.g. What is the significance of Ekadashi fasting?"
            required
            minLength="15"
            maxLength="300"
          />
          <div className="text-[13px] text-gray-400 mt-1 text-right">{title.length}/300</div>
        </div>

        {/* Body */}
        <div>
          <label className="block text-[14px] font-semibold text-gray-900 mb-1">Question Details</label>
          <div className="text-[13px] text-gray-400 mb-2">Provide context, background, and what you've already researched.</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border-[1.5px] border-gray-200 rounded-[9px] px-4 py-3 bg-white text-[15px] outline-none resize-y min-h-[160px] leading-relaxed focus:border-brand transition-colors"
            placeholder="Describe your question in detail..."
          />
        </div>

        {/* Auto-suggested tags */}
        <div>
          <label className="block text-[14px] font-semibold text-gray-900 mb-1">Tags</label>
          <div className="text-[13px] text-gray-400 mb-2 flex items-center gap-1">
            <FiAlertCircle size={12} /> Auto-detected from your question. Guru/admin can edit later.
          </div>
          <div className="flex flex-wrap gap-1.5">
            {suggestedTags.map(tag => (
              <span key={tag} className="bg-brand-50 border border-brand-100 text-brand text-[13px] px-3 py-1 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="bg-brand text-white px-6 py-2.5 rounded-[9px] text-[15px] font-medium hover:bg-brand-500 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Posting...' : 'Submit Question'}
        </button>
      </form>
    </div>
  );
};

export default AskQuestion;
