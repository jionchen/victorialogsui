import client, { axios } from './client.js'
import {
  API_LOG_QUERY_TIMEOUT_MS,
  API_STATS_QUERY_TIMEOUT_MS,
} from '../../config/proxyConfig.js'

let currentQueryController = null
let currentHitsController = null

export function parseNdjsonChunk(chunk, remainder = '') {
  const raw = `${remainder}${chunk || ''}`
  const lines = raw.split('\n')
  const nextRemainder = lines.pop() || ''
  const items = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return { _msg: line }
      }
    })

  return { items, remainder: nextRemainder }
}

/**
 * Query logs
 * API: /select/logsql/query
 */
export async function queryLogs({ query, limit = 100, start, end }) {
  // Cancel previous query
  if (currentQueryController) {
    currentQueryController.abort()
  }
  currentQueryController = new AbortController()

  const params = new URLSearchParams()
  params.set('query', query)
  if (limit) params.set('limit', String(limit))
  if (start) params.set('start', start)
  if (end) params.set('end', end)

  const response = await client.post('/select/logsql/query', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: currentQueryController.signal,
    transformResponse: [(data) => data], // keep raw
    timeout: API_LOG_QUERY_TIMEOUT_MS,
  })

  const { items, remainder } = parseNdjsonChunk(response.data, '')
  if (remainder.trim()) {
    items.push({ _msg: remainder.trim() })
  }
  return items
}

/**
 * Query hits stats (histogram)
 * API: /select/logsql/hits
 */
export async function queryHits({ query, start, end, step, field }) {
  // Cancel previous histogram request
  if (currentHitsController) {
    currentHitsController.abort()
  }
  currentHitsController = new AbortController()

  const params = new URLSearchParams()
  params.set('query', query)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (step) params.set('step', step)
  if (field) params.set('field', field)

  const response = await client.post('/select/logsql/hits', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal: currentHitsController.signal,
    timeout: API_STATS_QUERY_TIMEOUT_MS,
  })
  return response.data
}

/**
 * Query facets
 * API: /select/logsql/facets
 */
export async function queryFacets({ query, start, end, limit = 10, maxValuesPerField = 20 }) {
  const params = new URLSearchParams()
  params.set('query', query)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (limit) params.set('limit', String(limit))
  if (maxValuesPerField) params.set('max_values_per_field', String(maxValuesPerField))
  params.set('max_value_len', '200')

  const response = await client.post('/select/logsql/facets', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data
}

/**
 * Query stats aggregation
 * API: /select/logsql/query (with stats by clause)
 */
export async function queryStats({ query, start, end }, signal) {
  const params = new URLSearchParams()
  params.set('query', query)
  if (start) params.set('start', start)
  if (end) params.set('end', end)

  const response = await client.post('/select/logsql/query', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    signal,
    transformResponse: [(data) => data],
    timeout: API_STATS_QUERY_TIMEOUT_MS,
  })

  const { items } = parseNdjsonChunk(response.data, '')
  return items
}

export default { queryLogs, queryHits, queryFacets, queryStats }
