import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const { login, guruLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isGuruLogin, setIsGuruLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isGuruLogin) {
        await guruLogin(email, password);
      } else {
        await login(email, password);
      }
      toast.success('Logged in successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  const API_BASE = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5001';

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/google`;
  };

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE}/api/auth/github`;
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Login</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex mb-6">
          <button
            onClick={() => setIsGuruLogin(false)}
            className={`flex-1 py-2 ${!isGuruLogin ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
          >
            User Login
          </button>
          <button
            onClick={() => setIsGuruLogin(true)}
            className={`flex-1 py-2 ${isGuruLogin ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
          >
            Guru Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {!isGuruLogin && (
          <>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleGoogleLogin}
            className="w-full border rounded-lg py-2 flex items-center justify-center hover:bg-gray-50"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 mr-2" />
            Google (Coming Soon)
          </button>
          <button
            onClick={handleGitHubLogin}
            className="w-full border rounded-lg py-2 flex items-center justify-center hover:bg-gray-50"
          >
            <img src="https://github.com/favicon.ico" alt="GitHub" className="w-5 h-5 mr-2" />
            GitHub (Coming Soon)
          </button>
        </div>
          </>
        )}

        <p className="text-center mt-6 text-gray-600">
          Don't have an account? <Link to="/register" className="text-orange-600 hover:text-orange-700">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
