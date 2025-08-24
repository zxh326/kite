import { createBrowserRouter } from 'react-router-dom'

import App from './App'
import { InitCheckRoute } from './components/init-check-route'
import { ProtectedRoute } from './components/protected-route'
import { CRListPage } from './pages/cr-list-page'
import { InitializationPage } from './pages/initialization'
import { LoginPage } from './pages/login'
import { Overview } from './pages/overview'
import { SettingsPage } from './pages/settings'
import { ResourceDetail } from './pages/resource-detail'
import { ResourceList } from './pages/resource-list'

export const router = createBrowserRouter([
  {
    path: '/setup',
    element: <InitializationPage />,
  },
  {
    path: '/login',
    element: (
      <InitCheckRoute>
        <LoginPage />
      </InitCheckRoute>
    ),
  },
  {
    path: '/',
    element: (
      <InitCheckRoute>
        <ProtectedRoute>
          <App />
        </ProtectedRoute>
      </InitCheckRoute>
    ),
    children: [
      {
        index: true,
        element: <Overview />,
      },
      {
        path: 'dashboard',
        element: <Overview />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'crds/:crd',
        element: <CRListPage />,
      },
      // for namespaced CRD resources
      {
        path: 'crds/:resource/:namespace/:name',
        element: <ResourceDetail />,
      },
      // for cluster-scoped CRD resources
      {
        path: 'crds/:resource/:name',
        element: <ResourceDetail />,
      },
      {
        path: ':resource/:name',
        element: <ResourceDetail />,
      },
      {
        path: ':resource',
        element: <ResourceList />,
      },
      {
        path: ':resource/:namespace/:name',
        element: <ResourceDetail />,
      },
    ],
  },
])
