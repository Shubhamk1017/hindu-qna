import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiAward, FiStar, FiChevronRight, FiTrendingUp } from 'react-icons/fi';

const GURU_CONFIG = {
  gradient: 'from-amber-500 to-orange-500',
  bg: 'bg-amber-50 dark:bg-amber-500/10',
  text: 'text-amber-600',
};

const RANK_GRADIENTS = [
  'from-amber-300 to-amber-500',
  'from-gray-300 to-gray-400',
  'from-amber-700 to-amber-800',
];

const TopExperts = () => {
  const [experts, setExperts] = useState([]);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        const guruRes = await api.get('/users?role=guru&limit=5');
        const gurus = (guruRes.data.users || [])
          .sort((a, b) => (b.reputation || 0) - (a.reputation || 0));
        setExperts(gurus);
      } catch (error) {
        console.error('Error fetching experts:', error);
      }
    };
    fetchExperts();
  }, []);

  if (experts.length === 0) return null;

  const getInitials = (name) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="bg-white dark:bg-[#1C1814] border border-gray-100 dark:border-[#2A2520] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200/50">
            <FiAward size={16} className="text-white" />
          </div>
          <div>
            <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 block leading-tight">
              Top Gurus
            </span>
            <span className="text-[11px] text-gray-400 dark:text-gray-500">
              Highest reputation
            </span>
          </div>
        </div>
        <Link
          to="/users"
          className="flex items-center gap-0.5 text-[12px] font-medium text-brand hover:text-brand-600 transition-colors group"
        >
          All
          <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* Expert List */}
      <div className="space-y-1">
        {experts.map((expert, i) => {
          const config = GURU_CONFIG;
          const isTop3 = i < 3;

          return (
            <Link
              key={expert._id}
              to={`/profile/${expert._id}`}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#2A2520] transition-all duration-200"
            >
              {/* Rank badge */}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isTop3
                  ? `bg-gradient-to-br ${RANK_GRADIENTS[i]} text-white shadow-sm`
                  : 'bg-gray-50 dark:bg-[#2A2520] text-gray-400 dark:text-gray-500'
              } text-[11px] font-bold`}>
                {i + 1}
              </div>

              {/* Avatar + Name */}
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 shadow-sm ring-2 ring-white dark:ring-[#1C1814]`}>
                  {getInitials(expert.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-brand transition-colors">
                    {expert.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium ${config.text}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] text-gray-300 dark:text-gray-500">·</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {expert.answerCount || 0} ans
                    </span>
                  </div>
                </div>
              </div>

              {/* Reputation */}
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
                isTop3 ? config.bg : 'bg-gray-50 dark:bg-[#2A2520]'
              } flex-shrink-0`}>
                <FiStar size={10} className={isTop3 ? config.text : 'text-gray-400'} />
                <span className={`text-[12px] font-bold ${isTop3 ? config.text : 'text-gray-500 dark:text-gray-400'}`}>
                  {expert.reputation || 0}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer link */}
      <Link
        to="/users"
        className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-gray-50 dark:border-[#2A2520] text-[12px] font-medium text-gray-400 dark:text-gray-500 hover:text-brand transition-colors group"
      >
        <FiTrendingUp size={12} />
        View all experts
        <FiChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
};

export default TopExperts;
