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
        accent1: '#0CFCDD',
        accent2: '#46E4FD',
        accent3: '#3C93FD',
        accent4: '#2669FC',
        accent5: '#7667E6',
        scrollThumb: '#3C3C4E',
        scrollHover: '#46E4FD',
        scrollActive: '#3C93FD',
      },
    },
  },
  plugins: [],
} 