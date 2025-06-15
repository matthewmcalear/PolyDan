import React from 'react';

interface FormInputProps {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
  'data-testid'?: string;
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
  required = true,
  'data-testid': testId,
  className = '',
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    required={required}
    data-testid={testId}
    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
  />
); 