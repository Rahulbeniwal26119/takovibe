// Single source of truth for the two ramps the design uses.
//
// `brand` and Tailwind's stock `orange` were byte-identical, so `orange` is
// aliased to `brand` here: the ~2000 existing `orange-*` classes keep rendering
// exactly as before but now resolve through one definition, which is what makes
// the accent colour changeable in one place. The 950 step exists because
// `orange-950` is in use and `brand` originally stopped at 900.
const brand = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#f97316',
  600: '#ea580c',
  700: '#c2410c',
  800: '#9a3412',
  900: '#7c2d12',
  950: '#431407',
};

// Warm greys, deliberately not Tailwind's cool defaults. `gray` is aliased to
// the same ramp because it was still cool: mixing `gray-*` and `neutral-*`
// surfaces put warm and cool panels side by side, which reads as a subtle
// brown-vs-grey mismatch. Prefer `neutral-*` in new code.
const warmGrey = {
  50: '#fafaf9',
  100: '#f5f5f4',
  200: '#e7e5e4',
  300: '#d6d3d1',
  400: '#a8a29e',
  500: '#78716c',
  600: '#57534e',
  700: '#44403c',
  800: '#292524',
  900: '#1c1917',
  950: '#0c0a09',
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '300px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand,
        orange: brand,
        neutral: warmGrey,
        gray: warmGrey,
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'var(--zen-text)',
            a: {
              color: brand[500],
              '&:hover': {
                color: brand[600],
              },
            },
            h1: {
              color: 'var(--zen-text)',
              fontFamily: 'Syne, sans-serif',
            },
            h2: {
              color: 'var(--zen-text)',
              fontFamily: 'Syne, sans-serif',
            },
            h3: {
              color: 'var(--zen-text)',
              fontFamily: 'Syne, sans-serif',
            },
            h4: {
              color: 'var(--zen-text)',
            },
            code: {
              // Mint (#86efac) reads at 1.4:1 on white, so this is theme-aware.
              color: 'var(--zen-code)',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: warmGrey[900],
            },
          },
        },
      },
      backgroundImage: {
        'grid-16': 'linear-gradient(to right, var(--grid-color) var(--grid-strength), transparent var(--grid-strength)), linear-gradient(to bottom, var(--grid-color) var(--grid-strength), transparent var(--grid-strength))',
      },
      backgroundSize: {
        'grid-16': 'var(--grid-size) var(--grid-size)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}