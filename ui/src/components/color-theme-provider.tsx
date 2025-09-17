/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

export const colorThemes = {
  default: '',
  'eye-care': '',
  darkmatter: '',
  notebook: '',
  'clean-slate': '',
}

export type ColorTheme = keyof typeof colorThemes

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
  colorTheme: 'default',
  setColorTheme: () => null,
}

const ColorThemeProviderContext =
  createContext<ColorThemeProviderState>(initialState)

export function ColorThemeProvider({
  children,
  defaultColorTheme = 'default',
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
      ...Object.keys(colorThemes).map((theme) => `color-${theme}`)
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
