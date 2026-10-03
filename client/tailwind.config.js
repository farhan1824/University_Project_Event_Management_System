/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)',
        'premium-hover': '0 10px 30px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.04)',
        'bottom-nav': '0 -4px 24px -2px rgba(15, 23, 42, 0.08)',
        'modal': '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
      }
    },
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    themes: [
      {
        eventOpsLight: {
          "primary": "#4f46e5",
          "primary-content": "#ffffff",
          "secondary": "#7c3aed",
          "secondary-content": "#ffffff",
          "accent": "#0284c7",
          "accent-content": "#ffffff",
          "neutral": "#1e293b",
          "neutral-content": "#f8fafc",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#f1f5f9",
          "base-content": "#0f172a",
          "info": "#0284c7",
          "info-content": "#ffffff",
          "success": "#10b981",
          "success-content": "#ffffff",
          "warning": "#f59e0b",
          "warning-content": "#ffffff",
          "error": "#ef4444",
          "error-content": "#ffffff",
        },
      },
      "light",
      "corporate"
    ],
    defaultTheme: "eventOpsLight"
  }
}
