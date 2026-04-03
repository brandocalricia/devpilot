/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg-rgb))',
        'bg-card': 'rgb(var(--bg-card-rgb))',
        'bg-sidebar': 'rgb(var(--bg-sidebar-rgb))',
        'bg-hover': 'rgb(var(--bg-hover-rgb))',
        'bg-briefing': 'rgb(var(--bg-briefing-rgb))',
        border: 'var(--border-val)',
        accent: 'rgb(var(--accent-rgb))',
        active: 'rgb(var(--accent-rgb))',
        paused: '#EF9F27',
        stale: '#E24B4A',
        muted: 'rgb(var(--text-muted-rgb))',
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
