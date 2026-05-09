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
        brand: {
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
        },
        neutral: {
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
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'var(--zen-text)',
            a: {
              color: '#f97316',
              '&:hover': {
                color: '#ea580c',
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
              color: '#86efac',
            },
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
            pre: {
              backgroundColor: '#1c1917',
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