import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext'
  },
  optimizeDeps: {
    include: ['monaco-editor']
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})