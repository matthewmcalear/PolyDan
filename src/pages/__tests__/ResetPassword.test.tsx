import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPassword from '../ResetPassword';
import { supabase } from '../../lib/supabase';

// Mock supabase auth methods
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      setSession: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
  },
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({
      pathname: '/reset-password',
      search: '',
      hash: '',
    }),
  };
});

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows forgot password form by default', () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument();
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-reset-button')).toBeInTheDocument();
  });

  it('handles password mismatch error', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Mock successful session exchange
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
      data: { session: {} },
      error: null,
    });

    // Trigger password reset form
    await waitFor(() => {
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
    });

    // Enter mismatched passwords
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'password456' },
    });

    // Submit form
    fireEvent.click(screen.getByTestId('reset-password-button'));

    // Check for error message
    expect(screen.getByTestId('error-message')).toHaveTextContent('Passwords do not match');
  });

  it('disables submit button during submission', async () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Mock successful session exchange
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
      data: { session: {} },
      error: null,
    });

    // Trigger password reset form
    await waitFor(() => {
      expect(screen.getByTestId('reset-password-form')).toBeInTheDocument();
    });

    // Enter matching passwords
    fireEvent.change(screen.getByTestId('new-password-input'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('confirm-password-input'), {
      target: { value: 'password123' },
    });

    // Mock slow password update
    vi.mocked(supabase.auth.updateUser).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    // Submit form
    fireEvent.click(screen.getByTestId('reset-password-button'));

    // Check button is disabled and shows spinner
    expect(screen.getByTestId('reset-password-button')).toBeDisabled();
    expect(screen.getByTestId('submit-spinner')).toBeInTheDocument();
  });

  it('handles invalid reset token', async () => {
    // Mock failed session exchange
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Invalid token'),
    });

    // Mock failed fallback
    vi.mocked(supabase.auth.setSession).mockResolvedValueOnce({
      data: { session: null },
      error: new Error('Invalid session'),
    });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>
    );

    // Should show forgot password form after failed attempts
    await waitFor(() => {
      expect(screen.getByTestId('forgot-password-form')).toBeInTheDocument();
    });
  });
}); 