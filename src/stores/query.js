import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { buildLogsQL, isLogsQLSyntax } from '../utils/queryBuilder.js'
import { getTimeRange, calculateStep } from '../utils/timeUtils.js'
import { DEFAULT_TIME_PRESET, MAX_QUERY_HISTORY } from '../../config/appConfig.js'
import { STORAGE_KEYS } from '../../config/storageKeys.js'

export const useQueryStore = defineStore('query', () => {
  // Time range
  const timePreset = ref(DEFAULT_TIME_PRESET)
  const customStart = ref('')
  const customEnd = ref('')

  const timeRange = computed(() => {
    if (customStart.value && customEnd.value) {
      const ms = new Date(customEnd.value).getTime() - new Date(customStart.value).getTime()
      return { start: customStart.value, end: customEnd.value, rangeMs: ms }
    }
    return getTimeRange(timePreset.value)
  })

  const histogramStep = computed(() => calculateStep(timeRange.value.rangeMs))

  function setTimePreset(preset) {
    timePreset.value = preset
    customStart.value = ''
    customEnd.value = ''
  }

  function setCustomTime(start, end) {
    customStart.value = start
    customEnd.value = end
    timePreset.value = ''
  }

  // Filters
  // Each filter: { id, field, values: [], type: 'stream'|'log', negated: boolean, disabled: boolean }
  const filters = ref([])
  let nextFilterId = 1

  function addFilter(field, value, type = 'log', negated = false) {
    const existing = filters.value.find(f => f.field === field && f.negated === negated && !f.disabled)
    if (existing) {
      if (!existing.values.includes(value)) {
        existing.values.push(value)
      }
    } else {
      filters.value.push({
        id: nextFilterId++,
        field,
        values: [value],
        type,
        negated,
        disabled: false,
      })
    }
  }

  function removeFilter(id) {
    filters.value = filters.value.filter(f => f.id !== id)
  }

  function removeFilterValue(id, value) {
    const f = filters.value.find(f => f.id === id)
    if (f) {
      f.values = f.values.filter(v => v !== value)
      if (f.values.length === 0) {
        removeFilter(id)
      }
    }
  }

  function toggleFilterDisabled(id) {
    const f = filters.value.find(f => f.id === id)
    if (f) f.disabled = !f.disabled
  }

  function toggleFilterNegated(id) {
    const f = filters.value.find(f => f.id === id)
    if (f) f.negated = !f.negated
  }

  function clearAllFilters() {
    filters.value = []
  }

  // Free text query (user typed LogsQL)
  const freeTextQuery = ref('')

  // Built LogsQL (computed from filters + freeText)
  const logsQL = computed(() => {
    return buildLogsQL(filters.value, freeTextQuery.value)
  })

  // Manual override: if user directly edits the query box
  const manualQuery = ref('')
  const manualDraft = ref('')
  const isManualMode = ref(false)

  const effectiveQuery = computed(() => {
    const raw = isManualMode.value ? manualQuery.value : logsQL.value
    if (!raw || !raw.trim()) return '*'
    const text = raw.trim()
    // 如果是纯文本 (没有 LogsQL 语法)，自动转为子串匹配
    if (!isLogsQLSyntax(text)) {
      const escaped = text.replace(/"/g, '\\"')
      return `_msg:~"${escaped}"`
    }
    return text
  })

  function setManualQuery(q) {
    manualQuery.value = q
    manualDraft.value = q
    isManualMode.value = true
  }

  function updateManualDraft(q) {
    manualDraft.value = q
  }

  function submitQueryDraft() {
    const draft = manualDraft.value.trim()
    const built = logsQL.value.trim()

    if (!draft || draft === built) {
      manualQuery.value = ''
      manualDraft.value = ''
      isManualMode.value = false
      return
    }

    manualQuery.value = draft
    manualDraft.value = draft
    isManualMode.value = true
  }

  function exitManualMode() {
    isManualMode.value = false
    manualQuery.value = ''
    manualDraft.value = ''
  }

  // Auto-refresh
  const autoRefreshInterval = ref(0) // 0 = off, otherwise ms

  function setAutoRefresh(intervalMs) {
    autoRefreshInterval.value = intervalMs
  }

  // Query version (increments to trigger re-fetch)
  const queryVersion = ref(0)
  
  // Query History
  const queryHistory = ref(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.queryHistory) || '[]')
  )

  function addQueryToHistory(q) {
    if (!q || q.trim() === '' || q.trim() === '*') return
    let history = [...queryHistory.value]
    // Remove if already exists to put it at the top
    history = history.filter(item => item !== q)
    history.unshift(q)
    // Keep max 20
    if (history.length > MAX_QUERY_HISTORY) {
      history = history.slice(0, MAX_QUERY_HISTORY)
    }
    queryHistory.value = history
    localStorage.setItem(STORAGE_KEYS.queryHistory, JSON.stringify(history))
  }

  function clearQueryHistory() {
    queryHistory.value = []
    localStorage.removeItem(STORAGE_KEYS.queryHistory)
  }

  function executeQuery() {
    queryVersion.value++
    addQueryToHistory(effectiveQuery.value)
  }

  function createSnapshot() {
    return {
      tp: timePreset.value,
      cs: customStart.value,
      ce: customEnd.value,
      f: JSON.parse(JSON.stringify(filters.value)),
      ft: freeTextQuery.value,
      m: isManualMode.value,
      mq: manualQuery.value,
    }
  }

  function applySnapshot(state = {}) {
    if (state.tp !== undefined) timePreset.value = state.tp
    if (state.cs !== undefined) customStart.value = state.cs
    if (state.ce !== undefined) customEnd.value = state.ce
    if (state.f !== undefined) {
      filters.value = state.f
      const maxId = Math.max(0, ...state.f.map(x => x.id))
      nextFilterId = maxId + 1
    }
    if (state.ft !== undefined) freeTextQuery.value = state.ft
    if (state.m !== undefined) isManualMode.value = state.m
    if (state.mq !== undefined) {
      manualQuery.value = state.mq
      manualDraft.value = state.mq
    }
  }

  // URL State persistence
  function getUrlState() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(createSnapshot()))))
  }

  function loadUrlState(base64Str) {
    try {
      const state = JSON.parse(decodeURIComponent(escape(atob(base64Str))))
      applySnapshot(state)
    } catch (e) {
      console.error('Failed to parse URL state', e)
    }
  }

  return {
    timePreset, customStart, customEnd, timeRange, histogramStep,
    setTimePreset, setCustomTime,
    filters, addFilter, removeFilter, removeFilterValue,
    toggleFilterDisabled, toggleFilterNegated, clearAllFilters,
    freeTextQuery, logsQL,
    manualQuery, manualDraft, isManualMode, effectiveQuery,
    setManualQuery, updateManualDraft, submitQueryDraft, exitManualMode,
    autoRefreshInterval, setAutoRefresh,
    queryVersion, executeQuery,
    createSnapshot, applySnapshot, getUrlState, loadUrlState,
    queryHistory, addQueryToHistory, clearQueryHistory,
  }
})
