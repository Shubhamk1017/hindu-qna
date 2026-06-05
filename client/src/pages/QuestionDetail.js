import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import MarkdownRenderer from '../components/MarkdownRenderer';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiArrowUp, FiArrowDown, FiCheck, FiMessageSquare, FiBookmark, FiClock, FiEye, FiUser, FiSend, FiTag, FiLink, FiChevronDown, FiChevronUp, FiAward } from 'react-icons/fi';
import ScriptureInput from '../components/ScriptureAutocomplete';
import toast from 'react-hot-toast';

const VALID_TAGS = ['bhagavad-gita', 'srimad-bhagavatam', 'dharma', 'karma', 'yoga', 'meditation', 'vedanta', 'worship', 'mantras', 'philosophy', 'festivals', 'deities'];

const VoteButton = ({ active, onClick, type }) => (
  <button
    onClick={onClick}
    className={`group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
      active
        ? type === 'up'
          ? 'bg-brand text-white shadow-md shadow-brand/20 scale-110'
          : 'bg-red-500 text-white shadow-md shadow-red-500/20 scale-110'
        : 'bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand border border-gray-200 hover:border-brand-200 hover:scale-105'
    }`}
  >
    {type === 'up' ? <FiArrowUp size={18} className={active ? 'animate-bounce' : ''} /> : <FiArrowDown size={18} className={active ? 'animate-bounce' : ''} />}
  </button>
);

const Badge = ({ children, variant = 'default' }) => {
  const variants = {
    accepted: 'bg-green-50 text-green-700 border-green-200',
    guru: 'bg-amber-50 text-amber-700 border-amber-200',
    ai: 'bg-blue-50 text-blue-700 border-blue-200',
    aiVerified: 'bg-green-50 text-green-700 border-green-200',
    bounty: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    default: 'bg-gray-50 text-gray-600 border-gray-200',
  };    const tooltipText = variant === 'guru' && children?.length > 1
      ? children.find(c => c?.type === 'span')?.props?.children
      : null;
    const hasTooltip = !!tooltipText;
    return (
    <span
      className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2.5 py-1 rounded-full border ${variants[variant]} ${hasTooltip ? 'relative cursor-help' : ''}`}
      title={tooltipText || undefined}
    >
      {children}
    </span>
  );
};

const QuestionDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answerBody, setAnswerBody] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [voting, setVoting] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showComments, setShowComments] = useState({});
  const [copied, setCopied] = useState(false);
  const [expandedAnswers, setExpandedAnswers] = useState({});

  useEffect(() => {
    fetchQuestion();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchQuestion = async () => {
    try {
      const res = await api.get(`/questions/${id}`);
      setQuestion(res.data);
      setSelectedTags((res.data.tags || []).map(t => t.name));

      const viewed = JSON.parse(localStorage.getItem('viewedQuestions') || '[]');
      if (!viewed.includes(id)) {
        await api.post(`/questions/${id}/view`);
        viewed.push(id);
        localStorage.setItem('viewedQuestions', JSON.stringify(viewed));
        setQuestion(prev => ({ ...prev, views: (prev.views || 0) + 1 }));
      }
    } catch (error) {
      toast.error('Error loading question');
    }
    setLoading(false);
  };

  const handleVote = async (type, questionId = null, answerId = null) => {
    if (!user) return toast.error('Please login to vote');
    if (voting) return;
    setVoting(true);
    try {
      if (questionId) await api.post(`/questions/${questionId}/vote`, { type });
      else if (answerId) await api.post(`/answers/${answerId}/vote`, { type });
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error voting');
    }
    setTimeout(() => setVoting(false), 500);
  };

  const isUpvoted = (item) => item.upvotes?.some(id => String(id) === String(user?._id));
  const isDownvoted = (item) => item.downvotes?.some(id => String(id) === String(user?._id));

  const handleAccept = async (answerId) => {
    try {
      await api.post(`/questions/${id}/accept/${answerId}`);
      toast.success('Answer accepted!');
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error accepting answer');
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
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding comment');
    }
  };

  const handleSaveTags = async () => {
    if (selectedTags.length === 0) return toast.error('Select at least one tag');
    try {
      await api.put(`/questions/${id}/tags`, { tags: selectedTags });
      toast.success('Tags updated!');
      setEditingTags(false);
      fetchQuestion();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error updating tags');
    }
  };

  const toggleTag = (tagName) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else if (selectedTags.length < 5) {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const toggleComments = (itemId) => {
    setShowComments(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const toggleAnswerExpand = (answerId) => {
    setExpandedAnswers(prev => ({ ...prev, [answerId]: !prev[answerId] }));
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="h-4 bg-gray-100 rounded w-full"></div>
            <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            <div className="h-4 bg-gray-100 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-16 text-center">
        <div className="text-gray-400 text-lg">Question not found</div>
        <Link to="/questions" className="text-brand text-sm mt-2 inline-block hover:text-brand-500">Back to questions</Link>
      </div>
    );
  }

  const canEditTags = user && ['guru', 'acharya', 'admin'].includes(user.role);
  const votes = question.upvotes?.length - question.downvotes?.length || 0;
  const sortedAnswers = [...(question.answers || [])].sort((a, b) => {
    if (a.isAccepted && !b.isAccepted) return -1;
    if (!a.isAccepted && b.isAccepted) return 1;
    return (b.upvotes?.length || 0) - (a.upvotes?.length || 0);
  });

  return (
    <div className="max-w-[800px] mx-auto px-6 py-8">
      {/* ═══════════════════════════════════════════════════════════════════
          QUESTION
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm mb-6 overflow-hidden">
        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-bl-[60px] -z-0"></div>

        <div className="relative flex gap-5">
          {/* Vote Column */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <VoteButton active={isUpvoted(question)} onClick={() => handleVote('upvote', question._id)} type="up" />
            <span className={`text-xl font-bold transition-colors ${votes > 0 ? 'text-brand' : votes < 0 ? 'text-red-500' : 'text-gray-900'}`}>
              {votes}
            </span>
            <VoteButton active={isDownvoted(question)} onClick={() => handleVote('downvote', question._id)} type="down" />
            <div className="w-px h-3 bg-gray-200 my-1"></div>
            <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand border border-gray-200 hover:border-brand-200 transition-all duration-200 hover:scale-105">
              <FiBookmark size={16} />
            </button>
            <button onClick={copyLink} className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 text-gray-400 hover:bg-brand-50 hover:text-brand border border-gray-200 hover:border-brand-200 transition-all duration-200 hover:scale-105">
              {copied ? <FiCheck size={16} className="text-green-500" /> : <FiLink size={16} />}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h1 className="font-serif text-xl md:text-[26px] font-bold text-gray-900 leading-snug mb-4">
              {question.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-gray-400 mb-5 pb-5 border-b border-gray-100">
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-brand-50 flex items-center justify-center">
                  <FiClock size={10} className="text-brand" />
                </div>
                {new Date(question.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-purple-50 flex items-center justify-center">
                  <FiEye size={10} className="text-purple-500" />
                </div>
                {question.views} views
              </span>
              <span className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center">
                  <FiUser size={10} className="text-green-500" />
                </div>
                <span className="text-brand font-medium">{question.author?.name || 'Anonymous'}</span>
              </span>
            </div>

            {/* Body */}
            <div className="prose prose-sm max-w-none mb-5">
              <MarkdownRenderer content={question.body} />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {question.tags?.map(tag => (
                <Link
                  key={tag._id}
                  to={`/questions?tag=${tag.name}`}
                  className="group text-[13px] text-gray-600 bg-cream border border-gray-200 px-3 py-1 rounded-full hover:border-brand hover:text-brand hover:bg-brand-50 transition-all duration-200"
                >
                  <FiTag size={10} className="inline mr-1 group-hover:rotate-12 transition-transform" />
                  {tag.name}
                </Link>
              ))}
              {canEditTags && !editingTags && (
                <button
                  onClick={() => setEditingTags(true)}
                  className="text-[12px] text-gray-400 hover:text-brand border border-dashed border-gray-300 rounded-full px-3 py-1 hover:border-brand transition-all duration-200"
                >
                  + Edit tags
                </button>
              )}
            </div>

            {/* Tag Editor */}
            {editingTags && canEditTags && (
              <div className="bg-gradient-to-br from-brand-50 to-white border border-brand-100 rounded-xl p-4 mb-4 animate-in slide-in-from-top-2">
                <div className="text-[14px] font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <FiTag size={13} className="text-brand" /> Edit Tags
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {VALID_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-[13px] px-2.5 py-1 rounded-full border transition-all duration-200 ${
                        selectedTags.includes(tag)
                          ? 'bg-brand text-white border-brand shadow-sm scale-105'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand hover:scale-105'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveTags} className="bg-brand text-white px-4 py-1.5 rounded-lg text-[14px] font-medium hover:bg-brand-500 transition-all duration-200 hover:shadow-md">Save Tags</button>
                  <button onClick={() => { setEditingTags(false); setSelectedTags(question.tags?.map(t => t.name) || []); }} className="text-gray-500 text-[14px] hover:text-gray-700 transition-colors">Cancel</button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <button
                onClick={() => toggleComments(question._id)}
                className="flex items-center gap-1.5 text-[14px] text-gray-400 hover:text-brand transition-colors group"
              >
                <FiMessageSquare size={14} className="group-hover:rotate-12 transition-transform" />
                {showComments[question._id] ? 'Hide' : 'Add'} comment
                {question.comments?.length > 0 && (
                  <span className="text-[12px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{question.comments.length}</span>
                )}
              </button>
              {question.isBounty && (
                <Badge variant="bounty">
                  <FiAward size={10} /> {question.bountyAmount} bounty
                </Badge>
              )}
            </div>

            {/* Comment Form */}
            {showComments[question._id] && (
              <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                {question.comments?.map(comment => (
                  <div key={comment._id} className="text-[14px] text-gray-600 pl-4 border-l-2 border-gray-100 py-1.5 hover:border-brand transition-colors">
                    {comment.body} <span className="text-brand font-medium">— {comment.author?.name}</span>
                  </div>
                ))}
                <div className="flex gap-2">
                  <ScriptureInput
                    value={commentBody}
                    onChange={(val) => setCommentBody(typeof val === 'string' ? val : val.target?.value || val)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(question._id, 'question'); } }}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all bg-white"
                    placeholder="Write a comment..."
                    rows={1}
                  />
                  <button onClick={() => handleAddComment(question._id, 'question')} className="bg-brand text-white px-4 py-2 rounded-xl text-[14px] font-medium hover:bg-brand-500 transition-all hover:shadow-md flex items-center gap-1.5">
                    <FiSend size={12} /> Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ANSWERS
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-serif text-xl font-bold text-gray-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center">
            <FiMessageSquare className="text-brand" size={16} />
          </div>
          {question.answers?.length || 0} {question.answers?.length === 1 ? 'Answer' : 'Answers'}
        </h2>
        {question.answers?.length > 1 && (
          <div className="text-[13px] text-gray-400 flex items-center gap-1">
            <FiChevronDown size={12} /> Sorted by votes
          </div>
        )}
      </div>

      <div className="space-y-4">
        {sortedAnswers.map(answer => {
          const ansVotes = answer.upvotes?.length - answer.downvotes?.length || 0;
          const isExpanded = expandedAnswers[answer._id] !== false;
          const isLong = answer.body?.length > 500;

          return (
            <div
              key={answer._id}
              className={`relative bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md ${
                answer.isAccepted
                  ? 'border-green-300 ring-1 ring-green-100'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Accepted indicator */}
              {answer.isAccepted && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-500"></div>
              )}

              <div className="p-6">
                <div className="flex gap-5">
                  {/* Vote Column */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <VoteButton active={isUpvoted(answer)} onClick={() => handleVote('upvote', null, answer._id)} type="up" />
                    <span className={`text-base font-bold transition-colors ${ansVotes > 0 ? 'text-brand' : ansVotes < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                      {ansVotes}
                    </span>
                    <VoteButton active={isDownvoted(answer)} onClick={() => handleVote('downvote', null, answer._id)} type="down" />

                    {answer.isAccepted && (
                      <div className="mt-1 w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center animate-pulse-once">
                        <FiCheck size={18} className="text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* Answer Content */}
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    {(answer.isAccepted || answer.isVerifiedByGuru || answer.isAIGenerated) && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {answer.isAccepted && (
                          <Badge variant="accepted"><FiCheck size={10} /> Accepted</Badge>
                        )}
                        {answer.isVerifiedByGuru && (
                          <Badge variant="guru">
                            <FiAward size={10} /> Guru Verified
                            {answer.verifiedBy?.name && (
                              <span className="sr-only">Verified by {answer.verifiedBy.name}{answer.verifiedAt ? ` on ${new Date(answer.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</span>
                            )}
                          </Badge>
                        )}
                        {answer.isAIGenerated && (
                          <Badge variant={answer.isVerifiedByAdmin ? 'aiVerified' : 'ai'}>
                            {answer.isVerifiedByAdmin ? '✓ AI Verified' : 'AI Generated'}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Body */}
                    <div className={`prose prose-sm max-w-none mb-4 transition-all duration-300 ${!isExpanded && isLong ? 'max-h-[200px] overflow-hidden relative' : ''}`}>
                      <MarkdownRenderer content={answer.body} />
                      {!isExpanded && isLong && (
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent"></div>
                      )}
                    </div>
                    {isLong && (
                      <button
                        onClick={() => toggleAnswerExpand(answer._id)}
                        className="text-[13px] text-brand font-medium hover:text-brand-500 flex items-center gap-1 mb-3 transition-colors"
                      >
                        {isExpanded ? <><FiChevronUp size={12} /> Show less</> : <><FiChevronDown size={12} /> Read more</>}
                      </button>
                    )}

                    {/* Guru Verified Banner */}
                    {answer.isVerifiedByGuru && (
                      <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                            <FiAward size={14} className="text-amber-700" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-amber-800 flex items-center gap-1.5">
                              Guru Verified
                              <span className="text-[11px] font-normal text-amber-500">
                                by <span className="font-medium">{answer.verifiedBy?.name || 'a verified guru'}</span>
                                {answer.verifiedAt && <> · {new Date(answer.verifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>}
                              </span>
                            </p>
                            {answer.verifiedBy?.role && ['guru', 'acharya'].includes(answer.verifiedBy.role) && (
                              <span className="text-[11px] font-semibold text-amber-600 bg-amber-100/50 px-1.5 py-0.5 rounded-full capitalize">
                                {answer.verifiedBy.role}
                              </span>
                            )}
                          </div>
                        </div>
                        {answer.verificationNote && (
                          <>
                            <div className="w-full h-px bg-amber-200/50 my-2"></div>
                            <p className="text-[14px] text-amber-700 leading-relaxed">
                              "{answer.verificationNote}"
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Author & Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-3">
                        {/* Author */}
                        <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                          <div className="w-7 h-7 rounded-full bg-brand-50 text-brand flex items-center justify-center text-[12px] font-bold">
                            {answer.author?.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <span className="text-[14px] font-medium text-gray-900 block leading-tight">{answer.author?.name || 'Anonymous'}</span>
                            {answer.author?.role && ['guru', 'acharya'].includes(answer.author.role) && (
                              <span className="text-[11px] font-semibold text-brand">
                                {answer.author.role}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Accept button */}
                        {user && String(user._id) === String(question.author?._id) && !answer.isAccepted && (
                          <button
                            onClick={() => handleAccept(answer._id)}
                            className="text-[13px] text-green-600 hover:text-green-700 font-medium flex items-center gap-1 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-all duration-200"
                          >
                            <FiCheck size={12} /> Accept
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggleComments(answer._id)}
                          className="flex items-center gap-1 text-[13px] text-gray-400 hover:text-brand transition-colors group"
                        >
                          <FiMessageSquare size={12} className="group-hover:rotate-12 transition-transform" />
                          {answer.comments?.length || 0}
                        </button>
                        <span className="text-[13px] text-gray-400">
                          {new Date(answer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    {/* Comments */}
                    {showComments[answer._id] && (
                      <div className="mt-3 space-y-2 animate-in slide-in-from-top-2">
                        {answer.comments?.map(comment => (
                          <div key={comment._id} className="text-[14px] text-gray-600 pl-4 border-l-2 border-gray-100 py-1.5 hover:border-brand transition-colors">
                            {comment.body} <span className="text-brand font-medium">— {comment.author?.name}</span>
                          </div>
                        ))}
                <div className="flex gap-2">
                  <ScriptureInput
                    value={commentBody}
                    onChange={(val) => setCommentBody(typeof val === 'string' ? val : val.target?.value || val)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(answer._id, 'answer'); } }}
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all bg-white"
                    placeholder="Write a comment..."
                    rows={1}
                  />
                  <button onClick={() => handleAddComment(answer._id, 'answer')} className="bg-brand text-white px-4 py-2 rounded-xl text-[14px] font-medium hover:bg-brand-500 transition-all hover:shadow-md flex items-center gap-1.5">
                    <FiSend size={12} /> Post
                  </button>
                </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ANSWER FORM
          ═══════════════════════════════════════════════════════════════════ */}
      {user && ['guru', 'acharya', 'admin', 'scholar'].includes(user.role) && (
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
              <FiSend className="text-brand" size={18} />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-gray-900">Your Answer</h3>
              <p className="text-[13px] text-gray-400">Share your knowledge with the community</p>
            </div>
          </div>
          <form onSubmit={handleSubmitAnswer}>
            <div className="relative">
              <ScriptureInput
                value={answerBody}
                onChange={(val) => setAnswerBody(typeof val === 'string' ? val : val.target?.value || val)}
                className="w-full border border-gray-200 rounded-xl px-5 py-4 text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all duration-200 resize-y min-h-[180px] leading-relaxed bg-cream/30"
                placeholder="Write your answer here... You can use Markdown for formatting. Type @ to reference scriptures."
                rows={6}
              />
              <div className="absolute bottom-3 right-3 text-[12px] text-gray-400">
                Markdown supported
              </div>
            </div>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-[13px] text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                Posting as <span className="text-brand font-medium">{user.name}</span>
              </div>
              <button
                type="submit"
                disabled={!answerBody.trim()}
                className="bg-brand text-white px-6 py-2.5 rounded-xl text-[15px] font-medium hover:bg-brand-500 transition-all duration-200 hover:shadow-lg hover:shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex items-center gap-2"
              >
                <FiSend size={14} />
                Post Answer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuestionDetail;
