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
    const tailMode = ref(false)
    const MAX_TAIL_LOGS = 5000

    const isTruncated = computed(() =>
      totalHits.value > 0 && loadedCount.value > 0 && totalHits.value > loadedCount.value
    )

    let fetchId = 0
    let histogramId = 0

    function makeLogKey(log) {
      return `${log._time || ''}|${log._msg || ''}`
    }

    function appendLogs(newEntries) {
      const existing = new Set(logs.value.map(makeLogKey))
      const seen = new Set(existing)
      const unique = newEntries.filter(l => {
        const key = makeLogKey(l)
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      let combined = [...logs.value, ...unique]
      // Ring buffer: keep last MAX_TAIL_LOGS
      if (combined.length > MAX_TAIL_LOGS) {
        combined = combined.slice(combined.length - MAX_TAIL_LOGS)
      }
      logs.value = sortLogsByTime(combined, sortOrder.value)
      loadedCount.value = logs.value.length
    }

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
        if (tailMode.value) {
          appendLogs(data)
        } else {
          logs.value = sortLogsByTime(data, sortOrder.value)
          loadedCount.value = data.length
        }
      } catch (e) {
        if (id !== fetchId) return
        if (e.cancelled) return
        error.value = e.message || 'Query failed'
        connectionError.value = classifyConnectionError(e)
        if (!tailMode.value) {
          logs.value = []
          loadedCount.value = 0
        }
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

    function setTailMode(enabled) {
      tailMode.value = enabled
      if (!enabled) {
        // exiting tail mode: clear logs so next full query starts fresh
        clearLogs()
      }
    }

    return {
      logs, loading, error, connectionError, totalHits, loadedCount, sortOrder,
      isTruncated, tailMode,
      histogramData, histogramLoading, histogramError,
      fetchLogs, fetchHistogram, clearLogs,
      setSortOrder, toggleSortOrder, setTailMode,
    }
  })
}

export const useLogStore = createLogsStore()
