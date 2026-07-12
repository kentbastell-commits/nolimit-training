import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { injectSeo } from './server/seo.ts'

const publicSeoRoutes = [
  '/',
  '/store',
  '/coaching',
  '/in-person',
  '/privacy',
  '/terms',
  '/refund',
  '/business',
]

function seoFiles(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl = (env.VITE_PUBLIC_SITE_URL || 'https://trainnolimit.com').replace(/\/+$/, '')
  const socialImage = env.VITE_SOCIAL_IMAGE_URL || '/icon-512.png'
  const xmlEscape = (value: string) => value.replace(/&/g, '&amp;')
  let outputDirectory = path.resolve('dist')
  return {
    name: 'nolimit-seo-files',
    configResolved(config) {
      outputDirectory = path.resolve(config.root, config.build.outDir)
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
      })
      const urls = publicSeoRoutes
        .map((route) => `  <url><loc>${xmlEscape(new URL(route, `${siteUrl}/`).toString())}</loc><changefreq>${route === '/' ? 'weekly' : 'monthly'}</changefreq></url>`)
        .join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
    closeBundle() {
      const indexPath = path.join(outputDirectory, 'index.html')
      if (!fs.existsSync(indexPath)) return
      const template = fs.readFileSync(indexPath, 'utf8')
      // Rewrite the root too, so a domain change updates static metadata even
      // when nginx serves dist/index.html without involving Node.
      fs.writeFileSync(indexPath, injectSeo(template, '/', siteUrl, socialImage))
      for (const route of publicSeoRoutes.filter((item) => item !== '/')) {
        const routeDirectory = path.join(outputDirectory, route.replace(/^\//, ''))
        fs.mkdirSync(routeDirectory, { recursive: true })
        fs.writeFileSync(
          path.join(routeDirectory, 'index.html'),
          injectSeo(template, route, siteUrl, socialImage),
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), seoFiles(mode)],
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
}))
