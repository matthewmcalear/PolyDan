import React from 'react';

interface ErrorMessageProps {
  message: string;
  'data-testid'?: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  'data-testid': testId,
  className = '',
}) => (
  <p className={`text-red-500 text-sm mt-1 ${className}`} data-testid={testId}>
    {message}
  </p>
); 