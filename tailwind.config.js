/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#090d16',
        },
        'champagne-gold': {
          50: '#fcf8f2',
          100: '#f7eee1',
          200: '#edd8bc',
          300: '#e3c298',
          400: '#d4ab73',
          500: '#C5A059',
          600: '#b08b45',
          700: '#907036',
          800: '#755a2d',
          900: '#5e4826',
        }
      }
    },
  },
  plugins: [],
}
