<template>
  <div class="pattern-panel">
    <!-- Header -->
    <div class="pattern-panel__header">
      <span class="pattern-panel__info">
        <template v-if="processing">
          分析中...
        </template>
        <template v-else>
          日志模式 ({{ clusters.length }} 个)
        </template>
      </span>
      <div class="pattern-panel__actions">
        <span v-if="truncated" class="pattern-panel__warning" title="仅分析前 5000 条日志">
          已截断
        </span>
        <span v-if="!processing && clusters.length > 0" class="pattern-panel__total">
          共 {{ totalLogs }} 条
        </span>
      </div>
    </div>

    <!-- Body -->
    <div class="pattern-panel__body">
      <!-- Loading -->
      <template v-if="processing">
        <div v-for="i in 8" :key="i" class="skeleton-pattern-row">
          <div class="skeleton" :style="{ width: skeletonWidths[i - 1] + '%', height: '14px' }"></div>
        </div>
      </template>

      <!-- Empty state -->
      <div v-else-if="clusters.length === 0" class="empty-state">
        <div class="empty-state__icon">--</div>
        <div class="empty-state__text">暂无日志数据</div>
        <div class="empty-state__hint">请先执行查询以获取日志</div>
      </div>

      <!-- Pattern list -->
      <div v-else class="pattern-list">
        <div
          v-for="cluster in clusters"
          :key="cluster.pattern"
          class="pattern-item"
          :class="{ expanded: expandedPattern === cluster.pattern }"
        >
          <div class="pattern-item__header" @click="toggleExpand(cluster.pattern)">
            <span class="pattern-item__count">{{ cluster.count }}</span>
            <span class="pattern-item__template" :title="cluster.pattern">{{ cluster.pattern }}</span>
            <span class="pattern-item__percent">{{ ((cluster.count / totalLogs) * 100).toFixed(1) }}%</span>
            <span class="pattern-item__arrow" :class="{ expanded: expandedPattern === cluster.pattern }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </span>
          </div>
          <div v-if="expandedPattern === cluster.pattern" class="pattern-item__samples">
            <div class="pattern-item__samples-label">示例日志 ({{ cluster.samples.length }} 条):</div>
            <div
              v-for="(sample, i) in cluster.samples"
              :key="i"
              class="pattern-item__sample"
            >
              <pre>{{ JSON.stringify(sample, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { clusterLogs, wasTruncated } from '../utils/patternCluster.js'

const props = defineProps({
  logs: {
    type: Array,
    default: () => [],
  },
})

const clusters = ref([])
const processing = ref(false)
const expandedPattern = ref(null)
const truncated = ref(false)

const totalLogs = computed(() => props.logs.length)

// Pre-computed skeleton widths
const skeletonWidths = Array.from({ length: 8 }, (_, i) => 40 + ((i * 13 + 7) % 50))

let debounceTimer = null
let currentClusterId = 0

function toggleExpand(pattern) {
  expandedPattern.value = expandedPattern.value === pattern ? null : pattern
}

async function runClustering() {
  const logs = props.logs
  if (logs.length === 0) {
    clusters.value = []
    truncated.value = false
    return
  }

  const id = ++currentClusterId
  processing.value = true

  // Defer clustering to next tick to not block UI
  await nextTick()

  // Use setTimeout to yield to browser
  setTimeout(() => {
    if (id !== currentClusterId) return

    const result = clusterLogs(logs)
    truncated.value = wasTruncated(logs)
    clusters.value = result
    processing.value = false
  }, 0)
}

watch(
  () => props.logs,
  () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      runClustering()
    }, 300)
  },
  { deep: true }
)

// Initial clustering if logs already present
if (props.logs.length > 0) {
  runClustering()
}
</script>

<style scoped>
.pattern-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.pattern-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.pattern-panel__info {
  font-size: 12px;
  color: var(--text-secondary);
}

.pattern-panel__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pattern-panel__warning {
  font-size: 11px;
  color: var(--warning);
  background: rgba(251, 191, 36, 0.1);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--warning);
}

.pattern-panel__total {
  font-size: 11px;
  color: var(--text-muted);
}

.pattern-panel__body {
  flex: 1;
  overflow-y: auto;
}

.skeleton-pattern-row {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-light);
}

.pattern-list {
  padding: 0;
}

.pattern-item {
  border-bottom: 1px solid var(--border-light);
  transition: background var(--transition);
}

.pattern-item:hover {
  background: var(--bg-hover);
}

.pattern-item.expanded {
  background: var(--bg-surface);
}

.pattern-item__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  user-select: none;
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;
}

.pattern-item__count {
  min-width: 48px;
  text-align: right;
  font-weight: 600;
  color: var(--accent);
  font-size: 12px;
  flex-shrink: 0;
}

.pattern-item__template {
  flex: 1;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.pattern-item__percent {
  min-width: 42px;
  text-align: right;
  color: var(--text-muted);
  font-size: 11px;
  flex-shrink: 0;
}

.pattern-item__arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: transform var(--transition);
  display: flex;
  align-items: center;
}

.pattern-item__arrow.expanded {
  transform: rotate(180deg);
}

.pattern-item__samples {
  padding: 8px 16px 12px 74px;
  border-top: 1px solid var(--border-light);
  animation: slideDown 0.15s ease;
}

.pattern-item__samples-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-weight: 500;
}

.pattern-item__sample {
  margin-bottom: 6px;
}

.pattern-item__sample:last-child {
  margin-bottom: 0;
}

.pattern-item__sample pre {
  margin: 0;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
