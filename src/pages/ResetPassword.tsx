import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { FormInput } from '../components/common/FormInput';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

// Custom hook to handle reset token and session setup
const useResetToken = () => {
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const hasAttemptedSetup = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleResetToken = async () => {
      // Prevent multiple attempts
      if (hasAttemptedSetup.current) return;
      hasAttemptedSetup.current = true;

      try {
        // First check if we already have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted.current) return;

        if (session) {
          // Session already exists, no need to set it up again
          setIsSessionEstablished(true);
          setIsProcessingToken(false);
          return;
        }

        // If no session exists, try to set it up from URL params
        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        
        if (accessToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (!isMounted.current) return;
          
          if (error) throw error;
          if (data?.session) {
            setIsSessionEstablished(true);
          }
        }
      } catch (error) {
        if (!isMounted.current) return;
        console.error('Error setting up session:', error);
        toast.error('Failed to set up password reset session. Please try again.');
      } finally {
        if (isMounted.current) {
          setIsProcessingToken(false);
        }
      }
    };

    handleResetToken();
  }, []);

  return { isSessionEstablished, isProcessingToken };
};

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetComplete, setIsResetComplete] = useState(false);
  const isSubmitting = useRef(false);
  const { isSessionEstablished, isProcessingToken } = useResetToken();

  // Auto-redirect after 5 seconds when reset is complete
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isResetComplete) {
      timeoutId = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 5000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isResetComplete, navigate]);

  // Clear URL parameters after processing
  useEffect(() => {
    if (isSessionEstablished) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isSessionEstablished]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (loading || isSubmitting.current) return;
    isSubmitting.current = true;
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset instructions sent to your email');
      setEmail('');
    } catch (error) {
      console.error('Error sending reset email:', error);
      setError('Failed to send reset instructions. Please try again.');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [email, loading]);

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

      // Show success message
      toast.success('Password updated successfully');

      // Reset form state
      setPassword('');
      setConfirmPassword('');
      setError(null);

      // Show confirmation screen
      setIsResetComplete(true);
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      // Always reset loading state
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [password, confirmPassword, loading]);

  if (isProcessingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <LoadingSpinner data-testid="loading-spinner" />
          <p className="text-center text-gray-600">Setting up password reset...</p>
        </div>
      </div>
    );
  }

  if (isResetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Password Reset Complete
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600" data-testid="reset-success-message">
              Your password has been successfully updated. You will be redirected to the login page in 5 seconds.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                data-testid="go-to-login-button"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSessionEstablished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
          </div>
          <form 
            className="mt-8 space-y-6" 
            onSubmit={handleResetPassword} 
            data-testid="reset-password-form"
            // Disable form during submission
            style={{ pointerEvents: loading ? 'none' : 'auto' }}
          >
            <div className="rounded-md shadow-sm space-y-4">
              <FormInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                data-testid="new-password-input"
                disabled={loading}
              />
              <FormInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                data-testid="confirm-password-input"
                disabled={loading}
              />
            </div>

            {error && <ErrorMessage message={error} data-testid="error-message" />}

            <div>
              <button
                type="submit"
                disabled={loading}
                data-testid="reset-password-button"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" data-testid="submit-spinner" /> : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Forgot Your Password?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your email address and we'll send you instructions to reset your password.
          </p>
        </div>
        <form 
          className="mt-8 space-y-6" 
          onSubmit={handleForgotPassword} 
          data-testid="forgot-password-form"
          // Disable form during submission
          style={{ pointerEvents: loading ? 'none' : 'auto' }}
        >
          <div>
            <FormInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              data-testid="email-input"
              disabled={loading}
            />
          </div>

          {error && <ErrorMessage message={error} data-testid="error-message" />}

          <div>
            <button
              type="submit"
              disabled={loading}
              data-testid="send-reset-button"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <LoadingSpinner size="sm" data-testid="submit-spinner" /> : 'Send Reset Instructions'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500" data-testid="back-to-login">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword; 