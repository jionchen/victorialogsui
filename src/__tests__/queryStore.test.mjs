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

