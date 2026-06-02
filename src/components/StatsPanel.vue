<template>
  <div class="stats-panel">
    <div class="stats-panel__header">
      <span class="stats-panel__title">聚合分析</span>
      <button class="icon-btn" @click="$emit('close')" title="关闭">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="stats-panel__controls">
      <div class="stats-control">
        <label>分组字段</label>
        <div class="field-selector">
          <label
            v-for="f in availableFields"
            :key="f.value"
            class="field-checkbox"
            :class="{ 'is-selected': selectedFields.includes(f.value) }"
          >
            <input
              type="checkbox"
              :value="f.value"
              v-model="selectedFields"
            />
            <span>{{ f.value }}</span>
            <span v-if="f.hits" class="field-hits">{{ formatHits(f.hits) }}</span>
          </label>
        </div>
      </div>

      <div class="stats-control">
        <label>聚合函数</label>
        <div class="agg-selector">
          <button
            v-for="fn in AGGREGATE_FUNCTIONS"
            :key="fn"
            class="agg-btn"
            :class="{ 'is-active': aggFunction === fn }"
            @click="aggFunction = fn"
          >
            {{ fn }}
          </button>
        </div>
      </div>

      <button
        class="btn-primary stats-run-btn"
        @click="runStats"
        :disabled="selectedFields.length === 0 || loading"
      >
        {{ loading ? '计算中...' : '▶ 执行聚合' }}
      </button>
    </div>

    <div v-if="error" class="stats-error">
      {{ error }}
    </div>

    <StatsChart
      v-if="statsData.length > 0"
      :data="statsData"
      :group-fields="selectedFields"
      :agg-function="aggFunction"
    />

    <div v-else-if="!loading && !error" class="stats-empty">
      选择字段和聚合函数后点击执行
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFieldStore } from '../stores/fields.js'
import { useQueryStore } from '../stores/query.js'
import { AGGREGATE_FUNCTIONS, buildStatsQuery } from '../utils/queryBuilder.js'
import { queryStats } from '../api/logs.js'
import StatsChart from './StatsChart.vue'

defineEmits(['close'])

const fieldStore = useFieldStore()
const queryStore = useQueryStore()

const selectedFields = ref([])
const aggFunction = ref('count')
const loading = ref(false)
const error = ref('')
const statsData = ref([])

const availableFields = computed(() => {
  const logFields = fieldStore.logFieldNames || []
  const streamFields = fieldStore.streamFieldNames || []
  return [...streamFields, ...logFields].filter(
    (f, idx, arr) => arr.findIndex(a => a.value === f.value) === idx
  )
})

function formatHits(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return String(n)
}

async function runStats() {
  if (selectedFields.value.length === 0) return

  loading.value = true
  error.value = ''
  statsData.value = []

  try {
    const baseQuery = queryStore.effectiveQuery
    const statsQuery = buildStatsQuery(baseQuery, selectedFields.value, aggFunction.value)

    const { start, end } = queryStore.timeRange
    const results = await queryStats({
      query: statsQuery,
      start,
      end,
    })

    statsData.value = results
  } catch (err) {
    error.value = err.message || '聚合查询失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  min-width: 320px;
}

.stats-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-panel__title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-1, #1d2129);
}

.stats-panel__controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-control > label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-2, #4e5969);
  margin-bottom: 6px;
}

.field-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
}

.field-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--color-border-2, #c9cdd4);
  background: var(--color-bg-2, #fff);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.field-checkbox:hover,
.field-checkbox.is-selected {
  border-color: var(--color-primary, #165dff);
  background: var(--color-primary-light-1, #e8f3ff);
}

.field-checkbox input {
  display: none;
}

.field-hits {
  color: var(--color-text-3, #86909c);
  font-size: 11px;
}

.agg-selector {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.agg-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--color-border-2, #c9cdd4);
  background: var(--color-bg-2, #fff);
  color: var(--color-text-2, #4e5969);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.agg-btn:hover,
.agg-btn.is-active {
  border-color: var(--color-primary, #165dff);
  background: var(--color-primary, #165dff);
  color: #fff;
}

.stats-run-btn {
  align-self: flex-start;
}

.stats-error {
  padding: 8px 12px;
  border-radius: 4px;
  background: var(--color-danger-light-1, #ffece8);
  color: var(--color-danger, #f53f3f);
  font-size: 13px;
}

.stats-empty {
  padding: 24px;
  text-align: center;
  color: var(--color-text-3, #86909c);
  font-size: 13px;
}
</style>
