/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Custom dark theme colors matching reference images
        background: {
          DEFAULT: '#0f0f0f',
          secondary: '#1a1a1a',
          tertiary: '#242424'
        },
        border: {
          DEFAULT: '#2a2a2a',
          hover: '#3a3a3a'
        },
        // Status colors for workflow nodes
        status: {
          pending: '#6b7280',
          running: '#f59e0b',
          completed: '#22c55e',
          failed: '#ef4444',
          skipped: '#9ca3af'
        }
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-pulse': 'border-pulse 1.5s ease-in-out infinite'
      },
      keyframes: {
        'border-pulse': {
          '0%, 100%': { borderColor: '#f59e0b' },
          '50%': { borderColor: '#fbbf24' }
        }
      }
    }
  },
  plugins: []
}
