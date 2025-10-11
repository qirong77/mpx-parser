import { defineConfig } from 'vite'
import './server/index';
export default defineConfig({
  build: {
    target: 'esnext'
  },
  server: {
    fs: {
      allow: ['..']
    },
    proxy:{
      '/babel/script': { target: 'http://localhost:3000/babel/script', changeOrigin: true }
    }
  }
})
