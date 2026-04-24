import { formatDateTime } from './formatters.js'

const MESSAGE_SCAN_LIMIT = 300
const DEFAULT_LOCAL_OFFSET_MINUTES = 8 * 60
const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

function normalizeMillis(raw = '') {
  if (!raw) return 0
  return Number(String(raw).slice(0, 3).padEnd(3, '0'))
}

function toIsoFromParts({
  year,
  month,
  day,
  hour,
  minute,
  second,
  millisecond = 0,
  offsetMinutes = DEFAULT_LOCAL_OFFSET_MINUTES,
}) {
  const utcMs = Date.UTC(year, month, day, hour, minute, second, millisecond) - offsetMinutes * 60 * 1000
  const date = new Date(utcMs)
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}

function parseOffsetMinutes(offset = '+0800') {
  const match = String(offset).match(/^([+-])(\d{2}):?(\d{2})$/)
  if (!match) return DEFAULT_LOCAL_OFFSET_MINUTES

  const sign = match[1] === '-' ? -1 : 1
  return sign * ((Number(match[2]) * 60) + Number(match[3]))
}

function normalizeIsoCandidate(candidate = '') {
  const normalized = String(candidate).replace(',', '.')
  const date = new Date(normalized)
  return Number.isFinite(date.getTime()) ? date.toISOString() : ''
}

function parseJavaBracketTime(scan = '') {
  const match = scan.match(/\[(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:[,.](\d{1,9}))?\]/u)
  if (!match) return ''

  return toIsoFromParts({
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    millisecond: normalizeMillis(match[7]),
  })
}

function parseNginxTime(scan = '') {
  const match = scan.match(/\[(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})\]/u)
  if (!match) return ''

  const month = MONTHS[match[2]]
  if (month === undefined) return ''

  return toIsoFromParts({
    year: Number(match[3]),
    month,
    day: Number(match[1]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6]),
    offsetMinutes: parseOffsetMinutes(match[7]),
  })
}

function parseIsoTime(scan = '') {
  const match = scan.match(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[,.]\d{1,9})?(?:Z|[+-]\d{2}:?\d{2}))\b/u)
  return match ? normalizeIsoCandidate(match[1]) : ''
}

export function extractLogMessageTime(log = {}) {
  const scan = String(log?._msg || '').slice(0, MESSAGE_SCAN_LIMIT)
  if (!scan) return ''

  return parseJavaBracketTime(scan) || parseNginxTime(scan) || parseIsoTime(scan)
}

export function getLogDisplayTimestamp(log = {}) {
  return extractLogMessageTime(log) || log?._time || ''
}

export function formatLogTimestamp(timestamp = '') {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  if (!Number.isFinite(date.getTime())) return String(timestamp)

  const formatted = formatDateTime(timestamp)
  return date.getMilliseconds() > 0 ? formatted : formatted.replace(/\.\d{3}$/u, '')
}

export function getLogTimeTitle(log = {}) {
  const messageTime = extractLogMessageTime(log)
  const collectionTime = log?._time || ''

  if (messageTime) {
    return `日志时间: ${formatLogTimestamp(messageTime)} / 采集时间: ${formatLogTimestamp(collectionTime)}`
  }

  return `采集时间: ${formatLogTimestamp(collectionTime)}`
}
