import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

interface User {
  id: string
  username: string
  name: string
  avatar_url: string
  provider: string
}

interface OAuthProvider {
  name: string
  displayName: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  providers: OAuthProvider[]
  login: (provider?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  refreshToken: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

let base = ''
if (import.meta.env.DEV) {
  base = 'http://localhost:8080'
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [providers, setProviders] = useState<OAuthProvider[]>([])

  const loadProviders = async () => {
    try {
      const response = await fetch(`${base}/api/auth/providers`)
      if (response.ok) {
        const data = await response.json()
        const providerList = data.providers.map((name: string) => ({
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
        }))
        setProviders(providerList)
      }
    } catch (error) {
      console.error('Failed to load OAuth providers:', error)
    }
  }

  const checkAuth = async () => {
    try {
      const response = await fetch(`${base}/api/auth/user`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (provider: string = 'github') => {
    try {
      const response = await fetch(
        `${base}/api/auth/login?provider=${provider}`,
        {
          credentials: 'include',
        }
      )

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.auth_url
      } else {
        throw new Error('Failed to initiate login')
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const refreshToken = async () => {
    try {
      const response = await fetch(`${base}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to refresh token')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // If refresh fails, redirect to login
      setUser(null)
      window.location.href = '/login'
    }
  }

  const logout = async () => {
    try {
      const response = await fetch(`${base}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })

      if (response.ok) {
        setUser(null)
        window.location.href = '/login'
      } else {
        throw new Error('Failed to logout')
      }
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      await loadProviders()
      await checkAuth()
    }
    initAuth()
  }, [])

  // Set up automatic token refresh
  useEffect(() => {
    if (!user) return

    const refreshInterval = setInterval(
      () => {
        refreshToken()
      },
      30 * 60 * 1000
    ) // Refresh every 30 minutes

    return () => clearInterval(refreshInterval)
  }, [user])

  const value = {
    user,
    isLoading,
    providers,
    login,
    logout,
    checkAuth,
    refreshToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
