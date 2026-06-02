import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Questions from './pages/Questions';
import QuestionDetail from './pages/QuestionDetail';
import AskQuestion from './pages/AskQuestion';
import Tags from './pages/Tags';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import GuruPortal from './pages/GuruPortal';
import AdminPanel from './pages/AdminPanel';
import AIChat from './pages/AIChat';
import ReviewQueues from './pages/ReviewQueues';
import Bounties from './pages/Bounties';
import AuthCallback from './pages/AuthCallback';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-cream">
            <Navbar />
            <main className="container mx-auto px-4 py-6">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/questions" element={<Questions />} />
                <Route path="/questions/ask" element={<AskQuestion />} />
                <Route path="/questions/:id" element={<QuestionDetail />} />
                <Route path="/tags" element={<Tags />} />
                <Route path="/users" element={<Users />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/guru" element={<GuruPortal />} />
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="/chat" element={<AIChat />} />
                <Route path="/reviews" element={<ReviewQueues />} />
                <Route path="/bounties" element={<Bounties />} />
              </Routes>
            </main>
          </div>
        </Router>
        <Toaster position="top-right" />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
