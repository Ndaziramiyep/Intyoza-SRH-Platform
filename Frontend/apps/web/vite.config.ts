import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The backend is proxied in development, so the app calls it on the same origin.
  // Defaults to the local backend (backend/, port 4000); set VITE_BACKEND_URL in .env.local to use another one.
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_BACKEND_URL ?? process.env.VITE_BACKEND_URL ?? 'http://localhost:4000'
  const backend = { target, changeOrigin: true }

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': backend,
        '/health': backend,
      },
    },
  }
})
