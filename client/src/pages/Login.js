import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiBook, FiMail, FiLock, FiLoader, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
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

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Decorative top */}
        <div className="relative text-center mb-8">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand/[0.04] rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-brand to-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-brand/20 group-hover:shadow-xl group-hover:-translate-y-0.5 transition-all duration-300">
              <FiBook className="text-white" size={28} />
            </div>
            <h1 className="font-serif text-[32px] font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-500 text-[15px]">Sign in to continue to Pariprashna</p>
          </div>
          {/* Ornamental dots */}
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-1.5 h-1.5 rounded-full bg-brand/20 animate-float" style={{ animationDelay: '0s' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-brand/30 animate-float" style={{ animationDelay: '0.3s' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-brand/20 animate-float" style={{ animationDelay: '0.6s' }}></div>
          </div>
        </div>

        {/* Form Card */}
        <div className="relative bg-white rounded-2xl shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] border border-gray-100 p-8 overflow-hidden">
          {/* Corner decorations */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-brand/[0.03] to-transparent rounded-bl-[40px]"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-brand/[0.03] to-transparent rounded-tr-[32px]"></div>

          <form onSubmit={handleSubmit} className="relative space-y-5">
            {/* Email */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <label className="block text-[14px] font-medium text-gray-700 mb-1.5">Email</label>
              <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'scale-[1.01]' : ''}`}>
                <FiMail size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'email' ? 'text-brand' : 'text-gray-300'}`} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="you@example.com"
                  className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-[14px] outline-none transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-300"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <label className="block text-[14px] font-medium text-gray-700 mb-1.5">Password</label>
              <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'scale-[1.01]' : ''}`}>
                <FiLock size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${focusedField === 'password' ? 'text-brand' : 'text-gray-300'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-12 py-3 border border-gray-200 rounded-xl text-[14px] outline-none transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/10 placeholder:text-gray-300"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors duration-200"
                >
                  {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="relative w-full bg-gradient-to-r from-brand to-brand-500 text-white py-3 rounded-xl font-semibold hover:from-brand-500 hover:to-brand-600 disabled:opacity-60 transition-all duration-300 shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden group animate-fade-in-up"
              style={{ animationDelay: '0.3s' }}
            >
              <span className={`inline-flex items-center gap-2 transition-all duration-300 ${loading ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`}>
                <FiBook size={16} />
                Sign In
              </span>
              {loading && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <FiLoader size={20} className="animate-spin" />
                </span>
              )}
              {/* Shimmer effect */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </button>

            {/* Divider */}
            <div className="relative my-6 animate-fade-in-up" style={{ animationDelay: '0.35s' }}>
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-400 text-[13px]">or continue with</span>
              </div>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogleLogin}
              className="w-full border border-gray-200 rounded-xl py-3 flex items-center justify-center gap-2.5 text-[14px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800 transition-all duration-200 group animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </form>

          {/* Footer */}
          <p className="text-center mt-7 text-[14px] text-gray-500 animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
            Don't have an account?{' '}
            <Link to="/register" className="text-brand font-medium hover:text-brand-600 transition-colors relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-brand after:transition-all after:duration-300 hover:after:w-full">
              Sign up
            </Link>
          </p>
        </div>

        {/* Bottom decorative */}
        <div className="flex justify-center gap-3 mt-8">
          <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-brand/20"></div>
          <div className="flex gap-1">
            <div className="w-1 h-1 rounded-full bg-brand/10"></div>
            <div className="w-1 h-1 rounded-full bg-brand/15"></div>
            <div className="w-1 h-1 rounded-full bg-brand/10"></div>
          </div>
          <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-brand/20"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
