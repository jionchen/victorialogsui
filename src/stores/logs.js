import { defineStore } from 'pinia'
import { ref } from 'vue'
import { queryLogs, queryHits } from '../api/logs.js'
import { getApiBaseUrl } from '../api/client.js'

export const useLogStore = defineStore('logs', () => {
  // Logs data
  const logs = ref([])
  const loading = ref(false)
  const error = ref(null)
  const totalHits = ref(0)

  // Histogram data
  const histogramData = ref(null)
  const histogramLoading = ref(false)

  // Track latest request to avoid race conditions
  let fetchId = 0
  let histogramId = 0

  /**
   * Fetch logs
   */
  async function fetchLogs({ query, limit, start, end }) {
    const id = ++fetchId
    loading.value = true
    error.value = null
    try {
      const targetUrl = getApiBaseUrl()
      const data = await queryLogs({ query, limit, start, end })
      
      // If a newer request has started, ignore this one
      if (id !== fetchId) return

      console.log(`[fetchLogs] id=${id}, target=${targetUrl}, results=${data.length}`)
      logs.value = data
      totalHits.value = data.length
    } catch (e) {
      if (id !== fetchId) return
      if (e.cancelled) return
      error.value = e.message || 'Query failed'
      logs.value = []
      totalHits.value = 0
    } finally {
      if (id === fetchId) {
        loading.value = false
      }
    }
  }

  /**
   * Fetch histogram data
   */
  async function fetchHistogram({ query, start, end, step, field }) {
    const id = ++histogramId
    histogramLoading.value = true
    try {
      const data = await queryHits({ query, start, end, step, field })
      
      if (id !== histogramId) return

      histogramData.value = data
      // Calculate total from histogram
      if (data?.hits) {
        totalHits.value = data.hits.reduce((sum, h) => sum + (h.total || 0), 0)
      }
    } catch (e) {
      if (id !== histogramId) return
      if (e.cancelled) return
      histogramData.value = null
    } finally {
      if (id === histogramId) {
        histogramLoading.value = false
      }
    }
  }

  function clearLogs() {
    logs.value = []
    totalHits.value = 0
    histogramData.value = null
  }

  return {
    logs, loading, error, totalHits,
    histogramData, histogramLoading,
    fetchLogs, fetchHistogram, clearLogs,
  }
})
