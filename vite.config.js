import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createProxyMiddleware } from 'http-proxy-middleware'

const DEFAULT_TARGET = 'http://172.19.0.176:19428'

function normalizeTarget(raw) {
  if (!raw) return null

  try {
    const url = new URL(raw)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.username || url.password || url.search || url.hash) return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

const ALLOWED_TARGETS = new Set([
  DEFAULT_TARGET,
  ...(process.env.VITE_ALLOWED_PROXY_TARGETS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(normalizeTarget)
    .filter(Boolean),
])

function dynamicProxyPlugin() {
  return {
    name: 'dynamic-proxy',
    configureServer(server) {
      const apiProxy = createProxyMiddleware({
        target: DEFAULT_TARGET,
        changeOrigin: true,
        secure: false,
        router(req) {
          const rawTarget = req.headers['x-proxy-target'] || req.headers['X-Proxy-Target'] || req.headers['x-target-url']
          const target = normalizeTarget(rawTarget)
          if (target && ALLOWED_TARGETS.has(target)) {
            console.log(`[Vite Proxy Router] Routing to Target: ${target}`)
            return target
          }
          return DEFAULT_TARGET
        },
        pathRewrite: {
          '^/api': '',
        },
        onProxyReq(proxyReq, req) {
          const rawTarget = req.headers['x-proxy-target'] || req.headers['X-Proxy-Target'] || req.headers['x-target-url']
          const target = normalizeTarget(rawTarget)
          if (target && ALLOWED_TARGETS.has(target)) {
            const parsedTarget = new URL(target)
            proxyReq.setHeader('Host', parsedTarget.host)
          }
          proxyReq.removeHeader('x-proxy-target')
          proxyReq.removeHeader('X-Proxy-Target')
          proxyReq.removeHeader('x-target-url')
        },
      })

      server.middlewares.use('/api', apiProxy)
    },
  }
}

export default defineConfig({
  plugins: [vue(), dynamicProxyPlugin()],
  base: '/vlogs-ui/',
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {},
  },
})
