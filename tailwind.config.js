/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        'bg-card': 'var(--bg-card)',
        'bg-sidebar': 'var(--bg-sidebar)',
        'bg-hover': 'var(--bg-hover)',
        'bg-briefing': 'var(--bg-briefing)',
        border: 'var(--border)',
        accent: 'var(--accent)',
        active: 'var(--accent)',
        paused: '#EF9F27',
        stale: '#E24B4A',
        muted: 'var(--text-muted)',
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
