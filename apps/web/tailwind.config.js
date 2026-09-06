/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#07070C',
        surface: {
          1: '#0D0C18',
          2: '#131224',
          3: '#1B1832',
          modal: 'rgba(21, 19, 41, 0.95)',
        },
        primary: {
          DEFAULT: '#8B5CF6',
          violet: '#8B5CF6',
          indigo: '#6366F1',
          lavender: '#C084FC',
          light: '#DDD6FE',
        },
        accent: {
          cyan: '#38BDF8',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
      },
      fontFamily: {
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(139, 92, 246, 0.25)',
        'glow-md': '0 0 30px -5px rgba(139, 92, 246, 0.35)',
        'glow-lg': '0 0 50px -10px rgba(139, 92, 246, 0.45)',
        'glow-cyan': '0 0 30px -5px rgba(56, 189, 248, 0.3)',
        'card-glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
