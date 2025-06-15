import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper components to reduce duplication
const Input: React.FC<{
  id: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
  className?: string;
  'data-testid'?: string;
}> = ({ id, type, placeholder, value, onChange, required, autoComplete, className = '', 'data-testid': testId }) => (
  <input
    id={id}
    name={id}
    type={type}
    required={required}
    autoComplete={autoComplete}
    className={`appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${className}`}
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    data-testid={testId}
  />
);

const Button: React.FC<{
  type: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}> = ({ type, disabled, onClick, children, className = '', 'data-testid': testId }) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    data-testid={testId}
  >
    {children}
  </button>
);

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="rounded-md bg-red-50 p-4" data-testid="error-message">
    <div className="text-sm text-red-700">{message}</div>
  </div>
);

/**
 * Custom hook to handle the password reset token from URL
 * @returns Object containing loading state, error state, and session establishment status
 */
const useResetToken = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);
  const location = useLocation();
  const hasAttemptedSetup = useRef(false);

  useEffect(() => {
    const handleResetToken = async () => {
      // Prevent multiple attempts
      if (hasAttemptedSetup.current) return;
      hasAttemptedSetup.current = true;

      const hashParams = new URLSearchParams(location.hash.substring(1));
      const searchParams = new URLSearchParams(location.search);
      
      const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') || searchParams.get('refresh_token');
      
      if (!accessToken) {
        setError('Invalid reset link. Please request a new password reset.');
        setIsLoading(false);
        return;
      }

      try {
        // Set up the session directly without signing out first
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) throw error;

        // Verify the session was established
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsSessionEstablished(true);
          // Clear the URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
        } else {
          throw new Error('Failed to establish session');
        }
      } catch (err: any) {
        console.error('Error setting session:', err);
        setError(err.message || 'Failed to process reset link');
      } finally {
        setIsLoading(false);
      }
    };

    handleResetToken();
  }, [location.hash, location.search]);

  return { isLoading, error, isSessionEstablished };
};

/**
 * Custom hook to handle auth state changes
 * @returns Object containing session state and error handling
 */
const useAuthState = () => {
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    console.log('Setting up auth state change listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      
      console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
      
      if (event === 'SIGNED_IN' && session && !isSessionEstablished) {
        setIsSessionEstablished(true);
      } else if (event === 'SIGNED_OUT') {
        setIsSessionEstablished(false);
      }
    });

    return () => {
      cancelled = true;
      console.log('Cleaning up auth state change listener');
      subscription.unsubscribe();
    };
  }, [isSessionEstablished]);

  return { isSessionEstablished, error, setError };
};

/**
 * ResetPassword component that handles both forgot password and password reset flows
 * @returns JSX.Element
 */
const ResetPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isSubmitting = useRef(false);

  // Check if we have a reset token in the URL
  const hasResetToken = location.hash.includes('type=recovery') || location.search.includes('type=recovery');
  
  // Use our custom hooks
  const { isLoading: isTokenLoading, error: tokenError, isSessionEstablished } = useResetToken();
  const { error: authError } = useAuthState();

  // Combine errors
  useEffect(() => {
    setError(tokenError || authError);
  }, [tokenError, authError]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading || isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      console.log('Sending reset password email...');
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://polydan-1f195a22e2e0.herokuapp.com/reset-password'
      });

      if (error) throw error;

      toast.success('Password reset instructions sent to your email!');
      setEmail('');
      navigate('/reset-confirmation');
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      setError(error.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [email, loading, navigate]);

  const handleResetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading || isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      isSubmitting.current = false;
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success('Password updated successfully!');
      navigate('/login');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setError(error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [password, confirmPassword, loading, navigate]);

  // Show loading state while processing token
  if (isTokenLoading) {
    return (
      <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" data-testid="loading-spinner"></div>
          </div>
          <p className="text-center text-gray-600">Processing reset link...</p>
        </div>
      </div>
    );
  }

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

          <form className="mt-8 space-y-6" onSubmit={handleResetPassword} data-testid="reset-password-form">
            {error && <ErrorMessage message={error} />}

            <div className="rounded-md shadow-sm -space-y-px">
              <Input
                id="password"
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-t-md"
                data-testid="new-password-input"
              />
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="rounded-b-md"
                data-testid="confirm-password-input"
              />
            </div>

            <Button type="submit" disabled={loading} data-testid="reset-password-button">
              {loading ? 'Updating...' : 'Reset Password'}
            </Button>
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

        <form className="mt-8 space-y-6" onSubmit={handleForgotPassword} data-testid="forgot-password-form">
          {error && <ErrorMessage message={error} />}

          <Input
            id="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            data-testid="email-input"
          />

          <Button type="submit" disabled={loading} data-testid="send-reset-button">
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </Button>

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500" data-testid="back-to-login">
              Back to login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export { ResetPassword };
export default ResetPassword; 