import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getFieldNames, getFieldValues, getStreamFieldNames, getStreamFieldValues } from '../api/fields.js'
import { queryFacets } from '../api/logs.js'
import { logger } from '../utils/logger.js'

const FIELD_VALUE_RETRY_ATTEMPTS = 1

function createEmptyFieldValueState(overrides = {}) {
  return {
    values: [],
    loading: false,
    total: 0,
    countsKnown: false,
    status: 'idle',
    error: null,
    ...overrides,
  }
}

function createFieldValueCacheKey({ field, isStream = false, query = '*', start = '', end = '', filter = '' }) {
  return JSON.stringify([field, isStream ? 'stream' : 'log', query || '*', start || '', end || '', filter || ''])
}

function createFieldValueBaseKey({ field, isStream = false, query = '*', start = '', end = '' }) {
  return JSON.stringify([field, isStream ? 'stream' : 'log', query || '*', start || '', end || ''])
}

function cloneValues(values = []) {
  return values.map(item => ({ ...item }))
}

export function createFieldsStore(fetchers = {
  getFieldNames,
  getFieldValues,
  getStreamFieldNames,
  getStreamFieldValues,
  queryFacets,
}) {
  return defineStore('fields', () => {
    const streamFieldNames = ref([])
    const logFieldNames = ref([])
    const loading = ref(false)
    const error = ref(null)
    const fieldValuesCache = ref({})
    const namesVersion = ref(0)

    let namesFetchId = 0
    const valuesFetchIds = {}
    const lastSuccessfulValuesByBaseKey = {}

    async function loadFieldNames({ query, start, end }) {
      const id = ++namesFetchId
      loading.value = true
      error.value = null
      try {
        let streams = []
        try {
          streams = await fetchers.getStreamFieldNames({ query, start, end })
        } catch (e) {
          logger.warn('Failed to load stream field names; continuing with log fields only:', e)
        }

        if (id !== namesFetchId) return

        const fields = await fetchers.getFieldNames({ query, start, end })

        if (id !== namesFetchId) return

        streamFieldNames.value = streams.sort((a, b) => b.hits - a.hits)

        const streamNames = new Set(streams.map(s => s.value))
        const internalFields = new Set(['_msg', '_time', '_stream', '_stream_id'])
        logFieldNames.value = fields
          .filter(f => !streamNames.has(f.value) && !internalFields.has(f.value))
          .sort((a, b) => b.hits - a.hits)
        namesVersion.value += 1
      } catch (e) {
        if (id !== namesFetchId || e.cancelled) return
        error.value = e.message || 'Failed to load fields'
        logger.error('Failed to load field names:', e)
      } finally {
        if (id === namesFetchId) {
          loading.value = false
        }
      }
    }

    async function loadFieldValues({ field, isStream, query, start, end, filter }) {
      const request = { field, isStream, query, start, end, filter }
      const key = createFieldValueCacheKey(request)
      const baseKey = createFieldValueBaseKey(request)
      const id = (valuesFetchIds[key] || 0) + 1
      valuesFetchIds[key] = id

      const fallback = fieldValuesCache.value[key] || lastSuccessfulValuesByBaseKey[baseKey]
      if (!fieldValuesCache.value[key]) {
        fieldValuesCache.value[key] = createEmptyFieldValueState(
          fallback ? {
            values: cloneValues(fallback.values),
            total: fallback.total,
            status: fallback.status === 'idle' ? 'idle' : 'success',
          } : {}
        )
      }

      const cache = fieldValuesCache.value[key]
      cache.loading = true
      cache.error = null
      if (cache.values.length === 0) {
        cache.status = 'loading'
      }

      try {
        const valuesFetcher = isStream ? fetchers.getStreamFieldValues : fetchers.getFieldValues

        for (let attempt = 0; attempt <= FIELD_VALUE_RETRY_ATTEMPTS; attempt += 1) {
          try {
            const values = await valuesFetcher({ query, field, start, end, filter, limit: 30 })

            if (id !== valuesFetchIds[key]) return

            const normalizedValues = cloneValues(values)
            // D35: 不再在缺少逐值计数时按总数均摊伪造等长 hits（会画出虚假的等长分布条）。
            // 保留真实 hits（无则为 0），用 countsKnown 标注该字段是否有真实逐值计数。
            const countsKnown = normalizedValues.some(v => v.hits > 0)

            cache.values = normalizedValues.sort((a, b) => b.hits - a.hits)
            cache.total = cache.values.reduce((sum, v) => sum + (v.hits || 0), 0)
            cache.countsKnown = countsKnown
            cache.status = 'success'
            cache.error = null
            lastSuccessfulValuesByBaseKey[baseKey] = {
              values: cloneValues(cache.values),
              total: cache.total,
              status: 'success',
            }
            return
          } catch (e) {
            if (id !== valuesFetchIds[key]) return
            if (e.cancelled) return
            if (attempt === FIELD_VALUE_RETRY_ATTEMPTS) {
              throw e
            }
          }
        }
      } catch (e) {
        if (id !== valuesFetchIds[key] || e.cancelled) return
        cache.status = 'error'
        cache.error = e.message || '加载失败'
        logger.error(`Failed to load values for ${field}:`, e)
      } finally {
        if (id === valuesFetchIds[key]) {
          cache.loading = false
        }
      }
    }

    async function loadFacets({ query, start, end }) {
      let response
      try {
        response = await fetchers.queryFacets({ query, start, end, maxValuesPerField: 30 })
      } catch (e) {
        if (e?.cancelled) return
        logger.error('Failed to load facets:', e)
        throw e
      }

      // Defensive: facets shape may vary across backend versions. Tolerate both
      // `{ facets: [...] }` and a bare array; bail silently on anything else so
      // the per-field loadFieldValues fallback still works.
      const facets = Array.isArray(response)
        ? response
        : Array.isArray(response?.facets)
          ? response.facets
          : null
      if (!facets) {
        logger.debug('loadFacets: unparseable facets response, skipping cache write')
        return
      }

      const streamNames = new Set(streamFieldNames.value.map(s => s.value))

      for (const entry of facets) {
        if (!entry) continue
        const field = entry.field_name
        if (!field) continue

        // VictoriaLogs /select/logsql/facets uses `field_values`; tolerate the
        // `values` spelling and `value`/`field_value` entry keys across versions.
        const rawValues = Array.isArray(entry.field_values)
          ? entry.field_values
          : Array.isArray(entry.values)
            ? entry.values
            : []
        const values = rawValues
          .map(v => ({ value: v?.field_value != null ? v.field_value : v?.value, hits: Number(v?.hits) || 0 }))
          .filter(v => v.value != null)
          .sort((a, b) => b.hits - a.hits)

        const isStream = streamNames.has(field)
        const request = { field, isStream, query, start, end, filter: '' }
        const key = createFieldValueCacheKey(request)
        const baseKey = createFieldValueBaseKey(request)
        const total = values.reduce((sum, v) => sum + (v.hits || 0), 0)

        fieldValuesCache.value[key] = createEmptyFieldValueState({
          values,
          total,
          countsKnown: true,
          status: 'success',
          loading: false,
          error: null,
        })
        lastSuccessfulValuesByBaseKey[baseKey] = {
          values: cloneValues(values),
          total,
          status: 'success',
        }
      }
    }

    function clearCache() {
      fieldValuesCache.value = {}
      for (const key of Object.keys(lastSuccessfulValuesByBaseKey)) {
        delete lastSuccessfulValuesByBaseKey[key]
      }
    }

    function getCachedValues(input) {
      if (typeof input === 'string') {
        return Object.values(fieldValuesCache.value).find(item => item?.field === input) || createEmptyFieldValueState()
      }

      const key = createFieldValueCacheKey(input)
      return fieldValuesCache.value[key] || createEmptyFieldValueState()
    }

    return {
      streamFieldNames,
      logFieldNames,
      loading,
      error,
      namesVersion,
      fieldValuesCache,
      loadFieldNames,
      loadFieldValues,
      loadFacets,
      clearCache,
      getCachedValues,
    }
  })
}

export const useFieldStore = createFieldsStore()
