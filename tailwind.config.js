/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f84f39',
          hover: '#e04431',
        },
        bg: {
          main: '#0a0a0a',
          sidebar: '#121212',
          panel: '#181818',
          card: '#222222',
          'card-hover': '#2a2a2a',
        }
      },
      fontFamily: {
        sans: ['Manrope', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      borderRadius: {
        'xl': '24px',
        'lg': '16px',
      }
    },
  },
  plugins: [],
}
