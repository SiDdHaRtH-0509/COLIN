import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { Navbar } from '../components/common/Navbar';
import { LoginPage } from '../pages/LoginPage';
import { SignUpPage } from '../pages/SignUpPage';

describe('Navigation & Authentication Experience', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders navbar with brand logo, explore links, and login/signup CTAs', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
        </BrowserRouter>
      </AuthProvider>
    );

    // Verify COLIN logo and wordmark
    expect(screen.getByAltText('COLIN Logo')).toBeInTheDocument();
    expect(screen.getByText('Verified Student Living')).toBeInTheDocument();

    // Verify nav links
    expect(screen.getByText('Explore Stays')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('Why COLIN')).toBeInTheDocument();
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('COLIN Living')).toBeInTheDocument();

    // Verify auth buttons
    expect(screen.getAllByText('Log In')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Sign Up Free')[0]).toBeInTheDocument();
  });

  it('renders LoginPage with form validation inputs and instant demo buttons', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Welcome Back to COLIN')).toBeInTheDocument();
    expect(screen.getByText('Prototype Demo Authentication')).toBeInTheDocument();
    expect(screen.getByText('Student Demo')).toBeInTheDocument();
    expect(screen.getByText('Owner Demo')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/student@du.ac.in/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('renders SignUpPage and toggles between Student and Property Owner roles', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <SignUpPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Create Your Free Account')).toBeInTheDocument();
    
    // Check initial student role fields
    expect(screen.getByText('Student / Scholar')).toBeInTheDocument();
    expect(screen.getByText(/College \/ University \/ Coaching Institute/i)).toBeInTheDocument();

    // Toggle to Property Owner role
    const ownerBtn = screen.getByText('Property Host / Owner');
    fireEvent.click(ownerBtn);

    // College field should no longer be present for property owners
    expect(screen.queryByText(/College \/ University \/ Coaching Institute/i)).not.toBeInTheDocument();
  });

  it('updates password strength indicator on user typing in SignUpPage', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <SignUpPage />
        </BrowserRouter>
      </AuthProvider>
    );

    const passwordInput = screen.getByPlaceholderText('Min 6 chars');
    
    // Type a strong password
    fireEvent.change(passwordInput, { target: { value: 'Secret@12345' } });

    expect(screen.getByText(/Strength:/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
