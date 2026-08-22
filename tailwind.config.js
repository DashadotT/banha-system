/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#002858',
          50: '#e6ebf1',
          100: '#c0cddd',
          200: '#96acc7',
          300: '#6c8bb0',
          400: '#4d729f',
          500: '#2e598e',
          600: '#144a82',
          700: '#002858',
          800: '#001f46',
          900: '#001633',
        },
        secondary: {
          DEFAULT: '#678EC4',
          50: '#eef2f9',
          100: '#d5e0f0',
          200: '#b9cbe5',
          300: '#9cb6da',
          400: '#82a2cf',
          500: '#678EC4',
          600: '#4d76ad',
          700: '#3c5c88',
          800: '#2b4262',
          900: '#1a283d',
        },
        accent: {
          DEFAULT: '#DEAE20',
          50: '#fbf4e0',
          100: '#f5e4b3',
          200: '#eed281',
          300: '#e7c04f',
          400: '#e2b638',
          500: '#DEAE20',
          600: '#b88c1a',
          700: '#8c6a14',
          800: '#60480d',
          900: '#332607',
        },
        surface: '#F7F8FA',
        border: '#E2E6EC',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(0, 40, 88, 0.06), 0 1px 3px 0 rgba(0, 40, 88, 0.08)',
      },
    },
  },
  plugins: [],
}
