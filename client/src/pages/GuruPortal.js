import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiCheck, FiX, FiAward, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

const GuruPortal = () => {
  const { user, isGuru } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!isGuru()) {
      toast.error('Access denied. Guru privileges required.');
      return;
    }
    fetchDashboard();
  }, [isGuru]);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/guru/dashboard');
      setDashboard(res.data);
    } catch (error) {
      toast.error('Error loading dashboard');
    }
    setLoading(false);
  };

  const handleVerify = async (answerId, note) => {
    try {
      await api.post(`/guru/verify/${answerId}`, { note });
      toast.success('Answer verified!');
      const verifiedAnswer = dashboard.pendingVerifications.find(a => a._id === answerId);
      setDashboard(prev => ({
        ...prev,
        pendingVerifications: prev.pendingVerifications.filter(a => a._id !== answerId),
        verifiedByMe: verifiedAnswer ? [{ ...verifiedAnswer, isVerifiedByGuru: true, verifiedAt: new Date().toISOString(), verificationNote: note }, ...prev.verifiedByMe] : prev.verifiedByMe,
        stats: { ...prev.stats, pendingCount: Math.max(0, prev.stats.pendingCount - 1), verifiedCount: (prev.stats.verifiedCount || 0) + 1 }
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error verifying answer');
    }
  };

  const handleUnverify = async (answerId) => {
    try {
      await api.post(`/guru/unverify/${answerId}`);
      toast.success('Verification removed');
      setDashboard(prev => ({
        ...prev,
        verifiedByMe: prev.verifiedByMe.filter(a => a._id !== answerId),
        pendingVerifications: [...prev.pendingVerifications, prev.verifiedByMe.find(a => a._id === answerId)].filter(Boolean),
        stats: { ...prev.stats, verifiedCount: Math.max(0, (prev.stats.verifiedCount || 0) - 1), pendingCount: (prev.stats.pendingCount || 0) + 1 }
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error removing verification');
    }
  };

  if (!isGuru()) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-[32px] font-bold mb-4">Guru Portal</h1>
        <p className="text-gray-600 mb-6">You need guru privileges to access this page.</p>
        <Link to="/login" className="bg-orange-600 text-white px-6 py-3 rounded-lg">
          Login as Guru
        </Link>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[32px] font-bold">Guru Portal</h1>
        <div className="flex items-center space-x-2">
          <FiAward className="text-yellow-500" size={24} />
          <span className="font-semibold">{user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiClock className="text-4xl text-orange-500 mx-auto mb-2" />
           <div className="text-[36px] font-bold">{dashboard?.stats?.pendingCount || 0}</div>
          <div className="text-gray-600">Pending Verifications</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiCheck className="text-4xl text-green-500 mx-auto mb-2" />
           <div className="text-[36px] font-bold">{dashboard?.stats?.verifiedCount || 0}</div>
          <div className="text-gray-600">Verified by You</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiAward className="text-4xl text-yellow-500 mx-auto mb-2" />
           <div className="text-[36px] font-bold">{dashboard?.stats?.totalAnswers || 0}</div>
          <div className="text-gray-600">Total Answers</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-4 font-semibold ${activeTab === 'pending' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
            >
              Pending Verification ({dashboard?.stats?.pendingCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('verified')}
              className={`px-6 py-4 font-semibold ${activeTab === 'verified' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
            >
              Verified by You
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'pending' ? (
            <div className="space-y-4">
              {dashboard?.pendingVerifications?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending verifications</p>
              ) : (
                dashboard?.pendingVerifications?.map(answer => (
                  <div key={answer._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/questions/${answer.question?._id}`} className="font-semibold text-xl hover:text-orange-600">
                           {answer.question?.title}
                         </Link>
                         <p className="text-[14px] text-gray-500 mt-1">
                           Answer by {answer.author?.name} • {new Date(answer.createdAt).toLocaleDateString()}
                         </p>
                         <div className="mt-2 text-[14px] text-gray-700 line-clamp-3">
                          {answer.body?.substring(0, 200)}...
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            const note = prompt('Add verification note (optional):');
                            handleVerify(answer._id, note);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
                        >
                          <FiCheck className="mr-1" /> Verify
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard?.verifiedByMe?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">You haven't verified any answers yet</p>
              ) : (
                dashboard?.verifiedByMe?.map(answer => (
                  <div key={answer._id} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link to={`/questions/${answer.question?._id}`} className="font-semibold text-xl hover:text-orange-600">
                           {answer.question?.title}
                         </Link>
                         <p className="text-[14px] text-gray-500 mt-1">
                           Answer by {answer.author?.name} • Verified {new Date(answer.verifiedAt).toLocaleDateString()}
                         </p>
                         {answer.verificationNote && (
                           <p className="text-[14px] text-green-700 mt-2 italic">
                            "{answer.verificationNote}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnverify(answer._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <FiX size={20} />
                      </button>
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

export default GuruPortal;
