import axios from 'axios'
import { DEFAULT_AUTH_CREDENTIALS } from '../../config/appConfig.js'
import {
  DEFAULT_PROXY_TARGET,
  MAX_API_RETRIES,
  API_RETRY_DELAY_MS,
  API_PROXY_BASE_PATH,
  API_REQUEST_TIMEOUT_MS,
} from '../../config/proxyConfig.js'
import { STORAGE_KEYS, SESSION_STORAGE_KEYS } from '../../config/storageKeys.js'

const RAW_ALLOWED_PROXY_TARGETS = import.meta.env?.VITE_ALLOWED_PROXY_TARGETS || ''
const STRICT_PROXY_TARGETS = import.meta.env?.VITE_STRICT_PROXY_TARGETS === 'true'

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

export function isStrictProxyMode() {
  return STRICT_PROXY_TARGETS
}

export function isAllowedProxyTarget(raw, options = {}) {
  const strict = options.strict ?? STRICT_PROXY_TARGETS
  const normalized = normalizeProxyTarget(raw)
  if (normalized === '') return true
  if (!normalized) return false
  if (!strict) return true
  return ALLOWED_PROXY_TARGETS.includes(normalized)
}

// axios 始终通过 /api 代理发送请求，避免跨域问题
const client = axios.create({
  baseURL: API_PROXY_BASE_PATH,
  timeout: API_REQUEST_TIMEOUT_MS,
})

// ======== 目标地址管理 ========
// 存储用户选择的实际 VictoriaLogs 地址，通过请求头传递给代理
function getTargetUrl() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.targetUrl) || ''
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
    localStorage.setItem(STORAGE_KEYS.targetUrl, safeUrl)
  } catch { /* ignore */ }
}

export function getApiBaseUrl() {
  return getTargetUrl()
}

// ======== 认证管理 ========
function getAuth() {
  try {
    const saved = localStorage.getItem(SESSION_STORAGE_KEYS.auth)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return DEFAULT_AUTH_CREDENTIALS
}

export function setAuth(username, password) {
  const auth = { username, password }
  try {
    if (!username && !password) {
      localStorage.removeItem(SESSION_STORAGE_KEYS.auth)
      sessionStorage.removeItem(SESSION_STORAGE_KEYS.auth)
      return
    }

    localStorage.setItem(SESSION_STORAGE_KEYS.auth, JSON.stringify(auth))
    sessionStorage.removeItem(SESSION_STORAGE_KEYS.auth)
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
      error.response.status === 503 ||
      error.response.status === 504

    if (isRetryable && config._retryCount < MAX_API_RETRIES) {
      config._retryCount++
      console.warn(`[retry ${config._retryCount}/${MAX_API_RETRIES}] ${config.url}`)
      const baseDelay = config.retryDelayMs ?? API_RETRY_DELAY_MS
      const retryDelay = baseDelay * (2 ** (config._retryCount - 1))
      const jitter = baseDelay > 0 ? Math.floor(Math.random() * 100) : 0
      await new Promise(resolve => setTimeout(resolve, retryDelay + jitter))
      return client(config)
    }

    return Promise.reject(error)
  }
)

export { axios }
export default client
