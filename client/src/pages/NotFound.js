import React from 'react';
import { Link } from 'react-router-dom';
import { FiHome, FiCompass, FiHelpCircle } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="max-w-md mx-auto text-center py-16 px-4 animate-fade-in-scale">
      <div className="relative mb-8 flex justify-center">
        {/* Floating background graphic */}
        <div className="absolute -inset-4 bg-brand/10 dark:bg-brand/5 rounded-full filter blur-xl animate-pulse-glow"></div>
        <div className="relative w-24 h-24 bg-brand/10 dark:bg-brand/20 rounded-full flex items-center justify-center text-brand animate-float">
          <span className="text-[48px] font-serif select-none">ॐ</span>
        </div>
      </div>

      <h1 className="text-[72px] font-serif font-extrabold text-brand tracking-tight mb-2">404</h1>
      <h2 className="text-[24px] font-serif font-bold text-gray-900 dark:text-gray-100 mb-4">
        Lost in the Cosmos of Knowledge?
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        "Neti Neti" — Not this, not that. The page you are seeking does not exist or has transcended to another path of existence.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 bg-brand text-white px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-brand-500 transition-colors shadow-sm"
        >
          <FiHome size={16} />
          Return Home
        </Link>
        <Link
          to="/questions"
          className="flex items-center justify-center gap-2 bg-white dark:bg-[#1C1814] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#3A342E] px-5 py-2.5 rounded-lg text-[14px] font-medium hover:bg-gray-50 dark:hover:bg-[#2A2520] transition-colors shadow-sm"
        >
          <FiCompass size={16} />
          Explore Questions
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
