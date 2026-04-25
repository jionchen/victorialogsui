export const DEFAULT_KEYWORDS = [
  'error',
  'exception',
  'fail',
  'failed',
  'fatal',
  'panic',
  'crash',
  'warn',
  'warning',
]

export function extractLogText(log) {
  if (!log || typeof log !== 'object') {
    return String(log || '')
  }

  const parts = []

  function walk(value) {
    if (typeof value === 'string') {
      parts.push(value)
    } else if (Array.isArray(value)) {
      value.forEach(walk)
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(walk)
    }
  }

  walk(log)
  return parts.join(' ')
}

export function countKeywordMatches(logs, keywords) {
  const counts = new Map()
  for (const keyword of keywords) {
    counts.set(keyword, 0)
  }

  for (const log of logs || []) {
    const text = extractLogText(log).toLowerCase()
    if (!text) continue
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        counts.set(keyword, (counts.get(keyword) || 0) + 1)
      }
    }
  }

  return Array.from(counts.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
}

export function buildKeywordStatsParams({ query, limit, start, end }) {
  const params = new URLSearchParams()
  params.set('query', query || '*')
  if (limit) params.set('limit', String(limit))
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  return params
}
