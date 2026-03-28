import axios from 'axios'

const DEFAULT_AUTH = { username: '', password: '' }
const DEFAULT_PROXY_TARGET = 'http://172.19.0.176:19428'
const RAW_ALLOWED_PROXY_TARGETS = import.meta.env?.VITE_ALLOWED_PROXY_TARGETS || ''

export function normalizeProxyTarget(raw) {
  if (raw === undefined || raw === null) return ''

  const input = String(raw).trim()
  if (!input) return ''

  try {
    const url = new URL(input)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    if (url.username || url.password || url.search || url.hash) return null
    return `${url.protocol}//${url.host}`
  } catch {
    return null
  }
}

function parseAllowedProxyTargets(raw) {
  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => normalizeProxyTarget(item))
    .filter(Boolean)
}

const ALLOWED_PROXY_TARGETS = Array.from(new Set([
  DEFAULT_PROXY_TARGET,
  ...parseAllowedProxyTargets(RAW_ALLOWED_PROXY_TARGETS),
]))

export function getAllowedProxyTargets() {
  return [...ALLOWED_PROXY_TARGETS]
}

export function isAllowedProxyTarget(raw) {
  const normalized = normalizeProxyTarget(raw)
  if (normalized === '') return true
  if (!normalized) return false
  return ALLOWED_PROXY_TARGETS.includes(normalized)
}

// axios 始终通过 /api 代理发送请求，避免跨域问题
const client = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// ======== 目标地址管理 ========
// 存储用户选择的实际 VictoriaLogs 地址，通过请求头传递给代理
function getTargetUrl() {
  try {
    const stored = localStorage.getItem('vlogs_target_url') || ''
    const normalized = normalizeProxyTarget(stored)
    return isAllowedProxyTarget(normalized) ? normalized : ''
  } catch {
    return ''
  }
}

export function setApiBaseUrl(url) {
  const normalized = normalizeProxyTarget(url)
  const safeUrl = normalized && isAllowedProxyTarget(normalized) ? normalized : ''

  try {
    localStorage.setItem('vlogs_target_url', safeUrl)
  } catch { /* ignore */ }
}

export function getApiBaseUrl() {
  return getTargetUrl()
}

// ======== 认证管理 ========
function getAuth() {
  try {
    const saved = sessionStorage.getItem('vlogs_auth')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return DEFAULT_AUTH
}

export function setAuth(username, password) {
  const auth = { username, password }
  try {
    if (!username && !password) {
      sessionStorage.removeItem('vlogs_auth')
      localStorage.removeItem('vlogs_auth')
      return
    }

    sessionStorage.setItem('vlogs_auth', JSON.stringify(auth))
    localStorage.removeItem('vlogs_auth')
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

  if (target && isAllowedProxyTarget(target)) {
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

    config._retryCount = config._retryCount || 0

    const isRetryable =
      !error.response ||
      error.response.status === 502 ||
      error.response.status === 503

    if (isRetryable && config._retryCount < MAX_RETRIES) {
      config._retryCount++
      console.warn(`[retry ${config._retryCount}/${MAX_RETRIES}] ${config.url}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return client(config)
    }

    return Promise.reject(error)
  }
)

export { axios }
export default client
