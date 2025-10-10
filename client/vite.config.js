// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Preferisci entry moderne dei pacchetti
    conditions: ['module', 'import', 'browser', 'default'],
    mainFields: ['module', 'jsnext:main', 'browser', 'main'],
  },
  esbuild: {
    target: 'es2022', // non transpila class/spread nel tuo codice
  },
  build: {
    target: 'es2022',          // output moderno
    modulePreload: { polyfill: false }, // niente polyfill inutili
  },
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, secure: false },
    },
    port: 5173,
    host: true,
  },
})
