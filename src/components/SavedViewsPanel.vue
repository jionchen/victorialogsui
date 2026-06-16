<template>
  <a-dropdown trigger="click" position="br">
    <button class="time-preset-btn saved-views-btn">
      视图
    </button>
    <template #content>
      <div class="saved-views-menu">
        <div class="saved-views-menu__header">已保存视图</div>
        <a-doption @click="openSaveDialog('view')">保存当前视图</a-doption>
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
        <a-doption :disabled="!canSaveQuery" @click="openSaveDialog('query')">保存当前查询</a-doption>
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

  <a-modal
    v-model:visible="saveDialogVisible"
    title="保存前确认"
    :footer="false"
  >
    <div class="saved-view-modal">
      <label class="saved-view-modal__label" for="saved-view-name">名称</label>
      <input
        id="saved-view-name"
        v-model="saveName"
        class="saved-view-modal__input"
        placeholder="输入名称"
      />
      <div class="saved-view-modal__summary">
        <div><span>类型</span>{{ saveMode === 'view' ? '视图' : '查询' }}</div>
        <div><span>查询</span><code>{{ queryStore.effectiveQuery }}</code></div>
        <div><span>时间</span>{{ timeSummary }}</div>
        <div><span>筛选</span>{{ filterSummary }}</div>
      </div>
      <div class="saved-view-modal__actions">
        <button class="connection-recovery__secondary" @click="saveDialogVisible = false">
          取消
        </button>
        <button class="btn-primary" :disabled="!saveName.trim()" @click="confirmSave">
          保存
        </button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'

const queryStore = useQueryStore()
const settingsStore = useSettingsStore()
const saveDialogVisible = ref(false)
const saveMode = ref('view')
const saveName = ref('')

const canSaveQuery = computed(() => {
  const currentQuery = queryStore.effectiveQuery
  return Boolean(currentQuery && currentQuery !== '*')
})

const timeSummary = computed(() => {
  const { start, end } = queryStore.timeRange
  return start && end ? `${start} ~ ${end}` : queryStore.timePreset || '自定义'
})

const filterSummary = computed(() => {
  if (!queryStore.filters.length) return '无'
  return `${queryStore.filters.length} 个筛选条件`
})

function openSaveDialog(mode) {
  if (mode === 'query' && !canSaveQuery.value) return
  saveMode.value = mode
  saveName.value = mode === 'view' ? buildDefaultViewName() : queryStore.effectiveQuery
  saveDialogVisible.value = true
}

function confirmSave() {
  const name = saveName.value.trim()
  if (!name) return

  if (saveMode.value === 'view') {
    settingsStore.upsertSavedView({
      name,
      snapshot: queryStore.createSnapshot(),
      summary: queryStore.effectiveQuery,
    })
  } else {
    settingsStore.upsertSavedQuery({
      name,
      query: queryStore.effectiveQuery,
    })
  }

  saveDialogVisible.value = false
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
