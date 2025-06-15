import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(false);
  const isMounted = useRef(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if we have a reset token in the URL
  const hasResetToken = location.hash.includes('type=recovery') || location.search.includes('type=recovery');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Handle the reset token when the component mounts
  useEffect(() => {
    const handleResetToken = async () => {
      if (!hasResetToken || isProcessingToken || !isMounted.current) return;

      setIsProcessingToken(true);
      const hashParams = new URLSearchParams(location.hash.substring(1));
      const searchParams = new URLSearchParams(location.search);
      
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      
      if (!accessToken) {
        if (isMounted.current) {
          setError('Invalid reset link. Please request a new password reset.');
          setIsProcessingToken(false);
        }
        return;
      }

      try {
        // First, sign out any existing session
        await supabase.auth.signOut();

        // Then set up the new session
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) throw error;

        // Verify the session was established
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted.current) {
          setIsSessionEstablished(true);
          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          throw new Error('Failed to establish session');
        }
      } catch (err: any) {
        console.error('Error setting session:', err);
        if (isMounted.current) {
          setError(err.message || 'Failed to process reset link');
        }
      } finally {
        if (isMounted.current) {
          setIsProcessingToken(false);
        }
      }
    };

    handleResetToken();
  }, [hasResetToken, location.hash, location.search, isProcessingToken]);

  // Single auth state change listener
  useEffect(() => {
    let mounted = true;
    console.log('Setting up auth state change listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session && !isSessionEstablished) {
        setIsSessionEstablished(true);
      } else if (event === 'SIGNED_OUT') {
        setIsSessionEstablished(false);
      }
    });

    return () => {
      mounted = false;
      console.log('Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [isSessionEstablished]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !isMounted.current) return;

    setLoading(true);
    setError('');

    try {
      console.log('Sending reset password email...');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://polydan-1f195a22e2e0.herokuapp.com/reset-password'
      });

      if (error) throw error;

      if (isMounted.current) {
        toast.success('Password reset instructions sent to your email!');
        setEmail('');
        navigate('/reset-confirmation');
      }
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      if (isMounted.current) {
        setError(error.message || 'Failed to send reset instructions');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [email, loading, navigate]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !isMounted.current) return;

    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      if (isMounted.current) {
        toast.success('Password updated successfully!');
        navigate('/login');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      if (isMounted.current) {
        setError(error.message || 'Failed to reset password');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [password, confirmPassword, loading, navigate]);

  // Show the password reset form if we have a reset token and session is established
  if (hasResetToken && isSessionEstablished) {
    return (
      <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="password" className="sr-only">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
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
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? 'Updating...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show the forgot password form by default
  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {loading ? 'Sending...' : 'Send Reset Instructions'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 