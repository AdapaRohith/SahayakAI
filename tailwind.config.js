/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep indigo — primary institutional brand
        indigo: {
          950: '#1a1442',
          900: '#241a5c',
          800: '#2e2178',
          700: '#3b2b96',
          600: '#4c39b8',
          500: '#6046d6',
        },
        // Teal — accent / AI actions
        teal: {
          700: '#0f6e6a',
          600: '#0d8b84',
          500: '#12a89f',
          400: '#3cc6bd',
          300: '#7dddd6',
        },
        // Status semantics
        approved: '#15803d',   // green
        'approved-bg': '#dcfce7',
        pending: '#b45309',    // amber
        'pending-bg': '#fef3c7',
        breach: '#b91c1c',     // red
        'breach-bg': '#fee2e2',
        ink: {
          900: '#111827',
          700: '#374151',
          500: '#6b7280',
          300: '#d1d5db',
          100: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.04)',
        panel: '0 4px 24px rgba(26,20,66,0.10)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
        slideIn: 'slideIn 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
