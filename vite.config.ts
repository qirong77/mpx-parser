import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'esnext'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('development'),
    'process.env': JSON.stringify({}),
    'global': 'globalThis',
  },
  optimizeDeps: {
    include: [
      'monaco-editor', 
      '@babel/core', 
      '@babel/parser', 
      '@babel/traverse', 
      '@babel/types'
    ],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})