import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiUsers, FiMessageSquare, FiTag, FiSettings, FiCheck, FiX, FiCpu } from 'react-icons/fi';
import toast from 'react-hot-toast';

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [aiAnswers, setAiAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAdmin()) {
      toast.error('Access denied. Admin privileges required.');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, aiRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/ai-answers/pending')
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setAiAnswers(aiRes.data.answers);
    } catch (error) {
      toast.error('Error loading admin data');
    }
    setLoading(false);
  };

  const handleVerifyAI = async (answerId, note) => {
    try {
      await api.post(`/admin/ai-answers/${answerId}/verify`, { note });
      toast.success('AI answer verified!');
      fetchData();
    } catch (error) {
      toast.error('Error verifying AI answer');
    }
  };

  const handleRejectAI = async (answerId) => {
    try {
      await api.post(`/admin/ai-answers/${answerId}/reject`);
      toast.success('AI answer rejected');
      fetchData();
    } catch (error) {
      toast.error('Error rejecting AI answer');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('User role updated');
      fetchData();
    } catch (error) {
      toast.error('Error updating user role');
    }
  };

  const handleApproveGuru = async (userId) => {
    try {
      await api.post('/admin/gurus/approve', { userId });
      toast.success('Guru approved!');
      fetchData();
    } catch (error) {
      toast.error('Error approving guru');
    }
  };

  const handleRejectGuru = async (userId) => {
    try {
      await api.post('/admin/gurus/reject', { userId });
      toast.success('Guru rejected');
      fetchData();
    } catch (error) {
      toast.error('Error rejecting guru');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold mb-4">Admin Panel</h1>
        <p className="text-gray-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiUsers className="text-4xl text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats?.users || 0}</div>
          <div className="text-gray-600">Users</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiMessageSquare className="text-4xl text-orange-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats?.questions || 0}</div>
          <div className="text-gray-600">Questions</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiTag className="text-4xl text-green-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats?.tags || 0}</div>
          <div className="text-gray-600">Tags</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <FiSettings className="text-4xl text-purple-500 mx-auto mb-2" />
          <div className="text-3xl font-bold">{stats?.gurus || 0}</div>
          <div className="text-gray-600">Gurus</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 font-semibold ${activeTab === 'overview' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
            >
              Users
            </button>
            <button
              onClick={() => setActiveTab('gurus')}
              className={`px-6 py-4 font-semibold ${activeTab === 'gurus' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
            >
              Guru Management
            </button>
            <button
              onClick={() => setActiveTab('ai-answers')}
              className={`px-6 py-4 font-semibold flex items-center ${activeTab === 'ai-answers' ? 'border-b-2 border-orange-600 text-orange-600' : 'text-gray-500'}`}
            >
              <FiCpu className="mr-1" /> AI Answers ({aiAnswers.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">User</th>
                    <th className="text-left py-3">Email</th>
                    <th className="text-left py-3">Role</th>
                    <th className="text-left py-3">Reputation</th>
                    <th className="text-left py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className="border-b hover:bg-gray-50">
                      <td className="py-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center text-white mr-2">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          {u.name}
                        </div>
                      </td>
                      <td className="py-3">{u.email}</td>
                      <td className="py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="border rounded px-2 py-1"
                        >
                          <option value="user">User</option>
                          <option value="scholar">Scholar</option>
                          <option value="guru">Guru</option>
                          <option value="acharya">Acharya</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-3">{u.reputation}</td>
                      <td className="py-3">
                        <button className="text-red-600 hover:text-red-700">
                          <FiX size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'ai-answers' ? (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">Review and verify AI-generated answers</p>
              {aiAnswers.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending AI answers to review</p>
              ) : (
                aiAnswers.map(answer => (
                  <div key={answer._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link to={`/questions/${answer.question?._id}`} className="font-semibold text-lg hover:text-orange-600">
                          {answer.question?.title}
                        </Link>
                        <p className="text-sm text-gray-500 mt-1">
                          Asked by {answer.question?.author?.name} • AI Answer generated {new Date(answer.createdAt).toLocaleDateString()}
                        </p>
                        <div className="mt-2 text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-40 overflow-y-auto">
                          {answer.body?.substring(0, 500)}...
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => {
                            const note = prompt('Add verification note (optional):');
                            handleVerifyAI(answer._id, note);
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
                        >
                          <FiCheck className="mr-1" /> Verify
                        </button>
                        <button
                          onClick={() => handleRejectAI(answer._id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-red-700"
                        >
                          <FiX className="mr-1" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 mb-4">Manage guru approvals and roles</p>
              {users.filter(u => u.role === 'user').slice(0, 10).map(u => (
                <div key={u._id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-orange-400 rounded-full flex items-center justify-center text-white mr-3">
                      {u.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-sm text-gray-500">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleApproveGuru(u._id)}
                      className="bg-green-600 text-white px-3 py-1 rounded flex items-center hover:bg-green-700"
                    >
                      <FiCheck className="mr-1" /> Approve Guru
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
