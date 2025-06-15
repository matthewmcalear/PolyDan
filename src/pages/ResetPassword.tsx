import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Custom hook to handle reset token and session setup
const useResetToken = () => {
  const [isSessionEstablished, setIsSessionEstablished] = useState(false);
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const hasAttemptedSetup = useRef(false);

  useEffect(() => {
    const handleResetToken = async () => {
      // Prevent multiple attempts
      if (hasAttemptedSetup.current) return;
      hasAttemptedSetup.current = true;

      try {
        // Supabase v2: First try exchangeCodeForSession for magic/recovery links
        // This is the recommended approach for handling auth code exchanges
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        
        if (exchangeError) {
          console.error('Error exchanging code for session:', exchangeError);
          // Fallback to manual session setup if exchange fails
          const params = new URLSearchParams(window.location.search);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          
          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) throw error;
            if (data?.session) {
              setIsSessionEstablished(true);
            }
          }
        } else if (exchangeData?.session) {
          setIsSessionEstablished(true);
        }
      } catch (error) {
        console.error('Error setting up session:', error);
        toast.error('Failed to set up password reset session. Please try again.');
      } finally {
        setIsProcessingToken(false);
      }
    };

    handleResetToken();
  }, []);

  return { isSessionEstablished, isProcessingToken };
};

// Helper component for form inputs
const FormInput: React.FC<{
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  'data-testid'?: string;
}> = ({ type, value, onChange, placeholder, required = true, 'data-testid': testId }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    data-testid={testId}
    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
);

// Helper component for error messages
const ErrorMessage: React.FC<{ message: string; 'data-testid'?: string }> = ({ message, 'data-testid': testId }) => (
  <p className="text-red-500 text-sm mt-1" data-testid={testId}>{message}</p>
);

// Helper component for loading spinner
const LoadingSpinner: React.FC<{ 'data-testid'?: string }> = ({ 'data-testid': testId }) => (
  <div className="flex justify-center" data-testid={testId}>
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
  </div>
);

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmitting = useRef(false);
  const { isSessionEstablished, isProcessingToken } = useResetToken();

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

      toast.success('Password updated successfully');
      navigate('/login');
    } catch (error) {
      console.error('Error updating password:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  }, [password, confirmPassword, loading, navigate]);

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

  if (isSessionEstablished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Reset Your Password
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword} data-testid="reset-password-form">
            <div className="rounded-md shadow-sm space-y-4">
              <FormInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                data-testid="new-password-input"
              />
              <FormInput
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                data-testid="confirm-password-input"
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
                {loading ? <LoadingSpinner data-testid="submit-spinner" /> : 'Reset Password'}
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
        <form className="mt-8 space-y-6" onSubmit={handleForgotPassword} data-testid="forgot-password-form">
          <div>
            <FormInput
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              data-testid="email-input"
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
              {loading ? <LoadingSpinner data-testid="submit-spinner" /> : 'Send Reset Instructions'}
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