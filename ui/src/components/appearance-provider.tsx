/* eslint-disable react-refresh/only-export-components */
import { useMemo, type ReactNode } from 'react'

import type { ColorTheme } from './color-theme-provider'
import { ColorThemeProvider, useColorTheme } from './color-theme-provider'
import { FontProvider, useFont } from './font-provider'
import { ThemeProvider, useTheme } from './theme-provider'

type AppearanceProviderProps = {
  children: ReactNode
  // Theme
  defaultTheme?: 'dark' | 'light' | 'system'
  themeStorageKey?: string
  // Color theme
  defaultColorTheme?: ColorTheme
  colorThemeStorageKey?: string
  // Font
  defaultFont?: 'system' | 'maple' | 'jetbrains'
  fontStorageKey?: string
}

export function AppearanceProvider({
  children,
  defaultTheme = 'system',
  themeStorageKey = 'vite-ui-theme',
  defaultColorTheme = 'default',
  colorThemeStorageKey = 'vite-ui-color-theme',
  defaultFont = 'maple',
  fontStorageKey = 'vite-ui-font',
}: AppearanceProviderProps) {
  return (
    <ThemeProvider defaultTheme={defaultTheme} storageKey={themeStorageKey}>
      <ColorThemeProvider
        defaultColorTheme={defaultColorTheme}
        storageKey={colorThemeStorageKey}
      >
        <FontProvider defaultFont={defaultFont} storageKey={fontStorageKey}>
          {children}
        </FontProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  )
}

export default AppearanceProvider

// Unified hook for reading/updating all appearance settings in one place.
export function useAppearance() {
  const { theme, actualTheme, setTheme } = useTheme()
  const { colorTheme, setColorTheme } = useColorTheme()
  const { font, setFont } = useFont()

  return useMemo(
    () => ({
      theme,
      actualTheme,
      setTheme,
      colorTheme,
      setColorTheme,
      font,
      setFont,
    }),
    [theme, actualTheme, colorTheme, font, setTheme, setColorTheme, setFont]
  )
}
