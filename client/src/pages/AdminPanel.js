import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import {
  FiUsers, FiMessageSquare, FiCheck, FiX, FiCpu,
  FiTrendingUp, FiActivity, FiSearch, FiStar, FiClock,
  FiShield, FiAlertCircle, FiArrowRight, FiChevronDown,
  FiFileText, FiUserCheck, FiZap, FiBarChart2, FiCalendar, FiHash,
  FiSmartphone, FiPhone, FiSend, FiRefreshCw
} from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ── Animated counter hook ─────────────────────────────────────
function useCountUp(end, duration = 1800) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || end === 0) { setCount(end); return; }
    let startTime = null;
    let raf;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [started, end, duration]);

  return { count, ref };
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg, delay = 0 }) {
  const { count, ref } = useCountUp(value);
  return (
    <div
      ref={ref}
      className="group relative bg-white border border-gray-100 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 animate-fade-in-up overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute top-0 right-0 w-28 h-28 ${bg} rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} transition-transform duration-300 group-hover:scale-110`}>
            <Icon size={22} />
          </div>
          {sub && (
            <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
              {sub}
            </span>
          )}
        </div>
        <div className="text-[36px] font-serif font-bold text-gray-900 leading-none">{count}</div>
        <div className="text-[15px] text-gray-500 mt-1.5">{label}</div>
      </div>
    </div>
  );
}

// ── Role Badge ────────────────────────────────────────────────
function RoleBadge({ role }) {
  const styles = {
    admin: 'bg-red-50 text-red-600 border-red-100',
    acharya: 'bg-purple-50 text-purple-600 border-purple-100',
    guru: 'bg-amber-50 text-amber-600 border-amber-100',
    scholar: 'bg-blue-50 text-blue-600 border-blue-100',
    user: 'bg-gray-50 text-gray-500 border-gray-100',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[role] || styles.user}`}>
      {role === 'admin' && <FiShield size={9} />}
      {role}
    </span>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function UserAvatar({ name, avatar, size = 'md' }) {
  const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-9 h-9 text-[12px]', lg: 'w-11 h-11 text-[14px]' };
  const colors = [
    'bg-brand text-white', 'bg-purple-500 text-white', 'bg-blue-500 text-white',
    'bg-emerald-500 text-white', 'bg-amber-500 text-white', 'bg-rose-500 text-white',
  ];
  const colorIndex = (name || 'U').charCodeAt(0) % colors.length;

  if (avatar) {
    return <img src={avatar} alt={name} className={`${sizes[size]} rounded-full object-cover`} />;
  }
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold ${colors[colorIndex]}`}>
      {(name || 'U').charAt(0).toUpperCase()}
    </div>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────
function SkeletonRows({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-xl animate-pulse">
          <div className="skeleton w-9 h-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-2.5 w-1/2" />
          </div>
          <div className="skeleton w-16 h-6 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ── Confirm Modal ─────────────────────────────────────────────
function ConfirmModal({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${danger ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand'}`}>
          {danger ? <FiAlertCircle size={22} /> : <FiShield size={22} />}
        </div>
        <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-[14px] text-gray-500 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-[14px] font-medium text-white rounded-xl transition-all duration-200 ${
              danger ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-brand hover:bg-brand-600 shadow-brand-200'
            } shadow-lg hover:shadow-xl`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Verify Modal ──────────────────────────────────────────────
function VerifyModal({ open, answer, onVerify, onCancel }) {
  const [note, setNote] = useState('');
  if (!open || !answer) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
          <h3 className="font-serif text-xl font-bold text-gray-900">Verify AI Answer</h3>
          <p className="text-[13px] text-gray-400 mt-0.5">Review the answer before making it visible to all users</p>
        </div>
        <div className="p-6">
          <Link to={`/questions/${answer.question?._id}`} className="font-semibold text-brand hover:text-brand-600 text-[16px]">
            {answer.question?.title}
          </Link>
          <div className="mt-4 text-[14px] text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-xl max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
            {answer.body}
          </div>
          <div className="mt-4">
            <label className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide">Verification Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this verification..."
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-4 py-3 text-[14px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 resize-none transition-all"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onCancel} className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { onVerify(answer._id, note); setNote(''); }}
              className="px-5 py-2 text-[14px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all duration-200 flex items-center gap-1.5"
            >
              <FiCheck size={14} /> Verify & Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Overview', icon: FiBarChart2 },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'gurus', label: 'Gurus', icon: FiUserCheck },
  { id: 'ai-answers', label: 'AI Answers', icon: FiCpu },
  { id: 'whatsapp', label: 'WhatsApp', icon: FiSmartphone },
  { id: 'activity', label: 'Activity', icon: FiActivity },
];

// ── WhatsApp Approve Modal ──────────────────────────────────
function WhatsAppApproveModal({ open, message, gurus, onApprove, onCancel }) {
  const [selectedGuru, setSelectedGuru] = useState('');
  if (!open || !message) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 rounded-t-2xl">
          <h3 className="font-serif text-xl font-bold text-gray-900">Approve WhatsApp Answer</h3>
          <p className="text-[13px] text-gray-400 mt-0.5">Assign a guru and publish this answer on the website</p>
        </div>
        <div className="p-6">
          {/* Question */}
          <div className="mb-4">
            <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Question</label>
            <Link to={`/questions/${message.question?._id}`} className="block font-semibold text-[16px] text-brand hover:text-brand-600 mt-1">
              {message.question?.title || 'Unknown question'}
            </Link>
          </div>
          {/* Sender */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
            <FiPhone size={14} className="text-gray-400" />
            <div>
              <span className="text-[14px] font-medium text-gray-700">{message.senderName || 'Unknown'}</span>
              {message.senderPhone && <span className="text-[13px] text-gray-400 ml-2">{message.senderPhone}</span>}
            </div>
          </div>
          {/* Answer text */}
          <div>
            <label className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Answer</label>
            <div className="mt-1.5 text-[14px] text-gray-700 bg-gray-50 border border-gray-100 p-4 rounded-xl max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {message.answerText}
            </div>
          </div>
          {/* Guru assignment */}
          <div className="mt-5">
            <label className="text-[13px] font-semibold text-gray-600 uppercase tracking-wide">Assign to Guru</label>
            <p className="text-[12px] text-gray-400 mt-0.5 mb-2">Choose which guru/acharya gets credit for this answer</p>
            <div className="relative">
              <select
                value={selectedGuru}
                onChange={(e) => setSelectedGuru(e.target.value)}
                className="w-full appearance-none pl-4 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all cursor-pointer"
              >
                <option value="">Auto-detect from sender / fallback to admin</option>
                {gurus.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name} ({g.role})
                  </option>
                ))}
              </select>
              <FiChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <button onClick={onCancel} className="px-4 py-2 text-[14px] font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onApprove(selectedGuru || undefined)}
            className="px-5 py-2 text-[14px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transition-all duration-200 flex items-center gap-1.5"
          >
            <FiCheck size={14} /> Approve & Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AdminPanel ────────────────────────────────────────────────
const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [aiAnswers, setAiAnswers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [whatsappAnswers, setWhatsappAnswers] = useState([]);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [whatsappQR, setWhatsappQR] = useState(null);
  const [gurus, setGurus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [searchDebounce, setSearchDebounce] = useState('');

  // Modals
  const [verifyModal, setVerifyModal] = useState({ open: false, answer: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, danger: false });
  const [waApproveModal, setWaApproveModal] = useState({ open: false, message: null });

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    setUserPage(1);
  }, [searchDebounce, userRoleFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, aiRes, actRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get(`/admin/users?page=${userPage}&limit=15${userRoleFilter ? `&role=${userRoleFilter}` : ''}${searchDebounce ? `&search=${encodeURIComponent(searchDebounce)}` : ''}`),
        api.get('/admin/ai-answers/pending?limit=20'),
        api.get('/admin/recent-activity?limit=15'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users || []);
      setUserTotalPages(usersRes.data.totalPages || 1);
      setAiAnswers(aiRes.data.answers || []);
      setActivities(actRes.data.activities || []);

      // Fetch WhatsApp data (non-critical, don't fail if endpoint doesn't exist)
      try {
        const [waStatusRes, waPendingRes] = await Promise.all([
          api.get('/whatsapp/status').catch(() => ({ data: {} })),
          api.get('/whatsapp/answers/pending').catch(() => ({ data: { answers: [] } })),
          api.get('/admin/users?role=guru&limit=50').catch(() => ({ data: { users: [] } })),
        ]);
        setWhatsappStatus(waStatusRes.data);
        setWhatsappAnswers(waPendingRes.data.answers || []);
        // Combine guru and acharya users for the dropdown
        const guruUsers = [
          ...(usersRes.data.users || []).filter(u => ['guru', 'acharya', 'admin'].includes(u.role)),
        ];
        setGurus(guruUsers);
      } catch (e) {
        // WhatsApp integration not configured — silently ignore
      }
    } catch (error) {
      toast.error('Error loading admin data');
    }
    setLoading(false);
  }, [userPage, userRoleFilter, searchDebounce]);

  useEffect(() => {
    if (!isAdmin()) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchData();
  }, [isAdmin, fetchData]);

  const handleVerifyAI = async (answerId, note) => {
    try {
      await api.post(`/admin/ai-answers/${answerId}/verify`, { note });
      toast.success('AI answer verified and published!');
      setAiAnswers(prev => prev.filter(a => a._id !== answerId));
      setVerifyModal({ open: false, answer: null });
    } catch {
      toast.error('Error verifying AI answer');
    }
  };

  const handleRejectAI = async (answerId) => {
    setConfirmModal({
      open: true,
      title: 'Reject AI Answer',
      message: 'This will permanently delete the AI-generated answer. Are you sure?',
      danger: true,
      confirmLabel: 'Reject & Delete',
      onConfirm: async () => {
        try {
          await api.post(`/admin/ai-answers/${answerId}/reject`);
          toast.success('AI answer rejected and removed');
          setAiAnswers(prev => prev.filter(a => a._id !== answerId));
          setConfirmModal({ open: false });
        } catch {
          toast.error('Error rejecting AI answer');
        }
      },
    });
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('User role updated');
      fetchData();
    } catch {
      toast.error('Error updating user role');
    }
  };

  const handlePhoneUpdate = async (userId, phone) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { phone });
      toast.success('Phone number updated');
      fetchData();
    } catch {
      toast.error('Error updating phone number');
    }
  };

  const handleApproveWhatsApp = async (msgId, guruUserId) => {
    try {
      await api.post(`/whatsapp/answers/${msgId}/approve`, { guruUserId });
      toast.success('WhatsApp answer approved and published!');
      setWhatsappAnswers(prev => prev.filter(a => a._id !== msgId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error approving answer');
    }
  };

  const handleRejectWhatsApp = async (msgId) => {
    try {
      await api.post(`/whatsapp/answers/${msgId}/reject`);
      toast.success('Answer rejected');
      setWhatsappAnswers(prev => prev.filter(a => a._id !== msgId));
    } catch {
      toast.error('Error rejecting answer');
    }
  };

  const handleInitWhatsApp = async () => {
    try {
      await api.post('/whatsapp/init');
      toast.success('WhatsApp client initializing...');
      // Poll for status
      setTimeout(async () => {
        const statusRes = await api.get('/whatsapp/status').catch(() => ({ data: {} }));
        setWhatsappStatus(statusRes.data);
        if (statusRes.data.hasQR) {
          const qrRes = await api.get('/whatsapp/qr').catch(() => ({ data: {} }));
          setWhatsappQR(qrRes.data.qr);
        }
      }, 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error initializing WhatsApp client';
      toast.error(msg);
    }
  };

  const handleResetWhatsApp = () => {
    setConfirmModal({
      open: true,
      title: 'Reset WhatsApp Connection',
      message: 'This will completely wipe the current WhatsApp session. The connected phone will be disconnected and you will need to scan a new QR code. Are you sure?',
      danger: true,
      confirmLabel: 'Reset Connection',
      onConfirm: async () => {
        setConfirmModal({ open: false });
        try {
          await api.post('/whatsapp/reset');
          toast.success('WhatsApp client resetting...');
          setWhatsappStatus(null);
          setWhatsappQR(null);
          setTimeout(async () => {
            const statusRes = await api.get('/whatsapp/status').catch(() => ({ data: {} }));
            setWhatsappStatus(statusRes.data);
            if (statusRes.data.hasQR) {
              const qrRes = await api.get('/whatsapp/qr').catch(() => ({ data: {} }));
              setWhatsappQR(qrRes.data.qr);
            }
          }, 5000);
        } catch (err) {
          const msg = err?.response?.data?.message || 'Error resetting WhatsApp client';
          toast.error(msg);
        }
      },
    });
  };

  // Auto-poll QR code when WhatsApp tab is active and not yet connected
  useEffect(() => {
    if (activeTab !== 'whatsapp') return;
    if (whatsappStatus?.isReady) return;

    const interval = setInterval(async () => {
      try {
        const statusRes = await api.get('/whatsapp/status').catch(() => ({ data: {} }));
        setWhatsappStatus(statusRes.data);
        if (statusRes.data.hasQR) {
          const qrRes = await api.get('/whatsapp/qr').catch(() => ({ data: {} }));
          setWhatsappQR(qrRes.data.qr);
        } else {
          setWhatsappQR(null);
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab, whatsappStatus?.isReady]);

  const handleApproveGuru = async (userId) => {
    try {
      await api.post('/admin/gurus/approve', { userId });
      toast.success('Guru approved!');
      fetchData();
    } catch {
      toast.error('Error approving guru');
    }
  };

  const handleRejectGuru = async (userId) => {
    setConfirmModal({
      open: true,
      title: 'Revoke Guru Status',
      message: 'This user will be reverted to a regular user role. Are you sure?',
      danger: true,
      confirmLabel: 'Revoke',
      onConfirm: async () => {
        try {
          await api.post('/admin/gurus/reject', { userId });
          toast.success('Guru status revoked');
          fetchData();
          setConfirmModal({ open: false });
        } catch {
          toast.error('Error revoking guru status');
        }
      },
    });
  };

  if (!isAdmin()) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-50 flex items-center justify-center">
          <FiShield size={28} className="text-red-400" />
        </div>
        <h1 className="font-serif text-[26px] font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500">Admin privileges required to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-10 animate-fade-in-up">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            <FiShield size={22} className="text-brand" />
          </div>
          <div>
            <h1 className="font-serif text-[32px] font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-[15px] text-gray-500 mt-0.5">Manage users, content, and AI answers</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          <StatCard icon={FiUsers} label="Users" value={stats.users} sub={`+${stats.todayUsers} today`} color="bg-blue-50 text-blue-600" bg="bg-blue-400" delay={0} />
          <StatCard icon={FiMessageSquare} label="Questions" value={stats.questions} sub={`+${stats.todayQuestions} today`} color="bg-brand-50 text-brand" bg="bg-brand-400" delay={60} />
          <StatCard icon={FiFileText} label="Answers" value={stats.answers} sub={`+${stats.todayAnswers} today`} color="bg-purple-50 text-purple-600" bg="bg-purple-400" delay={120} />
          <StatCard icon={FiHash} label="Tags" value={stats.tags} color="bg-emerald-50 text-emerald-600" bg="bg-emerald-400" delay={180} />
          <StatCard icon={FiUserCheck} label="Gurus" value={stats.gurus} color="bg-amber-50 text-amber-600" bg="bg-amber-400" delay={240} />
          <StatCard icon={FiClock} label="Pending AI" value={stats.pendingVerifications} color="bg-rose-50 text-rose-600" bg="bg-rose-400" delay={300} />
        </div>
      )}

      {/* Weekly snapshot */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="bg-white border border-gray-100 rounded-xl px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FiCalendar size={18} className="text-blue-500" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">This Week</div>
              <div className="text-[15px] text-gray-700 mt-1">
                <span className="font-semibold">{stats.weekUsers}</span> users · <span className="font-semibold">{stats.weekQuestions}</span> questions · <span className="font-semibold">{stats.weekAnswers}</span> answers
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
              <FiCheck size={18} className="text-green-500" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">Verified</div>
              <div className="text-[15px] text-gray-700 mt-1">
                <span className="font-semibold">{stats.verifiedAnswers}</span> guru · <span className="font-semibold">{stats.acceptedAnswers}</span> accepted
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
              <FiCpu size={18} className="text-purple-500" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide">AI Generated</div>
              <div className="text-[15px] text-gray-700 mt-1">
                <span className="font-semibold">{stats.aiAnswers}</span> total · <span className="font-semibold">{stats.pendingVerifications}</span> pending
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="border-b border-gray-100 px-3 pt-3 flex gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;                const badge = tab.id === 'ai-answers' ? aiAnswers.length : tab.id === 'whatsapp' ? whatsappAnswers.length : tab.id === 'gurus' ? stats?.pendingVerifications : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-3.5 text-[15px] font-medium rounded-t-xl transition-all duration-200 whitespace-nowrap ${
                  isActive ? 'text-brand bg-brand-50/50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
                {badge > 0 && (
                  <span className={`ml-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-brand text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <div className="p-8">
          {/* ── OVERVIEW TAB ─────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {loading ? (
                <SkeletonRows count={4} />
              ) : (
                <>
                  {/* Top Tags */}
                  {stats?.topTags?.length > 0 && (
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <FiTrendingUp size={16} className="text-brand" /> Top Tags
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {stats.topTags.map((tag, i) => (
                          <div key={tag._id || i} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 hover:bg-brand-50/30 hover:border-brand/10 transition-all duration-200">
                            <span className="text-[12px] font-bold text-brand/40">#{i + 1}</span>
                            <div>
                              <div className="text-[15px] font-semibold text-gray-800">{tag.name}</div>
                              <div className="text-[13px] text-gray-400 mt-0.5">{tag.questionCount || 0} questions</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FiZap size={16} className="text-brand" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <button
                        onClick={() => setActiveTab('ai-answers')}
                        className="flex items-center gap-4 bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100/60 rounded-xl px-6 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <FiCpu size={20} className="text-purple-500" />
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-gray-800">Review AI Answers</div>
                          <div className="text-[13px] text-gray-400 mt-0.5">{aiAnswers.length} pending</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('gurus')}
                        className="flex items-center gap-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100/60 rounded-xl px-6 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <FiUserCheck size={20} className="text-amber-500" />
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-gray-800">Manage Gurus</div>
                          <div className="text-[13px] text-gray-400 mt-0.5">{stats?.pendingVerifications || 0} pending</div>
                        </div>
                      </button>
                      <button
                        onClick={() => setActiveTab('activity')}
                        className="flex items-center gap-4 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100/60 rounded-xl px-6 py-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 text-left group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <FiActivity size={20} className="text-blue-500" />
                        </div>
                        <div>
                          <div className="text-[15px] font-semibold text-gray-800">Recent Activity</div>
                          <div className="text-[13px] text-gray-400 mt-0.5">{activities.length} events</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Recent Activity Preview */}
                  {activities.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[16px] font-semibold text-gray-800 flex items-center gap-2">
                          <FiClock size={16} className="text-brand" /> Latest Activity
                        </h3>
                        <button onClick={() => setActiveTab('activity')} className="text-[13px] text-brand hover:text-brand-600 flex items-center gap-1 transition-colors">
                          View all <FiArrowRight size={11} />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {activities.slice(0, 5).map((item, i) => (
                          <ActivityRow key={`${item.type}-${item._id}-${i}`} item={item} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── USERS TAB ───────────────────────────── */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              {/* Search + Filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <FiSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[15px] text-gray-700 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                  />
                </div>
                <div className="relative">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="appearance-none pl-4 pr-9 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[15px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all cursor-pointer"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User</option>
                    <option value="scholar">Scholar</option>
                    <option value="guru">Guru</option>
                    <option value="acharya">Acharya</option>
                    <option value="admin">Admin</option>
                  </select>
                  <FiChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {loading ? (
                <SkeletonRows count={5} />
              ) : users.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-[15px]">No users found</div>
              ) : (
                <>
                  <div className="space-y-3">
                    {users.map((u, i) => (
                      <div
                        key={u._id}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <UserAvatar name={u.name} avatar={u.avatar} size="lg" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-[16px] font-semibold text-gray-800 truncate">{u.name}</span>
                              <RoleBadge role={u.role} />
                            </div>
                            <div className="text-[14px] text-gray-400 mt-0.5 truncate">{u.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 sm:ml-auto flex-wrap sm:flex-nowrap">
                          <div className="text-right hidden sm:block">
                            <div className="text-[13px] text-gray-400">Reputation</div>
                            <div className="text-[16px] font-semibold text-gray-700">{u.reputation || 0}</div>
                          </div>
                          {/* Phone input */}
                          <div className="flex items-center gap-1.5">
                            <FiPhone size={12} className="text-gray-300" />
                            <input
                              type="tel"
                              defaultValue={u.phone || ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val !== (u.phone || '')) handlePhoneUpdate(u._id, val);
                              }}
                              placeholder="Phone"
                              className="w-28 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[13px] text-gray-600 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand/40 transition-all"
                              title="Set WhatsApp phone number for auto-matching"
                            />
                          </div>
                          <div className="relative">
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u._id, e.target.value)}
                              className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer transition-all"
                            >
                              <option value="user">User</option>
                              <option value="scholar">Scholar</option>
                              <option value="guru">Guru</option>
                              <option value="acharya">Acharya</option>
                              <option value="admin">Admin</option>
                            </select>
                            <FiChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Pagination */}
                  {userTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        onClick={() => setUserPage(p => Math.max(1, p - 1))}
                        disabled={userPage === 1}
                        className="px-3 py-1.5 text-[13px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Prev
                      </button>
                      <span className="text-[13px] text-gray-400 px-2">
                        Page {userPage} of {userTotalPages}
                      </span>
                      <button
                        onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                        disabled={userPage === userTotalPages}
                        className="px-3 py-1.5 text-[13px] font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── GURUS TAB ───────────────────────────── */}
          {activeTab === 'gurus' && (
            <div className="space-y-8">
              {loading ? (
                <SkeletonRows count={3} />
              ) : (
                <>
                  {/* Pending Approvals */}
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FiClock size={16} className="text-amber-500" /> Pending Guru Approvals
                    </h3>
                    {users.filter(u => u.role === 'user').length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                        <FiCheck size={28} className="text-green-400 mx-auto mb-2" />
                        <p className="text-[15px] text-gray-500">No pending approvals</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {users.filter(u => u.role === 'user').slice(0, 8).map((u, i) => (
                          <div
                            key={u._id}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-gray-100 rounded-xl hover:border-amber-200/60 hover:bg-amber-50/20 transition-all duration-200 animate-fade-in-up"
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <UserAvatar name={u.name} avatar={u.avatar} size="lg" />
                              <div className="min-w-0">
                                <div className="text-[16px] font-semibold text-gray-800 truncate">{u.name}</div>
                                <div className="text-[14px] text-gray-400 truncate mt-0.5">{u.email}</div>
                              </div>
                            </div>
                            <div className="flex gap-2 sm:ml-auto">
                              <button
                                onClick={() => handleApproveGuru(u._id)}
                                className="flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg shadow-sm hover:shadow transition-all duration-200"
                              >
                                <FiCheck size={14} /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectGuru(u._id)}
                                className="flex items-center gap-1.5 px-4 py-2 text-[14px] font-medium text-gray-500 bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg transition-all duration-200"
                              >
                                <FiX size={14} /> Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Active Gurus */}
                  <div>
                    <h3 className="text-[16px] font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <FiUserCheck size={16} className="text-green-500" /> Active Gurus & Acharyas
                    </h3>
                    {users.filter(u => ['guru', 'acharya'].includes(u.role)).length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[15px] text-gray-500">No gurus yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {users.filter(u => ['guru', 'acharya'].includes(u.role)).map((u, i) => (
                          <div
                            key={u._id}
                            className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <UserAvatar name={u.name} avatar={u.avatar} size="lg" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-[16px] font-semibold text-gray-800 truncate">{u.name}</span>
                                  <RoleBadge role={u.role} />
                                </div>
                                <div className="text-[14px] text-gray-400 truncate mt-0.5">{u.email} · Rep: {u.reputation || 0}</div>
                              </div>
                            </div>
                            <div className="relative sm:ml-auto">
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[14px] text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer transition-all"
                              >
                                <option value="user">User</option>
                                <option value="scholar">Scholar</option>
                                <option value="guru">Guru</option>
                                <option value="acharya">Acharya</option>
                                <option value="admin">Admin</option>
                              </select>
                              <FiChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── AI ANSWERS TAB ──────────────────────── */}
          {activeTab === 'ai-answers' && (
            <div className="space-y-5">
              {loading ? (
                <SkeletonRows count={3} />
              ) : aiAnswers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <FiCheck size={28} className="text-emerald-400" />
                  </div>
                  <p className="text-[17px] font-medium text-gray-700">All caught up!</p>
                  <p className="text-[14px] text-gray-400 mt-1">No pending AI answers to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiAnswers.map((answer, i) => (
                    <div
                      key={answer._id}
                      className="bg-white border border-gray-100 rounded-xl p-6 hover:border-gray-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row gap-5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-3">
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                              <FiCpu size={11} /> AI Generated
                            </span>
                            <span className="text-[13px] text-gray-300">·</span>
                            <span className="text-[13px] text-gray-400">
                              {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                           <Link to={`/questions/${answer.question?._id}`} className="font-semibold text-[17px] text-gray-900 hover:text-brand transition-colors line-clamp-1">
                            {answer.question?.title}
                          </Link>
                           <p className="text-[13px] text-gray-400 mt-1">
                            Asked by {answer.question?.author?.name || 'Unknown'}
                          </p>
                           <div className="mt-3 text-[14px] text-gray-600 bg-gray-50 border border-gray-100 p-4 rounded-lg max-h-32 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                            {answer.body?.substring(0, 500)}{answer.body?.length > 500 ? '...' : ''}
                          </div>
                        </div>
                        <div className="flex lg:flex-col gap-2.5 lg:justify-center shrink-0">
                          <button
                            onClick={() => setVerifyModal({ open: true, answer })}
                            className="flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm hover:shadow transition-all duration-200"
                          >
                            <FiCheck size={14} /> Verify
                          </button>
                          <button
                            onClick={() => handleRejectAI(answer._id)}
                            className="flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200"
                          >
                            <FiX size={14} /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── WHATSAPP TAB ──────────────────────── */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6">
              {/* Connection Status */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100/60 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <FiSmartphone size={22} className="text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-800">WhatsApp Integration</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${whatsappStatus?.isReady ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-[13px] text-gray-500">
                          {whatsappStatus?.isReady ? 'Connected' : whatsappStatus?.hasQR ? 'QR Code ready — scan to authenticate' : 'Not connected'}
                        </span>
                      </div>
                      {whatsappStatus?.groupId && (
                        <p className="text-[12px] text-gray-400 mt-1">Group: {whatsappStatus.groupId}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const statusRes = await api.get('/whatsapp/status').catch(() => ({ data: {} }));
                          setWhatsappStatus(statusRes.data);
                          if (statusRes.data.hasQR) {
                            const qrRes = await api.get('/whatsapp/qr').catch(() => ({ data: {} }));
                            setWhatsappQR(qrRes.data.qr);
                          }
                        } catch {
                          toast.error('Could not fetch WhatsApp status');
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all"
                    >
                      <FiRefreshCw size={13} /> Refresh
                    </button>
                    {!whatsappStatus?.isReady && (
                      <button
                        onClick={handleInitWhatsApp}
                        className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm hover:shadow transition-all"
                      >
                        <FiSend size={13} /> Initialize
                      </button>
                    )}
                    <button
                      onClick={handleResetWhatsApp}
                      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg shadow-sm hover:shadow transition-all"
                      title="Force wipe the current session and restart"
                    >
                      <FiAlertCircle size={13} /> Reset Connection
                    </button>
                  </div>
                </div>
                {/* QR Code display */}
                {whatsappQR && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 inline-block">
                    <p className="text-[12px] text-gray-400 mb-2 text-center">Scan this QR code with WhatsApp on your phone</p>
                    <img src={whatsappQR} alt="WhatsApp QR Code" className="w-56 h-56 mx-auto" />
                    <p className="text-[11px] text-gray-300 mt-2 text-center animate-pulse">QR auto-refreshes every few seconds</p>
                  </div>
                )}
                {!whatsappQR && !whatsappStatus?.isReady && whatsappStatus?.isInitializing && (
                  <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 inline-block">
                    <p className="text-[13px] text-gray-400 text-center">⏳ Waiting for QR code...</p>
                  </div>
                )}
              </div>

              {/* How it works */}
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                <h4 className="text-[14px] font-semibold text-gray-700 mb-3">How it works</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 text-brand text-[14px] font-bold">1</div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-700">New question posted</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Automatically sent to your WhatsApp group</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 text-brand text-[14px] font-bold">2</div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-700">Guru replies in group</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Bot captures the reply as a pending answer</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 text-brand text-[14px] font-bold">3</div>
                    <div>
                      <p className="text-[13px] font-medium text-gray-700">Admin approves & assigns</p>
                      <p className="text-[12px] text-gray-400 mt-0.5">Pick the guru and publish the answer</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pending WhatsApp Answers */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-semibold text-gray-800 flex items-center gap-2">
                    <FiSmartphone size={16} className="text-green-500" /> Pending WhatsApp Answers
                    {whatsappAnswers.length > 0 && (
                      <span className="text-[11px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                        {whatsappAnswers.length}
                      </span>
                    )}
                  </h3>
                </div>
                {whatsappAnswers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                    <FiSmartphone size={28} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-[15px] text-gray-500">No pending WhatsApp answers</p>
                    <p className="text-[13px] text-gray-400 mt-1">Answers from WhatsApp gurus will appear here for review</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {whatsappAnswers.map((msg, i) => (
                      <div
                        key={msg._id}
                        className="bg-white border border-gray-100 rounded-xl p-6 hover:border-green-200 hover:shadow-sm transition-all duration-200 animate-fade-in-up"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="flex flex-col lg:flex-row gap-5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 mb-3 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-green-50 text-green-600 border border-green-100">
                                <FiSmartphone size={11} /> WhatsApp Reply
                              </span>
                              <span className="text-[13px] text-gray-300">·</span>
                              <span className="text-[13px] text-gray-400">
                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <Link to={`/questions/${msg.question?._id}`} className="font-semibold text-[17px] text-gray-900 hover:text-brand transition-colors line-clamp-1">
                              {msg.question?.title || 'Unknown question'}
                            </Link>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5 text-[13px] text-gray-500">
                                <FiPhone size={11} />
                                {msg.senderName || 'Unknown'} {msg.senderPhone ? `(${msg.senderPhone})` : ''}
                              </div>
                            </div>
                            <div className="mt-3 text-[14px] text-gray-600 bg-gray-50 border border-gray-100 p-4 rounded-lg max-h-40 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                              {msg.answerText}
                            </div>
                          </div>
                          <div className="flex lg:flex-col gap-2.5 lg:justify-center shrink-0">
                            <button
                              onClick={() => setWaApproveModal({ open: true, message: msg })}
                              className="flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm hover:shadow transition-all duration-200"
                            >
                              <FiCheck size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleRejectWhatsApp(msg._id)}
                              className="flex items-center gap-1.5 px-5 py-2.5 text-[14px] font-medium text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200"
                            >
                              <FiX size={14} /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── ACTIVITY TAB ────────────────────────── */}
          {activeTab === 'activity' && (
            <div className="space-y-2">
              {loading ? (
                <SkeletonRows count={5} />
              ) : activities.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-[14px]">No recent activity</div>
              ) : (
                activities.map((item, i) => (
                  <div
                    key={`${item.type}-${item._id}-${i}`}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <ActivityRow item={item} />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <VerifyModal
        open={verifyModal.open}
        answer={verifyModal.answer}
        onVerify={handleVerifyAI}
        onCancel={() => setVerifyModal({ open: false, answer: null })}
      />
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false })}
        confirmLabel={confirmModal.confirmLabel}
        danger={confirmModal.danger}
      />
      <WhatsAppApproveModal
        open={waApproveModal.open}
        message={waApproveModal.message}
        gurus={gurus}
        onApprove={(guruUserId) => {
          handleApproveWhatsApp(waApproveModal.message._id, guruUserId);
          setWaApproveModal({ open: false, message: null });
        }}
        onCancel={() => setWaApproveModal({ open: false, message: null })}
      />
    </div>
  );
};

// ── Activity Row ──────────────────────────────────────────────
function ActivityRow({ item }) {
  const getIcon = () => {
    switch (item.type) {
      case 'user_joined': return <FiUserCheck size={14} />;
      case 'question_asked': return <FiMessageSquare size={14} />;
      case 'answer_posted': return <FiFileText size={14} />;
      default: return <FiActivity size={14} />;
    }
  };

  const getStyle = () => {
    switch (item.type) {
      case 'user_joined': return 'bg-blue-50 text-blue-500 border-blue-100';
      case 'question_asked': return 'bg-brand-50 text-brand border-brand-100';
      case 'answer_posted':
        if (item.isAccepted) return 'bg-emerald-50 text-emerald-500 border-emerald-100';
        if (item.isVerifiedByGuru) return 'bg-purple-50 text-purple-500 border-purple-100';
        if (item.isAIGenerated) return 'bg-sky-50 text-sky-500 border-sky-100';
        return 'bg-brand-50 text-brand border-brand-100';
      default: return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  const getLabel = () => {
    switch (item.type) {
      case 'user_joined': return 'Joined';
      case 'question_asked': return 'Asked';
      case 'answer_posted':
        if (item.isAccepted) return 'Accepted';
        if (item.isVerifiedByGuru) return 'Verified';
        if (item.isAIGenerated) return 'AI';
        return 'Answered';
      default: return '';
    }
  };

  const getTitle = () => {
    switch (item.type) {
      case 'user_joined': return item.name;
      case 'question_asked': return item.title;
      case 'answer_posted': return item.questionTitle;
      default: return '';
    }
  };

  const getLink = () => {
    switch (item.type) {
      case 'question_asked': return `/questions/${item._id}`;
      case 'answer_posted': return `/questions/${item.questionId}`;
      default: return null;
    }
  };

  const link = getLink();
  const Wrapper = link ? Link : 'div';

  return (
    <Wrapper
      to={link}
      className={`flex items-center gap-4 py-3 px-4 rounded-xl transition-colors duration-200 ${link ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${getStyle()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <span className={`text-[12px] font-semibold uppercase tracking-wider ${getStyle().split(' ').slice(1, 2).join(' ')}`}>
            {getLabel()}
          </span>
           <span className="text-[12px] text-gray-300">·</span>
          <span className="text-[14px] text-gray-600 truncate font-medium">{getTitle()}</span>
        </div>
        <div className="text-[13px] text-gray-400 mt-0.5">
          {item.author?.name || item.name || 'System'} · {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
          {item.views != null && <span> · {item.views} views</span>}
          {item.voteScore > 0 && <span> · <FiStar size={10} className="inline" /> {item.voteScore}</span>}
        </div>
      </div>
      {item.type === 'question_asked' && item.answerCount != null && (
        <span className="text-[12px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full flex-shrink-0">
          {item.answerCount} ans
        </span>
      )}
    </Wrapper>
  );
}

export default AdminPanel;
