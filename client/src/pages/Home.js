import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiMessageSquare, FiUsers, FiTag, FiTrendingUp } from 'react-icons/fi';

const Home = () => {
  const [stats, setStats] = useState({ questions: 0, users: 0, answers: 0, tags: 0 });
  const [hotQuestions, setHotQuestions] = useState([]);
  const [topTags, setTopTags] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [questionsRes, tagsRes, statsRes] = await Promise.all([
          api.get('/questions?sort=votes&limit=5'),
          api.get('/tags?limit=10'),
          api.get('/admin/public-stats')
        ]);
        setHotQuestions(questionsRes.data.questions);
        setTopTags(tagsRes.data.tags);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg p-8 mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Hindu QnA</h1>
        <p className="text-xl mb-6">
          A community-driven platform for authentic answers about Hinduism, Sanatan Dharma, and related topics.
        </p>
        <div className="flex space-x-4">
          <Link to="/questions/ask" className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-100">
            Ask a Question
          </Link>
          <Link to="/chat" className="border-2 border-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-orange-600">
            Try AI Assistant
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <FiMessageSquare className="text-4xl text-orange-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats.questions}</div>
          <div className="text-gray-600">Questions</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <FiUsers className="text-4xl text-orange-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats.users}</div>
          <div className="text-gray-600">Users</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <FiTrendingUp className="text-4xl text-orange-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats.answers}</div>
          <div className="text-gray-600">Answers</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-md text-center">
          <FiTag className="text-4xl text-orange-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats.tags}</div>
          <div className="text-gray-600">Tags</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">Hot Questions</h2>
          <div className="space-y-4">
            {hotQuestions.map(question => (
              <div key={question._id} className="bg-white rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow">
                <Link to={`/questions/${question._id}`} className="text-lg font-semibold text-gray-800 hover:text-orange-600">
                  {question.title}
                </Link>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                  <span>{question.upvotes?.length || 0} votes</span>
                  <span>{question.answers?.length || 0} answers</span>
                  <span>{question.views} views</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {question.tags?.map(tag => (
                    <span key={tag._id} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Link to="/questions" className="block text-center text-orange-600 hover:text-orange-700 mt-4 font-semibold">
            View all questions →
          </Link>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Popular Tags</h2>
          <div className="bg-white rounded-lg p-4 shadow-md">
            <div className="flex flex-wrap gap-2">
              {topTags.map(tag => (
                <Link
                  key={tag._id}
                  to={`/tags/${tag.name}`}
                  className="bg-gray-100 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm transition-colors"
                >
                  {tag.name}
                  <span className="text-gray-500 ml-1">({tag.count})</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-md mt-6">
            <h3 className="font-bold mb-3">Guru Verified Answers</h3>
            <p className="text-sm text-gray-600 mb-3">
              Look for the gold badge indicating answers verified by certified gurus and scholars.
            </p>
            <div className="flex items-center space-x-2 text-sm">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">🏅 Guru Verified</span>
              <span className="text-gray-500">= Authenticated knowledge</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
