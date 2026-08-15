import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
  is_admin: boolean;
}

const UserAdmin: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, created_at, role')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;
      
      setUsers((profilesData || []).map(profile => ({
        id: profile.user_id,
        email: profile.email,
        name: profile.display_name,
        created_at: profile.created_at,
        is_admin: profile.role === 'admin'
      })));
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) throw profileError;

      // Delete from auth.users through Supabase admin API (requires service role)
      // Note: This may fail if not using service role key
      try {
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) console.error('Could not delete from auth:', authError);
      } catch (e) {
        console.error('Auth deletion not available:', e);
      }

      setUsers(users.filter(user => user.id !== userId));
      toast.success('User profile deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const toggleAdminStatus = async (user: User) => {
    try {
      const newRole = user.is_admin ? 'user' : 'admin';
      
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', user.id);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === user.id 
          ? { ...u, is_admin: !u.is_admin }
          : u
      ));

      toast.success(`Admin status ${user.is_admin ? 'removed from' : 'granted to'} ${user.email}`);
    } catch (error: any) {
      console.error('Error toggling admin status:', error);
      toast.error(error.message || 'Failed to update admin status');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all users in your application including their name, email, and admin status.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white p-4 rounded-lg shadow border border-gray-200"
          >
            <div className="mb-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-gray-900">{user.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                  user.is_admin 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.is_admin ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => toggleAdminStatus(user)}
                className="flex-1 px-4 py-2 min-h-[44px] rounded-lg border-2 border-indigo-600 text-base font-semibold text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
              >
                {user.is_admin ? 'Remove Admin' : 'Make Admin'}
              </button>
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${user.email}?`)) {
                    deleteUser(user.id);
                  }
                }}
                className="flex-1 px-4 py-2 min-h-[44px] rounded-lg bg-red-600 text-base font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserAdmin; 