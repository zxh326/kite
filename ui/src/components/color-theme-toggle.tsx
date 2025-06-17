import { Palette } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ColorTheme, useColorTheme } from '@/components/color-theme-provider'

const colorThemeIcons = {
  blue: <div className="h-4 w-4 rounded-full bg-blue-500"></div>,
  red: <div className="h-4 w-4 rounded-full bg-red-500"></div>,
  green: <div className="h-4 w-4 rounded-full bg-green-500"></div>,
  violet: <div className="h-4 w-4 rounded-full bg-violet-500"></div>,
  'eye-care': <div className="h-4 w-4 rounded-full bg-amber-400"></div>,
}

export function ColorThemeToggle() {
  const { setColorTheme } = useColorTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-20">
        {Object.entries(colorThemeIcons).map(([key, icon]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => setColorTheme(key as ColorTheme)}
            className="flex items-center gap-2"
          >
            {icon}
            <span>{key}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
