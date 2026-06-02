import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createProxyMiddleware } from 'http-proxy-middleware'
import { APP_BASE_PATH, DEV_SERVER_HOST, DEV_SERVER_PORT } from './config/appConfig.js'
import { API_PROXY_TIMEOUT_MS, DEFAULT_PROXY_TARGET } from './config/proxyConfig.js'

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
  DEFAULT_PROXY_TARGET,
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
        target: DEFAULT_PROXY_TARGET,
        changeOrigin: true,
        secure: false,
        timeout: API_PROXY_TIMEOUT_MS,
        proxyTimeout: API_PROXY_TIMEOUT_MS,
        router(req) {
          const rawTarget = req.headers['x-proxy-target'] || req.headers['X-Proxy-Target'] || req.headers['x-target-url']
          const target = normalizeTarget(rawTarget)
          if (target && ALLOWED_TARGETS.has(target)) {
            console.log(`[Vite Proxy Router] Routing to Target: ${target}`)
            return target
          }
          return DEFAULT_PROXY_TARGET
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
        onError(err, req, res) {
          console.error('[Vite Proxy Error]', err.message)
          if (!res.headersSent) {
            res.writeHead(504, { 'Content-Type': 'application/json; charset=utf-8' })
          }
          res.end(JSON.stringify({ error: 'Proxy request failed', message: err.message }))
        },
      })

      server.middlewares.use('/api', apiProxy)
    },
  }
}

export default defineConfig({
  plugins: [vue(), dynamicProxyPlugin()],
  base: APP_BASE_PATH,
  server: {
    port: DEV_SERVER_PORT,
    host: DEV_SERVER_HOST,
    proxy: {},
  },
})
