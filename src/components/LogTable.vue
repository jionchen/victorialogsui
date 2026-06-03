<template>
  <div class="log-panel">
    <!-- Header -->
    <div class="log-panel__header">
      <span class="log-panel__info">
        <template v-if="logStore.loading">
          加载中...
        </template>
        <template v-else>
          显示 {{ logStore.logs.length }} 条日志
        </template>
      </span>
      <div class="log-panel__actions">
        <a-select
          v-model="displayLimit"
          style="width: 90px;"
          @change="onLimitChange"
        >
          <a-option :value="100">100</a-option>
          <a-option :value="500">500</a-option>
          <a-option :value="1000">1000</a-option>
          <a-option :value="2000">2000</a-option>
        </a-select>
        <a-dropdown trigger="click">
          <button class="icon-btn" title="导出">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <template #content>
            <a-doption @click="exportJSON">导出 JSON</a-doption>
            <a-doption @click="exportCSV">导出 CSV</a-doption>
          </template>
        </a-dropdown>
      </div>
    </div>

    <!-- Log body -->
    <div class="log-panel__body" ref="scrollContainer" @scroll="onScroll">
      <!-- Loading skeleton -->
      <template v-if="logStore.loading">
        <div v-for="i in 15" :key="i" class="skeleton-log-row">
          <div class="skeleton" :style="{ width: skeletonWidths[i - 1] + '%', height: '14px' }"></div>
        </div>
      </template>

      <!-- Error state -->
      <div v-else-if="logStore.error && recoverableConnectionError.recoverable" class="connection-recovery">
        <div class="connection-recovery__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </div>
        <div class="connection-recovery__title">{{ recoverableConnectionError.title }}</div>
        <div class="connection-recovery__detail">
          {{ recoverableConnectionError.detail }}
        </div>
        <div v-if="recoverableConnectionError.status" class="connection-recovery__meta">
          HTTP {{ recoverableConnectionError.status }} · {{ logStore.error }}
        </div>
        <div class="connection-recovery__actions">
          <button class="btn-primary" @click="emit('configure-connection')">
            配置 VictoriaLogs 地址
          </button>
          <button class="connection-recovery__secondary" @click="emit('retry-query')">
            重试查询
          </button>
        </div>
      </div>
      <div v-else-if="logStore.error" class="empty-state">
        <div class="empty-state__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <div class="empty-state__text text-danger">{{ logStore.error }}</div>
        <div class="empty-state__hint">请检查 VictoriaLogs 连接设置</div>
      </div>

      <!-- Empty state -->
      <div v-else-if="logStore.logs.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
        <div class="empty-state__text">未找到日志</div>
        <div class="empty-state__hint">请尝试调整时间范围或移除筛选条件</div>
      </div>

      <!-- Log rows -->
      <template v-else>
        <!-- Header Row (desktop only) -->
        <div v-if="!isMobile" class="log-row log-row--header">
          <button
            type="button"
            class="log-row__cell log-row__time log-row__time-header"
            :aria-label="logStore.sortOrder === 'desc' ? '按时间倒序，点击切换为正序' : '按时间正序，点击切换为倒序'"
            @click="logStore.toggleSortOrder()"
          >
            <span class="log-row__time-header-label">时间</span>
            <svg
              class="log-row__time-sort-arrow"
              :class="{ 'is-asc': logStore.sortOrder === 'asc' }"
              viewBox="0 0 12 12"
              aria-hidden="true"
            >
              <path d="M3 4.5 6 7.5 9 4.5" />
            </svg>
          </button>
          <div
            v-for="col in settingsStore.tableColumns"
            :key="col"
            class="log-row__cell log-row__col-header"
          >
            <span class="log-row__col-header-label" :title="col">{{ col === '_stream' ? '流标签' : col }}</span>
            <button class="icon-btn log-row__col-remove" title="移除此列" @click.stop="settingsStore.toggleTableColumn(col)">✕</button>
          </div>
          <div class="log-row__cell log-row__msg">日志内容</div>
        </div>

        <div :style="{ height: `${virtualWindow.offsetTop}px` }" />

        <template v-for="({ log, index, renderKey }) in visibleLogs" :key="renderKey">
          <!-- Desktop row layout -->
          <div
            v-if="!isMobile"
            class="log-row"
            :class="{ expanded: expandedIndex === index }"
            :ref="setLogRowRef(log)"
            @click="toggleExpand(index)"
          >
            <div class="log-row__cell log-row__time" :title="getLogTimeTitle(log)">
              {{ formatLogTimestamp(getLogDisplayTimestamp(log)) }}
            </div>

            <!-- Dynamic Data Columns -->
            <div
              v-for="col in settingsStore.tableColumns"
              :key="col"
              class="log-row__cell log-row__dynamic-col"
              :class="{ 'log-row__level': col === 'level', [ (log.level || '').toLowerCase() ]: col === 'level' }"
              :title="col === '_stream' ? getStreamLabel(log) : log[col]"
            >
              {{ col === '_stream' ? getStreamLabel(log) : (log[col] || '-') }}
            </div>

            <div class="log-row__cell log-row__msg">
              <div class="log-row__msg-preview">
                <HighlightedText :text="log._msg || ''" :terms="highlightTerms" />
              </div>
            </div>
          </div>

          <!-- Mobile card layout -->
          <div
            v-else
            class="log-row log-row--card"
            :class="{ expanded: expandedIndex === index }"
            :ref="setLogRowRef(log)"
            @click="toggleExpand(index)"
          >
            <div class="log-card__header">
              <span class="log-card__time">{{ formatLogTimestamp(getLogDisplayTimestamp(log)) }}</span>
              <span
                v-if="log.level"
                class="log-card__level"
                :class="(log.level || '').toLowerCase()"
              >{{ log.level }}</span>
            </div>
            <div
              v-for="col in settingsStore.tableColumns"
              :key="col"
              class="log-card__field"
            >
              <span class="log-card__label">{{ col === '_stream' ? '流标签' : col }}</span>
              <span
                class="log-card__value"
                :class="{ 'log-row__level': col === 'level', [ (log.level || '').toLowerCase() ]: col === 'level' }"
              >{{ col === '_stream' ? getStreamLabel(log) : (log[col] || '-') }}</span>
            </div>
            <div class="log-card__msg">
              <HighlightedText :text="log._msg || ''" :terms="highlightTerms" />
            </div>
          </div>

          <!-- Log Detail -->
          <LogDetail
            v-if="expandedIndex === index"
            :log="log"
            :is-stream-field="isStreamField"
            @view-context="openContext"
          />
        </template>

        <div :style="{ height: `${bottomSpacerHeight}px` }" />
      </template>
    </div>

    <!-- Context Modal -->
    <LogContextModal
      v-model:visible="contextVisible"
      :log="contextLog"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { useLogStore } from '../stores/logs.js'
import { useFieldStore } from '../stores/fields.js'
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'
import { getStreamLabel } from '../utils/formatters.js'
import { getHighlightTerms } from '../utils/highlighting.js'
import { classifyConnectionError } from '../utils/connectionStatus.js'
import { formatLogTimestamp, getLogDisplayTimestamp, getLogTimeTitle } from '../utils/logTime.js'
import { calculateDynamicVirtualWindow } from '../utils/virtualList.js'
import HighlightedText from './HighlightedText.vue'
import LogDetail from './LogDetail.vue'
import LogContextModal from './LogContextModal.vue'
import { LOG_ROW_HEIGHT } from '../../config/uiConfig.js'

const props = defineProps({
  isMobile: { type: Boolean, default: false },
})

const logStore = useLogStore()
const fieldStore = useFieldStore()
const queryStore = useQueryStore()
const settingsStore = useSettingsStore()
const emit = defineEmits(['configure-connection', 'retry-query'])

const expandedIndex = ref(-1)
const displayLimit = ref(settingsStore.resultLimit)
const scrollContainer = ref(null)

const contextVisible = ref(false)
const contextLog = ref(null)
const scrollTop = ref(0)
const rowHeights = ref(new Map())
const rowObservers = new Map()
const logRenderKeys = new WeakMap()
let nextRenderKey = 0

// Pre-computed skeleton widths to avoid Math.random() in templates
const skeletonWidths = Array.from({ length: 15 }, (_, i) => 30 + ((i * 17 + 7) % 60))

const measuredHeights = computed(() => {
  return logStore.logs.map(log => rowHeights.value.get(log) ?? LOG_ROW_HEIGHT)
})

const virtualWindow = computed(() => {
  return calculateDynamicVirtualWindow({
    itemHeights: measuredHeights.value,
    estimatedItemHeight: LOG_ROW_HEIGHT,
    scrollTop: scrollTop.value,
    containerHeight: scrollContainer.value?.clientHeight || 400,
    overscan: 6,
  })
})

const visibleLogs = computed(() => {
  return logStore.logs
    .slice(virtualWindow.value.start, virtualWindow.value.end)
    .map((log, offset) => ({
      log,
      index: virtualWindow.value.start + offset,
      renderKey: getLogRenderKey(log),
    }))
})

const highlightTerms = computed(() => getHighlightTerms({
  isManualMode: queryStore.isManualMode,
  freeTextQuery: queryStore.freeTextQuery,
  manualQuery: queryStore.manualQuery,
  effectiveQuery: queryStore.effectiveQuery,
}))

const bottomSpacerHeight = computed(() => {
  return Math.max(0, virtualWindow.value.totalHeight - virtualWindow.value.offsetTop - virtualWindow.value.visibleHeight)
})

const recoverableConnectionError = computed(() => {
  return logStore.connectionError || classifyConnectionError({ message: logStore.error })
})

watch(() => logStore.logs, () => {
  expandedIndex.value = -1
  scrollTop.value = 0
  disconnectRowObservers()
  rowHeights.value = new Map()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
})

function onScroll(e) {
  scrollTop.value = e.target.scrollTop
}

function openContext(log) {
  contextLog.value = log
  contextVisible.value = true
}

const streamFieldSet = computed(() => {
  return new Set(fieldStore.streamFieldNames.map(f => f.value))
})

function isStreamField(fieldName) {
  return streamFieldSet.value.has(fieldName)
}

function toggleExpand(index) {
  expandedIndex.value = expandedIndex.value === index ? -1 : index
}

function getLogRenderKey(log) {
  if (!logRenderKeys.has(log)) {
    logRenderKeys.set(log, `log-row-${nextRenderKey++}`)
  }
  return logRenderKeys.get(log)
}

function updateRowHeight(log, height) {
  const nextHeight = Math.max(1, Math.ceil(height || 0))
  const currentHeight = rowHeights.value.get(log)
  if (currentHeight === nextHeight) return

  const nextMap = new Map(rowHeights.value)
  nextMap.set(log, nextHeight)
  rowHeights.value = nextMap
}

function observeRow(log, el) {
  const currentObserver = rowObservers.get(log)
  if (currentObserver) {
    currentObserver.disconnect()
    rowObservers.delete(log)
  }

  if (!el) return

  updateRowHeight(log, el.offsetHeight)

  if (typeof ResizeObserver === 'undefined') return

  const observer = new ResizeObserver(entries => {
    const entry = entries[0]
    if (!entry) return

    const boxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize
    const measuredHeight = boxSize?.blockSize || entry.contentRect?.height || el.offsetHeight
    updateRowHeight(log, measuredHeight)
  })

  observer.observe(el)
  rowObservers.set(log, observer)
}

function setLogRowRef(log) {
  return (el) => observeRow(log, el)
}

function disconnectRowObservers() {
  for (const observer of rowObservers.values()) {
    observer.disconnect()
  }
  rowObservers.clear()
}

onBeforeUnmount(() => {
  disconnectRowObservers()
})

function onLimitChange(val) {
  settingsStore.setResultLimit(val)
  queryStore.executeQuery()
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(logStore.logs, null, 2)], { type: 'application/json' })
  downloadBlob(blob, 'logs.json')
}

function exportCSV() {
  if (logStore.logs.length === 0) return
  const allKeys = new Set()
  logStore.logs.forEach(log => Object.keys(log).forEach(k => allKeys.add(k)))
  const keys = Array.from(allKeys)
  const header = keys.join(',')
  const rows = logStore.logs.map(log => {
    return keys.map(k => {
      const v = log[k]
      if (v === undefined || v === null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s
    }).join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  downloadBlob(blob, 'logs.csv')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
</script>
