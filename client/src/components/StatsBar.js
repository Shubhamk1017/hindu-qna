import React from 'react';
import { FiHelpCircle, FiMessageSquare, FiCheckCircle, FiUsers } from 'react-icons/fi';

const StatsBar = ({ stats }) => {
  const items = [
    { icon: FiHelpCircle, label: 'Questions', value: stats.questions || 0, filled: false },
    { icon: FiMessageSquare, label: 'Expert Answers', value: stats.answers || 0, filled: true },
    { icon: FiCheckCircle, label: 'Verified Answers', value: stats.verifiedAnswers || 0, filled: false },
    { icon: FiUsers, label: 'Verified Experts', value: stats.experts || 0, filled: false },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-gray-200 bg-white">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`flex items-center gap-3.5 py-6 px-7 ${i < items.length - 1 ? 'border-r border-gray-200' : ''}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.filled ? 'bg-brand text-white' : 'bg-brand-50 text-brand'
            }`}>
              <Icon size={18} />
            </div>
            <div>
              <div className="text-2xl font-serif font-bold text-gray-900 leading-none">{item.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatsBar;
