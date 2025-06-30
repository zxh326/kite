import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../static',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ['monaco-editor'],
        },
      },
    },
  },
  server: {
    watch: {
      ignored: ['**/.vscode/**'],
    },
    proxy: {
      '/api/': {
        changeOrigin: true,
        target: 'http://localhost:8080',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // this is workaround for Tabler Icons issue
      // @see https://github.com/tabler/tabler-icons/issues/1233#issuecomment-2744963177
      '@tabler/icons-react': '@tabler/icons-react/dist/esm/icons/index.mjs',
    },
  },
  worker: {
    format: 'es',
  },
  define: {
    global: 'globalThis',
  },
})
