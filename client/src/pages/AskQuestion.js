import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const AskQuestion = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [customTag, setCustomTag] = useState('');
  const [tags, setTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags?limit=100');
      setAvailableTags(res.data.tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleAddTag = () => {
    if (selectedTag && !tags.includes(selectedTag) && tags.length < 5) {
      setTags([...tags, selectedTag]);
      setSelectedTag('');
    }
  };

  const handleAddCustomTag = () => {
    const tag = customTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setCustomTag('');
      setShowCustomInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please login to ask a question');
    if (tags.length === 0) return toast.error('Add at least one tag');

    setLoading(true);
    try {
      const res = await api.post('/questions', { title, body, tags });
      toast.success('Question posted!');
      navigate(`/questions/${res.data._id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error posting question');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Ask a Question</h1>
      
      <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
        <h3 className="font-bold text-orange-800">Writing a good question</h3>
        <ul className="text-sm text-orange-700 mt-2 space-y-1">
          <li>• Summarize your problem in a clear, concise title</li>
          <li>• Include details if helpful (optional)</li>
          <li>• Add tags to help categorize your question</li>
          <li>• Cite scriptures or references when possible</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg p-3"
            placeholder="e.g., What is the significance of the Gayatri Mantra?"
            required
            minLength="15"
            maxLength="300"
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/300 characters</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Body <span className="text-gray-400">(optional)</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border rounded-lg p-3"
            rows="10"
            placeholder="Describe your question in detail. You can use Markdown for formatting. Include shlokas in code blocks using ```sanskrit"
          />
          <p className="text-xs text-gray-500 mt-1">Supports Markdown. Use ```sanskrit for shlokas.</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags <span className="text-red-500">*</span> <span className="text-gray-400">(at least 1, max 5)</span>
          </label>
          
          {/* Selected tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map(tag => (
              <span key={tag} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full flex items-center text-sm">
                {tag}
                <button type="button" onClick={() => handleRemoveTag(tag)} className="ml-2 text-orange-600 hover:text-orange-800 font-bold">
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Dropdown for existing tags */}
          <div className="flex gap-2 mb-3">
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="flex-1 border rounded-lg p-3"
              disabled={tags.length >= 5}
            >
              <option value="">Select a tag...</option>
              {availableTags
                .filter(tag => !tags.includes(tag.name))
                .map(tag => (
                  <option key={tag._id} value={tag.name}>
                    {tag.name} ({tag.count} questions)
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!selectedTag || tags.length >= 5}
              className="bg-orange-600 text-white px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Add custom tag option */}
          {!showCustomInput ? (
            <button
              type="button"
              onClick={() => setShowCustomInput(true)}
              className="text-orange-600 text-sm hover:text-orange-700"
            >
              + Add a new tag
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomTag())}
                className="flex-1 border rounded-lg p-3"
                placeholder="Enter new tag name"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
                className="bg-green-600 text-white px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowCustomInput(false); setCustomTag(''); }}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/questions')}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Posting...' : 'Post Your Question'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AskQuestion;
