import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiCheck, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

const ReviewQueues = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState('first_question');

  const queues = [
    { id: 'first_question', name: 'First Questions', description: 'Review questions from new users' },
    { id: 'first_answer', name: 'First Answers', description: 'Review answers from new users' },
    { id: 'late_answer', name: 'Late Answers', description: 'Review late answers to old questions' },
    { id: 'close_vote', name: 'Close Votes', description: 'Review questions to close' }
  ];

  useEffect(() => {
    fetchReviews();
  }, [activeQueue]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reviews/${activeQueue}`);
      setReviews(res.data.reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
    setLoading(false);
  };

  const handleReview = async (reviewId, action) => {
    try {
      await api.post(`/reviews/${reviewId}/review`, { action });
      toast.success(`Review ${action === 'approve' ? 'approved' : 'rejected'}`);
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error reviewing');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-[32px] font-bold mb-6">Review Queues</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h3 className="font-bold mb-3">Queues</h3>
            <div className="space-y-2">
              {queues.map(queue => (
                <button
                  key={queue.id}
                  onClick={() => setActiveQueue(queue.id)}
                  className={`w-full text-left px-3 py-2 rounded text-[14px] ${
                    activeQueue === queue.id ? 'bg-orange-100 text-orange-800' : 'hover:bg-gray-100'
                  }`}
                >
                  {queue.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b">
              <h2 className="text-[22px] font-bold">{queues.find(q => q.id === activeQueue)?.name}</h2>
              <p className="text-gray-500 text-[14px]">{queues.find(q => q.id === activeQueue)?.description}</p>
            </div>

            <div className="p-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items in queue. Good work!
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Link to={`/questions/${review.post?._id}`} className="font-semibold hover:text-orange-600">
                            {review.post?.title}
                          </Link>
                          <p className="text-[14px] text-gray-500 mt-1">
                             by {review.author?.name} • {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReview(review._id, 'approve')}
                            className="bg-green-600 text-white px-3 py-1 rounded flex items-center hover:bg-green-700"
                          >
                            <FiCheck className="mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => handleReview(review._id, 'reject')}
                            className="bg-red-600 text-white px-3 py-1 rounded flex items-center hover:bg-red-700"
                          >
                            <FiX className="mr-1" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueues;
