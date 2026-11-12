/**
 * COLIN Logo Loader — Dedicated Loading Screen Component
 * Renders the 3-second logo construction animation overlay during initial application bootstrap.
 * Preserves original 16:9 aspect ratio, background #F8FAFC, and respects reduced motion.
 */

import React, { useState, useEffect, useRef } from 'react';
import styles from './ColinLoader.module.css';
import { useAuth } from '../../context/AuthContext';

export interface ColinLoaderProps {
  /**
   * Optional manual override for loading condition.
   * If omitted, the loader synchronizes with initial bootstrap and authentication state.
   */
  isLoading?: boolean;
  /**
   * Minimum display time in milliseconds to prevent visual flicker (default: 500ms).
   */
  minDuration?: number;
  /**
   * Fade-out transition duration in milliseconds (default: 350ms).
   */
  fadeDuration?: number;
  /**
   * Maximum safety timeout in milliseconds to prevent hanging on network failure (default: 3500ms).
   */
  maxDuration?: number;
  /**
   * If true, forces loader to display even if initial bootstrap already completed (used for testing).
   */
  forceShow?: boolean;
  /**
   * Callback fired once fade-out completes and component unmounts.
   */
  onDismiss?: () => void;
}

// Module-level guard: ensures loader only displays on initial application startup per session
let hasInitialBootstrapCompleted = false;

/**
 * Reset helper for testing environments
 */
export const resetBootstrapState = (): void => {
  hasInitialBootstrapCompleted = false;
};

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

export const ColinLoader: React.FC<ColinLoaderProps> = ({
  isLoading: explicitLoading,
  minDuration = 500,
  fadeDuration = 350,
  maxDuration = 3500,
  forceShow = false,
  onDismiss,
}) => {
  // Gracefully read AuthContext if available without throwing in standalone tests
  const auth = useSafeAuth();
  const isAuthLoading = auth?.isLoading ?? false;

  // Should we be considered actively loading?
  const isCurrentlyLoading = explicitLoading !== undefined ? explicitLoading : isAuthLoading;

  // If already bootstrapped and not forced, do not render at all
  const shouldSkipInitialRender = hasInitialBootstrapCompleted && !forceShow;

  const [isDismissed, setIsDismissed] = useState<boolean>(shouldSkipInitialRender);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  // Check and listen for reduced-motion accessibility preference
  useEffect(() => {
    isMountedRef.current = true;

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        if (isMountedRef.current) {
          setPrefersReducedMotion(e.matches);
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => {
          mediaQuery.removeEventListener('change', handleChange);
        };
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
        return () => {
          mediaQuery.removeListener(handleChange);
        };
      }
    }
  }, []);

  // Manage video autoplay and cleanup
  useEffect(() => {
    if (prefersReducedMotion || isDismissed) return;

    const videoEl = videoRef.current;
    if (videoEl) {
      try {
        videoEl.muted = true;
        if (typeof videoEl.play === 'function') {
          const playPromise = videoEl.play();
          if (playPromise !== undefined && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
              // Safe capture for browser autoplay policy rejections
            });
          }
        }
      } catch {
        // Safe capture for JSDOM or unhandled media exceptions
      }
    }

    return () => {
      if (videoEl) {
        try {
          if (typeof videoEl.pause === 'function') {
            videoEl.pause();
          }
        } catch {}
        try {
          videoEl.removeAttribute('src');
          if (typeof videoEl.load === 'function') {
            videoEl.load();
          }
        } catch {}
      }
    };
  }, [prefersReducedMotion, isDismissed]);

  // Handle bootstrap completion and initiation of fade-out
  useEffect(() => {
    if (shouldSkipInitialRender || isDismissed || isFadingOut) return;

    let fadeTimer: NodeJS.Timeout | null = null;
    let maxSafetyTimer: NodeJS.Timeout | null = null;

    const startFadeOut = () => {
      if (isMountedRef.current && !isFadingOut) {
        setIsFadingOut(true);
      }
    };

    // If still initializing, set a max safety timeout
    maxSafetyTimer = setTimeout(() => {
      startFadeOut();
    }, maxDuration);

    // If not actively loading, check against minDuration anti-flicker delay
    if (!isCurrentlyLoading) {
      const elapsed = Date.now() - mountTimeRef.current;
      const remainingMinDuration = Math.max(0, minDuration - elapsed);

      fadeTimer = setTimeout(() => {
        startFadeOut();
      }, remainingMinDuration);
    }

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (maxSafetyTimer) clearTimeout(maxSafetyTimer);
    };
  }, [
    isCurrentlyLoading,
    minDuration,
    maxDuration,
    isDismissed,
    isFadingOut,
    shouldSkipInitialRender,
  ]);

  // Once fading out, wait for the fade transition to conclude, then unmount
  useEffect(() => {
    if (!isFadingOut || isDismissed) return;

    const effectiveFade = prefersReducedMotion ? 0 : fadeDuration;
    const unmountTimer = setTimeout(() => {
      if (isMountedRef.current) {
        setIsDismissed(true);
        hasInitialBootstrapCompleted = true;
        onDismiss?.();
      }
    }, effectiveFade);

    return () => {
      clearTimeout(unmountTimer);
    };
  }, [isFadingOut, isDismissed, prefersReducedMotion, fadeDuration, onDismiss]);

  // Once dismissed, unmount entirely to zero out DOM footprint and network activity
  if (isDismissed) {
    return null;
  }

  const overlayClass = isFadingOut
    ? `${styles.overlay} ${styles.overlayHidden}`
    : styles.overlay;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!isFadingOut}
      tabIndex={-1}
      className={overlayClass}
      data-testid="colin-loader-overlay"
    >
      <span className={styles.srOnly}>Loading COLIN...</span>

      <div className={styles.videoWrapper}>
        {prefersReducedMotion ? (
          <img
            src="/assets/colin-logo.png"
            alt="COLIN"
            className={styles.fallbackLogo}
            data-testid="colin-loader-fallback"
          />
        ) : (
          <video
            ref={videoRef}
            className={styles.video}
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            preload="auto"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            data-testid="colin-loader-video"
          >
            <source src="/colin-loader.mp4" type="video/mp4" />
            <source src="/CoLiN_Loader.mp4" type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
};

export default ColinLoader;
