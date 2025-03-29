/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#12121A',
        card: '#22222E',
        pane: '#ABA9BF',
      },
    },
  },
  plugins: [],
} 