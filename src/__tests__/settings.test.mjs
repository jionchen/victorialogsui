import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed))
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

globalThis.localStorage = createStorage({
  vlogs_audit_events: JSON.stringify([
    { id: 'audit_1', action: '执行查询', summary: 'level:error', timestamp: '2026-03-28T01:02:03.000Z' },
  ]),
})
globalThis.sessionStorage = createStorage()
globalThis.document = {
  documentElement: { setAttribute() {}, removeAttribute() {} },
  body: { setAttribute() {}, removeAttribute() {} },
}

test('settings store can clear persisted audit events', async () => {
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  assert.equal(store.auditEvents.length, 1)

  store.clearAuditEvents()

  assert.equal(store.auditEvents.length, 0)
  assert.equal(localStorage.getItem('vlogs_audit_events'), JSON.stringify([]))
})

test('settings store keeps only the most recent 200 audit events', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  for (let index = 0; index < 205; index += 1) {
    store.logAuditEvent('执行查询', `query-${index}`)
  }

  assert.equal(store.auditEvents.length, 200)
  assert.equal(store.auditEvents[0].summary, 'query-204')
  assert.equal(store.auditEvents.at(-1).summary, 'query-5')

  const persisted = JSON.parse(localStorage.getItem('vlogs_audit_events'))
  assert.equal(persisted.length, 200)
})
