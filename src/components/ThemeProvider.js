'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext(null)

function applyTheme(mode) {
  const root = document.documentElement
  if (mode === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', mode)
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => 'system')

  useEffect(() => {
    const saved = window.localStorage.getItem('pct_theme_mode') || 'system'
    applyTheme(saved)
    if (saved !== mode) {
      queueMicrotask(() => setMode(saved))
    }
  }, [mode])

  const value = useMemo(() => ({
    mode,
    setMode(next) {
      setMode(next)
      window.localStorage.setItem('pct_theme_mode', next)
      applyTheme(next)
    },
  }), [mode])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider')
  return ctx
}
