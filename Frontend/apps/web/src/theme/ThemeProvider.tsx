import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { preferenceStorage } from '../lib/privacy/consent'
import { ThemeContext, type Theme } from './context'

// The saved choice is applied before first paint by a small script in index.html.
const STORAGE_KEY = 'intyoza.theme'

function savedTheme(): Theme | null {
  const saved = preferenceStorage.get<Theme>(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' ? saved : null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Theme | null>(savedTheme)
  // Light unless the person turned dark on, whatever the device is set to.
  const theme: Theme = chosen ?? 'light'

  useEffect(() => {
    if (chosen) document.documentElement.dataset.theme = chosen
    else delete document.documentElement.dataset.theme
  }, [chosen])

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setChosen(next)
    preferenceStorage.set(STORAGE_KEY, next)
  }, [theme])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
