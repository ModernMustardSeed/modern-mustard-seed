import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
    './data/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Space Mono"', 'monospace'],
        display: ['"Fraunces"', '"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      colors: {
        // Legacy "mustard" tokens remapped to Mountain Sunrise so every existing
        // text-mustard-*, bg-mustard-*, border-mustard-* utility picks up the new
        // palette without rewriting components. Names are kept for backwards-compat.
        mustard: {
          50: '#FFF1ED',
          100: '#FFE3D5',
          200: '#FFD2B8',
          300: '#FFC093',
          400: '#FFB347', // sunrise.gold (primary accent)
          500: '#FF8E72', // sunrise.peach (primary brand)
          600: '#FF6B6B', // sunrise.rose (deep accent)
          700: '#E0524E',
          800: '#B53E3E',
          900: '#8A2D2D',
        },
        // New Mountain Sunrise palette
        night: {
          DEFAULT: '#1A1140',
          900: '#0E0824',
          800: '#150E33',
          700: '#1A1140',
          600: '#26174F',
          500: '#3A2475',
          400: '#5238A1',
        },
        sunrise: {
          rose: '#FF6B6B',
          peach: '#FF8E72',
          gold: '#FFB347',
          mint: '#7FE4C5',
          cyan: '#4ECDC4',
          sky: '#9FD3E0',
        },
        steel: '#7C8DB5',
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'fade-in-up-delay': 'fadeInUp 0.8s ease-out 0.3s forwards',
        'fade-in-up-delay-2': 'fadeInUp 0.8s ease-out 0.6s forwards',
        'fade-in-up-delay-3': 'fadeInUp 0.8s ease-out 0.9s forwards',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'ken-burns': 'kenBurns 32s ease-in-out infinite alternate',
        'shimmer': 'shimmer 3.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        kenBurns: {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.08) translate(-1.2%, -0.8%)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.3', transform: 'translateX(-20%)' },
          '50%': { opacity: '0.9', transform: 'translateX(20%)' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            color: 'rgba(255,255,255,0.75)',
            maxWidth: '70ch',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
