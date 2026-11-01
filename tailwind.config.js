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
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
