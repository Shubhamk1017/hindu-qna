import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiSearch, FiMessageSquare, FiUser, FiLogOut } from 'react-icons/fi';

const Navbar = () => {
  const { user, logout, isGuru, isAdmin } = useAuth();

  return (
    <nav className="bg-orange-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">🕉️ Hindu QnA</span>
          </Link>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/questions" className="hover:text-orange-200">Questions</Link>
            <Link to="/tags" className="hover:text-orange-200">Tags</Link>
            <Link to="/users" className="hover:text-orange-200">Users</Link>
            <Link to="/chat" className="hover:text-orange-200 flex items-center gap-1">
              <FiMessageSquare /> AI Chat
            </Link>
            <Link to="/bounties" className="hover:text-orange-200">Bounties</Link>
            {isGuru() && (
              <Link to="/guru" className="hover:text-orange-200">Guru Portal</Link>
            )}
            {isAdmin() && (
              <Link to="/admin" className="hover:text-orange-200">Admin</Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/questions/ask" className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-100">
                  Ask Question
                </Link>
                <div className="flex items-center space-x-2">
                  <Link to={`/profile/${user.id}`} className="flex items-center space-x-2 hover:text-orange-200">
                    <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.name}</span>
                  </Link>
                  <button onClick={logout} className="hover:text-orange-200">
                    <FiLogOut />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="hover:text-orange-200">Login</Link>
                <Link to="/register" className="bg-white text-orange-600 px-4 py-2 rounded-lg font-semibold hover:bg-orange-100">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
