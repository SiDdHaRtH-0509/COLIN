import React from 'react';
import { ShieldCheck, Sparkles, Award } from 'lucide-react';

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
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-semibold rounded-md',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold rounded-lg',
  };

  const variantStyles = {
    certified: 'bg-gradient-to-r from-colin-navy to-colin-navy-800 text-white shadow-sm border border-colin-teal/40',
    verified: 'bg-colin-teal/15 text-colin-teal-700 border border-colin-teal/30',
    accent: 'bg-colin-orange/20 text-colin-orange-800 border border-colin-orange/40 font-bold',
    teal: 'bg-colin-teal text-white shadow-sm',
    neutral: 'bg-colin-charcoal-100 text-colin-charcoal-700 border border-colin-charcoal-200',
    outline: 'bg-white/80 border border-colin-charcoal-300 text-colin-charcoal-700',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
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
        return <Sparkles size={iconSize} className="text-colin-orange-600" />;
      default:
        return null;
    }
  };

  return (
    <span className={`inline-flex items-center tracking-wide uppercase ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
};
