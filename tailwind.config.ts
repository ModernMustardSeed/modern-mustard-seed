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
        sans: ['"DM Sans"', '"DM Sans Fallback"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', '"DM Sans Fallback"', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Space Mono"', 'monospace'],
        display: ['"Playfair Display"', '"Playfair Fallback"', 'Georgia', 'serif'],
        oswald: ['Oswald', '"DM Sans"', 'sans-serif'],
      },
      colors: {
        // Legacy "mustard" tokens REMAPPED to Campfire Brass so every existing
        // text-mustard-*, bg-mustard-*, border-mustard-* utility immediately
        // picks up the warm cabin palette without rewriting components.
        // Remapped to pop-art mustard. text/bg/border-mustard-* now read bright.
        mustard: {
          50: '#FCF7E6',
          100: '#FBEFC2',
          200: '#FFD23F',
          300: '#FFC400',
          400: '#F5B700', // primary pop yellow
          500: '#E8A800',
          600: '#FF8A00', // amber pop for gradients
          700: '#C97A00',
          800: '#9A5E00',
          900: '#6E4400',
        },
        // Midnight: deep cool blue-black, NOT pure black, NOT warm black
        midnight: {
          DEFAULT: '#080C16',
          900: '#04060D',
          800: '#080C16',
          700: '#0F1422',
          600: '#1A1A2E',
          500: '#2D2D44',
        },
        night: {
          DEFAULT: '#080C16',
          900: '#04060D',
          800: '#080C16',
          700: '#0F1422',
          600: '#1A1A2E',
          500: '#2D2D44',
          400: '#3F3F58',
        },
        // Pop-art mustard (bright, comic). text-gold-* now reads vivid yellow.
        gold: {
          DEFAULT: '#F5B700',
          50: '#FCF7E6',
          100: '#FBEFC2',
          200: '#FFD23F',
          300: '#FFC400',
          400: '#F5B700',
          500: '#E8A800',
          600: '#FF8A00',
          700: '#C97A00',
          bright: '#FFDD55',
          light: '#FFD23F',
        },
        // Pop-art palette
        pop: {
          yellow: '#F5B700',
          red: '#E0301E',
          blue: '#1E50C8',
          cream: '#FBF6EA',
          ink: '#161616',
        },
        // Ember orange — the bonfire pop
        ember: {
          DEFAULT: '#FF6B35',
          bright: '#FF8550',
          glow: '#E07850',
        },
        // Rust — the deep earthy accent
        rust: {
          DEFAULT: '#C86A45',
          light: '#E07850',
          deep: '#B8603F',
        },
        // Lake teal — cool counterpoint, the alpine water
        lake: {
          DEFAULT: '#3B6B8A',
          light: '#5C8AA8',
          deep: '#284E6A',
        },
        // Sage green — the wilderness, evergreens
        sage: {
          DEFAULT: '#8FA98F',
          light: '#A8BFA8',
          deep: '#6E876E',
        },
        // Cream — warm off-white for cozy content
        cream: {
          DEFAULT: '#F5F0E8',
          50: '#FCFAF5',
          100: '#F5F0E8',
          200: '#E8E0CF',
        },
        // Legacy aliases pointing at the new brand. Keep for cascade.
        sky: {
          50: '#EAF0F5',
          100: '#C9D7E2',
          200: '#94B0C5',
          300: '#5C8AA8',
          400: '#3B6B8A',  // lake
          500: '#284E6A',  // lake deep
          600: '#1A3548',
          700: '#102233',
          800: '#0A1A28',
          900: '#06121E',
        },
        cloud: {
          50: '#FCFAF5',
          100: '#F5F0E8',   // cream
          200: '#E8E0CF',
          300: '#D4C8B0',
        },
        // Sunrise tokens kept (used in scenic art horizons) — now ember-shifted
        sunrise: {
          rose: '#C86A45',  // rust
          peach: '#E07850', // rust glow
          gold: '#C8964E',  // brass gold
          mint: '#8FA98F',  // sage
          cyan: '#3B6B8A',  // lake
          sky: '#5C8AA8',   // lake light
        },
        steel: '#5C7188',
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
        'pop-in': 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'eq': 'eqBar 0.8s ease-in-out infinite',
      },
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        eqBar: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
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
