/**
 * Format large numbers (e.g., 1234567 -> "1.2M")
 */
export function formatNumber(n) {
  if (n === null || n === undefined) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}

/**
 * Calculate percentage
 */
export function calcPercentage(value, total) {
  if (!total || total === 0) return 0
  return Math.round((value / total) * 100)
}

/**
 * Try to detect and pretty-print JSON
 */
export function tryFormatJSON(str) {
  if (!str || typeof str !== 'string') return null
  const trimmed = str.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str, maxLen = 100) {
  if (!str) return ''
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen) + '...'
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Extract meaningful stream label from log entry
 */
export function getStreamLabel(log) {
  const candidates = [
    log['src_container.name'],
    log.src_container_name,
    log['src_k8s.pod.name'],
    log.src_pod_name,
    log['host.name'],
    log._stream,
  ]
  return candidates.find(Boolean) || '-'
}

/**
 * Format datetime with milliseconds
 */
export function formatDateTime(isoStr) {
  if (!isoStr) return ''
  try {
    const d = new Date(isoStr)
    const pad = n => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const MM = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    const ms = String(d.getMilliseconds()).padStart(3, '0')
    return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}.${ms}`
  } catch {
    return isoStr
  }
}
