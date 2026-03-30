/**
 * Time utility functions
 */

import { TIME_PRESETS } from '../../config/uiConfig.js'

export { TIME_PRESETS }

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
