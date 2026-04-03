/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#E53935',
        pay: '#4CAF50',
        gift: '#7B1FA2',
        staffBlue: '#0288D1',
        surface: '#F5F5F5',
      },
    },
  },
  plugins: [],
};
