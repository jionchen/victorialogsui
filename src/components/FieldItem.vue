<template>
  <div class="field-item">
    <!-- Field Header -->
    <div class="field-item__header" @click="toggleExpand" :class="{ 'is-active-col': isColumnActive }">
      <svg class="field-item__icon" :class="{ expanded }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 18l6-6-6-6"/>
      </svg>
      <span class="field-item__type-badge" :class="isStream ? 'stream' : 'log'" />
      <span class="field-item__name" :title="field.value">{{ field.value }}</span>
      <span class="field-item__hits" style="margin-left: auto;">{{ formatNumber(field.hits) }}</span>
      <button 
        class="icon-btn" 
        style="margin-left: 4px; padding: 0 4px; font-size: 14px;" 
        title="在表格中切换此列" 
        @click.stop="settingsStore.toggleTableColumn(field.value)"
      >
        <span :style="{ color: isColumnActive ? 'var(--accent)' : 'inherit', opacity: isColumnActive ? 1 : 0.3 }">▦</span>
      </button>
    </div>

    <!-- Field Values (expanded) -->
    <div v-if="expanded" class="field-values">
      <!-- Search within values -->
      <div v-if="cachedData.values.length > 5 || valueSearch" class="field-values__search">
        <input
          v-model="valueSearch"
          placeholder="搜索值..."
          @input="onValueSearch"
        />
      </div>

      <!-- Loading -->
      <div v-if="cachedData.loading && cachedData.values.length === 0" class="loading-spinner">
        <a-spin :size="16" />
      </div>

      <!-- Values list -->
      <template v-else>
        <div
          v-if="cachedData.error"
          style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 11px; color: var(--danger);"
        >
          <span>{{ cachedData.values.length > 0 ? '加载失败，展示上次结果。' : '加载失败，请重试。' }}</span>
          <button class="field-value-row__action-btn" title="重试加载" @click.stop="retryLoad">重试</button>
        </div>
        <div
          v-else-if="cachedData.loading && cachedData.values.length > 0"
          style="padding: 4px 0; font-size: 11px; color: var(--text-muted);"
        >
          正在更新...
        </div>
        <div
          v-for="val in displayedValues"
          :key="val.value"
          class="field-value-row"
        >
          <div class="field-value-row__actions">
            <button
              class="field-value-row__action-btn"
              title="包含此值"
              @click.stop="addIncludeFilter(val.value)"
            >+</button>
            <button
              class="field-value-row__action-btn exclude"
              title="排除此值"
              @click.stop="addExcludeFilter(val.value)"
            >−</button>
          </div>
          <span class="field-value-row__label" :title="val.value">{{ val.value }}</span>
          <div class="field-value-row__bar">
            <div
              class="field-value-row__bar-fill"
              :style="{ width: getBarWidth(val.hits) + '%' }"
            />
          </div>
          <span class="field-value-row__count">{{ formatNumber(val.hits) }}</span>
        </div>

        <!-- No values -->
        <div v-if="cachedData.status === 'success' && cachedData.values.length === 0 && !cachedData.loading" style="padding: 4px 0; font-size: 11px; color: var(--text-muted);">
          暂无数据
        </div>

        <!-- More indicator -->
        <div v-if="cachedData.values.length >= 30" class="field-values__more">
          显示前 30 个值，可使用搜索查找更多。
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFieldStore } from '../stores/fields.js'
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'
import { formatNumber, debounce } from '../utils/formatters.js'

const props = defineProps({
  field: { type: Object, required: true },
  isStream: { type: Boolean, default: false },
  defaultExpanded: { type: Boolean, default: false },
})

const fieldStore = useFieldStore()
const queryStore = useQueryStore()
const settingsStore = useSettingsStore()

const expanded = ref(props.defaultExpanded)
const valueSearch = ref('')
const remoteFilter = computed(() => valueSearch.value.length >= 2 ? valueSearch.value : '')
const lastLoadedContext = ref('')

const cachedData = computed(() => fieldStore.getCachedValues({
  field: props.field.value,
  isStream: props.isStream,
  query: queryStore.effectiveQuery,
  start: queryStore.timeRange.start,
  end: queryStore.timeRange.end,
  filter: remoteFilter.value,
}))

const maxHits = computed(() => {
  const vals = cachedData.value.values
  if (vals.length === 0) return 1
  return Math.max(...vals.map(v => v.hits || 0), 1)
})

const displayedValues = computed(() => {
  let vals = cachedData.value.values
  if (valueSearch.value) {
    const q = valueSearch.value.toLowerCase()
    vals = vals.filter(v => v.value.toLowerCase().includes(q))
  }
  return vals
})

const isColumnActive = computed(() => {
  return settingsStore.tableColumns.includes(props.field.value)
})

const currentLoadContext = computed(() => JSON.stringify([
  props.field.value,
  props.isStream ? 'stream' : 'log',
  queryStore.effectiveQuery,
  queryStore.timeRange.start,
  queryStore.timeRange.end,
  remoteFilter.value,
]))

function getBarWidth(hits) {
  return Math.max(2, (hits / maxHits.value) * 100)
}

function toggleExpand() {
  expanded.value = !expanded.value
  if (expanded.value) {
    loadValues()
  }
}

function loadValues(filter) {
  lastLoadedContext.value = currentLoadContext.value
  fieldStore.loadFieldValues({
    field: props.field.value,
    isStream: props.isStream,
    query: queryStore.effectiveQuery,
    start: queryStore.timeRange.start,
    end: queryStore.timeRange.end,
    filter,
  })
}

function retryLoad() {
  lastLoadedContext.value = ''
  loadValues(remoteFilter.value)
}

function addIncludeFilter(value) {
  queryStore.addFilter(props.field.value, value, props.isStream ? 'stream' : 'log', false)
  queryStore.exitManualMode()
}

function addExcludeFilter(value) {
  queryStore.addFilter(props.field.value, value, props.isStream ? 'stream' : 'log', true)
  queryStore.exitManualMode()
}

const onValueSearch = debounce(() => {
  if (valueSearch.value.length === 0 || valueSearch.value.length >= 2) {
    loadValues(remoteFilter.value)
  }
}, 400)

function loadExpandedValuesIfReady() {
  if (!expanded.value) return
  if (fieldStore.loading || props.field.hits <= 0) return
  if (lastLoadedContext.value === currentLoadContext.value) return
  loadValues(remoteFilter.value)
}

// Default pinned fields wait until field_names succeeds, so they don't compete with the main log query.
onMounted(() => {
  loadExpandedValuesIfReady()
})

watch(() => fieldStore.namesVersion, () => {
  loadExpandedValuesIfReady()
})

watch(() => props.field.hits, () => {
  loadExpandedValuesIfReady()
})

watch(currentLoadContext, () => {
  lastLoadedContext.value = ''
})

watch(() => fieldStore.loading, (loading) => {
  if (!loading) {
    loadExpandedValuesIfReady()
  }
})

// Reload values when query changes (filter linkage)
watch(() => queryStore.queryVersion, () => {
  lastLoadedContext.value = ''
})
</script>
