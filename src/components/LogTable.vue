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
          size="small"
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
      <div v-else-if="logStore.error" class="empty-state">
        <div class="empty-state__icon">--</div>
        <div class="empty-state__text text-danger">{{ logStore.error }}</div>
        <div class="empty-state__hint">请检查 VictoriaLogs 连接设置</div>
      </div>

      <!-- Empty state -->
      <div v-else-if="logStore.logs.length === 0" class="empty-state">
        <div class="empty-state__icon">--</div>
        <div class="empty-state__text">未找到日志</div>
        <div class="empty-state__hint">请尝试调整时间范围或移除筛选条件</div>
      </div>

      <!-- Log rows -->
      <template v-else>
        <!-- Header Row -->
        <div class="log-row log-row--header">
          <div class="log-row__cell log-row__time">时间</div>
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

        <template v-for="(log, index) in visibleLogs" :key="index">
          <div
            class="log-row"
            :class="{ expanded: expandedIndex === index }"
            @click="toggleExpand(index)"
          >
            <div class="log-row__cell log-row__time">
              {{ formatTimestamp(log._time) }}
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
              {{ log._msg || '' }}
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
import { ref, computed, watch } from 'vue'
import { useLogStore } from '../stores/logs.js'
import { useFieldStore } from '../stores/fields.js'
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'
import { formatTimestamp } from '../utils/timeUtils.js'
import { getStreamLabel } from '../utils/formatters.js'
import LogDetail from './LogDetail.vue'
import LogContextModal from './LogContextModal.vue'

const logStore = useLogStore()
const fieldStore = useFieldStore()
const queryStore = useQueryStore()
const settingsStore = useSettingsStore()

const expandedIndex = ref(-1)
const displayLimit = ref(settingsStore.resultLimit)
const scrollContainer = ref(null)

const contextVisible = ref(false)
const contextLog = ref(null)

// Pre-computed skeleton widths to avoid Math.random() in templates
const skeletonWidths = Array.from({ length: 15 }, (_, i) => 30 + ((i * 17 + 7) % 60))

// Virtual Scrolling (Progressive Rendering)
const visibleCount = ref(100)
const visibleLogs = computed(() => logStore.logs.slice(0, visibleCount.value))

watch(() => logStore.logs, () => {
  visibleCount.value = 100
  expandedIndex.value = -1
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
})

function onScroll(e) {
  const target = e.target
  // Load more when user scrolls near the bottom
  if (target.scrollHeight - target.scrollTop <= target.clientHeight + 300) {
    if (visibleCount.value < logStore.logs.length) {
      visibleCount.value += 100
    }
  }
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
