import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { FiMessageSquare, FiHelpCircle, FiCheck } from 'react-icons/fi';

const RecentActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await api.get('/activity?limit=6');
        setActivities(res.data.activities || []);
      } catch {
        // Fallback: fetch recent questions if activity endpoint isn't available
        try {
          const res = await api.get('/questions?sort=newest&limit=6');
          const questions = res.data.questions || [];
          setActivities(questions.map(q => ({
            type: 'question',
            _id: q._id,
            title: q.title,
            author: q.author,
            createdAt: q.createdAt,
            answerCount: q.answers?.length || 0,
            voteScore: (q.upvotes?.length || 0) - (q.downvotes?.length || 0),
          })));
        } catch {
          setActivities([]);
        }
      }
      setLoading(false);
    };
    fetchActivity();
  }, []);

  const getIcon = (item) => {
    if (item.type === 'question') return <FiHelpCircle size={12} />;
    if (item.isAccepted) return <FiCheck size={12} />;
    return <FiMessageSquare size={12} />;
  };

  const getLabel = (item) => {
    if (item.type === 'question') return 'Asked';
    if (item.isAccepted) return 'Accepted';
    if (item.isVerifiedByGuru) return 'Verified';
    if (item.isAIGenerated) return 'AI';
    return 'Answered';
  };

  const getLabelStyle = (item) => {
    if (item.type === 'question') return 'bg-amber-50 text-amber-600 border-amber-100';
    if (item.isAccepted) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (item.isVerifiedByGuru) return 'bg-purple-50 text-purple-600 border-purple-100';
    if (item.isAIGenerated) return 'bg-sky-50 text-sky-600 border-sky-100';
    return 'bg-brand-50 text-brand border-brand-100';
  };

  const getTitle = (item) => {
    if (item.type === 'question') return item.title;
    return item.questionTitle;
  };

  const getLink = (item) => {
    if (item.type === 'question') return `/questions/${item._id}`;
    return `/questions/${item.questionId}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="text-[14px] font-semibold text-gray-800 tracking-wide uppercase mb-4">
          Activity
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 py-2">
              <div className="skeleton w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[14px] font-semibold text-gray-800 tracking-wide uppercase">
          Activity
        </span>
        <Link to="/questions?sort=newest" className="text-[12px] text-gray-400 hover:text-brand transition-colors duration-200">
          View all
        </Link>
      </div>
      <div className="space-y-0">
        {activities.map((item, i) => (
          <Link
            key={`${item.type}-${item._id}-${i}`}
            to={getLink(item)}
            className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 group"
          >
            <div className={`flex-shrink-0 mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border ${getLabelStyle(item)}`}>
              {getIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-gray-600 leading-snug line-clamp-2 group-hover:text-gray-800 transition-colors">
                {getTitle(item)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${getLabelStyle(item).split(' ').slice(1, 2).join(' ')}`}>
                  {getLabel(item)}
                </span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[11px] text-gray-400">
                  {item.author?.name || 'Someone'}
                </span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[11px] text-gray-350">
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RecentActivity;
