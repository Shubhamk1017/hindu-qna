import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { FiClock, FiTrendingUp, FiMessageSquare } from 'react-icons/fi';

const Questions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const currentSort = searchParams.get('sort') || 'newest';
  const currentTag = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('search') || '';

  useEffect(() => {
    fetchQuestions();
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page);
      params.set('sort', currentSort);
      if (currentTag) params.set('tag', currentTag);
      if (searchQuery) params.set('search', searchQuery);

      const res = await api.get(`/questions?${params}`);
      setQuestions(res.data.questions);
      setPagination({ page: res.data.currentPage, totalPages: res.data.totalPages });
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const handleSort = (sort) => {
    setSearchParams({ sort, tag: currentTag, search: searchQuery });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Questions</h1>
        <Link to="/questions/ask" className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700">
          Ask Question
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-3/4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => handleSort('newest')}
                className={`px-4 py-2 rounded-lg ${currentSort === 'newest' ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <FiClock className="inline mr-1" /> Newest
              </button>
              <button
                onClick={() => handleSort('votes')}
                className={`px-4 py-2 rounded-lg ${currentSort === 'votes' ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <FiTrendingUp className="inline mr-1" /> Votes
              </button>
              <button
                onClick={() => handleSort('unverified')}
                className={`px-4 py-2 rounded-lg ${currentSort === 'unverified' ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                <FiMessageSquare className="inline mr-1" /> Unverified
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {questions.map(question => (
                <div key={question._id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
                  <div className="flex">
                    <div className="flex flex-col items-center space-y-2 mr-4 text-center">
                      <div className="text-lg font-bold">{question.upvotes?.length - question.downvotes?.length || 0}</div>
                      <div className="text-sm text-gray-500">votes</div>
                      <div className={`text-lg font-bold ${question.answers?.length > 0 ? 'text-green-600' : ''}`}>
                        {question.answers?.length || 0}
                      </div>
                      <div className="text-sm text-gray-500">answers</div>
                      <div className="text-sm text-gray-500">{question.views} views</div>
                    </div>
                    <div className="flex-1">
                      <Link to={`/questions/${question._id}`} className="text-xl font-semibold text-gray-800 hover:text-orange-600">
                        {question.title}
                      </Link>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {question.tags?.map(tag => (
                          <span key={tag._id} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                            {tag.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                        <span>
                          asked by {question.author?.name} • {new Date(question.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-center space-x-2 mt-6">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setSearchParams({ page, sort: currentSort, tag: currentTag })}
                  className={`px-4 py-2 rounded-lg ${page === pagination.page ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="font-bold mb-3">Filter by Tag</h3>
            <div className="flex flex-wrap gap-2">
              {['vedas', 'upanishads', 'bhagavad-gita', 'puranas', 'deities', 'rituals'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setSearchParams({ tag, sort: currentSort })}
                  className={`px-3 py-1 rounded text-sm ${currentTag === tag ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-bold mb-3">Related Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/tags" className="text-orange-600 hover:text-orange-700">Browse all tags</Link></li>
              <li><Link to="/bounties" className="text-orange-600 hover:text-orange-700">Active bounties</Link></li>
              <li><Link to="/chat" className="text-orange-600 hover:text-orange-700">AI Assistant</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Questions;
