<template>
  <div class="query-editor">
    <div class="query-editor__main">
      <input
        ref="inputRef"
        v-model="queryText"
        class="query-editor__input"
        :class="[`is-${validation.level}`]"
        aria-label="查询输入"
        :role="showSuggestions && suggestions.length > 0 ? 'combobox' : undefined"
        :aria-autocomplete="showSuggestions && suggestions.length > 0 ? 'list' : undefined"
        :aria-expanded="showSuggestions && suggestions.length > 0"
        :aria-controls="showSuggestions && suggestions.length > 0 ? 'query-suggestions' : undefined"
        :aria-activedescendant="showSuggestions && suggestions.length > 0 ? `query-suggestion-${selectedIndex}` : undefined"
        :placeholder="'LogsQL: 例如 level:error 或 {src_k8s.namespace.name=\x22production\x22}'"
        @keydown.enter="onKeydownEnter"
        @keydown.down.prevent="onKeydownDown"
        @keydown.up.prevent="onKeydownUp"
        @keydown.escape="onKeydownEscape"
        @input="onInput"
        @blur="onBlur"
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
              class="query-history__item"
              @click="applyHistory(h)"
            >
              {{ h }}
            </a-doption>
            <div class="query-history__divider" />
            <a-doption class="query-history__clear" @click="confirmClearQueryHistory">
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
    <div
      v-if="showSuggestions && suggestions.length > 0"
      id="query-suggestions"
      class="query-editor__suggestions"
      role="listbox"
      :aria-label="'查询建议'"
    >
      <div
        v-for="(s, idx) in suggestions"
        :id="`query-suggestion-${idx}`"
        :key="idx"
        class="query-editor__suggestion"
        :class="{ 'is-selected': idx === selectedIndex }"
        role="option"
        :aria-selected="idx === selectedIndex"
        @mousedown.prevent="applySuggestion(s)"
        @mouseenter="selectedIndex = idx"
      >
        <span class="query-editor__suggestion-label">{{ s.label }}</span>
        <span v-if="s.detail" class="query-editor__suggestion-detail">{{ s.detail }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { useFieldStore } from '../stores/fields.js'
import { shouldShowValidationBadge, validateQuery } from '../utils/queryValidation.js'
import { createQueryCompletionEngine } from '../composables/queryCompletion.js'

const queryStore = useQueryStore()
const fieldStore = useFieldStore()

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

const inputRef = ref(null)
const suggestions = ref([])
const showSuggestions = ref(false)
const selectedIndex = ref(0)
const blurTimeout = ref(null)

const completionEngine = computed(() =>
  createQueryCompletionEngine({
    getLogFieldNames: () => fieldStore.logFieldNames,
    getStreamFieldNames: () => fieldStore.streamFieldNames,
    getFieldValues: (field) => {
      const cacheEntry = Object.values(fieldStore.fieldValuesCache).find(
        (item) => item?.values && fieldStore.streamFieldNames.some((s) => s.value === field)
          ? false
          : item?.values,
      )
      if (cacheEntry?.values) {
        return cacheEntry.values
      }
      const streamEntry = Object.values(fieldStore.fieldValuesCache).find(
        (item) => item?.values && fieldStore.streamFieldNames.some((s) => s.value === field),
      )
      return streamEntry?.values || null
    },
  }),
)

function triggerCompletion() {
  const input = inputRef.value
  if (!input) return
  const text = queryText.value || ''
  const cursorPos = input.selectionStart || text.length
  const engine = completionEngine.value
  suggestions.value = engine.getSuggestions(text, cursorPos)
  selectedIndex.value = 0
  showSuggestions.value = suggestions.value.length > 0
}

function applySuggestion(suggestion) {
  const input = inputRef.value
  if (!input) return
  const text = queryText.value || ''
  const cursorPos = input.selectionStart || text.length
  const insertText = suggestion.insertText ?? suggestion.label

  const before = text.slice(0, cursorPos)
  const tokenMatch = before.match(/([^\s{}()|,]*)$/)
  const tokenStart = tokenMatch ? cursorPos - tokenMatch[1].length : cursorPos

  const newText = text.slice(0, tokenStart) + insertText + text.slice(cursorPos)
  queryStore.updateManualDraft(newText)

  showSuggestions.value = false
  suggestions.value = []

  requestAnimationFrame(() => {
    const newCursor = tokenStart + insertText.length
    input.setSelectionRange(newCursor, newCursor)
    input.focus()
  })
}

function onInput() {
  queryStore.updateManualDraft(queryText.value)
  triggerCompletion()
}

function onKeydownEnter() {
  if (showSuggestions.value && suggestions.value.length > 0) {
    applySuggestion(suggestions.value[selectedIndex.value])
    return
  }
  queryStore.submitQueryDraft()
  queryStore.executeQuery()
}

function onKeydownDown() {
  if (!showSuggestions.value || suggestions.value.length === 0) return
  selectedIndex.value = (selectedIndex.value + 1) % suggestions.value.length
}

function onKeydownUp() {
  if (!showSuggestions.value || suggestions.value.length === 0) return
  selectedIndex.value = (selectedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
}

function onKeydownEscape() {
  showSuggestions.value = false
}

function onBlur() {
  blurTimeout.value = setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}

function applyHistory(h) {
  queryStore.updateManualDraft(h)
  queryStore.submitQueryDraft()
  queryStore.executeQuery()
}

function confirmClearQueryHistory() {
  if (!confirm('确定要清空查询历史吗？')) return
  queryStore.clearQueryHistory()
}
</script>

<style scoped>
.query-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.query-editor__main {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
}

.query-editor__input {
  flex: 1;
  min-width: 0;
  padding: 8px 40px 8px 12px;
  border: 1px solid var(--color-border-2, #c9cdd4);
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  background: var(--color-bg-2, #fff);
  color: var(--color-text-1, #1d2129);
  transition: border-color 0.2s;
}

.query-editor__input:focus {
  outline: none;
  border-color: var(--color-primary, #165dff);
}

.query-editor__input.is-valid {
  border-color: var(--color-success, #00b42a);
}

.query-editor__input.is-warning {
  border-color: var(--color-warning, #ff7d00);
}

.query-editor__input.is-error {
  border-color: var(--color-danger, #f53f3f);
}

.query-editor__status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.query-editor__status.is-valid {
  color: var(--color-success, #00b42a);
}

.query-editor__status.is-warning {
  color: var(--color-warning, #ff7d00);
}

.query-editor__status.is-error {
  color: var(--color-danger, #f53f3f);
}

.query-editor__suggestions {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--color-bg-2, #fff);
  border: 1px solid var(--color-border-2, #c9cdd4);
  border-radius: 4px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  max-height: 240px;
  overflow-y: auto;
}

.query-editor__suggestion {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.15s;
}

.query-editor__suggestion:hover,
.query-editor__suggestion.is-selected {
  background: var(--color-fill-2, #f2f3f5);
}

.query-editor__suggestion-label {
  color: var(--color-text-1, #1d2129);
}

.query-editor__suggestion-detail {
  color: var(--color-text-3, #86909c);
  font-size: 12px;
  margin-left: 8px;
}
</style>
