/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F5F0E8',
        'cream-dark': '#1C1814',
        warmgray: '#EDE8DF',
        'warmgray-dark': '#2A2520',
        brand: {
          DEFAULT: '#E07B2A',
          50: '#FDF0E5',
          100: '#F0D4B8',
          200: '#E8C49E',
          300: '#D49A5E',
          400: '#E07B2A',
          500: '#C4661A',
          600: '#A85415',
          700: '#8C4310',
          800: '#70340C',
          900: '#542609',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
