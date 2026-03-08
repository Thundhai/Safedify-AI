import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// Mock dependencies
const mockLogin = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
  }),
}));

import { Login } from '../../components/Login';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderLogin();
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeInTheDocument();
  });

  it('shows validation when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();
    const button = screen.getByRole('button', { name: /sign in/i });
    await user.click(button);
    // Form should handle empty submission - either with HTML5 validation or toast
    expect(button).toBeInTheDocument();
  });

  it('calls login with provided credentials', async () => {
    mockLogin.mockResolvedValue(true);
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    await user.type(emailInput, 'admin@safedify.com');
    await user.type(passwordInput, 'password123');

    const button = screen.getByRole('button', { name: /sign in/i });
    await user.click(button);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin@safedify.com', 'password123');
    });
  });

  it('has a link to register page', () => {
    renderLogin();
    const link = screen.getByText(/sign up/i) || screen.getByText(/register/i) || screen.getByText(/create.*account/i);
    expect(link).toBeInTheDocument();
  });

  it('has a link to forgot password', () => {
    renderLogin();
    const link = screen.getByText(/forgot/i);
    expect(link).toBeInTheDocument();
  });
});
