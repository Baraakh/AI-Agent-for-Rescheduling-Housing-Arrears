/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef1f6',
          100: '#dbe2ec',
          200: '#b3c1d6',
          300: '#8aa0c0',
          400: '#5c7aa3',
          500: '#3f5d85',
          600: '#2f4a6c',
          700: '#243a56',
          800: '#1a2c42',
          900: '#101c2c',
          950: '#0a1320',
        },
        gold: {
          50: '#fbf7ed',
          100: '#f4ead0',
          200: '#e9d4a3',
          300: '#dcb96f',
          400: '#cf9f47',
          500: '#b9842f',
          600: '#9a6a26',
          700: '#7b5320',
          800: '#5f3f1c',
          900: '#4a3219',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 28, 44, 0.06), 0 1px 12px rgba(16, 28, 44, 0.05)',
        soft: '0 12px 32px rgba(16, 28, 44, 0.10)',
        panel: '0 4px 24px rgba(16, 28, 44, 0.08)',
      },
    },
  },
  plugins: [],
}
