<template>
  <div
    class="field-sidebar"
    :class="{ 'is-drawer-open': drawerMode && drawerOpen }"
    :style="drawerMode ? {} : { width: sidebarWidth + 'px' }"
  >
    <!-- Close button for drawer mode -->
    <button
      v-if="drawerMode"
      class="field-sidebar__close-btn"
      @click="emit('closeDrawer')"
      title="关闭"
    >
      &#10005;
    </button>

    <!-- Search -->
    <div class="field-sidebar__search">
      <input
        v-model="searchText"
        placeholder="搜索字段..."
      />
    </div>

    <!-- Field List -->
    <div class="field-sidebar__list">
      <!-- Loading skeleton -->
      <template v-if="fieldStore.loading">
        <div v-for="i in 8" :key="i" class="skeleton-row">
          <div class="skeleton" :style="{ width: skeletonWidths[i - 1] + '%', height: '14px', marginBottom: '4px' }"></div>
        </div>
      </template>

      <template v-else>
        <div v-if="fieldStore.error" class="field-sidebar__error">
          <span>字段加载失败，可重试</span>
          <button class="link-btn" @click="retryFieldNames">重试</button>
        </div>

        <!-- Pinned Fields Section -->
        <div v-if="pinnedFieldItems.length > 0">
          <div class="field-sidebar__section-title">置顶字段</div>
          <FieldItem
            v-for="field in pinnedFieldItems"
            :key="'pinned-' + field.value"
            :field="field"
            :is-stream="field.isStream"
            :default-expanded="true"
          />
        </div>

        <!-- Stream Fields Section -->
        <div v-if="filteredStreamFields.length > 0">
          <div class="field-sidebar__section-title">Stream 字段</div>
          <FieldItem
            v-for="field in filteredStreamFields"
            :key="'stream-' + field.value"
            :field="field"
            :is-stream="true"
          />
        </div>

        <!-- Log Fields Section -->
        <div v-if="filteredLogFields.length > 0">
          <div class="field-sidebar__section-title">日志字段</div>
          <FieldItem
            v-for="field in filteredLogFields"
            :key="'log-' + field.value"
            :field="field"
            :is-stream="false"
          />
        </div>

        <!-- Empty state -->
        <div v-if="filteredStreamFields.length === 0 && filteredLogFields.length === 0 && pinnedFieldItems.length === 0" class="empty-state">
          <div class="empty-state__icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <div class="empty-state__text">未找到字段</div>
          <div class="empty-state__hint">请尝试调整时间范围</div>
        </div>
      </template>
    </div>

    <!-- Resize handle -->
    <div
      class="field-sidebar__resize-handle"
      :class="{ active: isResizing }"
      role="separator"
      aria-orientation="vertical"
      aria-label="调整侧边栏宽度"
      tabindex="0"
      @mousedown="startResize"
      @keydown.enter="startResize"
      @keydown.space.prevent="startResize"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useFieldStore } from '../stores/fields.js'
import { useSettingsStore } from '../stores/settings.js'
import { useQueryStore } from '../stores/query.js'
import FieldItem from './FieldItem.vue'

const props = defineProps({
  drawerMode: { type: Boolean, default: false },
  drawerOpen: { type: Boolean, default: false },
})

const emit = defineEmits(['closeDrawer'])

const fieldStore = useFieldStore()
const settingsStore = useSettingsStore()
const queryStore = useQueryStore()

const searchText = ref('')
const sidebarWidth = ref(280)
const isResizing = ref(false)

// Pre-computed skeleton widths to avoid Math.random() in templates
const skeletonWidths = [56, 72, 48, 65, 43, 78, 54, 61]

// Pinned fields with their data
const pinnedFieldItems = computed(() => {
  const pinned = settingsStore.pinnedFields
  const items = []
  for (const name of pinned) {
    // Check stream fields first
    const streamField = fieldStore.streamFieldNames.find(f => f.value === name)
    if (streamField) {
      items.push({ ...streamField, isStream: true })
      continue
    }
    // Check log fields
    const logField = fieldStore.logFieldNames.find(f => f.value === name)
    if (logField) {
      items.push({ ...logField, isStream: false })
      continue
    }
    // Still show it even if not found (might appear after query)
    items.push({ value: name, hits: 0, isStream: false })
  }
  return items.filter(f => matchSearch(f.value))
})

// Filtered stream fields (excluding pinned)
const filteredStreamFields = computed(() => {
  const pinned = new Set(settingsStore.pinnedFields)
  return fieldStore.streamFieldNames
    .filter(f => !pinned.has(f.value) && matchSearch(f.value))
})

// Filtered log fields (excluding pinned)
const filteredLogFields = computed(() => {
  const pinned = new Set(settingsStore.pinnedFields)
  return fieldStore.logFieldNames
    .filter(f => !pinned.has(f.value) && matchSearch(f.value))
})

function matchSearch(name) {
  if (!searchText.value) return true
  return name.toLowerCase().includes(searchText.value.toLowerCase())
}

function retryFieldNames() {
  const { start, end } = queryStore.timeRange
  fieldStore.loadFieldNames({
    query: queryStore.effectiveQuery,
    start,
    end,
  })
}

// Resize logic
function startResize(e) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  function onMouseMove(e) {
    const delta = e.clientX - startX
    sidebarWidth.value = Math.max(200, Math.min(450, startWidth + delta))
  }

  function onMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}
</script>
