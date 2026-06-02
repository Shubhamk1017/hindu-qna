import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { FiUsers, FiCheckCircle } from 'react-icons/fi';

const Users = () => {
  const [gurus, setGurus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperts();
  }, []);

  const fetchExperts = async () => {
    try {
      const [guruRes, acharyaRes, scholarRes] = await Promise.all([
        api.get('/users?role=guru&limit=50'),
        api.get('/users?role=acharya&limit=50'),
        api.get('/users?role=scholar&limit=50'),
      ]);
      const verified = [
        ...(guruRes.data.users || []),
        ...(acharyaRes.data.users || []),
        ...(scholarRes.data.users || []),
      ].sort((a, b) => (b.reputation || 0) - (a.reputation || 0));

      setGurus(verified);
    } catch (error) {
      console.error('Error fetching experts:', error);
    }
    setLoading(false);
  };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const getRoleLabel = (role) => {
    const labels = { guru: 'Guru', acharya: 'Acharya', scholar: 'Scholar' };
    return labels[role] || 'Expert';
  };

  const colors = ['bg-brand-50 text-brand', 'bg-purple-50 text-purple-600', 'bg-blue-50 text-blue-600', 'bg-green-50 text-green-600'];

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="font-serif text-[32px] font-bold text-gray-900 flex items-center gap-2.5">
          <FiUsers className="text-brand" size={24} />
          Our Experts
        </div>
        <p className="text-[15px] text-gray-500 mt-1">
          Verified pandits, scholars, and practitioners who provide authoritative answers.
        </p>
      </div>

      {/* Verified Experts */}
      {gurus.length > 0 && (
        <div className="mb-8">
          <div className="font-serif text-lg font-semibold text-gray-600 flex items-center gap-2 mb-4">
            <FiCheckCircle className="text-brand" size={16} />
            Verified Experts ({gurus.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {gurus.map((user, i) => (
              <Link
                key={user._id}
                to={`/profile/${user._id}`}
                className="bg-white border border-gray-200 rounded-[10px] p-5 hover:border-brand-100 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[16px] font-semibold text-brand flex items-center gap-1.5">
                      {user.name}
                      <FiCheckCircle size={14} className="text-brand" />
                    </div>
                    <div className="text-[13px] text-brand mb-1.5">{getRoleLabel(user.role)}</div>
                    {user.bio && (
                      <div className="text-[14px] text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">
                        {user.bio}
                      </div>
                    )}
                    <div className="flex items-center gap-2.5">
                      <span className="text-[13px] text-gray-500 bg-cream border border-gray-200 rounded-lg px-3 py-1 flex items-center gap-1">
                        📖 {user.answers || 0} answers
                      </span>
                      <span className="text-[13px] font-medium text-brand bg-brand-50 border border-brand-100 rounded-lg px-3 py-1">
                        Verified Expert
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {gurus.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No verified experts yet.
        </div>
      )}
    </div>
  );
};

export default Users;
