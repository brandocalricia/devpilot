import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const ACCENT_PRESETS = [
  { name: 'Teal', value: '#5DCAA5' },
  { name: 'Blue', value: '#5B9CF6' },
  { name: 'Purple', value: '#A78BFA' },
  { name: 'Pink', value: '#F472B6' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Yellow', value: '#FBBF24' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Cyan', value: '#22D3EE' },
]

const DARK_VARS = {
  '--bg-rgb': '15 15 16',
  '--bg-card-rgb': '24 24 27',
  '--bg-sidebar-rgb': '19 19 22',
  '--bg-hover-rgb': '31 31 35',
  '--bg-briefing-rgb': '21 21 37',
  '--text-rgb': '255 255 255',
  '--text-muted-rgb': '136 135 128',
  '--border-val': 'rgba(255, 255, 255, 0.06)',
}

const LIGHT_VARS = {
  '--bg-rgb': '248 248 250',
  '--bg-card-rgb': '255 255 255',
  '--bg-sidebar-rgb': '240 240 243',
  '--bg-hover-rgb': '232 232 236',
  '--bg-briefing-rgb': '238 240 255',
  '--text-rgb': '26 26 26',
  '--text-muted-rgb': '107 107 107',
  '--border-val': 'rgba(0, 0, 0, 0.08)',
}

export { ACCENT_PRESETS }

function applyTheme(theme, accent) {
  const vars = theme === 'light' ? LIGHT_VARS : DARK_VARS
  const root = document.documentElement
  const body = document.body

  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value)
    body.style.setProperty(key, value)
  }

  const rgb = hexToRgb(accent)
  root.style.setProperty('--accent-rgb', rgb)
  body.style.setProperty('--accent-rgb', rgb)

  // Force background and color on BOTH html and body to override Electron's native bg
  const bgRgb = vars['--bg-rgb']
  const textRgb = vars['--text-rgb']
  const bgColor = `rgb(${bgRgb.split(' ').join(', ')})`
  const textColor = `rgb(${textRgb.split(' ').join(', ')})`
  root.style.backgroundColor = bgColor
  root.style.color = textColor
  body.style.backgroundColor = bgColor
  body.style.color = textColor

  // Tell Electron to update its native background color
  if (window.devpilot?.setThemeColors) {
    window.devpilot.setThemeColors(bgColor)
  }
}

export function ThemeProvider({ children, settings, onSaveSettings }) {
  const [theme, setTheme] = useState(settings?.theme || 'dark')
  const [accent, setAccent] = useState(settings?.accentColor || '#5DCAA5')

  useEffect(() => {
    if (settings?.theme) setTheme(settings.theme)
    if (settings?.accentColor) setAccent(settings.accentColor)
  }, [settings?.theme, settings?.accentColor])

  useEffect(() => {
    applyTheme(theme, accent)
  }, [theme, accent])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next, accent)
    if (onSaveSettings) onSaveSettings({ ...settings, theme: next })
  }

  function setAccentColor(color) {
    setAccent(color)
    applyTheme(theme, color)
    if (onSaveSettings) onSaveSettings({ ...settings, accentColor: color })
  }

  return (
    <ThemeContext.Provider value={{ theme, accent, toggleTheme, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r} ${g} ${b}`
}
