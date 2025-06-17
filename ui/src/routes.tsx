import { createBrowserRouter } from 'react-router-dom'

import App from './App'
import { ProtectedRoute } from './components/protected-route'
import { CRListPage } from './pages/cr-list-page'
import { LoginPage } from './pages/login'
import { Overview } from './pages/overview'
import { ResourceDetail } from './pages/resource-detail'
import { ResourceList } from './pages/resource-list'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <App />
      </ProtectedRoute>
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
