import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  setApiBaseUrl,
  getApiBaseUrl,
  getAllowedProxyTargets,
  isStrictProxyMode,
  isAllowedProxyTarget,
  normalizeProxyTarget,
} from '../api/client.js'
import {
  DEFAULTS_MIGRATION_VERSION,
  DEFAULT_PINNED_FIELDS,
  DEFAULT_RESULT_LIMIT,
  DEFAULT_TABLE_COLUMNS,
  DEFAULT_THEME,
  MAX_AUDIT_EVENTS,
  MAX_SAVED_QUERIES,
  MAX_SAVED_VIEWS,
} from '../../config/appConfig.js'
import { STORAGE_KEYS } from '../../config/storageKeys.js'
import { useStorage } from '../composables/useStorage.js'

function buildDefaultApiList() {
  const defaults = [{ name: '默认 (代理配置)', url: '' }]
  if (!isStrictProxyMode()) {
    return defaults
  }
  return defaults.concat(
    getAllowedProxyTargets().map((url) => ({
      name: new URL(url).host,
      url,
    }))
  )
}

function sanitizeApiList(items) {
  const defaults = buildDefaultApiList()
  const byUrl = new Map(defaults.map(item => [item.url, item]))

  for (const item of items || []) {
    const normalized = normalizeProxyTarget(item?.url)
    if (normalized === '' || isAllowedProxyTarget(normalized)) {
      byUrl.set(normalized, {
        name: item?.name || byUrl.get(normalized)?.name || normalized || '默认 (代理配置)',
        url: normalized,
      })
    }
  }

  return Array.from(byUrl.values())
}

function applyDefaultsMigration() {
  if (localStorage.getItem(STORAGE_KEYS.defaultsVersion) === DEFAULTS_MIGRATION_VERSION) {
    return
  }

  localStorage.setItem(STORAGE_KEYS.pinnedFields, JSON.stringify(DEFAULT_PINNED_FIELDS))
  localStorage.setItem(STORAGE_KEYS.tableColumns, JSON.stringify(DEFAULT_TABLE_COLUMNS))
  localStorage.setItem(STORAGE_KEYS.defaultsVersion, DEFAULTS_MIGRATION_VERSION)
}

export const useSettingsStore = defineStore('settings', () => {
  applyDefaultsMigration()

  const theme = useStorage(STORAGE_KEYS.theme, DEFAULT_THEME)

  function setTheme(newTheme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    if (newTheme === 'dark') {
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      document.body.removeAttribute('arco-theme')
    }
  }

  function initTheme() {
    setTheme(theme.value)
  }

  const apiBaseUrlList = ref(
    sanitizeApiList(useStorage(STORAGE_KEYS.apiUrlList, null).value)
  )
  const apiBaseUrl = ref(getApiBaseUrl())

  function saveUrlList() {
    localStorage.setItem(STORAGE_KEYS.apiUrlList, JSON.stringify(apiBaseUrlList.value))
  }

  function updateApiBaseUrl(url) {
    const normalized = normalizeProxyTarget(url)
    const safeUrl = normalized && isAllowedProxyTarget(normalized) ? normalized : ''

    apiBaseUrl.value = safeUrl
    setApiBaseUrl(safeUrl)

    if (!apiBaseUrlList.value.find(item => item.url === safeUrl)) {
      apiBaseUrlList.value.push({ name: '自定义', url: safeUrl })
      saveUrlList()
    }
  }

  function addApiBaseUrl(name, url) {
    const normalized = normalizeProxyTarget(url)
    if (!normalized || !isAllowedProxyTarget(normalized)) {
      return false
    }

    if (!apiBaseUrlList.value.find(item => item.url === normalized)) {
      apiBaseUrlList.value.push({ name, url: normalized })
      saveUrlList()
    }
    return true
  }

  function removeApiBaseUrl(url) {
    apiBaseUrlList.value = apiBaseUrlList.value.filter(item => item.url !== url)
    saveUrlList()
    if (apiBaseUrl.value === url && apiBaseUrlList.value.length > 0) {
      updateApiBaseUrl(apiBaseUrlList.value[0].url)
    }
  }

  const pinnedFields = useStorage(STORAGE_KEYS.pinnedFields, [...DEFAULT_PINNED_FIELDS])

  function setPinnedFields(fields) {
    pinnedFields.value = fields
  }

  const resultLimit = useStorage(STORAGE_KEYS.resultLimit, DEFAULT_RESULT_LIMIT, {
    serialize: String,
    deserialize: (raw) => parseInt(raw, 10),
  })

  function setResultLimit(limit) {
    resultLimit.value = limit
  }

  const tableColumns = useStorage(STORAGE_KEYS.tableColumns, [...DEFAULT_TABLE_COLUMNS])
  const auditEvents = useStorage(STORAGE_KEYS.auditEvents, [])
  const savedViews = useStorage(STORAGE_KEYS.savedViews, [])
  const savedQueries = useStorage(STORAGE_KEYS.savedQueries, [])

  function toggleTableColumn(field) {
    const idx = tableColumns.value.indexOf(field)
    if (idx > -1) {
      tableColumns.value.splice(idx, 1)
    } else {
      tableColumns.value.push(field)
    }
  }

  function resetTableColumns() {
    tableColumns.value = [...DEFAULT_TABLE_COLUMNS]
  }

  function logAuditEvent(action, summary) {
    const event = {
      id: `audit_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      action,
      summary,
      timestamp: new Date().toISOString(),
    }
    auditEvents.value = [event, ...auditEvents.value].slice(0, MAX_AUDIT_EVENTS)
  }

  function clearAuditEvents() {
    auditEvents.value = []
  }

  function upsertSavedView(view) {
    const item = {
      id: view.id || `view_${Date.now()}`,
      name: view.name,
      snapshot: view.snapshot,
      summary: view.summary || '*',
      updatedAt: new Date().toISOString(),
    }
    savedViews.value = [
      item,
      ...savedViews.value.filter(existing => existing.id !== item.id),
    ].slice(0, MAX_SAVED_VIEWS)
    logAuditEvent('保存视图', view.name)
  }

  function removeSavedView(id) {
    savedViews.value = savedViews.value.filter(item => item.id !== id)
  }

  function upsertSavedQuery(item) {
    const saved = {
      id: item.id || `query_${Date.now()}`,
      name: item.name,
      query: item.query,
      updatedAt: new Date().toISOString(),
    }
    savedQueries.value = [
      saved,
      ...savedQueries.value.filter(existing => existing.id !== saved.id),
    ].slice(0, MAX_SAVED_QUERIES)
    logAuditEvent('保存查询', item.name)
  }

  function removeSavedQuery(id) {
    savedQueries.value = savedQueries.value.filter(item => item.id !== id)
  }

  return {
    theme, setTheme, initTheme,
    apiBaseUrl, updateApiBaseUrl, apiBaseUrlList, addApiBaseUrl, removeApiBaseUrl,
    pinnedFields, setPinnedFields,
    resultLimit, setResultLimit,
    savedViews, upsertSavedView, removeSavedView,
    savedQueries, upsertSavedQuery, removeSavedQuery,
    auditEvents, logAuditEvent, clearAuditEvents,
    tableColumns, toggleTableColumn, resetTableColumns,
  }
})
