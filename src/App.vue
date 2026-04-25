<template>
  <div class="app-layout">
    <!-- Header -->
    <header class="app-header">
      <div class="app-header__logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>
        </svg>
        VLogs Explorer
        <div class="app-header__api-badge" v-if="currentApi">
          {{ currentApi.name }}
        </div>
      </div>
      <div class="app-header__spacer" />
      <div class="app-header__actions">
        <button class="icon-btn activity-btn" @click="showActivity = true" title="关键字统计">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M3 12h4l3 8 4-16 3 8h4"/>
          </svg>
          <span v-if="activityCount > 0" class="activity-btn__count">{{ activityCount }}</span>
        </button>
        <button class="icon-btn" @click="toggleTheme" :title="settingsStore.theme === 'dark' ? '切换为浅色' : '切换为深色'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <template v-if="settingsStore.theme === 'dark'">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </template>
            <template v-else>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </template>
          </svg>
        </button>
        <button class="icon-btn" @click="showSettings = true" title="设置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Toolbar -->
    <div class="app-toolbar">
      <div class="app-toolbar__row">
        <TimeRangePicker />
        <QueryEditor />
        <SavedViewsPanel />
        <LiveTailPanel />
        <button class="btn-primary" @click="submitSearch" :disabled="logStore.loading">
          ▶ 查询
        </button>
      </div>
      <FilterBar v-if="queryStore.filters.length > 0" />
    </div>

    <!-- Body -->
    <div class="app-body">
      <FieldSidebar />
      <div class="main-content">
        <HitsHistogram />
        <LogTable
          @configure-connection="openConnectionSettings"
          @retry-query="submitSearch"
        />
      </div>
    </div>

    <!-- Settings Drawer -->
    <a-drawer
      v-model:visible="showSettings"
      title="设置"
      :width="360"
      placement="right"
    >
      <SettingsPanel />
    </a-drawer>

    <ActivityDrawer v-model:visible="showActivity" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useSettingsStore } from './stores/settings.js'
import { useQueryStore } from './stores/query.js'
import { useFieldStore } from './stores/fields.js'
import { useLogStore } from './stores/logs.js'


import TimeRangePicker from './components/TimeRangePicker.vue'
import QueryEditor from './components/QueryEditor.vue'
import SavedViewsPanel from './components/SavedViewsPanel.vue'
import LiveTailPanel from './components/LiveTailPanel.vue'
import FilterBar from './components/FilterBar.vue'
import FieldSidebar from './components/FieldSidebar.vue'
import HitsHistogram from './components/HitsHistogram.vue'
import LogTable from './components/LogTable.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ActivityDrawer from './components/ActivityDrawer.vue'
import { createSearchExecutor } from './utils/searchOrchestration.js'
import { DEFAULT_KEYWORDS, countKeywordMatches } from './utils/keywordStats.js'

const settingsStore = useSettingsStore()
const queryStore = useQueryStore()
const fieldStore = useFieldStore()
const logStore = useLogStore()

const showSettings = ref(false)

const showActivity = ref(false)

const currentApi = computed(() => {
  return settingsStore.apiBaseUrlList.find(item => item.url === settingsStore.apiBaseUrl)
})
const activityCount = computed(() => {
  const stats = countKeywordMatches(logStore.logs, DEFAULT_KEYWORDS)
  const active = stats.filter(s => s.count > 0).length
  return Math.min(active, 99)
})
const searchExecutor = createSearchExecutor({
  fetchLogs: (params) => logStore.fetchLogs(params),
  fetchHistogram: (params) => logStore.fetchHistogram(params),
  loadFieldNames: (params) => fieldStore.loadFieldNames(params),
  onAuxiliaryError: (source, error) => {
    console.warn(`[executeSearch] auxiliary ${source} failed:`, error)
  },
})

function toggleTheme() {
  settingsStore.setTheme(settingsStore.theme === 'dark' ? 'light' : 'dark')
}

async function executeSearch() {
  const { start, end } = queryStore.timeRange
  const query = queryStore.effectiveQuery
  const limit = settingsStore.resultLimit

  await searchExecutor.execute({
    query,
    limit,
    start,
    end,
    step: queryStore.histogramStep,
    rangeMs: queryStore.timeRange.rangeMs,
  })
}

function submitSearch() {
  queryStore.submitQueryDraft()
  queryStore.executeQuery()
}

function openConnectionSettings() {
  showSettings.value = true
}
// Watch for filter changes → auto execute and update URL
let searchTimer = null
watch(
  () => [
    queryStore.filters, queryStore.timePreset, queryStore.customStart, queryStore.customEnd,
    queryStore.freeTextQuery
  ],
  () => {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      queryStore.executeQuery()
    }, 300)
  },
  { deep: true }
)

watch(
  () => queryStore.queryVersion,
  () => {
    fieldStore.clearCache()
    const state = queryStore.getUrlState()
    const url = new URL(window.location)
    url.searchParams.set('s', state)
    window.history.replaceState({}, '', url)
    settingsStore.logAuditEvent('执行查询', queryStore.effectiveQuery)
    executeSearch()
  }
)

// Auto refresh
let autoRefreshTimer = null
watch(
  () => queryStore.autoRefreshInterval,
  (interval) => {
    clearInterval(autoRefreshTimer)
    if (interval > 0) {
      autoRefreshTimer = setInterval(() => executeSearch(), interval)
    }
  }
)

// Watch for API changes → auto re-search
watch(
  () => settingsStore.apiBaseUrl,
  async (newUrl, oldUrl) => {
    if (newUrl === oldUrl) return
    console.log(`[App] Switching API Base URL from [${oldUrl}] to [${newUrl}]`)

    // 1. 清除所有旧数据和缓存
    logStore.clearLogs()
    fieldStore.clearCache()

    // 2. 使用当前已提交的查询重新加载
    queryStore.executeQuery()
  }
)

onMounted(() => {
  settingsStore.initTheme()

  // Load from URL if present
  const params = new URLSearchParams(window.location.search)
  const stateStr = params.get('s')
  if (stateStr) {
    queryStore.loadUrlState(stateStr)
  }

  queryStore.executeQuery()


  // Global Keyboard Shortcuts
  window.addEventListener('keydown', onGlobalKeydown)
})

function onGlobalKeydown(e) {
  // Press '/' to focus search box (like Github/Kibana)
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault()
    const searchBox = document.querySelector('.query-editor__input')
    if (searchBox) searchBox.focus()
  }
}

onUnmounted(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  clearTimeout(searchTimer)
  clearInterval(autoRefreshTimer)
})
</script>
