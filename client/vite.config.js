// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
     proxy: {
      '/api': {
        target: 'http://localhost:8080', // il tuo backend Node
        changeOrigin: true,
        secure: false,
      },
    },
    port: 5173, // Porta fissa per il client
    host: true, // Accesso da rete locale
  },
});