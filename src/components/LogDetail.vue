<template>
  <div class="log-detail">
    <!-- Tabs -->
    <div class="log-detail__tabs" style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <button
          class="log-detail__tab"
          :class="{ active: activeTab === 'table' }"
          @click="activeTab = 'table'"
        >
          字段表
        </button>
        <button
          class="log-detail__tab"
          :class="{ active: activeTab === 'json' }"
          @click="activeTab = 'json'"
        >
          JSON 源码
        </button>
      </div>
      <div class="log-detail__actions">
        <button class="log-detail__action-btn" @click="copyLog">
          {{ copied ? '已复制' : '复制原始信息' }}
        </button>
        <button class="log-detail__action-btn" @click="$emit('view-context', log)">
          查看上下文日志
        </button>
      </div>
    </div>

    <!-- Table View -->
    <div v-if="activeTab === 'table'" class="log-detail__body">
      <table class="log-detail__table">
        <tbody>
          <tr v-for="[key, value] in sortedFields" :key="key">
            <td>{{ key }}</td>
            <td>
              <template v-if="isJsonValue(value)">
                <pre style="margin: 0; white-space: pre-wrap; font-size: 11px;">{{ formatJsonValue(value) }}</pre>
              </template>
              <template v-else>{{ value }}</template>
            </td>
            <td>
              <div class="field-value-row__actions" style="opacity: 1;">
                <button
                  class="field-value-row__action-btn"
                  title="包含此值"
                  @click.stop="addFilter(key, String(value), false)"
                >+</button>
                <button
                  class="field-value-row__action-btn exclude"
                  title="排除此值"
                  @click.stop="addFilter(key, String(value), true)"
                >−</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- JSON View -->
    <div v-if="activeTab === 'json'" class="log-detail__json">
      <pre style="margin: 0; white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 12px; padding: 12px; background: var(--bg-surface); border-radius: 4px; overflow-x: auto;">{{ jsonFormatted }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQueryStore } from '../stores/query.js'
import { tryFormatJSON } from '../utils/formatters.js'

const props = defineProps({
  log: { type: Object, required: true },
  isStreamField: { type: Function, default: () => false },
})

defineEmits(['view-context'])

const queryStore = useQueryStore()
const activeTab = ref('table')
const copied = ref(false)

function copyLog() {
  navigator.clipboard.writeText(jsonFormatted.value).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }).catch(err => {
    console.error('Failed to copy text: ', err)
  })
}

// Sort fields: _time first, then stream fields, then others, _msg last
const sortedFields = computed(() => {
  const entries = Object.entries(props.log)
  return entries.sort((a, b) => {
    const order = (key) => {
      if (key === '_time') return 0
      if (key.startsWith('src_')) return 1
      if (key === 'level') return 2
      if (key === '_stream') return 8
      if (key === '_stream_id') return 9
      if (key === '_msg') return 10
      return 5
    }
    return order(a[0]) - order(b[0])
  })
})

const jsonFormatted = computed(() => {
  return JSON.stringify(props.log, null, 2)
})

function isJsonValue(value) {
  if (typeof value !== 'string') return false
  return tryFormatJSON(value) !== null
}

function formatJsonValue(value) {
  return tryFormatJSON(value) || value
}

function addFilter(field, value, negated) {
  const type = props.isStreamField(field) ? 'stream' : 'log'
  queryStore.addFilter(field, value, type, negated)
  queryStore.exitManualMode()
}
</script>
