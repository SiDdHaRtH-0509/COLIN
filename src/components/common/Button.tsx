import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'teal' | 'accent' | 'outline' | 'ghost' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100';

  const sizeStyles = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 shadow-sm',
  };

  const variantStyles = {
    primary: 'bg-colin-navy hover:bg-colin-navy-800 text-white shadow-brand hover:shadow-brand-hover focus:ring-colin-navy-500',
    teal: 'bg-colin-teal hover:bg-colin-teal-600 text-white shadow-brand-teal hover:shadow-lg focus:ring-colin-teal',
    accent: 'bg-colin-orange hover:bg-colin-orange-600 text-colin-navy-950 font-bold shadow-brand-orange hover:shadow-lg focus:ring-colin-orange',
    secondary: 'bg-colin-navy-50 hover:bg-colin-navy-100 text-colin-navy-900 focus:ring-colin-navy-300',
    outline: 'border-2 border-colin-navy/20 hover:border-colin-navy text-colin-navy hover:bg-colin-navy/5 focus:ring-colin-navy-400',
    ghost: 'text-colin-charcoal-700 hover:text-colin-navy hover:bg-colin-charcoal-100/70 focus:ring-colin-charcoal-300',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
};
