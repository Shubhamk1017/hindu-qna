import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const TopExperts = () => {
  const [experts, setExperts] = useState([]);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        // Fetch gurus and acharyas (verified experts only)
        const [guruRes, acharyaRes] = await Promise.all([
          api.get('/users?role=guru&limit=5'),
          api.get('/users?role=acharya&limit=5')
        ]);
        const gurus = guruRes.data.users || [];
        const acharyas = acharyaRes.data.users || [];
        const allExperts = [...gurus, ...acharyas]
          .sort((a, b) => (b.reputation || 0) - (a.reputation || 0))
          .slice(0, 5);
        setExperts(allExperts);
      } catch (error) {
        console.error('Error fetching experts:', error);
      }
    };
    fetchExperts();
  }, []);

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  
  const getRoleLabel = (role) => {
    const labels = { guru: 'Bhagwat gita', acharya: 'Advaita Vedanta', scholar: 'Vedanta Philosophy', admin: 'Platform Admin' };
    return labels[role] || 'Hindu Scripture';
  };

  const colors = ['bg-brand-50 text-brand', 'bg-purple-50 text-purple-600', 'bg-blue-50 text-blue-600', 'bg-green-50 text-green-600'];

  if (experts.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-[10px] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <span className="font-serif text-[16px] font-semibold flex items-center gap-2">
          <span className="text-brand">👤</span> Top Experts
        </span>
        <Link to="/users" className="text-[13px] text-brand font-medium hover:text-brand-500">
          All →
        </Link>
      </div>
      <div>
        {experts.map((expert, i) => (
          <Link
            key={expert._id}
            to={`/profile/${expert._id}`}
            className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors rounded px-1 -mx-1"
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                {getInitials(expert.name)}
              </div>
              <div>
                <div className="text-[14px] font-medium text-gray-900">{expert.name}</div>
                <div className="text-[12px] text-gray-400">{getRoleLabel(expert.role)}</div>
              </div>
            </div>
            <div className="w-6 h-6 rounded-full bg-brand-50 text-brand text-[13px] font-semibold flex items-center justify-center flex-shrink-0">
              {expert.reputation || 0}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default TopExperts;
