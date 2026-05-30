import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { FiAward, FiMessageSquare, FiEdit } from 'react-icons/fi';

const Profile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions');

  useEffect(() => {
    fetchProfile();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchProfile = async () => {
    try {
      const [profileRes, questionsRes, answersRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get(`/users/${id}/questions`),
        api.get(`/users/${id}/answers`)
      ]);
      setProfile(profileRes.data);
      setQuestions(questionsRes.data.questions);
      setAnswers(answersRes.data.answers);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!profile) return <div className="text-center py-8">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center">
          <div className="w-20 h-20 bg-orange-400 rounded-full flex items-center justify-center text-white text-3xl font-bold mr-6">
            {profile.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile.name}</h1>
            <p className="text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                {profile.reputation} reputation
              </span>
              {profile.role !== 'user' && (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                  {profile.role?.charAt(0).toUpperCase() + profile.role?.slice(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{questions.length}</div>
            <div className="text-sm text-gray-500">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{answers.length}</div>
            <div className="text-sm text-gray-500">Answers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{profile.badges?.length || 0}</div>
            <div className="text-sm text-gray-500">Badges</div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges?.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="font-semibold mb-3 flex items-center">
              <FiAward className="mr-2" /> Badges
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile.badges.map((badge, i) => (
                <span key={i} className={`px-3 py-1 rounded-full text-sm ${
                  badge.type === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                  badge.type === 'silver' ? 'bg-gray-100 text-gray-800' :
                  badge.type === 'special' ? 'bg-purple-100 text-purple-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {badge.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-4 font-semibold flex items-center ${activeTab === 'questions' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FiMessageSquare className="mr-2" /> Questions ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('answers')}
              className={`px-6 py-4 font-semibold flex items-center ${activeTab === 'answers' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FiEdit className="mr-2" /> Answers ({answers.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'questions' ? (
            <div className="space-y-4">
              {questions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No questions asked yet</p>
              ) : (
                questions.map(q => (
                  <div key={q._id} className="border-b pb-4 last:border-0">
                    <div className="flex">
                      <div className="flex flex-col items-center space-y-1 mr-4 text-center min-w-[60px]">
                        <div className={`text-lg font-bold ${q.upvotes?.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {q.upvotes?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">votes</div>
                        <div className={`text-lg font-bold ${q.answers?.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {q.answers?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">answers</div>
                      </div>
                      <div className="flex-1">
                        <Link to={`/questions/${q._id}`} className="text-lg font-semibold text-gray-800 hover:text-orange-600">
                          {q.title}
                        </Link>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {q.tags?.map(tag => (
                            <span key={tag._id} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                              {tag.name}
                            </span>
                          ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Asked {new Date(q.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {answers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No answers given yet</p>
              ) : (
                answers.map(a => (
                  <div key={a._id} className="border-b pb-4 last:border-0">
                    <div className="flex">
                      <div className="flex flex-col items-center space-y-1 mr-4 text-center min-w-[60px]">
                        <div className={`text-lg font-bold ${a.upvotes?.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {a.upvotes?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">votes</div>
                      </div>
                      <div className="flex-1">
                        <Link to={`/questions/${a.question?._id}`} className="text-lg font-semibold text-gray-800 hover:text-orange-600">
                          {a.question?.title || 'Question'}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{a.body?.substring(0, 150)}...</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>Answered {new Date(a.createdAt).toLocaleDateString()}</span>
                          {a.isVerifiedByAdmin && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">✅ Verified</span>
                          )}
                          {a.isVerifiedByGuru && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">🏅 Guru Verified</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
