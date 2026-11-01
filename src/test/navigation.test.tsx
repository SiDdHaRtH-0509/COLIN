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

  it('renders minimal navbar with brand logo, Home link, and login/register CTAs', () => {
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

    // Verify minimal nav: Home
    expect(screen.getByText('Home')).toBeInTheDocument();
    // Verify removed links are NOT in navbar
    expect(screen.queryByText('Explore Stays')).not.toBeInTheDocument();
    expect(screen.queryByText('Why COLIN')).not.toBeInTheDocument();

    // Verify auth buttons
    expect(screen.getAllByText('Log In')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Register / Sign Up')[0]).toBeInTheDocument();
  });

  it('renders redesigned LoginPage with clean form inputs and evaluation credentials', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByText('Student Account')).toBeInTheDocument();
    expect(screen.getByText('Owner Account')).toBeInTheDocument();

    const emailInput = screen.getByPlaceholderText(/student@du.ac.in/i);
    const passwordInput = screen.getByPlaceholderText(/Enter your password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  it('renders redesigned SignUpPage and toggles between Student and Property Owner roles', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <SignUpPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Create your account')).toBeInTheDocument();
    
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
