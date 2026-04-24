<template>
  <a-drawer
    :visible="visible"
    title="关键字统计"
    :width="360"
    placement="right"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="keyword-stats">
      <div class="keyword-stats__input-row">
        <a-input
          v-model="keywordInput"
          placeholder="输入关键字，按回车添加"
          @press-enter="addKeyword"
        />
        <button class="keyword-stats__add-btn" @click="addKeyword">添加</button>
      </div>

      <div class="keyword-stats__tags">
        <span
          v-for="k in allKeywords"
          :key="k"
          class="keyword-stats__tag"
          :class="{ 'keyword-stats__tag--custom': !DEFAULT_KEYWORDS.includes(k) }"
        >
          {{ k }}
          <button class="keyword-stats__tag-remove" @click="removeKeyword(k)">×</button>
        </span>
      </div>

      <div v-if="statsLoading" class="keyword-stats__loading">
        加载中...
      </div>
      <div v-else-if="statsError" class="keyword-stats__error">
        {{ statsError }}
      </div>
      <div v-else class="keyword-stats__list">
        <div
          v-for="stat in keywordStats"
          :key="stat.keyword"
          class="keyword-stats__row"
        >
          <div class="keyword-stats__info">
            <span class="keyword-stats__name">{{ stat.keyword }}</span>
            <span class="keyword-stats__count">{{ stat.count }}</span>
          </div>
          <div class="keyword-stats__bar">
            <div
              class="keyword-stats__bar-fill"
              :style="{ width: maxCount > 0 ? `${(stat.count / maxCount) * 100}%` : '0%' }"
            />
          </div>
        </div>

        <div v-if="keywordStats.length === 0" class="keyword-stats__empty">
          暂无关键字
        </div>
      </div>

      <div class="keyword-stats__summary">
        时间范围：{{ timeRangeLabel }}，共 {{ statsLogs.length }} 条日志，命中 {{ matchedLogCount }} 条
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'
import client from '../api/client.js'
import { parseNdjsonChunk } from '../api/logs.js'
import { DEFAULT_KEYWORDS, countKeywordMatches, extractLogText } from '../utils/keywordStats.js'
import { STORAGE_KEYS } from '../../config/storageKeys.js'
import { API_LOG_QUERY_TIMEOUT_MS } from '../../config/proxyConfig.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible'])

const queryStore = useQueryStore()
const settingsStore = useSettingsStore()
const keywordInput = ref('')
const statsLogs = ref([])
const statsLoading = ref(false)
const statsError = ref(null)

let statsAbortController = null

function loadCustomKeywords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.customKeywords)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return []
}

const customKeywords = ref(loadCustomKeywords())

watch(
  customKeywords,
  (val) => {
    localStorage.setItem(STORAGE_KEYS.customKeywords, JSON.stringify(val))
  },
  { deep: true }
)

const allKeywords = computed(() => {
  const set = new Set([...DEFAULT_KEYWORDS, ...customKeywords.value])
  return Array.from(set)
})

const keywordStats = computed(() => {
  return countKeywordMatches(statsLogs.value, allKeywords.value)
})

const maxCount = computed(() => {
  if (!keywordStats.value.length) return 0
  return Math.max(...keywordStats.value.map(s => s.count))
})

const matchedLogCount = computed(() => {
  const logs = statsLogs.value || []
  if (!logs.length || !allKeywords.value.length) return 0
  return logs.filter(log => {
    const text = extractLogText(log).toLowerCase()
    return allKeywords.value.some(k => text.includes(k.toLowerCase()))
  }).length
})

const timeRangeLabel = computed(() => {
  const { start, end } = queryStore.timeRange
  if (start && end) {
    return `${start} ~ ${end}`
  }
  return '全部时间'
})

async function fetchStatsLogs() {
  const { start, end } = queryStore.timeRange
  const limit = settingsStore.resultLimit

  if (statsAbortController) {
    statsAbortController.abort()
  }
  statsAbortController = new AbortController()

  statsLoading.value = true
  statsError.value = null

  try {
    const params = new URLSearchParams()
    params.set('query', '*')
    if (limit) params.set('limit', String(limit))
    if (start) params.set('start', start)
    if (end) params.set('end', end)

    const response = await client.post('/select/logsql/query', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      signal: statsAbortController.signal,
      transformResponse: [(data) => data],
      timeout: API_LOG_QUERY_TIMEOUT_MS,
    })

    const { items, remainder } = parseNdjsonChunk(response.data, '')
    if (remainder.trim()) {
      items.push({ _msg: remainder.trim() })
    }
    statsLogs.value = items
  } catch (e) {
    if (e.name === 'AbortError' || e.cancelled) return
    statsError.value = e.message || '加载失败'
    statsLogs.value = []
  } finally {
    statsLoading.value = false
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      fetchStatsLogs()
    }
  }
)

watch(
  () => [queryStore.timeRange.start, queryStore.timeRange.end],
  () => {
    if (props.visible) {
      fetchStatsLogs()
    }
  }
)

function addKeyword() {
  const raw = keywordInput.value.trim()
  if (!raw) return
  const keywords = raw.split(/[,，\s]+/).map(k => k.trim()).filter(Boolean)
  for (const k of keywords) {
    const lower = k.toLowerCase()
    if (!customKeywords.value.includes(lower) && !DEFAULT_KEYWORDS.includes(lower)) {
      customKeywords.value.push(lower)
    }
  }
  keywordInput.value = ''
}

function removeKeyword(keyword) {
  customKeywords.value = customKeywords.value.filter(k => k !== keyword)
}
</script>
