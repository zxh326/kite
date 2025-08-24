import { StrictMode } from 'react'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import './index.css'
import './i18n'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

import { AuthProvider } from './contexts/auth-context'
import { QueryProvider } from './lib/query-provider'
import { router } from './routes'

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}

loader.config({ monaco })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryProvider>
  </StrictMode>
)
