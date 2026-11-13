/**
 * COLIN Portal Loaders — Comprehensive Verification Suite
 * Verifies rendering, accessibility, reduced motion, session flag gating,
 * and dismissal lifecycle for student_loader and owner_loader.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  PortalLoader,
  PORTAL_LOADER_KEY,
  triggerPortalLoader,
  clearPortalLoader,
  shouldShowPortalLoader,
} from '../components/common/PortalLoader';

describe('COLIN Portal Loaders Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearPortalLoader();
    sessionStorage.clear();

    // Polyfill media methods for JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearPortalLoader();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. Renders Student Portal Loader with student_loader.mp4 and accessibility label when active', () => {
    triggerPortalLoader('student');
    expect(shouldShowPortalLoader('student')).toBe(true);

    render(<PortalLoader role="student" minDuration={1000} />);

    const overlay = screen.getByTestId('student-portal-loader');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('role', 'status');

    expect(screen.getByText(/Loading Student Portal\.\.\./i)).toBeInTheDocument();

    const video = screen.getByTestId('student-portal-loader-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('playsinline');
    expect(video.querySelector('source')).toHaveAttribute('src', '/student_loader.mp4');
  });

  it('2. Renders Owner Portal Loader with owner_loader.mp4 and accessibility label when active', () => {
    triggerPortalLoader('owner');
    expect(shouldShowPortalLoader('owner')).toBe(true);

    render(<PortalLoader role="owner" minDuration={1000} />);

    const overlay = screen.getByTestId('owner-portal-loader');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('role', 'status');

    expect(screen.getByText(/Loading Owner Portal\.\.\./i)).toBeInTheDocument();

    const video = screen.getByTestId('owner-portal-loader-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('playsinline');
    expect(video.querySelector('source')).toHaveAttribute('src', '/owner_loader.mp4');
  });

  it('3. Does not render when no login/signup session flag is set and forceShow is false', () => {
    render(<PortalLoader role="student" />);
    expect(screen.queryByTestId('student-portal-loader')).toBeNull();

    render(<PortalLoader role="owner" />);
    expect(screen.queryByTestId('owner-portal-loader')).toBeNull();
  });

  it('4. Automatically fades out and unmounts after minDuration, clearing session flag', () => {
    triggerPortalLoader('student');
    const onDismissMock = vi.fn();

    const { unmount } = render(
      <PortalLoader
        role="student"
        minDuration={500}
        fadeDuration={350}
        onDismiss={onDismissMock}
      />
    );

    expect(screen.getByTestId('student-portal-loader')).toBeInTheDocument();

    // Advance to minDuration (500ms): starts fade out and clears session flag
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const overlay = screen.getByTestId('student-portal-loader');
    expect(overlay).toHaveClass(/overlayHidden/);
    expect(sessionStorage.getItem(PORTAL_LOADER_KEY)).toBeNull();

    // Advance to end of fadeDuration (350ms): unmounts completely
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId('student-portal-loader')).toBeNull();
    expect(onDismissMock).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('5. Renders static fallback when prefers-reduced-motion is active', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<PortalLoader role="student" forceShow={true} minDuration={1000} />);

    expect(screen.queryByTestId('student-portal-loader-video')).toBeNull();
    expect(screen.getByTestId('student-portal-loader-fallback')).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });
});
