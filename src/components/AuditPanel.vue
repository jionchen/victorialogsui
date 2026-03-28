<template>
  <div class="settings-drawer__section">
    <div class="settings-drawer__label">最近审计事件</div>
    <div v-if="settingsStore.auditEvents.length === 0" class="saved-views-menu__empty">
      暂无事件
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
import { useSettingsStore } from '../stores/settings.js'

const settingsStore = useSettingsStore()

function formatTime(value) {
  return new Date(value).toLocaleString()
}
</script>
