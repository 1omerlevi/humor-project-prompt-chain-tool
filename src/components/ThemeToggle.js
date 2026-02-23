'use client'

import { useThemeMode } from './ThemeProvider'

export default function ThemeToggle() {
  const { mode, setMode } = useThemeMode()

  return (
    <div className="theme-toggle" role="group" aria-label="Theme mode">
      {['system', 'dark', 'light'].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setMode(opt)}
          data-active={mode === opt ? 'true' : 'false'}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}
