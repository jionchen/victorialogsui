<template>
  <a-dropdown trigger="click" position="br">
    <button class="time-preset-btn saved-views-btn">
      视图
    </button>
    <template #content>
      <div class="saved-views-menu">
        <div class="saved-views-menu__header">已保存视图</div>
        <a-doption @click="saveCurrentView">保存当前视图</a-doption>
        <div v-if="settingsStore.savedViews.length === 0" class="saved-views-menu__empty">
          暂无保存视图
        </div>
        <template v-else>
          <a-doption
            v-for="view in settingsStore.savedViews"
            :key="view.id"
            @click="applyView(view)"
          >
            {{ view.name }}
          </a-doption>
        </template>

        <div class="saved-views-menu__header">已保存查询</div>
        <a-doption @click="saveCurrentQuery">保存当前查询</a-doption>
        <div v-if="settingsStore.savedQueries.length === 0" class="saved-views-menu__empty">
          暂无保存查询
        </div>
        <template v-else>
          <a-doption
            v-for="item in settingsStore.savedQueries"
            :key="item.id"
            @click="applySavedQuery(item)"
          >
            {{ item.name }}
          </a-doption>
        </template>
      </div>
    </template>
  </a-dropdown>
</template>

<script setup>
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'

const queryStore = useQueryStore()
const settingsStore = useSettingsStore()

function saveCurrentView() {
  const name = window.prompt('请输入视图名称', buildDefaultViewName())
  if (!name) return

  settingsStore.upsertSavedView({
    name: name.trim(),
    snapshot: queryStore.createSnapshot(),
    summary: queryStore.effectiveQuery,
  })
}

function saveCurrentQuery() {
  const currentQuery = queryStore.effectiveQuery
  if (!currentQuery || currentQuery === '*') return

  const name = window.prompt('请输入查询名称', currentQuery)
  if (!name) return

  settingsStore.upsertSavedQuery({
    name: name.trim(),
    query: currentQuery,
  })
}

function applyView(view) {
  queryStore.applySnapshot(view.snapshot)
  queryStore.executeQuery()
}

function applySavedQuery(item) {
  queryStore.updateManualDraft(item.query)
  queryStore.submitQueryDraft()
  queryStore.executeQuery()
}

function buildDefaultViewName() {
  return `视图 ${new Date().toLocaleString()}`
}
</script>
