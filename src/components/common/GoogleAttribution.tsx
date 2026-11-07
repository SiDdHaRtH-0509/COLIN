import React from 'react';

export interface GoogleAttributionProps {
  provider?: string;
  source?: string;
  className?: string;
  showMockInDev?: boolean;
}

/**
 * Google Maps Platform Attribution Component
 * Enforces compliance with Google Maps Platform Terms of Service §3.2.2(b)
 * Displays official "Powered by Google" badge / typography whenever Google-derived
 * location data or places autocomplete suggestions are presented to end-users.
 */
export const GoogleAttribution: React.FC<GoogleAttributionProps> = ({
  provider = 'google',
  source,
  className = '',
  showMockInDev = false,
}) => {
  const isGoogle =
    provider === 'google' ||
    source === 'GOOGLE_GEOCODING' ||
    source === 'GOOGLE_PLACES' ||
    source === 'Powered by Google';

  if (!isGoogle) {
    if (showMockInDev && (provider === 'mock' || source === 'MOCK_GEOCODING')) {
      return (
        <div
          data-testid="mock-location-attribution"
          className={`flex items-center gap-1 text-[10px] text-slate-400 font-medium px-2 py-1 ${className}`}
        >
          <span>Mock Geolocation (Dev/Test Mode)</span>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      data-testid="google-maps-attribution"
      role="img"
      aria-label="Powered by Google"
      className={`flex items-center justify-end gap-1.5 px-3 py-1.5 text-xs text-slate-500 font-medium select-none ${className}`}
    >
      <span className="text-[11px] font-normal text-slate-500 tracking-tight">powered by</span>
      <span className="inline-flex items-center font-bold text-xs tracking-tight">
        <span className="text-[#4285F4]">G</span>
        <span className="text-[#EA4335]">o</span>
        <span className="text-[#FBBC05]">o</span>
        <span className="text-[#4285F4]">g</span>
        <span className="text-[#34A853]">l</span>
        <span className="text-[#EA4335]">e</span>
      </span>
    </div>
  );
};
