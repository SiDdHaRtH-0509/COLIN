/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        colin: {
          navy: {
            DEFAULT: '#0B3452',
            50: '#F0F6FA',
            100: '#DDE9F2',
            200: '#B8D4E5',
            300: '#8EBBD6',
            400: '#5F9EC2',
            500: '#357EA9',
            600: '#1D628B',
            700: '#134B6E',
            800: '#0E3B58',
            900: '#0B3452',
            950: '#061F32',
          },
          teal: {
            DEFAULT: '#16A085',
            50: '#E8F7F4',
            100: '#C7EDE5',
            200: '#94DDD0',
            300: '#5EC9B8',
            400: '#32B39E',
            500: '#16A085',
            600: '#128770',
            700: '#0E6B58',
            800: '#0B5143',
            900: '#07362D',
          },
          orange: {
            DEFAULT: '#F2A01A',
            50: '#FEF8EB',
            100: '#FDEECC',
            200: '#FBDCA0',
            300: '#F8C670',
            400: '#F5B345',
            500: '#F2A01A',
            600: '#CE820E',
            700: '#A36407',
            800: '#794807',
            900: '#502E07',
          },
          offwhite: '#F8FAFC',
          charcoal: {
            DEFAULT: '#1E293B',
            50: '#F8FAFC',
            100: '#F1F5F9',
            200: '#E2E8F0',
            300: '#CBD5E1',
            400: '#94A3B8',
            500: '#64748B',
            600: '#475569',
            700: '#334155',
            800: '#1E293B',
            900: '#0F172A',
          }
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 4px 20px -2px rgba(11, 52, 82, 0.08), 0 2px 6px -1px rgba(11, 52, 82, 0.04)',
        'brand-hover': '0 12px 30px -4px rgba(11, 52, 82, 0.14), 0 4px 10px -2px rgba(11, 52, 82, 0.06)',
        'brand-teal': '0 8px 24px -3px rgba(22, 160, 133, 0.25)',
        'brand-orange': '0 8px 24px -3px rgba(242, 160, 26, 0.3)',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.03)', opacity: '0.92' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'colin-pin-drop': {
          '0%': { transform: 'translateY(-14px)', opacity: '0' },
          '65%': { transform: 'translateY(2px)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'colin-cap-tilt': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '35%': { transform: 'rotate(-4deg) translateY(-1px)' },
          '70%': { transform: 'rotate(2deg)' },
        },
        'colin-window-glow': {
          '0%, 100%': { opacity: '0.85', filter: 'drop-shadow(0 0 0px rgba(242, 160, 26, 0))' },
          '50%': { opacity: '1', filter: 'drop-shadow(0 0 8px rgba(242, 160, 26, 0.6))' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'teal-shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
        'pin-drop': 'colin-pin-drop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'cap-tilt': 'colin-cap-tilt 3s ease-in-out infinite',
        'window-glow': 'colin-window-glow 2.5s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'teal-shimmer': 'teal-shimmer 2.5s infinite',
      }
    },
  },
  plugins: [],
}
