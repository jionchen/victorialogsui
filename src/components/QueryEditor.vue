<template>
  <div class="query-editor">
    <input
      class="query-editor__input"
      v-model="queryText"
      :placeholder="'LogsQL: 例如 level:error 或 {src_k8s.namespace.name=\x22production\x22}'"
      @keydown.enter="onSubmit"
      @input="onInput"
    />
    <a-dropdown trigger="click" position="br">
      <button class="icon-btn" title="查询历史" style="margin-left: -32px; z-index: 2;" @click.prevent>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      </button>
      <template #content>
        <div v-if="queryStore.queryHistory.length === 0" class="query-history__empty">
          暂无历史记录
        </div>
        <template v-else>
          <div class="query-history__header">
            最近查询记录
          </div>
          <a-doption
            v-for="(h, idx) in queryStore.queryHistory"
            :key="idx"
            @click="applyHistory(h)"
            class="query-history__item"
          >
            {{ h }}
          </a-doption>
          <div class="query-history__divider" />
          <a-doption @click="queryStore.clearQueryHistory()" class="query-history__clear">
            清空历史记录
          </a-doption>
        </template>
      </template>
    </a-dropdown>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useQueryStore } from '../stores/query.js'

const queryStore = useQueryStore()
const queryText = ref(queryStore.effectiveQuery)

// Sync from store to input
watch(() => queryStore.logsQL, (val) => {
  if (!queryStore.isManualMode) {
    queryText.value = val
  }
})

function onInput() {
  queryStore.setManualQuery(queryText.value)
}

function onSubmit() {
  queryStore.setManualQuery(queryText.value)
  queryStore.executeQuery()
}

function applyHistory(h) {
  queryText.value = h
  queryStore.setManualQuery(h)
  queryStore.executeQuery()
}
</script>
