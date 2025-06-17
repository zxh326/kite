import './App.css'

import { Outlet } from 'react-router-dom'

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
import { QueryProvider } from './lib/query-provider'

function AppContent() {
  const { isOpen, closeSearch } = useGlobalSearch()

  return (
    <>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-auto">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
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
          <GlobalSearchProvider>
            <AppContent />
          </GlobalSearchProvider>
        </QueryProvider>
      </ColorThemeProvider>
    </ThemeProvider>
  )
}

export default App
