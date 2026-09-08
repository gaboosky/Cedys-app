/** @type {import('tailwindcss').Config} */ export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cyan: { brand: '#03CDE6', brandDark: '#02A6BA', brandLight: '#13DBE1' },
        ink: '#0A0A0A',
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
