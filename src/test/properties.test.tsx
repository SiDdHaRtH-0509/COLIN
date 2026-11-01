import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PropertyCard } from '../components/property/PropertyCard';
import { AuthModal } from '../components/common/AuthModal';
import { PROPERTIES } from '../data/mockData';

describe('Properties and Access Control Presentation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('contains valid mock property listings covering all 5 core categories', () => {
    expect(PROPERTIES.length).toBeGreaterThanOrEqual(6);
    
    const categories = new Set(PROPERTIES.map((p) => p.category));
    expect(categories.has('pg')).toBe(true);
    expect(categories.has('hostel')).toBe(true);
    expect(categories.has('rental-room')).toBe(true);
    expect(categories.has('shared-flat')).toBe(true);
    expect(categories.has('co-living')).toBe(true);

    PROPERTIES.forEach((prop) => {
      expect(prop.rentMonthly).toBeGreaterThan(0);
      expect(prop.title).toBeTruthy();
      expect(prop.city).toBeTruthy();
      expect(prop.nearbyUniversity).toBeTruthy();
      expect(prop.fullAddress).toBeTruthy();
      expect(prop.ownerContact).toBeTruthy();
      expect(prop.refundGuaranteePercent).toBe(55);
    });
  });

  it('renders property card with locked prompt for unauthenticated guest', () => {
    const testProp = PROPERTIES[0];

    render(
      <AuthProvider>
        <BrowserRouter>
          <PropertyCard property={testProp} />
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    );

    // Card should show indicative rent and lock message
    expect(screen.getByText(`₹${testProp.rentMonthly.toLocaleString('en-IN')}`)).toBeInTheDocument();
    expect(screen.getByText('Login to Unlock')).toBeInTheDocument();
    expect(screen.getByText('Unlock Details')).toBeInTheDocument();
  });

  it('triggers AuthModal when unauthenticated user clicks a property card', async () => {
    const testProp = PROPERTIES[0];

    render(
      <AuthProvider>
        <BrowserRouter>
          <PropertyCard property={testProp} />
          <AuthModal />
        </BrowserRouter>
      </AuthProvider>
    );

    // Click the card
    await act(async () => {
      screen.getByText(testProp.title).click();
    });

    // AuthModal should now be open
    expect(screen.getByText('Member-Only Property Access')).toBeInTheDocument();
    expect(screen.getByText('Student Demo')).toBeInTheDocument();
    expect(screen.getByText('Owner Demo')).toBeInTheDocument();
    expect(screen.getByText('Go to Login')).toBeInTheDocument();
  });
});
