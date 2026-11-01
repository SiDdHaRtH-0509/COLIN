import React from 'react';

interface ColinCertifiedBadgeProps {
  variant?: 'dark' | 'light' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  score?: number;
  showScore?: boolean;
  className?: string;
}

export const ColinCertifiedBadge: React.FC<ColinCertifiedBadgeProps> = ({
  variant = 'dark',
  size = 'md',
  score,
  showScore = false,
  className = '',
}) => {
  // Size dimensions
  const sizeMap = {
    sm: {
      container: 'px-2 py-0.5 text-[10px] gap-1.5 rounded-lg',
      iconSize: 13,
      textStyle: 'tracking-wider font-extrabold text-[10px]',
    },
    md: {
      container: 'px-2.5 py-1 text-xs gap-2 rounded-xl',
      iconSize: 16,
      textStyle: 'tracking-wide font-extrabold text-[11px]',
    },
    lg: {
      container: 'px-3.5 py-1.5 text-sm gap-2.5 rounded-2xl',
      iconSize: 20,
      textStyle: 'tracking-wide font-black text-xs',
    },
  };

  const currentSize = sizeMap[size];

  // Visual styling variants
  const variantStyles = {
    dark: 'bg-colin-navy-950/95 text-white border border-colin-teal/60 shadow-lg backdrop-blur-md',
    light: 'bg-white text-colin-navy border-2 border-colin-teal shadow-brand backdrop-blur-sm',
    glass: 'bg-colin-navy/85 text-white border border-white/25 shadow-xl backdrop-blur-md',
  };

  return (
    <div
      className={`inline-flex items-center select-none font-sans transition-all duration-200 group ${variantStyles[variant]} ${currentSize.container} ${className}`}
      title="COLIN Certified: Physically inspected by COLIN campus ambassadors for safety, dimensions, and food hygiene."
    >
      {/* Authentic COLIN Logo-Inspired Custom Vector Emblem */}
      <span className="relative flex items-center justify-center shrink-0">
        <svg
          width={currentSize.iconSize}
          height={currentSize.iconSize}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 transition-transform duration-300 group-hover:scale-110"
        >
          {/* Graduation Cap at Top Right */}
          <path
            d="M20 3L28 7L20 11L12 7L20 3Z"
            fill="#F2A01A"
          />
          <path
            d="M26 8.5V13C26 13.8 25.4 14.5 24.5 14.8"
            stroke="#F2A01A"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="24.5" cy="15.5" r="1" fill="#F2A01A" />

          {/* Outer 'C' / Location Pin Curve */}
          {/* Navy upper arc */}
          <path
            d="M21 11.5C18.5 10 14.8 10.3 12 12.5C9 14.8 8 18.5 9 22"
            stroke="#1D628B"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Teal lower pin curve & point */}
          <path
            d="M9 22C10.2 25.5 13 28.5 15.5 30.5C15.8 30.7 16.2 30.7 16.5 30.5C18.5 28.5 22 25 23 21"
            stroke="#16A085"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Inner Home Roof */}
          <path
            d="M12 18.5L16 15L20 18.5"
            stroke="#0B3452"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Chimney */}
          <path
            d="M19 16.5V14H20.5V17.8"
            stroke="#0B3452"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* 4-Pane Warm Orange Window */}
          <rect x="14.2" y="19.5" width="1.6" height="1.6" rx="0.3" fill="#F2A01A" />
          <rect x="16.2" y="19.5" width="1.6" height="1.6" rx="0.3" fill="#F2A01A" />
          <rect x="14.2" y="21.5" width="1.6" height="1.6" rx="0.3" fill="#F2A01A" />
          <rect x="16.2" y="21.5" width="1.6" height="1.6" rx="0.3" fill="#F2A01A" />
        </svg>
      </span>

      {/* Badge Typography */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className={`uppercase font-display ${currentSize.textStyle} ${variant === 'light' ? 'text-colin-navy' : 'text-white'}`}>
          COLIN <span className={variant === 'light' ? 'text-colin-teal-700' : 'text-colin-teal-300'}>CERTIFIED</span>
        </span>

        {showScore && score && (
          <span className={`ml-0.5 px-1.5 py-0.2 rounded text-[9px] font-black ${
            variant === 'light'
              ? 'bg-colin-teal/15 text-colin-teal-800 border border-colin-teal/30'
              : 'bg-colin-teal/20 text-colin-teal-300 border border-colin-teal/40'
          }`}>
            {score}/100
          </span>
        )}
      </div>
    </div>
  );
};
