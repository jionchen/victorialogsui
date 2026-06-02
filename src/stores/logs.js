import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { queryLogs, queryHits } from '../api/logs.js'
import { getApiBaseUrl } from '../api/client.js'
import { classifyConnectionError } from '../utils/connectionStatus.js'
import { getLogDisplayTimestamp } from '../utils/logTime.js'
import { logger } from '../utils/logger.js'

export function sortLogsByTime(entries = [], order = 'desc') {
  const direction = order === 'asc' ? 1 : -1

  return [...entries]
    .map((log, index) => ({
      log,
      index,
      time: new Date(getLogDisplayTimestamp(log)).getTime(),
    }))
    .sort((a, b) => {
      const aValid = Number.isFinite(a.time)
      const bValid = Number.isFinite(b.time)

      if (aValid && bValid && a.time !== b.time) {
        return (a.time - b.time) * direction
      }

      if (aValid !== bValid) {
        return aValid ? -1 : 1
      }

      return a.index - b.index
    })
    .map(entry => entry.log)
}

export function createLogsStore(deps = {}) {
  const {
    queryLogs: queryLogsImpl = queryLogs,
    queryHits: queryHitsImpl = queryHits,
    getApiBaseUrl: getApiBaseUrlImpl = getApiBaseUrl,
  } = deps

  return defineStore('logs', () => {
    const logs = ref([])
    const loading = ref(false)
    const error = ref(null)
    const connectionError = ref(null)
    const totalHits = ref(0)
    const loadedCount = ref(0)
    const sortOrder = ref('desc')

    const histogramData = ref(null)
    const histogramLoading = ref(false)
    const histogramError = ref(null)

    const isTruncated = computed(() =>
      totalHits.value > 0 && loadedCount.value > 0 && totalHits.value > loadedCount.value
    )

    let fetchId = 0
    let histogramId = 0

    async function fetchLogs({ query, limit, start, end }) {
      const id = ++fetchId
      loading.value = true
      error.value = null
      connectionError.value = null
      try {
        const targetUrl = getApiBaseUrlImpl()
        const data = await queryLogsImpl({ query, limit, start, end })

        if (id !== fetchId) return

        logger.debug(`[fetchLogs] id=${id}, target=${targetUrl}, results=${data.length}`)
        logs.value = sortLogsByTime(data, sortOrder.value)
        loadedCount.value = data.length
      } catch (e) {
        if (id !== fetchId) return
        if (e.cancelled) return
        error.value = e.message || 'Query failed'
        connectionError.value = classifyConnectionError(e)
        logs.value = []
        loadedCount.value = 0
      } finally {
        if (id === fetchId) {
          loading.value = false
        }
      }
    }

    async function fetchHistogram({ query, start, end, step, field }) {
      const id = ++histogramId
      histogramLoading.value = true
      histogramError.value = null
      try {
        const data = await queryHitsImpl({ query, start, end, step, field })

        if (id !== histogramId) return

        histogramData.value = data
        if (data?.hits) {
          totalHits.value = data.hits.reduce((sum, h) => sum + (h.total || 0), 0)
        }
      } catch (e) {
        if (id !== histogramId) return
        if (e.cancelled) return
        histogramData.value = null
        histogramError.value = e.message || '统计加载失败'
      } finally {
        if (id === histogramId) {
          histogramLoading.value = false
        }
      }
    }

    function clearLogs() {
      logs.value = []
      totalHits.value = 0
      loadedCount.value = 0
      error.value = null
      connectionError.value = null
      histogramData.value = null
      histogramError.value = null
    }

    function setSortOrder(order) {
      if (order !== 'asc' && order !== 'desc') return
      sortOrder.value = order
      logs.value = sortLogsByTime(logs.value, sortOrder.value)
    }

    function toggleSortOrder() {
      setSortOrder(sortOrder.value === 'desc' ? 'asc' : 'desc')
    }

    return {
      logs, loading, error, connectionError, totalHits, loadedCount, sortOrder,
      isTruncated,
      histogramData, histogramLoading, histogramError,
      fetchLogs, fetchHistogram, clearLogs,
      setSortOrder, toggleSortOrder,
    }
  })
}

export const useLogStore = createLogsStore()
