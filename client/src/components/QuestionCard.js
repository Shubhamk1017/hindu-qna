import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { FiChevronUp, FiMessageSquare, FiEye, FiClock, FiBookmark, FiCheck, FiAward } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const getDifficulty = (votes, answerCount) => {
  if (votes >= 5 || answerCount >= 3) return { label: 'Hot', color: 'bg-red-50 text-red-600 border-red-100', icon: '🔥' };
  if (votes >= 2 || answerCount >= 1) return { label: 'Active', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: '⚡' };
  return { label: 'New', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: '✨' };
};

const QuestionCard = ({ question, compact = false, bookmarked = false, onToggleBookmark }) => {
  const { user } = useAuth();
  const votes = question.upvotes?.length || 0;
  const answerCount = question.answers?.length || 0;
  const hasAccepted = question.answers?.some(a => a.accepted);
  const relativeDate = formatDistanceToNow(new Date(question.createdAt), { addSuffix: true });
  const difficulty = getDifficulty(votes, answerCount);
  const views = question.views || 0;

  if (compact) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 card-lift cursor-pointer group hover:border-gray-200/80 hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] transition-all duration-300">
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficulty.color}`}>
            {difficulty.icon} {difficulty.label}
          </span>
          <span className="text-[11px] text-gray-300">·</span>
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
            <FiEye size={10} /> {views}
          </span>
        </div>
        <Link
          to={`/questions/${question._id}`}
          className="font-serif text-[15px] font-semibold text-gray-800 group-hover:text-brand transition-colors duration-200 leading-snug line-clamp-2 block mb-2.5"
        >
          {question.title}
        </Link>
        <div className="flex items-center justify-between text-[12px] text-gray-400">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-0.5">
              <FiChevronUp size={11} className="text-brand/60" />
              {votes}
            </span>
            <span className={`flex items-center gap-0.5 ${hasAccepted ? 'text-green-500' : answerCount > 0 ? 'text-brand/70' : ''}`}>
              <FiMessageSquare size={10} />
              {answerCount}
            </span>
          </div>
          <span className="flex items-center gap-0.5">
            <FiClock size={10} className="text-gray-300" />
            {relativeDate}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex gap-5 card-lift cursor-pointer group hover:border-gray-200/80 hover:shadow-[0_4px_20px_-6px_rgba(0,0,0,0.07)] transition-all duration-300">
      {/* Vote & Answer Column */}
      <div className="flex flex-col items-center gap-3 min-w-[40px] pt-0.5">
        {/* Votes */}
        <div className="flex flex-col items-center">
          <button className="vote-btn text-gray-300 group-hover:text-brand p-0.5 rounded-md hover:bg-brand/5">
            <FiChevronUp size={17} strokeWidth={2.5} />
          </button>
          <span className={`text-[16px] font-bold leading-none mt-0.5 transition-colors duration-200 ${votes > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
            {votes}
          </span>
          <span className="text-[10px] text-gray-300 uppercase tracking-widest mt-0.5">votes</span>
        </div>
        {/* Answers */}
        <div className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-300 ${
          hasAccepted ? 'bg-green-50/80 ring-1 ring-green-100' : answerCount > 0 ? 'bg-brand-50/60 ring-1 ring-brand-100/50' : ''
        }`}>
          <FiMessageSquare
            size={13}
            className={`transition-colors duration-200 ${hasAccepted ? 'text-green-500' : answerCount > 0 ? 'text-brand/70' : 'text-gray-200'}`}
          />
          <span className={`text-[14px] font-semibold transition-colors duration-200 ${hasAccepted ? 'text-green-600' : answerCount > 0 ? 'text-brand/80' : 'text-gray-300'}`}>
            {answerCount}
          </span>
          <span className="text-[10px] text-gray-300 uppercase tracking-widest">ans</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: badge + bookmark */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficulty.color}`}>
              {difficulty.icon} {difficulty.label}
            </span>
            {hasAccepted && (
              <span className="text-[10px] font-semibold text-green-600 bg-green-50/80 border border-green-100 px-2 py-0.5 rounded-full tracking-wide uppercase animate-pulse-glow" style={{ animationDuration: '3s' }}>
                ✓ Accepted
              </span>
            )}
            {question.guruVerifiedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50/80 border border-amber-200/60 px-2 py-0.5 rounded-full uppercase">
                <FiAward size={10} /> Guru Verified
              </span>
            )}
            {question.isBounty && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-yellow-600 bg-yellow-50 border border-yellow-100 px-2 py-0.5 rounded-full">
                🏆 Bounty
              </span>
            )}
          </div>
          {user && (
            <button
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onToggleBookmark) {
                  onToggleBookmark(question._id);
                } else {
                  try {
                    await api.post(`/users/favorites/${question._id}`);
                    toast.success(bookmarked ? 'Removed from bookmarks' : 'Bookmarked!');
                  } catch (err) {
                    if (err.response?.status === 401) toast.error('Please login to bookmark');
                  }
                }
              }}
              className={`p-1.5 rounded-lg transition-all duration-200 ${
                bookmarked
                  ? 'text-brand bg-brand-50 opacity-100 scale-110'
                  : 'text-gray-300 hover:text-brand hover:bg-brand-50 opacity-0 group-hover:opacity-100'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarked ? <FiCheck size={14} /> : <FiBookmark size={14} />}
            </button>
          )}
        </div>

        {/* Title */}
        <Link
          to={`/questions/${question._id}`}
          className="font-serif text-[16px] font-semibold text-gray-800 group-hover:text-brand transition-colors duration-200 leading-snug block mb-2"
        >
          {question.title}
        </Link>

        {/* Preview */}
        {question.body && (
          <p className="text-[14px] text-gray-400 line-clamp-2 mb-3 leading-relaxed group-hover:text-gray-500 transition-colors duration-200">
            {question.body.replace(/[#*`>[[\]]/g, '').substring(0, 180)}
          </p>
        )}

        {/* Tags */}
        {question.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {question.tags.slice(0, 4).map((tag) => (
              <span
                key={tag._id || tag}
                className="tag-chip text-[11px] font-medium text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md hover:border-brand/30 hover:text-brand hover:bg-brand/5 cursor-pointer tracking-wide uppercase transition-all duration-200"
              >
                {tag.name || tag}
              </span>
            ))}
            {question.tags.length > 4 && (
              <span className="text-[11px] text-gray-300 font-medium">+{question.tags.length - 4}</span>
            )}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[12px] text-gray-350">
          <span className="flex items-center gap-1">
            <FiEye size={11} className="text-gray-250" />
            {views} views
          </span>
          <span>
            by{' '}
            <Link
              to={`/profile/${question.author?._id}`}
              className="text-brand/80 font-medium hover:text-brand transition-colors duration-200 relative after:content-[''] after:absolute after:bottom-[-1px] after:left-0 after:w-0 after:h-[1px] after:bg-brand after:transition-all after:duration-300 hover:after:w-full"
            >
              {question.author?.name || 'Anonymous'}
            </Link>
          </span>
          <span className="flex items-center gap-1">
            <FiClock size={10} className="text-gray-250" />
            {relativeDate}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
