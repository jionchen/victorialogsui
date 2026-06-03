/**
 * Time utility functions
 */

import { TIME_PRESETS } from '../../config/uiConfig.js'

export { TIME_PRESETS }

export const DEFAULT_TIMEZONE_OFFSET = -480 // minutes; -480 = UTC+8 (China)

let configuredTimezoneOffset = DEFAULT_TIMEZONE_OFFSET

export function setTimezoneOffset(minutes) {
  configuredTimezoneOffset = minutes
}

export function getTimezoneOffset() {
  return configuredTimezoneOffset
}

/**
 * Apply a timezone offset (in minutes) to a Date object.
 * Returns a new Date that represents the same instant but with
 * the target offset applied for display purposes.
 */
function applyTimezoneOffset(d, offsetMinutes = configuredTimezoneOffset) {
  const localOffset = d.getTimezoneOffset()
  const delta = (localOffset - offsetMinutes) * 60000
  return new Date(d.getTime() + delta)
}

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
    const adjusted = applyTimezoneOffset(d)
    const pad = (n) => String(n).padStart(2, '0')
    return `${adjusted.getFullYear()}-${pad(adjusted.getMonth() + 1)}-${pad(adjusted.getDate())} ${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}:${pad(adjusted.getSeconds())}`
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
    const adjusted = applyTimezoneOffset(d)
    const pad = (n) => String(n).padStart(2, '0')
    return `${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}:${pad(adjusted.getSeconds())}`
  } catch {
    return String(ts)
  }
}

/**
 * Format timestamp with an explicit timezone offset (in minutes).
 * Useful for testing or one-off formatting with a different offset.
 */
export function formatTimestampUtc(ts, offsetMinutes = configuredTimezoneOffset) {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const adjusted = applyTimezoneOffset(d, offsetMinutes)
    const pad = (n) => String(n).padStart(2, '0')
    return `${adjusted.getFullYear()}-${pad(adjusted.getMonth() + 1)}-${pad(adjusted.getDate())} ${pad(adjusted.getHours())}:${pad(adjusted.getMinutes())}:${pad(adjusted.getSeconds())}`
  } catch {
    return String(ts)
  }
}
