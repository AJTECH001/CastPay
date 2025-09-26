import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/contract/target/**'],
    },
    proxy: {
      // Proxy API calls during development to avoid CORS
      // IMPORTANT: Do NOT rewrite the path because backend mounts routes under '/api'
      '/api': {
        target: 'https://00692bb93831.ngrok-free.app',
        changeOrigin: true,
        secure: false,
      },
      // Health endpoint is at backend root ('/health'), so proxy it explicitly
      '/health': {
        target: 'https://00692bb93831.ngrok-free.app',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});