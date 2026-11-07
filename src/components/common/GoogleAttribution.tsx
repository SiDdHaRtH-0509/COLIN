import React from 'react';

export interface GoogleAttributionProps {
  provider?: string;
  source?: string;
  className?: string;
  showMockInDev?: boolean;
  variant?: 'lockup' | 'compact' | 'badge';
  ariaLabel?: string;
}

/**
 * Official Google Maps Platform Attribution Component
 * Compliant with Google Maps Platform Terms of Service §3.2.2(b) and official Brand Guidelines.
 * Displays the official Google emblem alongside the prescribed "Google Maps" brand treatment.
 */
export const GoogleAttribution: React.FC<GoogleAttributionProps> = ({
  provider = 'google',
  source,
  className = '',
  showMockInDev = false,
  variant = 'lockup',
  ariaLabel = 'Powered by Google',
}) => {
  const isGoogle =
    provider === 'google' ||
    source === 'GOOGLE_GEOCODING' ||
    source === 'GOOGLE_PLACES' ||
    source === 'Powered by Google' ||
    source === 'Google Maps';

  if (!isGoogle) {
    if (showMockInDev && (provider === 'mock' || source === 'MOCK_GEOCODING')) {
      return (
        <div
          data-testid="mock-location-attribution"
          className={`flex items-center gap-1.5 text-[11px] text-slate-500 font-medium px-2.5 py-1.5 ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span>Mock Geolocation (Dev/Test Environment)</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      data-testid="google-maps-attribution"
      data-variant={variant}
      role="img"
      aria-label={ariaLabel}
      className={`flex items-center justify-end gap-1.5 px-3 py-1.5 text-xs text-slate-600 font-medium select-none ${className}`}
    >
      <span className="text-[11px] font-normal text-slate-500 tracking-tight">powered by</span>
      {/* Official Google 4-Color "G" Emblem */}
      <svg
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          fill="#4285F4"
          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
        />
        <path
          fill="#FBBC05"
          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
        />
      </svg>
      {/* Official "Google Maps" Typography */}
      <span className="font-semibold text-slate-700 tracking-tight text-xs">
        Google <span className="font-normal text-slate-500">Maps</span>
      </span>
    </div>
  );
};
