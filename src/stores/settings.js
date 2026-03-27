import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setApiBaseUrl, getApiBaseUrl } from '../api/client.js'

export const useSettingsStore = defineStore('settings', () => {
  // Theme
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

  // API Base URL List
  // url 为空表示使用 vite.config.js / nginx 中配置的默认地址
  const apiBaseUrlList = ref(
    JSON.parse(localStorage.getItem('vlogs_api_url_list') || 'null') || [
      { name: '默认 (代理配置)', url: '' },
      { name: '172.19.0.176', url: 'http://172.19.0.176:19428' },
    ]
  )
  const apiBaseUrl = ref(getApiBaseUrl())

  function updateApiBaseUrl(url) {
    apiBaseUrl.value = url
    setApiBaseUrl(url)
    
    // Ensure the current URL is in the list
    if (!apiBaseUrlList.value.find(item => item.url === url)) {
      apiBaseUrlList.value.push({ name: '自定义', url })
      saveUrlList()
    }
  }

  function saveUrlList() {
    localStorage.setItem('vlogs_api_url_list', JSON.stringify(apiBaseUrlList.value))
  }

  function addApiBaseUrl(name, url) {
    if (!apiBaseUrlList.value.find(item => item.url === url)) {
      apiBaseUrlList.value.push({ name, url })
      saveUrlList()
    }
  }

  function removeApiBaseUrl(url) {
    apiBaseUrlList.value = apiBaseUrlList.value.filter(item => item.url !== url)
    saveUrlList()
    // If we removed the active one, fallback to the first one
    if (apiBaseUrl.value === url && apiBaseUrlList.value.length > 0) {
      updateApiBaseUrl(apiBaseUrlList.value[0].url)
    }
  }

  // Pinned fields (default K8s fields)
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

  // Result limit
  const resultLimit = ref(
    parseInt(localStorage.getItem('vlogs_result_limit') || '500', 10)
  )

  function setResultLimit(limit) {
    resultLimit.value = limit
    localStorage.setItem('vlogs_result_limit', String(limit))
  }

  // Table Columns
  const DEFAULT_COLUMNS = ['level', '_stream']
  const tableColumns = ref(
    JSON.parse(localStorage.getItem('vlogs_table_columns') || 'null') || [...DEFAULT_COLUMNS]
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

  return {
    theme, setTheme, initTheme,
    apiBaseUrl, updateApiBaseUrl, apiBaseUrlList, addApiBaseUrl, removeApiBaseUrl,
    pinnedFields, setPinnedFields,
    resultLimit, setResultLimit,
    tableColumns, toggleTableColumn, resetTableColumns,
  }
})
