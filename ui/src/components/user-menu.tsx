import { useAuth } from '@/contexts/auth-context'
import { Check, LogOut, Palette } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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

export function UserMenu() {
  const { user, logout } = useAuth()
  const { colorTheme, setColorTheme } = useColorTheme()

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }



  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="size-sm">
            <AvatarImage
              src={user.avatar_url}
              alt={user.name || user.username}
            />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(user.name || user.username)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.name && <p className="font-medium">{user.name}</p>}
            <p className="text-xs text-muted-foreground">{user.username}</p>
            {user.provider && (
              <p className="text-xs text-muted-foreground capitalize">
                via {user.provider}
              </p>
            )}
            {user.roles && user.roles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Role: {user.roles.map((role) => role.name).join(', ')}
              </p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Color Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {Object.entries(colorThemeIcons).map(([key, icon]) => {
              const isSelected = key === colorTheme

              return (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setColorTheme(key as ColorTheme)}
                  role="menuitemradio"
                  aria-checked={isSelected}
                  className={`flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected ? 'font-medium text-foreground' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {icon}
                    <span className="capitalize">{key}</span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {user.provider !== 'none' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
