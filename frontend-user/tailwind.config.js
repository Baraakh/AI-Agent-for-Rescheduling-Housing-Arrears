/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#faf6ed',
          100: '#f3ead1',
          200: '#e6d2a3',
          300: '#d6b56e',
          400: '#c69c49',
          500: '#ad8233',
          600: '#8f6929',
          700: '#735324',
          800: '#5f4523',
          900: '#523c21',
          950: '#2f2010',
        },
        ink: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          400: '#9a9a9a',
          600: '#5f5f5f',
          700: '#454545',
          800: '#2b2b2b',
          900: '#1a1a1a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        soft: '0 8px 24px rgba(82, 60, 33, 0.12)',
      },
    },
  },
  plugins: [],
}
