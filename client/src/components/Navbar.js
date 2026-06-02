import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiHelpCircle, FiUsers, FiBook, FiPlus, FiLogOut, FiMenu, FiX, FiShield, FiMessageSquare } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Home', icon: FiHome },
    { path: '/questions', label: 'Questions', icon: FiHelpCircle },
    { path: '/users', label: 'Experts', icon: FiUsers },
    { path: '/tags', label: 'Tags', icon: FiBook },
    { path: '/chat', label: 'AI Chat', icon: FiMessageSquare },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex items-center h-14 gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mr-5">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center flex-shrink-0">
              <FiBook className="text-white" size={15} />
            </div>
            <span className="font-serif text-[16px] font-semibold text-gray-900">Pariprashna</span>
          </Link>

          {/* Desktop Nav */}
          <div className="flex items-center gap-0.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[14px] transition-colors ${
                    isActive(item.path)
                      ? 'bg-brand-50 text-brand border border-brand-100 font-medium'
                      : 'text-gray-600 hover:bg-cream hover:text-gray-900'
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
            {user && ['guru', 'acharya'].includes(user.role) && (
              <Link
                to="/guru"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[14px] transition-colors ${
                  isActive('/guru')
                    ? 'bg-brand-50 text-brand border border-brand-100 font-medium'
                    : 'text-gray-600 hover:bg-cream hover:text-gray-900'
                }`}
              >
                <FiShield size={14} />
                Guru Portal
              </Link>
            )}
            {user && user.role === 'admin' && (
              <Link
                to="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[14px] transition-colors ${
                  isActive('/admin')
                    ? 'bg-brand-50 text-brand border border-brand-100 font-medium'
                    : 'text-gray-600 hover:bg-cream hover:text-gray-900'
                }`}
              >
                <FiShield size={14} />
                Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  to="/questions/ask"
                  className="flex items-center gap-1.5 bg-brand text-white px-4 py-[7px] rounded-lg text-[14px] font-medium hover:bg-brand-500 transition-colors"
                >
                  <FiPlus size={14} />
                  Ask
                </Link>
                <Link
                  to={`/profile/${user._id || user.id}`}
                  className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center text-[12px] font-semibold hover:bg-brand-500 transition-colors"
                >
                  {user.name?.charAt(0).toUpperCase()}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-gray-600 transition-colors hidden md:block ml-1"
                  title="Logout"
                >
                  <FiLogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-brand text-white px-5 py-[7px] rounded-lg text-[14px] font-medium hover:bg-brand-500 transition-colors"
              >
                Login
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-gray-600 ml-1"
            >
              {mobileOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden pb-3 border-t border-gray-100 mt-1">
            <div className="flex flex-col gap-0.5 pt-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] ${
                      isActive(item.path)
                        ? 'bg-brand-50 text-brand'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
              {user && (
                <Link
                  to="/questions/ask"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] font-medium text-brand"
                >
                  <FiPlus size={16} />
                  Ask a Question
                </Link>
              )}
              {user && ['guru', 'acharya'].includes(user.role) && (
                <Link
                  to="/guru"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] text-gray-600 hover:bg-gray-50"
                >
                  <FiShield size={16} />
                  Guru Portal
                </Link>
              )}
              {user && user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[14px] text-gray-600 hover:bg-gray-50"
                >
                  <FiShield size={16} />
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
