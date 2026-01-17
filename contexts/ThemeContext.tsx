'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'auto'
type ColorScheme = 'blue' | 'purple' | 'green' | 'red' | 'orange'

interface ThemeContextType {
  theme: Theme
  colorScheme: ColorScheme
  setTheme: (theme: Theme) => void
  setColorScheme: (scheme: ColorScheme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>('blue')

  // Check if auto mode should be dark or light
  const getAutoTheme = (): 'dark' | 'light' => {
    const hour = new Date().getHours()
    return (hour >= 6 && hour < 18) ? 'light' : 'dark'
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    const savedColorScheme = localStorage.getItem('colorScheme') as ColorScheme
    if (savedTheme) {
      setThemeState(savedTheme)
    }
    if (savedColorScheme) {
      setColorSchemeState(savedColorScheme)
    }
  }, [])

  useEffect(() => {
    const actualTheme = theme === 'auto' ? getAutoTheme() : theme
    document.documentElement.classList.remove('dark', 'light')
    document.documentElement.classList.add(actualTheme)
    localStorage.setItem('theme', theme)

    // Apply color scheme
    document.documentElement.setAttribute('data-color-scheme', colorScheme)
    localStorage.setItem('colorScheme', colorScheme)

    // Auto mode: check every minute
    if (theme === 'auto') {
      const interval = setInterval(() => {
        const newTheme = getAutoTheme()
        document.documentElement.classList.remove('dark', 'light')
        document.documentElement.classList.add(newTheme)
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [theme, colorScheme])

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'dark') return 'light'
      if (prev === 'light') return 'auto'
      return 'dark'
    })
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const setColorScheme = (scheme: ColorScheme) => {
    setColorSchemeState(scheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, colorScheme, setTheme, setColorScheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
