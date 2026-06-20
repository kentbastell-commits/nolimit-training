import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split stable, always-loaded third-party libs into their own chunks so
        // frequent app redeploys don't force returning visitors to re-download
        // React, i18n, and icons — only the app chunk changes between deploys.
        // (Returns undefined for everything else so dynamically-imported libs
        // like Recharts stay lazy.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id))
            return 'react'
          if (/[\\/]node_modules[\\/](i18next|react-i18next)[\\/]/.test(id))
            return 'i18n'
          if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return 'icons'
          return undefined
        },
      },
    },
  },
})
