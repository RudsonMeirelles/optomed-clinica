/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./packages/offline-tv/index.html",
    "./packages/offline-tv/src/**/*.{js,ts,jsx,tsx}",
    "../shared/src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        tvDark: '#0B0F19',
        tvSurface: '#161E2E',
        tvCard: '#1F2A3F',
        tvAccent: '#3B82F6',
        tvSuccess: '#10B981',
        tvWarning: '#F59E0B',
        tvDanger: '#EF4444'
      }
    },
  },
  plugins: [],
}
