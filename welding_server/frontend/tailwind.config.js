/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Industrial Dark Mode Palette
        industrial: {
          dark: '#0f172a',
          darker: '#020617',
          slate: '#1e293b',
          gray: '#334155',
          blue: '#3b82f6',
          'blue-dark': '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
}
