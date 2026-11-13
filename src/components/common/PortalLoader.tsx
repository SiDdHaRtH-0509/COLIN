/**
 * COLIN Portal Loaders — Student & Owner Portal Transition Screens
 * Plays dedicated video animations upon student or owner login/signup:
 * - student_loader.mp4 (~2.1s) for Student Portal
 * - owner_loader.mp4 (~3.0s) for Owner Portal
 */

import React, { useState, useEffect, useRef } from 'react';
import styles from './PortalLoader.module.css';

export const PORTAL_LOADER_KEY = 'colin_auth_portal_loader';

/**
 * Triggers the portal loader for a given role upon login or signup.
 */
export const triggerPortalLoader = (role?: string): void => {
  if (role === 'student' || role === 'owner') {
    try {
      sessionStorage.setItem(PORTAL_LOADER_KEY, role);
    } catch {}
  }
};

/**
 * Clears any pending portal loader flag.
 */
export const clearPortalLoader = (): void => {
  try {
    sessionStorage.removeItem(PORTAL_LOADER_KEY);
  } catch {}
};

/**
 * Checks whether the portal loader should be active for the specified role.
 */
export const shouldShowPortalLoader = (role: 'student' | 'owner'): boolean => {
  try {
    return sessionStorage.getItem(PORTAL_LOADER_KEY) === role;
  } catch {
    return false;
  }
};

export interface PortalLoaderProps {
  /**
   * Target role for this portal loader ('student' or 'owner').
   */
  role: 'student' | 'owner';
  /**
   * Minimum duration in milliseconds (default: 2100ms for student, 2800ms for owner).
   */
  minDuration?: number;
  /**
   * Fade-out duration in milliseconds (default: 350ms).
   */
  fadeDuration?: number;
  /**
   * Maximum safety timeout in milliseconds (default: 4500ms).
   */
  maxDuration?: number;
  /**
   * If true, forces loader to display regardless of session flag (useful for testing).
   */
  forceShow?: boolean;
  /**
   * Callback fired once fade-out completes.
   */
  onDismiss?: () => void;
}

export const PortalLoader: React.FC<PortalLoaderProps> = ({
  role,
  minDuration,
  fadeDuration = 350,
  maxDuration = 4500,
  forceShow = false,
  onDismiss,
}) => {
  const effectiveMinDuration = minDuration !== undefined
    ? minDuration
    : role === 'student'
      ? 2100
      : 2800;

  // Determine if loader should activate
  const [shouldActivate] = useState<boolean>(() => forceShow || shouldShowPortalLoader(role));
  const [isDismissed, setIsDismissed] = useState<boolean>(!shouldActivate);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  // Check for reduced motion preference
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
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, []);

  // Programmatically handle video playback
  useEffect(() => {
    if (!shouldActivate || prefersReducedMotion || isDismissed) return;

    const videoEl = videoRef.current;
    if (videoEl) {
      try {
        videoEl.muted = true;
        if (typeof videoEl.play === 'function') {
          const playPromise = videoEl.play();
          if (playPromise !== undefined && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
      } catch {}
    }

    return () => {
      if (videoEl) {
        try {
          if (typeof videoEl.pause === 'function') videoEl.pause();
          videoEl.removeAttribute('src');
          if (typeof videoEl.load === 'function') videoEl.load();
        } catch {}
      }
    };
  }, [shouldActivate, prefersReducedMotion, isDismissed]);

  // Handle duration lifecycle and transition
  useEffect(() => {
    if (!shouldActivate || isDismissed || isFadingOut) return;

    let fadeTimer: NodeJS.Timeout | null = null;
    let maxSafetyTimer: NodeJS.Timeout | null = null;

    const startFadeOut = () => {
      if (isMountedRef.current && !isFadingOut) {
        clearPortalLoader();
        setIsFadingOut(true);
      }
    };

    // Safety timeout
    maxSafetyTimer = setTimeout(() => {
      startFadeOut();
    }, maxDuration);

    // Minimum display timer matching video duration
    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, effectiveMinDuration - elapsed);

    fadeTimer = setTimeout(() => {
      startFadeOut();
    }, remaining);

    return () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (maxSafetyTimer) clearTimeout(maxSafetyTimer);
    };
  }, [shouldActivate, isDismissed, isFadingOut, effectiveMinDuration, maxDuration]);

  // Handle final unmount after fade transition
  useEffect(() => {
    if (!isFadingOut || isDismissed) return;

    const effectiveFade = prefersReducedMotion ? 0 : fadeDuration;
    const unmountTimer = setTimeout(() => {
      if (isMountedRef.current) {
        setIsDismissed(true);
        clearPortalLoader();
        onDismiss?.();
      }
    }, effectiveFade);

    return () => clearTimeout(unmountTimer);
  }, [isFadingOut, isDismissed, prefersReducedMotion, fadeDuration, onDismiss]);

  if (isDismissed || !shouldActivate) {
    return null;
  }

  const primaryVideoSrc = role === 'student' ? '/student_loader.mp4' : '/owner_loader.mp4';
  const fallbackVideoSrc = role === 'student' ? '/student-loader.mp4' : '/owner-loader.mp4';
  const accessibleText = role === 'student' ? 'Loading Student Portal...' : 'Loading Owner Portal...';
  const testId = role === 'student' ? 'student-portal-loader' : 'owner-portal-loader';

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
      data-testid={testId}
    >
      <span className={styles.srOnly}>{accessibleText}</span>

      <div className={styles.videoWrapper}>
        {prefersReducedMotion ? (
          <img
            src="/assets/colin-logo.png"
            alt="COLIN"
            className={styles.fallbackLogo}
            data-testid={`${testId}-fallback`}
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
            poster="/assets/colin-logo.png"
            disablePictureInPicture
            disableRemotePlayback
            aria-hidden="true"
            data-testid={`${testId}-video`}
            onEnded={() => {
              if (isMountedRef.current && !isFadingOut) {
                clearPortalLoader();
                setIsFadingOut(true);
              }
            }}
          >
            <source src={primaryVideoSrc} type="video/mp4" />
            <source src={fallbackVideoSrc} type="video/mp4" />
          </video>
        )}
      </div>
    </div>
  );
};

export const StudentPortalLoader: React.FC<Omit<PortalLoaderProps, 'role'>> = (props) => (
  <PortalLoader role="student" {...props} />
);

export const OwnerPortalLoader: React.FC<Omit<PortalLoaderProps, 'role'>> = (props) => (
  <PortalLoader role="owner" {...props} />
);

export default PortalLoader;
