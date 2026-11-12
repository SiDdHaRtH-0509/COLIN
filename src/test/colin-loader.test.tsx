/**
 * COLIN Logo Loader — Comprehensive Verification Suite
 * Verifies rendering, accessibility, reduced motion, anti-flicker timing,
 * and bootstrap state management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ColinLoader, resetBootstrapState } from '../components/common/ColinLoader';
import { AuthProvider } from '../context/AuthContext';

describe('COLIN Logo Loader Component Suite', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetBootstrapState();

    // Polyfill media methods for JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn().mockImplementation(() => Promise.resolve());
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetBootstrapState();
    vi.restoreAllMocks();
  });

  it('1. Renders full-viewport overlay with off-white background and video element', () => {
    render(<ColinLoader forceShow={true} minDuration={1000} />);

    const overlay = screen.getByTestId('colin-loader-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('role', 'status');
    expect(overlay).toHaveAttribute('aria-live', 'polite');

    const video = screen.getByTestId('colin-loader-video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect(video).not.toHaveAttribute('controls');
  });

  it('2. Includes accessible screen-reader announcement', () => {
    render(<ColinLoader forceShow={true} minDuration={1000} />);

    expect(screen.getByText(/Loading COLIN\.\.\./i)).toBeInTheDocument();
  });

  it('3. Renders static logo fallback when prefers-reduced-motion is active', () => {
    // Mock matchMedia to report prefers-reduced-motion: reduce
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

    render(<ColinLoader forceShow={true} minDuration={1000} />);

    // Video should not be rendered
    expect(screen.queryByTestId('colin-loader-video')).toBeNull();

    // Fallback static logo should be rendered
    const fallbackLogo = screen.getByTestId('colin-loader-fallback');
    expect(fallbackLogo).toBeInTheDocument();
    expect(fallbackLogo).toHaveAttribute('src', '/assets/colin-logo.png');

    window.matchMedia = originalMatchMedia;
  });

  it('4. Automatically fades out and unmounts after minDuration anti-flicker delay', () => {
    const onDismissMock = vi.fn();
    const { unmount } = render(
      <ColinLoader
        forceShow={true}
        minDuration={500}
        fadeDuration={350}
        isLoading={false}
        onDismiss={onDismissMock}
      />
    );

    expect(screen.getByTestId('colin-loader-overlay')).toBeInTheDocument();

    // Advance to minDuration (500ms): should start fading out
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const overlay = screen.getByTestId('colin-loader-overlay');
    expect(overlay).toHaveClass(/overlayHidden/);

    // Advance to end of fadeDuration (350ms): should unmount completely
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId('colin-loader-overlay')).toBeNull();
    expect(onDismissMock).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('5. Stays visible and looping while actively loading, then dismisses when done', () => {
    const { rerender } = render(
      <ColinLoader
        forceShow={true}
        minDuration={500}
        fadeDuration={350}
        isLoading={true}
      />
    );

    // Advance beyond minDuration while still loading
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // Still visible because isLoading is true
    expect(screen.getByTestId('colin-loader-overlay')).toBeInTheDocument();
    expect(screen.getByTestId('colin-loader-overlay')).not.toHaveClass(/overlayHidden/);

    // Transition isLoading to false
    rerender(
      <ColinLoader
        forceShow={true}
        minDuration={500}
        fadeDuration={350}
        isLoading={false}
      />
    );

    // Since 1200ms > minDuration, start fading out
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(screen.getByTestId('colin-loader-overlay')).toHaveClass(/overlayHidden/);

    // Complete fade out
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.queryByTestId('colin-loader-overlay')).toBeNull();
  });

  it('6. Does not show again once initial bootstrap has completed in session', () => {
    // 1st render: Initial bootstrap
    const { unmount } = render(
      <ColinLoader minDuration={100} fadeDuration={50} isLoading={false} />
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(screen.queryByTestId('colin-loader-overlay')).toBeNull();
    unmount();

    // 2nd render (e.g. simulated internal navigation or re-render):
    render(<ColinLoader minDuration={100} fadeDuration={50} isLoading={false} />);

    // Should immediately return null without rendering overlay
    expect(screen.queryByTestId('colin-loader-overlay')).toBeNull();
  });

  it('7. Integrates gracefully with AuthProvider without crashing', () => {
    render(
      <AuthProvider>
        <ColinLoader forceShow={true} minDuration={300} fadeDuration={100} />
      </AuthProvider>
    );

    expect(screen.getByTestId('colin-loader-overlay')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.queryByTestId('colin-loader-overlay')).toBeNull();
  });
});
