import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Test consumer component
const AuthConsumerTest: React.FC = () => {
  const { user, isAuthenticated, login, signup, demoLogin, logout } = useAuth();

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</div>
      <div data-testid="user-name">{user?.name || 'No User'}</div>
      <div data-testid="user-role">{user?.role || 'No Role'}</div>
      <div data-testid="user-email">{user?.email || 'No Email'}</div>

      <button onClick={() => login('scholar@du.ac.in', 'student')}>Login Normal</button>
      <button onClick={() => signup({ name: 'Kavya Sen', email: 'kavya@gmail.com', phone: '9876543210', role: 'student', university: 'Miranda House' })}>
        Signup Normal
      </button>
      <button onClick={() => demoLogin('student')}>Student Demo</button>
      <button onClick={() => demoLogin('owner')}>Owner Demo</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext and Access Restriction Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes as unauthenticated when localStorage is empty', () => {
    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('Unauthenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('No User');
  });

  it('authenticates with Student Demo preset instantly', async () => {
    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Student Demo').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('Aarav Mehra');
    expect(screen.getByTestId('user-role').textContent).toBe('student');
    expect(localStorage.getItem('colin_auth_session')).toContain('Aarav Mehra');
  });

  it('authenticates with Property Owner Demo preset', async () => {
    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Owner Demo').click();
    });

    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('Col. Rajesh Sharma');
    expect(screen.getByTestId('user-role').textContent).toBe('owner');
  });

  it('clears session on logout', async () => {
    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('Student Demo').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');

    await act(async () => {
      screen.getByText('Logout').click();
    });
    expect(screen.getByTestId('auth-status').textContent).toBe('Unauthenticated');
    expect(screen.getByTestId('user-name').textContent).toBe('No User');
    expect(localStorage.getItem('colin_auth_session')).toBeNull();
  });

  it('registers a new student profile correctly', async () => {
    render(
      <AuthProvider>
        <AuthConsumerTest />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Signup Normal').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status').textContent).toBe('Authenticated');
    }, { timeout: 2000 });

    expect(screen.getByTestId('user-name').textContent).toBe('Kavya Sen');
    expect(screen.getByTestId('user-role').textContent).toBe('student');
  });
});
