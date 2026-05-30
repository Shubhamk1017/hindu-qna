import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiAward, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Bounties = () => {
  const { user } = useAuth();
  const [bounties, setBounties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBounties();
  }, []);

  const fetchBounties = async () => {
    try {
      const res = await api.get('/bounties/active');
      setBounties(res.data);
    } catch (error) {
      console.error('Error fetching bounties:', error);
    }
    setLoading(false);
  };

  const handleCreateBounty = async (questionId) => {
    const amount = prompt('Enter bounty amount (reputation points):');
    if (!amount) return;

    try {
      await api.post(`/bounties/${questionId}`, { amount: parseInt(amount) });
      toast.success('Bounty created!');
      fetchBounties();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error creating bounty');
    }
  };

  const handleAwardBounty = async (questionId, answerId) => {
    try {
      await api.post(`/bounties/${questionId}/award/${answerId}`);
      toast.success('Bounty awarded!');
      fetchBounties();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error awarding bounty');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Active Bounties</h1>

      {bounties.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <FiAward className="text-6xl text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No active bounties</h2>
          <p className="text-gray-500 mb-4">Be the first to offer a bounty on a question!</p>
          <Link to="/questions" className="text-orange-600 hover:text-orange-700">
            Browse questions →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bounties.map(bounty => (
            <div key={bounty._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-bold">
                      +{bounty.bountyAmount} reputation
                    </span>
                    <span className="text-gray-500 text-sm flex items-center">
                      <FiClock className="mr-1" />
                      Expires {new Date(bounty.bountyExpiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <Link to={`/questions/${bounty._id}`} className="text-xl font-semibold hover:text-orange-600">
                    {bounty.title}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    Asked by {bounty.author?.name}
                  </p>
                </div>
                {user && user._id === bounty.author?._id && (
                  <button
                    onClick={() => handleCreateBounty(bounty._id)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
                  >
                    Award Bounty
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bounties;
