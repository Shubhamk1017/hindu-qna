import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const tagDescriptions = {
  'bhagavad-gita': 'The sacred dialogue between Lord Krishna and Arjuna on the battlefield of Kurukshetra, covering dharma, karma, yoga, and devotion.',
  'srimad-bhagavatam': 'The Bhagavata Purana — detailing the pastimes and activities of Vishnu and his devotees.',
  'dharma': 'Duty, righteousness, and the moral law that sustains the universe.',
  'karma': 'The law of cause and effect — how actions shape our destiny.',
  'yoga': 'Spiritual practices and discipline for union with the divine.',
  'meditation': 'Dhyana — practices for mental concentration and spiritual awareness.',
  'vedanta': 'Vedantic philosophy exploring the nature of Brahman, Atman, and ultimate reality.',
  'worship': 'Puja, rituals, and devotional practices offered to deities.',
  'mantras': 'Sacred sounds, syllables, and chants used in prayer and meditation.',
  'philosophy': 'Hindu philosophical schools — Vedanta, Sankhya, Yoga, Nyaya, and more.',
  'festivals': 'Hindu celebrations including Diwali, Holi, Navaratri, and Ekadashi.',
  'deities': 'Gods, goddesses, and divine forms worshipped in Hinduism.',
};

const iconMap = {
  'bhagavad-gita': '📖',
  'srimad-bhagavatam': '📚',
  'dharma': '⚖️',
  'karma': '🔄',
  'yoga': '🧘',
  'meditation': '🧘‍♂️',
  'vedanta': '🕉️',
  'worship': '🙏',
  'mantras': '🎵',
  'philosophy': '💭',
  'festivals': '🎉',
  'deities': '🔱',
};

const Tags = () => {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await api.get('/tags');
      setTags(res.data.tags);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
    setLoading(false);
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="font-serif text-[32px] font-bold text-gray-900">Tags</div>
        <p className="text-[15px] text-gray-500 mt-1">
          {tags.length} curated tags — auto-assigned by AI when questions are asked.
        </p>
      </div>

      {/* Info */}
      <div className="bg-cream border border-gray-200 rounded-[10px] p-4 mb-6">
        <p className="text-[14px] text-gray-600">
          Tags categorize questions by scripture or topic. When you ask a question, AI automatically assigns the most relevant tags.
          Verified experts can refine tags when answering.
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-80 border-[1.5px] border-gray-200 rounded-[9px] px-4 py-2.5 text-[15px] outline-none focus:border-brand transition-colors"
          placeholder="Filter by tag name..."
        />
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredTags.map(tag => (
          <Link
            key={tag._id}
            to={`/questions?tag=${tag.name}`}
            className="bg-white border border-gray-200 rounded-[10px] p-5 hover:border-brand-100 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="text-lg">{iconMap[tag.name] || '🏷️'}</span>
                <span className="font-serif text-[16px] font-semibold text-gray-900">{tag.name}</span>
              </div>
              <span className="text-[13px] text-gray-400 bg-cream border border-gray-200 rounded-lg px-2 py-0.5">
                {tag.count || 0}
              </span>
            </div>
            <p className="text-[14px] text-gray-500 leading-relaxed">
              {tagDescriptions[tag.name] || 'A topic related to Hindu Sanatan Dharma.'}
            </p>
          </Link>
        ))}
      </div>

      {filteredTags.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No tags found matching "{search}"
        </div>
      )}
    </div>
  );
};

export default Tags;
