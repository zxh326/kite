import './App.css'

import { useEffect } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'

import { AppSidebar } from './components/app-sidebar'
import { ColorThemeProvider } from './components/color-theme-provider'
import { GlobalSearch } from './components/global-search'
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from './components/global-search-provider'
import { SiteHeader } from './components/site-header'
import { ThemeProvider } from './components/theme-provider'
import { SidebarInset, SidebarProvider } from './components/ui/sidebar'
import { Toaster } from './components/ui/sonner'
import { ClusterProvider } from './contexts/cluster-context'
import { useCluster } from './hooks/use-cluster'
import { apiClient } from './lib/api-client'
import { QueryProvider } from './lib/query-provider'

function ClusterAwareApp() {
  const { currentCluster, isLoading } = useCluster()

  useEffect(() => {
    apiClient.setClusterProvider(() => {
      return currentCluster || localStorage.getItem('current-cluster')
    })
  }, [currentCluster])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span>Loading clusters...</span>
        </div>
      </div>
    )
  }

  return <AppContent />
}

function AppContent() {
  const { isOpen, closeSearch } = useGlobalSearch()
  const [searchParams] = useSearchParams()
  const isIframe = searchParams.get('iframe') === 'true'

  if (isIframe) {
    return <Outlet />
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-auto">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6">
                <div className="px-4 lg:px-6">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <GlobalSearch open={isOpen} onOpenChange={closeSearch} />
      <Toaster />
    </>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <ColorThemeProvider
        defaultColorTheme="blue"
        storageKey="vite-ui-color-theme"
      >
        <QueryProvider>
          <ClusterProvider>
            <GlobalSearchProvider>
              <ClusterAwareApp />
            </GlobalSearchProvider>
          </ClusterProvider>
        </QueryProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  )
}

export default App
