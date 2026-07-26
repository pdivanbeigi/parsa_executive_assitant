import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Use IPv4 explicitly — macOS often resolves "localhost" to ::1 while
        // the API binds to 127.0.0.1, which makes login look like a bad password.
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
