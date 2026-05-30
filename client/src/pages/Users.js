import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
    setLoading(false);
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {users.map(user => (
          <Link
            key={user._id}
            to={`/profile/${user._id}`}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center text-white text-xl font-bold mr-3">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.reputation} reputation</p>
              </div>
            </div>
            {user.badges?.length > 0 && (
              <div className="flex gap-1 mt-2">
                {user.badges.slice(0, 3).map((badge, i) => (
                  <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {badge.name}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Users;
