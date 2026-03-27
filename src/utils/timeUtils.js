/**
 * Time utility functions
 */

// Preset time ranges
export const TIME_PRESETS = [
  { label: '5m', value: '5m', ms: 5 * 60 * 1000 },
  { label: '15m', value: '15m', ms: 15 * 60 * 1000 },
  { label: '30m', value: '30m', ms: 30 * 60 * 1000 },
  { label: '1h', value: '1h', ms: 60 * 60 * 1000 },
  { label: '3h', value: '3h', ms: 3 * 60 * 60 * 1000 },
  { label: '6h', value: '6h', ms: 6 * 60 * 60 * 1000 },
  { label: '12h', value: '12h', ms: 12 * 60 * 60 * 1000 },
  { label: '1d', value: '1d', ms: 24 * 60 * 60 * 1000 },
  { label: '7d', value: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
]

/**
 * Calculate appropriate histogram step based on time range
 */
export function calculateStep(rangeMs) {
  if (rangeMs <= 15 * 60 * 1000) return '10s'
  if (rangeMs <= 60 * 60 * 1000) return '30s'
  if (rangeMs <= 6 * 60 * 60 * 1000) return '5m'
  if (rangeMs <= 24 * 60 * 60 * 1000) return '30m'
  if (rangeMs <= 7 * 24 * 60 * 60 * 1000) return '3h'
  return '1d'
}

/**
 * Get start/end timestamps for a preset range
 */
export function getTimeRange(preset) {
  const found = TIME_PRESETS.find(p => p.value === preset)
  if (!found) return { start: '1h', end: 'now' }
  return { start: found.value, end: 'now', rangeMs: found.ms }
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return String(ts)
  }
}

/**
 * Format timestamp for short display (time only)
 */
export function formatTimeShort(ts) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  } catch {
    return String(ts)
  }
}
