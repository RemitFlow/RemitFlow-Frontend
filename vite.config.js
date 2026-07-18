import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the RemitFlow frontend.
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.js'
  }
})
