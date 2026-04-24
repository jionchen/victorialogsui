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
  DEFAULT_SECURITY_ROLE,
  DEFAULT_REDACTION_ENABLED,
  DEFAULT_TABLE_COLUMNS,
  DEFAULT_THEME,
  MAX_AUDIT_EVENTS,
  MAX_SAVED_QUERIES,
  MAX_SAVED_VIEWS,
} from '../../config/appConfig.js'
import { STORAGE_KEYS } from '../../config/storageKeys.js'

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

  const theme = ref(localStorage.getItem(STORAGE_KEYS.theme) || DEFAULT_THEME)
  
  function setTheme(newTheme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    if (newTheme === 'dark') {
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      document.body.removeAttribute('arco-theme')
    }
    localStorage.setItem(STORAGE_KEYS.theme, newTheme)
  }

  function initTheme() {
    setTheme(theme.value)
  }

  const apiBaseUrlList = ref(
    sanitizeApiList(JSON.parse(localStorage.getItem(STORAGE_KEYS.apiUrlList) || 'null'))
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

  const pinnedFields = ref(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.pinnedFields) || 'null') || [...DEFAULT_PINNED_FIELDS]
  )

  function setPinnedFields(fields) {
    pinnedFields.value = fields
    localStorage.setItem(STORAGE_KEYS.pinnedFields, JSON.stringify(fields))
  }

  const resultLimit = ref(
    parseInt(localStorage.getItem(STORAGE_KEYS.resultLimit) || String(DEFAULT_RESULT_LIMIT), 10)
  )

  function setResultLimit(limit) {
    resultLimit.value = limit
    localStorage.setItem(STORAGE_KEYS.resultLimit, String(limit))
  }

  const tableColumns = ref(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.tableColumns) || 'null') || [...DEFAULT_TABLE_COLUMNS]
  )
  const securityRole = ref(localStorage.getItem(STORAGE_KEYS.securityRole) || DEFAULT_SECURITY_ROLE)
  const redactionEnabled = ref(localStorage.getItem(STORAGE_KEYS.redactionEnabled) !== 'false' ? DEFAULT_REDACTION_ENABLED : false)
  const auditEvents = ref(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.auditEvents) || '[]')
  )

  const savedViews = ref(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.savedViews) || '[]')
  )
  const savedQueries = ref(
    JSON.parse(localStorage.getItem(STORAGE_KEYS.savedQueries) || '[]')
  )

  function toggleTableColumn(field) {
    const idx = tableColumns.value.indexOf(field)
    if (idx > -1) {
      tableColumns.value.splice(idx, 1)
    } else {
      tableColumns.value.push(field)
    }
    localStorage.setItem(STORAGE_KEYS.tableColumns, JSON.stringify(tableColumns.value))
  }

  function resetTableColumns() {
    tableColumns.value = [...DEFAULT_TABLE_COLUMNS]
    localStorage.setItem(STORAGE_KEYS.tableColumns, JSON.stringify(tableColumns.value))
  }

  function setSecurityRole(role) {
    securityRole.value = role
    localStorage.setItem(STORAGE_KEYS.securityRole, role)
  }

  function setRedactionEnabled(value) {
    redactionEnabled.value = value
    localStorage.setItem(STORAGE_KEYS.redactionEnabled, String(value))
  }

  function logAuditEvent(action, summary) {
    const event = {
      id: `audit_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      action,
      summary,
      timestamp: new Date().toISOString(),
    }
    auditEvents.value = [event, ...auditEvents.value].slice(0, MAX_AUDIT_EVENTS)
    localStorage.setItem(STORAGE_KEYS.auditEvents, JSON.stringify(auditEvents.value))
  }

  function clearAuditEvents() {
    auditEvents.value = []
    localStorage.setItem(STORAGE_KEYS.auditEvents, JSON.stringify(auditEvents.value))
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
    localStorage.setItem(STORAGE_KEYS.savedViews, JSON.stringify(savedViews.value))
    logAuditEvent('保存视图', view.name)
  }

  function removeSavedView(id) {
    savedViews.value = savedViews.value.filter(item => item.id !== id)
    localStorage.setItem(STORAGE_KEYS.savedViews, JSON.stringify(savedViews.value))
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
    localStorage.setItem(STORAGE_KEYS.savedQueries, JSON.stringify(savedQueries.value))
    logAuditEvent('保存查询', item.name)
  }

  function removeSavedQuery(id) {
    savedQueries.value = savedQueries.value.filter(item => item.id !== id)
    localStorage.setItem(STORAGE_KEYS.savedQueries, JSON.stringify(savedQueries.value))
  }

  return {
    theme, setTheme, initTheme,
    apiBaseUrl, updateApiBaseUrl, apiBaseUrlList, addApiBaseUrl, removeApiBaseUrl,


    pinnedFields, setPinnedFields,
    resultLimit, setResultLimit,
    savedViews, upsertSavedView, removeSavedView,
    savedQueries, upsertSavedQuery, removeSavedQuery,
    securityRole, setSecurityRole,
    redactionEnabled, setRedactionEnabled,
    auditEvents, logAuditEvent, clearAuditEvents,
    tableColumns, toggleTableColumn, resetTableColumns,
  }
})
