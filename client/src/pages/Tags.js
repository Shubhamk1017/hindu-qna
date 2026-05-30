import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const tagDescriptions = {
  'vedas': 'The oldest scriptures of Hinduism, including Rigveda, Samaveda, Yajurveda, and Atharvaveda.',
  'upanishads': 'Philosophical texts forming the basis of Vedanta philosophy, exploring the nature of Brahman and Atman.',
  'bhagavad-gita': 'A 700-verse Hindu scripture that is part of the epic Mahabharata, containing a conversation between Lord Krishna and Arjuna.',
  'puranas': 'A vast genre of Indian literature about legends, traditional history, and cosmology.',
  'deities': 'Divine beings worshipped in Hinduism including Brahma, Vishnu, Shiva, Devi, and many others.',
  'rituals': 'Sacred ceremonies and practices performed in Hinduism, including puja, homa, and samskaras.',
  'mantras': 'Sacred sounds, syllables, or phrases used in prayer and meditation, like Om and Gayatri Mantra.',
  'festivals': 'Hindu celebrations including Diwali, Holi, Navaratri, Ganesh Chaturthi, and more.',
  'philosophy': 'Hindu philosophical schools including Vedanta, Yoga, Samkhya, Nyaya, Vaisheshika, and Mimamsa.',
  'yoga': 'Physical, mental, and spiritual practices for self-realization and union with the divine.',
  'karma': 'The law of cause and effect where actions determine future consequences.',
  'dharma': 'Righteousness, duty, ethics, and the cosmic order that sustains the universe.',
  'moksha': 'Liberation from the cycle of birth and death, the ultimate goal of Hindu spiritual practice.',
  'samskaras': 'Sacred rites of passage marking important life events from birth to death.',
  'temple': 'Sacred places of worship in Hinduism, housing deities and serving as community centers.',
  'scripture': 'Holy texts and writings considered sacred in Hinduism.',
  'avatars': 'Divine incarnations of deities, particularly the ten avatars of Lord Vishnu.',
  'worship': 'Devotional practices and offerings made to deities.',
  'meditation': 'Dhyana - practices for mental concentration and spiritual awareness.',
  'diet': 'Hindu dietary practices including vegetarianism and fasting traditions.',
  'sects': 'Different Hindu traditions and denominations like Vaishnavism, Shaivism, and Shaktism.',
  'vedanta': 'A school of Hindu philosophy based on the Upanishads, Brahma Sutras, and Bhagavad Gita.',
  'sanskrit': 'The ancient sacred language of Hinduism in which most scriptures are written.',
  'guru': 'A spiritual teacher or guide who leads disciples on the path of spiritual evolution.',
  ' caste': 'The traditional social classification system in Hindu society.',
  'diwali': 'The festival of lights celebrating the victory of good over evil.',
  'holi': 'The festival of colors celebrating spring, love, and the triumph of good over evil.',
  'ramayana': 'One of the two major Sanskrit epics of ancient India, telling the story of Lord Rama.',
  'mahabharata': 'One of the two major Sanskrit epics, the longest epic poem ever written.',
  'om': 'The sacred sound and spiritual symbol in Hinduism, representing Brahman.',
  'chakras': 'Energy centers in the subtle body described in yogic and tantric traditions.',
  'puja': 'A worship ritual of honoring deities with offerings and prayers.',
  'homam': 'A fire ritual or sacrifice performed in Hinduism for various purposes.',
  'astrology': 'Jyotish Shastra - Hindu system of astrology and astronomy.',
  'ayurveda': 'Traditional Indian system of medicine and holistic healing.',
  'default': 'A topic related to Hinduism, Sanatan Dharma, and its practices.'
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

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Tags</h1>
        <p className="text-gray-500">{tags.length} tags</p>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">
          A tag is a keyword or label that categorizes your question with other, similar questions. 
          Using the right tags makes it easier for others to find and answer your question.
        </p>
      </div>
      
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 border rounded-lg px-4 py-2"
          placeholder="Filter by tag name..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTags.map(tag => (
          <Link
            key={tag._id}
            to={`/questions?tag=${tag.name}`}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-sm font-semibold">
                {tag.name}
              </span>
              <span className="text-xs text-gray-500">{tag.count} questions</span>
            </div>
            <p className="text-sm text-gray-600">
              {tag.description || tagDescriptions[tag.name] || tagDescriptions['default']}
            </p>
          </Link>
        ))}
      </div>

      {filteredTags.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No tags found matching "{search}"
        </div>
      )}
    </div>
  );
};

export default Tags;
