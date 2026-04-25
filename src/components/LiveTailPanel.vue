<template>
  <a-dropdown trigger="click" position="br">
    <button class="time-preset-btn saved-views-btn" :class="{ active: isLive }">
      {{ liveLabel }}
    </button>
    <template #content>
      <div class="saved-views-menu">
        <div class="saved-views-menu__header">自动刷新</div>
        <a-doption @click="setLive(0)">关闭</a-doption>
        <a-doption @click="setLive(5000)">5 秒轮询</a-doption>
        <a-doption @click="setLive(10000)">10 秒轮询</a-doption>
        <a-doption @click="setLive(30000)">30 秒轮询</a-doption>
      </div>
    </template>
  </a-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useQueryStore } from '../stores/query.js'

const queryStore = useQueryStore()

const isLive = computed(() => queryStore.autoRefreshInterval > 0)
const liveLabel = computed(() => {
  if (!isLive.value) return '自动刷新'
  return `自动刷新 ${Math.round(queryStore.autoRefreshInterval / 1000)}s`
})

function setLive(interval) {
  queryStore.setAutoRefresh(interval)
  if (interval > 0) {
    queryStore.executeQuery()
  }
}
</script>
