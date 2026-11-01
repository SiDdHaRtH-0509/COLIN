import React from 'react';
import { ShieldCheck, Award } from 'lucide-react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'certified' | 'verified' | 'accent' | 'teal' | 'neutral' | 'outline' | 'danger';
  size?: 'sm' | 'md';
  icon?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon = true,
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2.5 py-0.5 gap-1.5 font-black rounded-lg select-none',
    md: 'text-xs px-3 py-1 gap-1.5 font-black rounded-xl select-none',
  };

  // High-contrast, opaque solid backdrops guaranteed visible on any light or dark photo background
  const variantStyles = {
    certified: 'bg-colin-navy-950 text-white shadow-md border border-colin-teal/60',
    verified: 'bg-colin-teal text-white shadow-md font-extrabold',
    accent: 'bg-colin-navy-950 text-white border border-colin-orange/70 shadow-md backdrop-blur-md',
    teal: 'bg-colin-teal text-white shadow-md font-extrabold',
    neutral: 'bg-colin-navy-950 text-white border border-colin-teal/60 shadow-md backdrop-blur-md',
    outline: 'bg-colin-navy-950 text-white border border-colin-teal/50 shadow-md backdrop-blur-md',
    danger: 'bg-rose-950 text-rose-100 border border-rose-500 font-extrabold shadow-md',
  };

  const renderIcon = () => {
    if (!icon) return null;
    const iconSize = size === 'sm' ? 12 : 14;
    switch (variant) {
      case 'certified':
        return <Award size={iconSize} className="text-colin-orange" />;
      case 'verified':
        return <ShieldCheck size={iconSize} className="text-colin-teal" />;
      case 'accent':
        return <span className="w-1.5 h-1.5 rounded-full bg-colin-orange shrink-0" />;
      case 'neutral':
        return <span className="w-1.5 h-1.5 rounded-full bg-colin-teal shrink-0" />;
      default:
        return <span className="w-1.5 h-1.5 rounded-full bg-colin-teal-300 shrink-0" />;
    }
  };

  return (
    <span className={`inline-flex items-center tracking-wider uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
};
