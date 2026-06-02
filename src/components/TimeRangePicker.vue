<template>
  <div class="time-picker">
    <div class="time-picker__presets">
      <button
        v-for="preset in TIME_PRESETS"
        :key="preset.value"
        class="time-preset-btn"
        :class="{ active: queryStore.timePreset === preset.value }"
        @click="queryStore.setTimePreset(preset.value)"
      >
        {{ preset.label }}
      </button>
    </div>
    <a-popover trigger="click" position="bottom">
      <button
        class="time-preset-btn"
        :class="{ active: queryStore.isCustomTime }"
      >
        {{ queryStore.isCustomTime ? queryStore.timeRangeLabel : '自定义' }}
      </button>
      <template #content>
        <div style="padding: 8px; display: flex; flex-direction: column; gap: 8px;">
          <div class="time-picker__abs-heading">绝对时间区间</div>
          <a-date-picker
            v-model="startTime"
            show-time
            placeholder="开始时间"
            style="width: 220px;"
            @change="onCustomChange"
          />
          <a-date-picker
            v-model="endTime"
            show-time
            placeholder="结束时间"
            style="width: 220px;"
            @change="onCustomChange"
          />
        </div>
      </template>
    </a-popover>
    <a-divider direction="vertical" />
    <a-dropdown trigger="click">
      <button class="time-preset-btn">
        {{ autoRefreshLabel }}
      </button>
      <template #content>
        <a-doption @click="queryStore.setAutoRefresh(0)">关闭</a-doption>
        <a-doption @click="queryStore.setAutoRefresh(10000)">10s</a-doption>
        <a-doption @click="queryStore.setAutoRefresh(30000)">30s</a-doption>
        <a-doption @click="queryStore.setAutoRefresh(60000)">1m</a-doption>
        <a-doption @click="queryStore.setAutoRefresh(300000)">5m</a-doption>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { TIME_PRESETS } from '../utils/timeUtils.js'

const queryStore = useQueryStore()
const startTime = ref('')
const endTime = ref('')

// One-way sync: store ISO -> local pickers, so reopening the popover reflects
// the current custom range and catches histogram brush-zoom writes.
watch(
  [() => queryStore.customStart, () => queryStore.customEnd],
  ([start, end]) => {
    startTime.value = start || ''
    endTime.value = end || ''
  },
  { immediate: true }
)

const autoRefreshLabel = computed(() => {
  const ms = queryStore.autoRefreshInterval
  if (ms === 0) return '自动刷新'
  if (ms < 60000) return `${ms / 1000}s`
  return `${ms / 60000}m`
})

function onCustomChange() {
  if (startTime.value && endTime.value) {
    queryStore.setCustomTime(
      new Date(startTime.value).toISOString(),
      new Date(endTime.value).toISOString()
    )
  }
}
</script>

<style scoped>
.time-picker__abs-heading {
  font-size: 12px;
  color: var(--text-secondary, #888);
  font-weight: 600;
}
</style>
