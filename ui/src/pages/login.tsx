import { FormEvent, useState } from 'react'
import Logo from '@/assets/icon.svg'
import { useAuth } from '@/contexts/auth-context'
import { Navigate, useSearchParams } from 'react-router-dom'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { user, login, loginWithPassword, providers, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const [loginLoading, setLoginLoading] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const error = searchParams.get('error')

  // If user is already logged in, redirect to dashboard
  if (user && !isLoading) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = async (provider: string = 'github') => {
    setLoginLoading(provider)
    try {
      await login(provider)
    } catch (error) {
      console.error('Login failed:', error)
      setLoginLoading(null)
    }
  }

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoginLoading('password')
    setPasswordError(null)
    try {
      await loginWithPassword(username, password)
    } catch (err) {
      if (err instanceof Error) {
        setPasswordError(err.message || 'Invalid username or password')
      } else {
        setPasswordError('An unknown error occurred')
      }
    } finally {
      setLoginLoading(null)
    }
  }

  const getErrorMessage = (errorCode: string | null) => {
    if (!errorCode) return null

    // Get additional parameters for more detailed error messages
    const provider = searchParams.get('provider') || 'OAuth provider'
    const user = searchParams.get('user')
    const reason = searchParams.get('reason') || errorCode

    switch (reason) {
      case 'insufficient_permissions':
        return {
          title: 'Access Denied',
          message: user
            ? `Access denied for user "${user}". Please contact your administrator to verify your permissions.`
            : 'Insufficient permissions to access this application.',
          details:
            'Your account does not have the required permissions to access this Kubernetes dashboard.',
        }
      case 'token_exchange_failed':
        return {
          title: 'Authentication Failed',
          message: `Failed to complete authentication with ${provider}.`,
          details:
            'There was an issue exchanging the authorization code for an access token. Please try again.',
        }
      case 'user_info_failed':
        return {
          title: 'Profile Access Failed',
          message: `Unable to retrieve your profile information from ${provider}.`,
          details:
            'The authentication succeeded, but we could not access your profile. Please try again.',
        }
      case 'jwt_generation_failed':
        return {
          title: 'Session Creation Failed',
          message: user
            ? `Failed to create a session for user "${user}".`
            : 'Unable to create your authentication session.',
          details:
            'Please try logging in again. If the problem persists, contact support.',
        }
      case 'callback_failed':
        return {
          title: 'OAuth Callback Failed',
          message: 'The OAuth authentication process failed.',
          details: 'Please try again or contact support if the issue persists.',
        }
      case 'callback_error':
        return {
          title: 'Authentication Error',
          message: 'An error occurred during authentication.',
          details: 'Please try again or contact support if the issue persists.',
        }
      default:
        return {
          title: 'Authentication Error',
          message: 'An unexpected error occurred during authentication.',
          details: 'Please try again or contact support if the issue persists.',
        }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <img src={Logo} className="h-10 w-10 dark:invert" />{' '}
              <h1 className="text-2xl font-bold text-gray-900">Kite</h1>
            </div>
            <p className="text-gray-600">Kubernetes Dashboard</p>
          </div>

          <Card className="bg-white shadow-sm border border-gray-200">
            <CardHeader className="text-center">
              <CardTitle className="text-xl text-gray-900">Sign In</CardTitle>
              <CardDescription className="text-gray-600">
                Access your Kubernetes dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="space-y-3">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700">
                      <div className="space-y-2">
                        <div className="font-semibold">
                          {getErrorMessage(error)?.title}
                        </div>
                        <div>{getErrorMessage(error)?.message}</div>
                        {getErrorMessage(error)?.details && (
                          <div className="text-sm text-red-600 mt-2">
                            {getErrorMessage(error)?.details}
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Additional actions for permission errors */}
                  {(searchParams.get('reason') === 'insufficient_permissions' ||
                    error === 'insufficient_permissions') && (
                    <div className="text-center space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Clear error parameters and allow retry
                          window.location.href = '/login'
                        }}
                        className="w-full"
                      >
                        Try Again with Different Account
                      </Button>
                      <p className="text-xs text-gray-500">
                        You can try logging in with a different account that has
                        the required permissions.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {providers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No login methods configured</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Please configure authentication providers in your
                    environment
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {providers.includes('password') && (
                    <form onSubmit={handlePasswordLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter your username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      {passwordError && (
                        <Alert variant="destructive">
                          <AlertDescription>{passwordError}</AlertDescription>
                        </Alert>
                      )}
                      <Button
                        type="submit"
                        disabled={loginLoading !== null}
                        className="w-full"
                      >
                        {loginLoading === 'password' ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Signing in...</span>
                          </div>
                        ) : (
                          'Sign In with Password'
                        )}
                      </Button>
                    </form>
                  )}

                  {providers.filter((p) => p !== 'password').length > 0 &&
                    providers.includes('password') && (
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-muted-foreground">
                            Or continue with
                          </span>
                        </div>
                      </div>
                    )}

                  {providers
                    .filter((p) => p !== 'password')
                    .map((provider) => (
                      <Button
                        key={provider}
                        onClick={() => handleLogin(provider)}
                        disabled={loginLoading !== null}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11"
                        variant="default"
                      >
                        {loginLoading === provider ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Signing in...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>
                              Sign in with{' '}
                              {provider.charAt(0).toUpperCase() +
                                provider.slice(1)}
                            </span>
                          </div>
                        )}
                      </Button>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Kite. Built for Kubernetes
              enthusiasts.
            </p>
            <div className="flex space-x-6 text-sm text-gray-500">
              <a
                href="https://github.com/zxh326/kite"
                target="_blank"
                className="hover:text-gray-700 transition-colors"
              >
                Documentation
              </a>
              <a
                href="https://github.com/zxh326/kite"
                target="_blank"
                className="hover:text-gray-700 transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
