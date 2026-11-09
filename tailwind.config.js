/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pinpic: {
          coral: '#f56a41',
          'coral-dark': '#F0997B',
          teal: '#1D9E75',
          'teal-dark': '#5DCAA5',
          'bg-light': '#ffffff',
          'surface-light': '#ffffff',
          'surface-subtle-light': '#f9fafb',
          'text-primary-light': '#111827',
          'text-secondary-light': '#6b7280',
          'border-light': '#e5e7eb',
          'bg-dark': '#15120E',
          'surface-dark': '#1F1B16',
          'surface-container-dark': '#2A241D',
          'surface-high-dark': '#352E25',
          'text-primary-dark': '#F2EAE0',
          'text-secondary-dark': '#B6A996',
          'outline-dark': '#4A4136',
          'outline-variant-dark': '#322B22',
          'border-dark': '#212220',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
