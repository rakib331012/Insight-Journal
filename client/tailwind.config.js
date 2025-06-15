/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#b3b0e2', // Light purple (your preferred color)
        'secondary': '#ec4899', // Pink (your preferred color)
        'bg-light': '#f3f4f6', // Light gray background
        'bg-dark': '#9bafdd', // Light blue (your preferred dark background)
        'card-bg': 'rgba(255, 255, 255, 0.8)', // Light card background
        'card-bg-dark': 'rgba(170, 192, 224, 0.8)', // Dark card background
        'text-primary': '#1A202C', // Dark gray for light mode (high contrast on bg-light)
        'text-secondary': '#4A5568', // Medium gray for secondary text
        'text-dark-mode': '#E6E6E6', // Off-white for dark mode (high contrast on bg-dark)
      },
      fontSize: {
        'xs': '0.75rem', // 12px
        'sm': '0.875rem', // 14px
        'base': '1rem', // 16px (default, increased slightly)
        'lg': '1.125rem', // 18px
        'xl': '1.25rem', // 20px
        '2xl': '1.5rem', // 24px
      },
      fontWeight: {
        'normal': 400,
        'medium': 500,
        'semibold': 600, // For headings and labels
      },
    },
  },
  plugins: [],
  darkMode: 'class', // Ensure dark mode is class-based
};