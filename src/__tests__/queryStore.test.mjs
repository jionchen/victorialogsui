import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'

function createStorage() {
  const data = new Map()
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    },
    clear() {
      data.clear()
    },
  }
}

globalThis.localStorage = createStorage()
globalThis.sessionStorage = createStorage()
globalThis.document = {
  documentElement: { setAttribute() {}, removeAttribute() {} },
  body: { setAttribute() {}, removeAttribute() {} },
}

test('query store keeps draft edits separate from submitted manual query', async () => {
  setActivePinia(createPinia())
  const { useQueryStore } = await import('../stores/query.js')
  const store = useQueryStore()

  store.updateManualDraft('level:error')

  assert.equal(store.effectiveQuery, '*')
  assert.equal(store.manualDraft, 'level:error')

  store.submitQueryDraft()

  assert.equal(store.isManualMode, true)
  assert.equal(store.effectiveQuery, 'level:error')
})

test('query store can return to visual mode when submitted draft matches built query', async () => {
  setActivePinia(createPinia())
  const { useQueryStore } = await import('../stores/query.js')
  const store = useQueryStore()

  store.addFilter('level', 'error')
  store.updateManualDraft('level:error')
  store.submitQueryDraft()

  assert.equal(store.isManualMode, false)
  assert.equal(store.effectiveQuery, 'level:error')
})

test('query store can export and re-apply a saved view snapshot', async () => {
  setActivePinia(createPinia())
  const { useQueryStore } = await import('../stores/query.js')
  const store = useQueryStore()

  store.setTimePreset('1h')
  store.addFilter('service', 'payments')
  store.updateManualDraft('status:500')
  store.submitQueryDraft()

  const snapshot = store.createSnapshot()

  store.clearAllFilters()
  store.setTimePreset('5m')
  store.exitManualMode()

  store.applySnapshot(snapshot)

  assert.equal(store.timePreset, '1h')
  assert.equal(store.filters.length, 1)
  assert.equal(store.filters[0].field, 'service')
  assert.equal(store.manualDraft, 'status:500')
  assert.equal(store.effectiveQuery, 'status:500')
})

test('query store echoes custom time range and distinguishes relative presets', async () => {
  setActivePinia(createPinia())
  const { useQueryStore } = await import('../stores/query.js')
  const store = useQueryStore()

  store.setCustomTime('2026-06-01T00:00:00.000Z', '2026-06-02T00:00:00.000Z')

  assert.equal(store.isCustomTime, true)
  assert.equal(store.timePreset, '')
  assert.ok(store.timeRangeLabel.includes('2026-06-01'))
  assert.ok(store.timeRangeLabel.includes('2026-06-02'))
  assert.ok(store.timeRangeLabel.includes('~'))

  store.setTimePreset('6h')

  assert.equal(store.isCustomTime, false)
  assert.equal(store.customStart, '')
  assert.equal(store.customEnd, '')
  assert.equal(store.timeRangeLabel, '最近 6h')
})
