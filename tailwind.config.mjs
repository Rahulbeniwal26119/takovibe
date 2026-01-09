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
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'white',
            a: {
              color: '#9333ea',
              '&:hover': {
                color: '#a855f7',
              },
            },
            h1: {
              color: 'white',
            },
            h2: {
              color: 'white',
            },
            h3: {
              color: 'white',
            },
            h4: {
              color: 'white',
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
              backgroundColor: '#1e293b',
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
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      colors: {
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}