/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',  // Extra small devices
        'sm': '640px',  // Small devices (mobile landscape)
        'md': '768px',  // Medium devices (tablets)
        'lg': '1024px', // Large devices (laptops)
        'xl': '1280px', // Extra large devices (desktops)
        '2xl': '1536px', // 2X large devices
      },
      colors: {
        // Colores basados en la imagen proporcionada
        primary: {
          DEFAULT: '#f1af45', // Orange
          hover: '#e09d35',
          light: '#f7c56b',
          dark: '#d19530',
        },
        secondary: {
          DEFAULT: '#522e5d', // Dark Purple
          hover: '#43264a',
          light: '#6b4572',
          dark: '#3d2144',
        },
        accent: {
          DEFAULT: '#4fa1a8', // Cyan
          hover: '#439ba2',
          light: '#6bb5bb',
          dark: '#3d848a',
        },
        neutral: {
          DEFAULT: '#e0e2e2', // Light Gray
          light: '#f0f1f1',
          dark: '#d1d3d3',
        },
        muted: {
          DEFAULT: '#917d99', // Gray Lavender
          light: '#a793ab',
          dark: '#7a6885',
        },
        background: '#ffffff',
        foreground: '#522e5d', // Dark Purple como texto principal
        error: '#dc2626',
        success: '#16a34a',
        warning: '#ca8a04',
        'input-bg': '#ffffff',
        'input-border': '#e0e2e2',
        'card-bg': '#ffffff',
        'text-primary': '#522e5d',
        'text-secondary': '#917d99',
        'text-muted': '#917d99',
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        montserrat: ['Montserrat', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
