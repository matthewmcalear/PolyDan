import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we're in reset mode (has access token) or forgot password mode
  const isResetMode = location.hash.includes('type=recovery') || location.search.includes('type=recovery');

  useEffect(() => {
    // If we're in reset mode, handle the token
    if (isResetMode) {
      console.log('Reset mode detected, checking URL parameters...');
      console.log('Hash:', location.hash);
      console.log('Search:', location.search);

      const hashParams = new URLSearchParams(location.hash.substring(1));
      const searchParams = new URLSearchParams(location.search);
      
      // Try to get token from hash first, then from search params
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      
      if (accessToken) {
        console.log('Found access token, attempting to set session...');
        // Set the session with the token
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        }).then(({ data, error }) => {
          if (error) {
            console.error('Error setting session:', error);
            setError(`Session error: ${error.message}`);
            navigate('/reset-password');
          } else {
            console.log('Session set successfully:', data);
          }
        });
      } else {
        console.log('No access token found in URL');
        setError('Invalid reset link. Please request a new password reset.');
      }
    }
  }, [isResetMode, location.hash, location.search, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Sending reset password email...');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://polydan-1f195a22e2e0.herokuapp.com/reset-password'
      });

      if (error) {
        console.error('Reset password error:', error);
        throw error;
      }

      toast.success('Password reset instructions sent to your email!');
      setEmail('');
      // Redirect to a confirmation page
      navigate('/reset-confirmation');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      setError(error.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting to update password...');
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Password update successful:', data);
      toast.success('Password updated successfully!');
      // Clear the URL parameters to remove the token
      window.history.replaceState({}, document.title, window.location.pathname);
      navigate('/login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isResetMode ? 'Reset Your Password' : 'Forgot Your Password?'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isResetMode ? (
              'Enter your new password below'
            ) : (
              <>
                Enter your email address and we'll send you instructions to reset your password.
                <br />
                <Link
                  to="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Back to login
                </Link>
              </>
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={isResetMode ? handleResetPassword : handleForgotPassword}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            {!isResetMode && (
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            )}

            {isResetMode && (
              <>
                <div>
                  <label htmlFor="password" className="sr-only">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="sr-only">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : isResetMode ? 'Reset Password' : 'Send Reset Instructions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 