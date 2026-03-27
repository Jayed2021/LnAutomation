import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Glasses } from 'lucide-react';
import bcrypt from 'bcryptjs';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (dbError) throw dbError;

      if (!data) {
        setError('Invalid username or password.');
        return;
      }

      if (!data.is_active) {
        setError('Your account has been deactivated. Please contact your administrator.');
        return;
      }

      const passwordMatch = await bcrypt.compare(password, data.password_hash);
      if (!passwordMatch) {
        setError('Invalid username or password.');
        return;
      }

      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.id);

      localStorage.setItem('erp_user_id', data.id);
      setUser(data);
      navigate('/dashboard');
    } catch (err: any) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gray-900 px-8 py-10 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
              <Glasses className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ERP System</h1>
            <p className="text-gray-400 text-sm mt-1">Bangladesh Eyewear Management</p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all placeholder-gray-400"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-2.5 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all placeholder-gray-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
};
