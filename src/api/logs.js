import client, { axios } from './client.js'

let currentQueryController = null
let currentHitsController = null

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
    timeout: 120000, // 120s for large queries
  })

  // VictoriaLogs returns NDJSON (newline-delimited JSON)
  const lines = response.data.trim().split('\n').filter(Boolean)
  return lines.map((line) => {
    try {
      return JSON.parse(line)
    } catch {
      return { _msg: line }
    }
  })
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

export default { queryLogs, queryHits, queryFacets }
