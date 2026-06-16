<template>
  <a-dropdown trigger="click" position="br">
    <button
      class="time-preset-btn saved-views-btn"
      :class="{ active: isLive, 'is-tail': logStore.tailMode }"
      title="实时尾随"
    >
      {{ liveLabel }}
    </button>
    <template #content>
      <div class="saved-views-menu">
        <div class="saved-views-menu__header">{{ logStore.tailMode ? '实时尾随中' : '自动刷新' }}</div>
        <template v-if="!logStore.tailMode">
          <a-doption @click="startTail(5000)">▶ 5 秒尾随</a-doption>
          <a-doption @click="startTail(10000)">▶ 10 秒尾随</a-doption>
          <a-doption @click="startTail(30000)">▶ 30 秒尾随</a-doption>
          <a-doption @click="setLive(0)">关闭</a-doption>
        </template>
        <template v-else>
          <a-doption class="live-tail-stop" @click="stopTail">⏹ 停止尾随</a-doption>
        </template>
      </div>
    </template>
  </a-dropdown>
</template>

<script setup>
import { computed } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { useLogStore } from '../stores/logs.js'

const queryStore = useQueryStore()
const logStore = useLogStore()

const isLive = computed(() => queryStore.autoRefreshInterval > 0)
const liveLabel = computed(() => {
  if (logStore.tailMode) return '实时尾随'
  if (!isLive.value) return '自动刷新'
  return `轮询 ${Math.round(queryStore.autoRefreshInterval / 1000)}s`
})

function startTail(interval) {
  logStore.setTailMode(true)
  queryStore.setAutoRefresh(interval)
  queryStore.executeQuery()
}

function stopTail() {
  logStore.setTailMode(false)
  queryStore.setAutoRefresh(0)
}

function setLive(interval) {
  queryStore.setAutoRefresh(interval)
  if (interval > 0) {
    queryStore.executeQuery()
  }
}
</script>

<style scoped>
.is-tail {
  color: var(--color-primary, #165dff);
  border-color: var(--color-primary, #165dff);
}

.live-tail-stop {
  color: var(--color-danger, #f53f3f);
}
</style>
