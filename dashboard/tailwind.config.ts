import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan:  '#00F5FF',
          pink:  '#FF6B9D',
          green: '#00FF88',
          amber: '#FF9F1C',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'drift':      'drift 8s ease-in-out infinite alternate',
        'scanline':   'scanline 6s linear infinite',
      },
      keyframes: {
        drift: {
          '0%':   { transform: 'translateY(0px) translateX(0px)' },
          '100%': { transform: 'translateY(-12px) translateX(6px)' },
        },
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
