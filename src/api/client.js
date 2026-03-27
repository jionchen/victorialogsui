import axios from 'axios'

const DEFAULT_AUTH = { username: '', password: '' }

// axios 始终通过 /api 代理发送请求，避免跨域问题
const client = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// ======== 目标地址管理 ========
// 存储用户选择的实际 VictoriaLogs 地址，通过请求头传递给代理
function getTargetUrl() {
  try {
    return localStorage.getItem('vlogs_target_url') || ''
  } catch {
    return ''
  }
}

export function setApiBaseUrl(url) {
  try {
    localStorage.setItem('vlogs_target_url', url)
  } catch { /* ignore */ }
}

export function getApiBaseUrl() {
  return getTargetUrl()
}

// ======== 认证管理 ========
function getAuth() {
  try {
    const saved = localStorage.getItem('vlogs_auth')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return DEFAULT_AUTH
}

export function setAuth(username, password) {
  const auth = { username, password }
  try {
    localStorage.setItem('vlogs_auth', JSON.stringify(auth))
  } catch { /* ignore */ }
}

export function getAuthCredentials() {
  return getAuth()
}

// ======== 请求拦截器 ========
client.interceptors.request.use((config) => {
  // 禁用缓存的请求头
  config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  config.headers['Pragma'] = 'no-cache'
  config.headers['Expires'] = '0'

  // 在 URL 后添加时间戳防止缓存
  const url = new URL(config.url, window.location.origin)
  url.searchParams.set('_t', Date.now().toString())
  config.url = url.pathname + url.search

  // 将实际目标地址作为自定义请求头传给代理
  const target = getTargetUrl()

  if (target && target.startsWith('http')) {
    console.log(`[Axios Outgoing] ${config.method?.toUpperCase()} ${config.url} -> Proxy-Target: ${target}`)
    if (config.headers && typeof config.headers.set === 'function') {
      config.headers.set('x-proxy-target', target)
    } else {
      config.headers['x-proxy-target'] = target
    }
  } else {
    console.log(`[Axios Outgoing] ${config.method?.toUpperCase()} ${config.url} -> Using default (no target header)`)
  }

  // Basic Auth
  const auth = getAuth()
  if (auth.username) {
    const encoded = btoa(`${auth.username}:${auth.password}`)
    config.headers['Authorization'] = `Basic ${encoded}`
  }
  return config
})

// ======== 响应拦截器 (含自动重试) ========
const MAX_RETRIES = 2
const RETRY_DELAY = 1000 // ms

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject({ cancelled: true })
    }

    const config = error.config
    if (!config) return Promise.reject(error)

    // 初始化重试计数
    config._retryCount = config._retryCount || 0

    // 判断是否为可重试的错误 (502, 503, 网络错误)
    const isRetryable =
      !error.response || // 网络错误 (ENETDOWN, ECONNRESET 等)
      error.response.status === 502 ||
      error.response.status === 503

    if (isRetryable && config._retryCount < MAX_RETRIES) {
      config._retryCount++
      console.warn(`[retry ${config._retryCount}/${MAX_RETRIES}] ${config.url}`)

      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return client(config)
    }

    return Promise.reject(error)
  }
)

export { axios }
export default client
