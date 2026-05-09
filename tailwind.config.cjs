/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "Inter",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        primary: "var(--primary)",
        accent: "var(--accent)",
      },
      animation: {
        fade: "fade-in 0.3s ease both",
        "slide-up": "slide-up 0.32s cubic-bezier(0.4,0,0.2,1) both",
      },
    },
  },
  plugins: [],
};
