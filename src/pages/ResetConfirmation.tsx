import React from 'react';
import { Link } from 'react-router-dom';

const ResetConfirmation: React.FC = () => {
  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Check Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent password reset instructions to your email address.
            Please check your inbox and follow the link to reset your password.
          </p>
        </div>

        <div className="text-center">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetConfirmation; 