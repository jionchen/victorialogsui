<template>
  <div class="query-editor">
    <div class="query-editor__main">
      <input
        class="query-editor__input"
        :class="[`is-${validation.level}`]"
        v-model="queryText"
        :placeholder="'LogsQL: 例如 level:error 或 {src_k8s.namespace.name=\x22production\x22}'"
        @keydown.enter="onSubmit"
        @input="onInput"
      />
      <a-dropdown trigger="click" position="br">
        <button class="icon-btn" title="查询历史" style="margin-left: -36px; z-index: 2;" @click.prevent>
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
      <a-tooltip v-if="showValidationBadge" :content="validation.message" position="bottom">
        <span class="query-editor__status" :class="[`is-${validation.level}`]" :aria-label="validation.message">
          <svg v-if="validation.level === 'valid'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
          <svg v-else-if="validation.level === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M12 3 2 21h20L12 3z"/><path d="M12 9v5"/><path d="M12 18h.01"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6"/><path d="m9 9 6 6"/>
          </svg>
        </span>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { shouldShowValidationBadge, validateQuery } from '../utils/queryValidation.js'

const queryStore = useQueryStore()
const queryText = computed({
  get() {
    if (queryStore.isManualMode || queryStore.manualDraft) {
      return queryStore.manualDraft
    }
    return queryStore.logsQL
  },
  set(value) {
    queryStore.updateManualDraft(value)
  },
})

const validation = computed(() => validateQuery(queryText.value))
const showValidationBadge = computed(() => shouldShowValidationBadge(validation.value))

function onInput() {
  queryStore.updateManualDraft(queryText.value)
}

function onSubmit() {
  queryStore.submitQueryDraft()
  queryStore.executeQuery()
}

function applyHistory(h) {
  queryStore.updateManualDraft(h)
  queryStore.submitQueryDraft()
  queryStore.executeQuery()
}
</script>
