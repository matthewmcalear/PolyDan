import React from 'react';

interface LoadingSpinnerProps {
  'data-testid'?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  'data-testid': testId,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={`flex justify-center ${className}`} data-testid={testId}>
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`}
      />
    </div>
  );
}; 