import client from './client.js'
import { API_FIELD_QUERY_TIMEOUT_MS } from '../../config/proxyConfig.js'

/**
 * Get field names
 * API: /select/logsql/field_names
 */
export async function getFieldNames({ query = '*', start, end, filter } = {}) {
  const params = new URLSearchParams()
  params.set('query', query)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (filter) params.set('filter', filter)

  const response = await client.post('/select/logsql/field_names', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: API_FIELD_QUERY_TIMEOUT_MS,
  })
  return response.data?.values || []
}

/**
 * Get field values
 * API: /select/logsql/field_values
 */
export async function getFieldValues({ query = '*', field, start, end, filter, limit = 30 } = {}) {
  const params = new URLSearchParams()
  params.set('query', query)
  params.set('field', field)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (filter) params.set('filter', filter)
  if (limit) params.set('limit', String(limit))

  const response = await client.post('/select/logsql/field_values', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: API_FIELD_QUERY_TIMEOUT_MS,
  })
  return response.data?.values || []
}

/**
 * Get stream field names
 * API: /select/logsql/stream_field_names
 */
export async function getStreamFieldNames({ query = '*', start, end, filter } = {}) {
  const params = new URLSearchParams()
  params.set('query', query)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (filter) params.set('filter', filter)

  const response = await client.post('/select/logsql/stream_field_names', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: API_FIELD_QUERY_TIMEOUT_MS,
  })
  return response.data?.values || []
}

/**
 * Get stream field values
 * API: /select/logsql/stream_field_values
 */
export async function getStreamFieldValues({ query = '*', field, start, end, filter, limit = 30 } = {}) {
  const params = new URLSearchParams()
  params.set('query', query)
  params.set('field', field)
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (filter) params.set('filter', filter)
  if (limit) params.set('limit', String(limit))

  const response = await client.post('/select/logsql/stream_field_values', params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: API_FIELD_QUERY_TIMEOUT_MS,
  })
  return response.data?.values || []
}

export default { getFieldNames, getFieldValues, getStreamFieldNames, getStreamFieldValues }
