/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-rgb) / <alpha-value>)',
        'bg-card': 'rgb(var(--bg-card-rgb) / <alpha-value>)',
        'bg-sidebar': 'rgb(var(--bg-sidebar-rgb) / <alpha-value>)',
        'bg-hover': 'rgb(var(--bg-hover-rgb) / <alpha-value>)',
        'bg-briefing': 'rgb(var(--bg-briefing-rgb) / <alpha-value>)',
        border: 'var(--border-val)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        active: 'rgb(var(--accent-rgb) / <alpha-value>)',
        paused: '#EF9F27',
        stale: '#E24B4A',
        muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs: '11px',
        sm: '13px',
        base: '13px',
        lg: '16px',
        xl: '20px',
      },
    },
  },
  plugins: [],
}
