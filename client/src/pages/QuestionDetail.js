import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiArrowUp, FiArrowDown, FiCheck, FiMessageSquare, FiBookmark, FiFlag } from 'react-icons/fi';
import toast from 'react-hot-toast';

const QuestionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(null);

  useEffect(() => {
    fetchQuestion();
  }, [id]);

  const fetchQuestion = async () => {
    try {
      const res = await api.get(`/questions/${id}`);
      setQuestion(res.data);
    } catch (error) {
      toast.error('Error loading question');
    }
    setLoading(false);
  };

  const handleVote = async (type, questionId = null, answerId = null) => {
    if (!user) return toast.error('Please login to vote');
    
    try {
      if (questionId) {
        await api.post(`/questions/${questionId}/vote`, { type });
      } else if (answerId) {
        await api.post(`/answers/${answerId}/vote`, { type });
      }
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error voting');
    }
  };

  const handleAccept = async (answerId) => {
    try {
      await api.post(`/questions/${id}/accept/${answerId}`);
      toast.success('Answer accepted!');
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error accepting answer');
    }
  };

  const handleCreateBounty = async (questionId, amount) => {
    try {
      await api.post(`/bounties/${questionId}`, { amount });
      toast.success(`Bounty of ${amount} reputation set!`);
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error setting bounty');
    }
  };

  const handleAwardBounty = async (questionId, answerId) => {
    try {
      await api.post(`/bounties/${questionId}/award/${answerId}`);
      toast.success('Bounty awarded!');
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error awarding bounty');
    }
  };

  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!answerBody.trim()) return toast.error('Answer cannot be empty');

    try {
      await api.post(`/answers/${id}`, { body: answerBody });
      toast.success('Answer posted!');
      setAnswerBody('');
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error posting answer');
    }
  };

  const handleAddComment = async (postId, postType) => {
    if (!commentBody.trim()) return;

    try {
      await api.post(`/comments/${postType}/${postId}`, { body: commentBody });
      toast.success('Comment added!');
      setCommentBody('');
      setShowCommentForm(null);
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding comment');
    }
  };

  const renderMarkdown = (content) => (
    <ReactMarkdown
      components={{
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline && match ? (
            <SyntaxHighlighter
              style={tomorrow}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        }
      }}
    >
      {content}
    </ReactMarkdown>
  );

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!question) return <div className="text-center py-8">Question not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex">
          <div className="flex flex-col items-center space-y-2 mr-6">
            <button onClick={() => handleVote('upvote', question._id)} className="text-gray-400 hover:text-orange-600">
              <FiArrowUp size={24} />
            </button>
            <span className="text-xl font-bold">{question.upvotes?.length - question.downvotes?.length || 0}</span>
            <button onClick={() => handleVote('downvote', question._id)} className="text-gray-400 hover:text-red-600">
              <FiArrowDown size={24} />
            </button>
            <button className="text-gray-400 hover:text-orange-600 mt-2">
              <FiBookmark size={20} />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-4">{question.title}</h1>
            <div className="prose max-w-none mb-4">
              {renderMarkdown(question.body)}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {question.tags?.map(tag => (
                <Link key={tag._id} to={`/tags/${tag.name}`} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs hover:bg-orange-200">
                  {tag.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
              <span>{question.views} views</span>
              <div className="flex items-center space-x-4">
                <button onClick={() => setShowCommentForm(question._id)} className="flex items-center hover:text-orange-600">
                  <FiMessageSquare className="mr-1" /> Add comment
                </button>
                {user && String(user._id) === String(question.author?._id) && !question.isBounty && (
                  <button 
                    onClick={() => {
                      const amount = prompt('Enter bounty amount (reputation to offer):');
                      if (amount && parseInt(amount) > 0) {
                        handleCreateBounty(question._id, parseInt(amount));
                      }
                    }}
                    className="flex items-center text-yellow-600 hover:text-yellow-700"
                  >
                    ⚠️ Set Bounty
                  </button>
                )}
                {question.isBounty && (
                  <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                    ⚠️ {question.bountyAmount} reputation bounty
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {question.comments?.length > 0 && (
          <div className="mt-4 pl-16 border-l-2 border-gray-200">
            {question.comments.map(comment => (
              <div key={comment._id} className="text-sm text-gray-600 py-2">
                {comment.body} – <span className="text-orange-600">{comment.author?.name}</span>
              </div>
            ))}
          </div>
        )}

        {showCommentForm === question._id && (
          <div className="mt-4 pl-16">
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              className="w-full border rounded-lg p-2 text-sm"
              rows="2"
              placeholder="Add a comment..."
            />
            <div className="flex space-x-2 mt-2">
              <button onClick={() => handleAddComment(question._id, 'question')} className="bg-orange-600 text-white px-3 py-1 rounded text-sm">
                Add
              </button>
              <button onClick={() => setShowCommentForm(null)} className="text-gray-500 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">{question.answers?.length || 0} Answers</h2>
      </div>

      {question.answers?.map(answer => (
        <div key={answer._id} className={`bg-white rounded-lg shadow-md p-6 mb-4 ${answer.isAccepted ? 'border-2 border-green-500' : ''}`}>
          <div className="flex">
            <div className="flex flex-col items-center space-y-2 mr-6">
              <button onClick={() => handleVote('upvote', null, answer._id)} className="text-gray-400 hover:text-orange-600">
                <FiArrowUp size={24} />
              </button>
              <span className="text-xl font-bold">{answer.upvotes?.length - answer.downvotes?.length || 0}</span>
              <button onClick={() => handleVote('downvote', null, answer._id)} className="text-gray-400 hover:text-red-600">
                <FiArrowDown size={24} />
              </button>
              {answer.isAccepted && (
                <div className="text-green-600 mt-2">
                  <FiCheck size={24} />
                  <span className="text-xs">Accepted</span>
                </div>
              )}
              {answer.isVerifiedByGuru && (
                <div className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mt-2">
                  🏅 Guru Verified
                </div>
              )}
              {answer.isAIGenerated && (
                <div className={`px-2 py-1 rounded text-xs mt-2 ${answer.isVerifiedByAdmin ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {answer.isVerifiedByAdmin ? '✅ AI Verified by Admin' : '🤖 AI Generated - Pending Verification'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="prose max-w-none mb-4">
                {renderMarkdown(answer.body)}
              </div>
              {answer.isVerifiedByGuru && answer.verificationNote && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Verification Note:</strong> {answer.verificationNote}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Verified by {answer.verifiedBy?.name}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
                <div className="flex items-center space-x-4">
                  {user && String(user._id) === String(question.author?._id) && !answer.isAccepted && (
                    <button onClick={() => handleAccept(answer._id)} className="text-green-600 hover:text-green-700">
                      Accept this answer
                    </button>
                  )}
                  {user && String(user._id) === String(question.author?._id) && question.isBounty && !question.bountyWinner && (
                    <button onClick={() => handleAwardBounty(question._id, answer._id)} className="text-yellow-600 hover:text-yellow-700 font-semibold">
                      ⚠️ Award Bounty
                    </button>
                  )}
                  <button onClick={() => setShowCommentForm(answer._id)} className="flex items-center hover:text-orange-600">
                    <FiMessageSquare className="mr-1" /> Add comment
                  </button>
                </div>
                <span>answered {new Date(answer.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {answer.comments?.length > 0 && (
            <div className="mt-4 pl-16 border-l-2 border-gray-200">
              {answer.comments.map(comment => (
                <div key={comment._id} className="text-sm text-gray-600 py-2">
                  {comment.body} – <span className="text-orange-600">{comment.author?.name}</span>
                </div>
              ))}
            </div>
          )}

          {showCommentForm === answer._id && (
            <div className="mt-4 pl-16">
              <textarea
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
                rows="2"
                placeholder="Add a comment..."
              />
              <div className="flex space-x-2 mt-2">
                <button onClick={() => handleAddComment(answer._id, 'answer')} className="bg-orange-600 text-white px-3 py-1 rounded text-sm">
                  Add
                </button>
                <button onClick={() => setShowCommentForm(null)} className="text-gray-500 text-sm">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {user && String(user._id) !== String(question.author?._id) && ['guru', 'acharya', 'admin', 'scholar'].includes(user.role) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Your Answer</h3>
          <form onSubmit={handleSubmitAnswer}>
            <textarea
              value={answerBody}
              onChange={(e) => setAnswerBody(e.target.value)}
              className="w-full border rounded-lg p-4 text-sm"
              rows="6"
              placeholder="Write your answer here... You can use Markdown for formatting and include shlokas in code blocks."
              required
            />
            <div className="mt-4">
              <button type="submit" className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700">
                Post Your Answer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuestionDetail;
