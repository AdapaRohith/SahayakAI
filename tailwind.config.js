/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------------
        // Government/Public-service theme. Cool slate neutrals carry all the
        // chrome (surfaces, text, borders); `ink-900/950` is the institutional
        // navy used for primary commit actions and headings.
        // ---------------------------------------------------------------
        ink: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          400: '#94a3b8',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        // Single brand accent — a confident public-sector blue. Used sparingly
        // for interactive state: active nav, focus rings, selections, AI actions,
        // links. This is the ONE hue that carries the theme; everything else is
        // slate neutral so the UI stays calm and un-maximal.
        accent: {
          950: '#082f49',
          900: '#0c4a6e',
          800: '#075985',
          700: '#0369a1',
          600: '#0284c7',
          500: '#0ea5e9',
          100: '#e0f2fe',
          50: '#f0f9ff',
        },
        // Semantic status — reserved strictly for the three compliance states
        // so the signal stays meaningful and never competes with the accent.
        approved: '#15803d',
        'approved-bg': '#dcfce7',
        pending: '#b45309',
        'pending-bg': '#fef3c7',
        breach: '#b91c1c',
        'breach-bg': '#fee2e2',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        // Flat by default; elevation is a hover affordance, not decoration.
        card: '0 1px 2px rgba(0,0,0,0.04)',
        lift: '0 6px 24px rgba(0,0,0,0.10)',
        panel: '0 8px 40px rgba(0,0,0,0.16)',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        // Content enter — used per-route and staggered for lists.
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Mono skeleton — a light sweep across the placeholder.
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        // Concentric ring for the live mic state.
        ring: {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        // Centered chatbar → full-screen conversation transition.
        chatExpand: {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Slow ambient drift for the background glass blobs.
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(24px, -28px) scale(1.08)' },
          '66%': { transform: 'translate(-18px, 18px) scale(0.94)' },
        },
      },
      animation: {
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
        slideIn: 'slideIn 0.35s cubic-bezier(0.22,1,0.36,1)',
        fadeUp: 'fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        ring: 'ring 1.4s ease-out infinite',
        chatExpand: 'chatExpand 0.55s cubic-bezier(0.22,1,0.36,1) both',
        blob: 'blob 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
