import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useInitCheck } from '@/lib/api'

interface InitCheckRouteProps {
  children: ReactNode
}

export function InitCheckRoute({ children }: InitCheckRouteProps) {
  const { data: initCheck, isLoading } = useInitCheck()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Check if app is initialized first
  if (!initCheck?.initialized) {
    return <Navigate to="/setup" replace />
  }

  return <>{children}</>
}
