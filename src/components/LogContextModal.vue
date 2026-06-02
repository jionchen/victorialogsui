<template>
  <a-modal
    :visible="visible"
    title="上下文日志"
    width="90%"
    :footer="false"
    class="context-modal"
    @cancel="close"
  >
    <div class="context-panel">
      <!-- Toolbar -->
      <div class="context-toolbar">
        <div v-if="log" class="context-toolbar__info">
          正在查看 <strong>{{ formatLogTimestamp(getLogDisplayTimestamp(log)) }}</strong> 前后 ±{{ windowMinutes }} 分钟
          <span style="color: var(--text-muted); margin-left: 8px;">(所属流: <span class="context-toolbar__stream-tag">{{ getStreamLabel(log) }}</span>)</span>
        </div>

        <div class="context-toolbar__actions">
          <a-select v-model="windowMinutes" @change="fetchContext" style="width: 100px;">
            <a-option :value="1">± 1 分钟</a-option>
            <a-option :value="5">± 5 分钟</a-option>
            <a-option :value="15">± 15 分钟</a-option>
          </a-select>
          <a-button type="primary" @click="fetchContext" :loading="loading">
            刷新
          </a-button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading && contextLogs.length === 0" class="loading-spinner" style="padding: 40px;">
        <a-spin />
      </div>

      <!-- Logs List -->
      <div v-else class="context-list">
        <table class="log-table">
          <thead>
            <tr>
              <th style="width: 180px;">时间</th>
              <th style="width: 50px;">级别</th>
              <th>日志内容</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="item in contextLogs" 
              :key="item.__host_ip__ + item._time"
              :class="{ 'is-anchor': isAnchor(item) }"
              class="log-row"
            >
              <td class="log-cell timestamp">{{ formatLogTimestamp(getLogDisplayTimestamp(item)) }}</td>
              <td class="log-cell"><span class="level-indicator" :class="getLevel(item)" /></td>
              <td class="log-cell message"><pre><HighlightedText :text="getMessage(item)" :terms="highlightTerms" /></pre></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { queryLogs } from '../api/logs.js'
import { getStreamLabel } from '../utils/formatters.js'
import { getHighlightTerms } from '../utils/highlighting.js'
import { formatLogTimestamp, getLogDisplayTimestamp } from '../utils/logTime.js'
import { useQueryStore } from '../stores/query.js'
import { logger } from '../utils/logger.js'
import HighlightedText from './HighlightedText.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  log: { type: Object, default: null },
})

const emit = defineEmits(['update:visible'])

const queryStore = useQueryStore()
const loading = ref(false)
const contextLogs = ref([])
const windowMinutes = ref(5)
const highlightTerms = computed(() => getHighlightTerms({
  isManualMode: queryStore.isManualMode,
  freeTextQuery: queryStore.freeTextQuery,
  manualQuery: queryStore.manualQuery,
  effectiveQuery: queryStore.effectiveQuery,
}))

function close() {
  emit('update:visible', false)
}

function getLevel(item) {
  return (item.level || 'info').toLowerCase()
}

function getMessage(item) {
  return item._msg || JSON.stringify(item)
}

function isAnchor(item) {
  if (!props.log) return false
  return item._time === props.log._time && item._msg === props.log._msg
}

async function fetchContext() {
  if (!props.log || !props.log._time) return
  
  loading.value = true
  try {
    const d = new Date(props.log._time)
    const startObj = new Date(d.getTime() - windowMinutes.value * 60000)
    const endObj = new Date(d.getTime() + windowMinutes.value * 60000)
    
    // Add 1s buffer just in case
    const startISO = startObj.toISOString()
    const endISO = endObj.toISOString()
    
    // Query exact stream_id to get surrounding logs in process
    let streamFilter = ''
    if (props.log._stream_id) {
      streamFilter = `_stream_id:"${props.log._stream_id}"`
    } else {
      // Fallback if no stream_id
      const host = props.log['host.name'] || props.log['__host_ip__'] || ''
      if (host) streamFilter = `host.name:"${host}"`
    }
    
    const query = `${streamFilter}`.trim() || '*'
    
    const logs = await queryLogs({
      query,
      start: startISO,
      end: endISO,
      limit: 500
    })
    
    // Ensure anchor exists in the list (sometimes API limits mean it might be cut off?)
    // Actually the logs are ordered oldest to newest from API ? No, usually newest first depending on sort?
    // VictoriaLogs returns logs in arbitrary order, wait queryLogs doesn't sort.
    // Let's sort manually by time descending
    contextLogs.value = logs.sort((a, b) => {
      const ta = new Date(getLogDisplayTimestamp(a)).getTime()
      const tb = new Date(getLogDisplayTimestamp(b)).getTime()
      return tb - ta
    })
    
    // Scroll to anchor
    nextTick(() => {
      const anchorEl = document.querySelector('.context-list .log-row.is-anchor')
      if (anchorEl) {
        anchorEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    })
    
  } catch (e) {
    if (!e.cancelled) {
      logger.error('Failed to load context:', e)
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.visible, (val) => {
  if (val && props.log) {
    windowMinutes.value = 5
    fetchContext()
  } else {
    contextLogs.value = []
  }
})
</script>

<style scoped>
.context-panel {
  display: flex;
  flex-direction: column;
  height: 65vh; /* fill modal nicely */
}

.context-list {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-family: inherit;
  font-size: 13px;
}

.log-table th {
  text-align: left;
  padding: 8px 12px;
  background-color: var(--bg-surface);
  color: var(--text-secondary);
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.log-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  vertical-align: top;
}

.log-row {
  cursor: default;
}

.log-row:hover {
  background-color: var(--bg-hover);
}

.log-row.is-anchor {
  background-color: rgba(124, 110, 240, 0.15); /* highlight primary color softly */
}
.log-row.is-anchor td {
  border-bottom-color: rgba(124, 110, 240, 0.3);
}

.timestamp {
  white-space: nowrap;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.message pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: monospace;
  font-size: 12px;
}

.level-indicator {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
}
.level-indicator.error { background: #f87171; }
.level-indicator.warn, .level-indicator.warning { background: #fbbf24; }
.level-indicator.info { background: #60a5fa; }
</style>
