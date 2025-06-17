import { createContext, useContext, useEffect, useState } from 'react'

export type ColorTheme = 'red' | 'green' | 'blue' | 'violet' | 'eye-care'

type ColorThemeProviderProps = {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (colorTheme: ColorTheme) => void
}

const initialState: ColorThemeProviderState = {
  colorTheme: 'blue',
  setColorTheme: () => null,
}

const ColorThemeProviderContext =
  createContext<ColorThemeProviderState>(initialState)

export function ColorThemeProvider({
  children,
  defaultColorTheme = 'blue',
  storageKey = 'vite-ui-color-theme',
  ...props
}: ColorThemeProviderProps) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultColorTheme
  )

  useEffect(() => {
    const root = window.document.documentElement

    // Remove all color themes
    root.classList.remove(
      'color-red',
      'color-green',
      'color-blue',
      'color-violet',
      'color-eye-care'
    )

    // Add the current color theme
    root.classList.add(`color-${colorTheme}`)
  }, [colorTheme])

  const value = {
    colorTheme,
    setColorTheme: (colorTheme: ColorTheme) => {
      localStorage.setItem(storageKey, colorTheme)
      setColorTheme(colorTheme)
    },
  }

  return (
    <ColorThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)

  if (context === undefined)
    throw new Error('useColorTheme must be used within a ColorThemeProvider')

  return context
}
