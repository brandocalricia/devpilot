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

export { ACCENT_PRESETS }

export function ThemeProvider({ children, settings, onSaveSettings }) {
  const [theme, setTheme] = useState(settings?.theme || 'dark')
  const [accent, setAccent] = useState(settings?.accentColor || '#5DCAA5')

  useEffect(() => {
    if (settings?.theme) setTheme(settings.theme)
    if (settings?.accentColor) setAccent(settings.accentColor)
  }, [settings?.theme, settings?.accentColor])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'light') {
      root.classList.add('light')
    } else {
      root.classList.remove('light')
    }
    root.style.setProperty('--accent', accent)
    root.style.setProperty('--accent-rgb', hexToRgb(accent))
  }, [theme, accent])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (onSaveSettings) onSaveSettings({ ...settings, theme: next })
  }

  function setAccentColor(color) {
    setAccent(color)
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
  return `${r}, ${g}, ${b}`
}
