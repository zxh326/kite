import './App.css'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useSearchParams } from 'react-router-dom'

import { AppSidebar } from './components/app-sidebar'
import { GlobalSearch } from './components/global-search'
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from './components/global-search-provider'
import { SiteHeader } from './components/site-header'
import { SidebarInset, SidebarProvider } from './components/ui/sidebar'
import { Toaster } from './components/ui/sonner'
import { ClusterProvider } from './contexts/cluster-context'
import { useCluster } from './hooks/use-cluster'
import { apiClient } from './lib/api-client'

function ClusterAwareApp() {
  const { t } = useTranslation()
  const { currentCluster, isLoading, error } = useCluster()

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
          <span>{t('cluster.loading')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-500">
          <p>{t('cluster.error', { error: error.message })}</p>
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
    <ClusterProvider>
      <GlobalSearchProvider>
        <ClusterAwareApp />
      </GlobalSearchProvider>
    </ClusterProvider>
  )
}

export default App
