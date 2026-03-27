import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createProxyMiddleware } from 'http-proxy-middleware'

const DEFAULT_TARGET = 'http://172.19.0.176:19428'

// 自定义动态代理插件，规避部分 Vite 版本原生 proxy 忽略 router 函数的问题
function dynamicProxyPlugin() {
  return {
    name: 'dynamic-proxy',
    configureServer(server) {
      const apiProxy = createProxyMiddleware({
        target: DEFAULT_TARGET,
        changeOrigin: true,
        secure: false,
        router: function(req) {
            const rawTarget = req.headers['x-proxy-target'] || req.headers['X-Proxy-Target'] || req.headers['x-target-url'];
            if (rawTarget && typeof rawTarget === 'string' && rawTarget.startsWith('http')) {
                const target = rawTarget.replace('localhost', '127.0.0.1').replace(/\/$/, '');
                console.log(`[Vite Proxy Router] Routing to Target: ${target}`);
                return target;
            }
            return DEFAULT_TARGET;
        },
        pathRewrite: {
            '^/api': ''
        },
        onProxyReq: (proxyReq, req, res) => {
            const rawTarget = req.headers['x-proxy-target'] || req.headers['X-Proxy-Target'] || req.headers['x-target-url'];
            if (rawTarget && typeof rawTarget === 'string' && rawTarget.startsWith('http')) {
               const parsedTarget = new URL(rawTarget);
               proxyReq.setHeader('Host', parsedTarget.host);
            }
            proxyReq.removeHeader('x-proxy-target');
            proxyReq.removeHeader('X-Proxy-Target');
            proxyReq.removeHeader('x-target-url');
        }
      });
      
      server.middlewares.use('/api', apiProxy);
    }
  }
}

export default defineConfig({
  plugins: [vue(), dynamicProxyPlugin()],
  base: '/vlogs-ui/',
  server: {
    port: 5173,
    host: '127.0.0.1',
    proxy: {} // `/api` is now handled by our dynamicProxyPlugin
  }
})
