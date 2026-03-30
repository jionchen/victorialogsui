<template>
  <div class="audit-panel-wrapper">
    <div v-if="showToolbar" class="audit-panel__toolbar">
      <div>
        <div class="audit-panel__heading">{{ title }}</div>
        <div class="audit-panel__caption">{{ caption }}</div>
      </div>
      <button v-if="showClear && settingsStore.auditEvents.length > 0" class="audit-panel__clear" @click="settingsStore.clearAuditEvents()">
        清空
      </button>
    </div>
    <div v-if="settingsStore.auditEvents.length === 0" class="saved-views-menu__empty">
      {{ emptyText }}
    </div>
    <div v-else class="audit-panel">
      <div v-for="event in settingsStore.auditEvents" :key="event.id" class="audit-panel__row">
        <div class="audit-panel__title">{{ event.action }}</div>
        <div class="audit-panel__meta">{{ event.summary }}</div>
        <div class="audit-panel__time">{{ formatTime(event.timestamp) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '最近活动',
  },
  caption: {
    type: String,
    default: '记录最近的查询、保存和切换操作。',
  },
  emptyText: {
    type: String,
    default: '暂无事件',
  },
  showToolbar: {
    type: Boolean,
    default: true,
  },
  showClear: {
    type: Boolean,
    default: false,
  },
})

import { useSettingsStore } from '../stores/settings.js'

const settingsStore = useSettingsStore()

function formatTime(value) {
  return new Date(value).toLocaleString()
}
</script>
