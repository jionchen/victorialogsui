import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getFieldNames, getFieldValues, getStreamFieldNames, getStreamFieldValues } from '../api/fields.js'

export const useFieldStore = defineStore('fields', () => {
  // All field names: [{value, hits}]
  const streamFieldNames = ref([])
  const logFieldNames = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Field values cache: { fieldName: { values: [{value, hits}], loading, total } }
  const fieldValuesCache = ref({})

  // Track latest request to avoid race conditions
  let namesFetchId = 0
  const valuesFetchIds = {}

  /**
   * Load all field names for current query/time
   */
  async function loadFieldNames({ query, start, end }) {
    const id = ++namesFetchId
    loading.value = true
    error.value = null
    try {
      // Try to load stream fields, but gracefully handle empty results
      let streams = []
      try {
        streams = await getStreamFieldNames({ query, start, end })
      } catch { /* ignore */ }

      if (id !== namesFetchId) return

      const fields = await getFieldNames({ query, start, end })
      
      if (id !== namesFetchId) return

      streamFieldNames.value = streams.sort((a, b) => b.hits - a.hits)
      
      // Exclude stream fields and internal fields from log fields list
      const streamNames = new Set(streams.map(s => s.value))
      const internalFields = new Set(['_msg', '_time', '_stream', '_stream_id'])
      logFieldNames.value = fields
        .filter(f => !streamNames.has(f.value) && !internalFields.has(f.value))
        .sort((a, b) => b.hits - a.hits)
    } catch (e) {
      if (id !== namesFetchId) return
      if (e.cancelled) return
      error.value = e.message || 'Failed to load fields'
      console.error('Failed to load field names:', e)
    } finally {
      if (id === namesFetchId) {
        loading.value = false
      }
    }
  }

  /**
   * Load values for a specific field
   */
  async function loadFieldValues({ field, isStream, query, start, end, filter }) {
    const id = (valuesFetchIds[field] || 0) + 1
    valuesFetchIds[field] = id

    const key = field
    if (!fieldValuesCache.value[key]) {
      fieldValuesCache.value[key] = { values: [], loading: false, total: 0 }
    }
    const cache = fieldValuesCache.value[key]
    cache.loading = true

    try {
      const valuesFetcher = isStream ? getStreamFieldValues : getFieldValues
      const values = await valuesFetcher({ query, field, start, end, filter, limit: 30 })
      
      if (id !== valuesFetchIds[field]) return

      // field_values API may return hits=0; show values regardless
      const fieldInfo = logFieldNames.value.find(f => f.value === field)
      const totalHits = fieldInfo?.hits || 0
      
      const hasHits = values.some(v => v.hits > 0)
      if (!hasHits && values.length > 0 && totalHits > 0) {
        const perValue = Math.floor(totalHits / values.length)
        values.forEach(v => { v.hits = perValue })
      }
      
      cache.values = values.sort((a, b) => b.hits - a.hits)
      cache.total = values.reduce((sum, v) => sum + (v.hits || 0), 0)
    } catch (e) {
      if (id !== valuesFetchIds[field]) return
      if (e.cancelled) return
      console.error(`Failed to load values for ${field}:`, e)
    } finally {
      if (id === valuesFetchIds[field]) {
        cache.loading = false
      }
    }
  }

  /**
   * Clear field values cache
   */
  function clearCache() {
    fieldValuesCache.value = {}
  }

  /**
   * Get cached values for a field
   */
  function getCachedValues(field) {
    return fieldValuesCache.value[field] || { values: [], loading: false, total: 0 }
  }

  return {
    streamFieldNames, logFieldNames, loading, error,
    fieldValuesCache,
    loadFieldNames, loadFieldValues,
    clearCache, getCachedValues,
  }
})
