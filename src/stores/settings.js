import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  setApiBaseUrl,
  getApiBaseUrl,
  getAllowedProxyTargets,
  isAllowedProxyTarget,
  normalizeProxyTarget,
} from '../api/client.js'

function buildDefaultApiList() {
  return [
    { name: '默认 (代理配置)', url: '' },
    ...getAllowedProxyTargets().map((url) => ({
      name: new URL(url).host,
      url,
    })),
  ]
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

export const useSettingsStore = defineStore('settings', () => {
  const theme = ref(localStorage.getItem('vlogs_theme') || 'dark')
  
  function setTheme(newTheme) {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    if (newTheme === 'dark') {
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      document.body.removeAttribute('arco-theme')
    }
    localStorage.setItem('vlogs_theme', newTheme)
  }

  function initTheme() {
    setTheme(theme.value)
  }

  const apiBaseUrlList = ref(
    sanitizeApiList(JSON.parse(localStorage.getItem('vlogs_api_url_list') || 'null'))
  )
  const apiBaseUrl = ref(getApiBaseUrl())

  function saveUrlList() {
    localStorage.setItem('vlogs_api_url_list', JSON.stringify(apiBaseUrlList.value))
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

  const DEFAULT_PINNED = [
    'src_k8s.namespace.name',
    'src_container.name',
    'src_k8s.pod.name',
  ]

  const pinnedFields = ref(
    JSON.parse(localStorage.getItem('vlogs_pinned_fields') || 'null') || [...DEFAULT_PINNED]
  )

  function setPinnedFields(fields) {
    pinnedFields.value = fields
    localStorage.setItem('vlogs_pinned_fields', JSON.stringify(fields))
  }

  const resultLimit = ref(
    parseInt(localStorage.getItem('vlogs_result_limit') || '500', 10)
  )

  function setResultLimit(limit) {
    resultLimit.value = limit
    localStorage.setItem('vlogs_result_limit', String(limit))
  }

  const DEFAULT_COLUMNS = ['level', '_stream']
  const tableColumns = ref(
    JSON.parse(localStorage.getItem('vlogs_table_columns') || 'null') || [...DEFAULT_COLUMNS]
  )
  const securityRole = ref(localStorage.getItem('vlogs_security_role') || 'admin')
  const redactionEnabled = ref(localStorage.getItem('vlogs_redaction_enabled') !== 'false')
  const auditEvents = ref(
    JSON.parse(localStorage.getItem('vlogs_audit_events') || '[]')
  )

  const savedViews = ref(
    JSON.parse(localStorage.getItem('vlogs_saved_views') || '[]')
  )
  const savedQueries = ref(
    JSON.parse(localStorage.getItem('vlogs_saved_queries') || '[]')
  )

  function toggleTableColumn(field) {
    const idx = tableColumns.value.indexOf(field)
    if (idx > -1) {
      tableColumns.value.splice(idx, 1)
    } else {
      tableColumns.value.push(field)
    }
    localStorage.setItem('vlogs_table_columns', JSON.stringify(tableColumns.value))
  }

  function resetTableColumns() {
    tableColumns.value = [...DEFAULT_COLUMNS]
    localStorage.removeItem('vlogs_table_columns')
  }

  function setSecurityRole(role) {
    securityRole.value = role
    localStorage.setItem('vlogs_security_role', role)
  }

  function setRedactionEnabled(value) {
    redactionEnabled.value = value
    localStorage.setItem('vlogs_redaction_enabled', String(value))
  }

  function logAuditEvent(action, summary) {
    const event = {
      id: `audit_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
      action,
      summary,
      timestamp: new Date().toISOString(),
    }
    auditEvents.value = [event, ...auditEvents.value].slice(0, 20)
    localStorage.setItem('vlogs_audit_events', JSON.stringify(auditEvents.value))
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
    ].slice(0, 20)
    localStorage.setItem('vlogs_saved_views', JSON.stringify(savedViews.value))
    logAuditEvent('保存视图', view.name)
  }

  function removeSavedView(id) {
    savedViews.value = savedViews.value.filter(item => item.id !== id)
    localStorage.setItem('vlogs_saved_views', JSON.stringify(savedViews.value))
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
    ].slice(0, 20)
    localStorage.setItem('vlogs_saved_queries', JSON.stringify(savedQueries.value))
    logAuditEvent('保存查询', item.name)
  }

  function removeSavedQuery(id) {
    savedQueries.value = savedQueries.value.filter(item => item.id !== id)
    localStorage.setItem('vlogs_saved_queries', JSON.stringify(savedQueries.value))
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
    auditEvents, logAuditEvent,
    tableColumns, toggleTableColumn, resetTableColumns,
  }
})
