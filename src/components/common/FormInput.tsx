import React from 'react';

interface FormInputProps {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  'data-testid'?: string;
  disabled?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  type,
  value,
  onChange,
  placeholder,
  'data-testid': dataTestId,
  disabled = false
}) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    data-testid={dataTestId}
    disabled={disabled}
    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
      disabled ? 'opacity-50 cursor-not-allowed' : ''
    }`}
  />
);

export default FormInput; 