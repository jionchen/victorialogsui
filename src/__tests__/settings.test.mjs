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

test('settings store force-migrates persisted defaults to the new pinned fields and table columns', async () => {
  localStorage.clear()
  localStorage.setItem('vlogs_pinned_fields', JSON.stringify([
    'src_k8s.namespace.name',
    'src_container.name',
    'src_k8s.pod.name',
  ]))
  localStorage.setItem('vlogs_table_columns', JSON.stringify(['level', '_stream']))

  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  assert.deepEqual(store.pinnedFields, ['src_namespace', 'src_container_name', 'src_pod_name'])
  assert.deepEqual(store.tableColumns, ['_stream'])
  assert.equal(localStorage.getItem('vlogs_defaults_version'), '2026-04-10-defaults-v1')
  assert.equal(localStorage.getItem('vlogs_pinned_fields'), JSON.stringify(['src_namespace', 'src_container_name', 'src_pod_name']))
  assert.equal(localStorage.getItem('vlogs_table_columns'), JSON.stringify(['_stream']))
})

test('settings store persists theme via useStorage', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  assert.equal(store.theme, 'dark')

  store.setTheme('light')

  assert.equal(store.theme, 'light')
  assert.equal(localStorage.getItem('vlogs_theme'), JSON.stringify('light'))
})

test('settings store persists pinnedFields via useStorage', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  store.setPinnedFields(['foo', 'bar'])

  assert.deepEqual(store.pinnedFields, ['foo', 'bar'])
  assert.equal(localStorage.getItem('vlogs_pinned_fields'), JSON.stringify(['foo', 'bar']))
})

test('settings store persists resultLimit via useStorage', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  assert.equal(store.resultLimit, 500)

  store.setResultLimit(1000)

  assert.equal(store.resultLimit, 1000)
  assert.equal(localStorage.getItem('vlogs_result_limit'), '1000')
})

test('settings store persists savedViews via useStorage', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  store.upsertSavedView({ name: 'test-view', snapshot: {} })

  assert.equal(store.savedViews.length, 1)
  assert.equal(store.savedViews[0].name, 'test-view')

  const persisted = JSON.parse(localStorage.getItem('vlogs_saved_views'))
  assert.equal(persisted.length, 1)
  assert.equal(persisted[0].name, 'test-view')
})

test('settings store persists savedQueries via useStorage', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  store.upsertSavedQuery({ name: 'test-query', query: 'level:error' })

  assert.equal(store.savedQueries.length, 1)
  assert.equal(store.savedQueries[0].name, 'test-query')

  const persisted = JSON.parse(localStorage.getItem('vlogs_saved_queries'))
  assert.equal(persisted.length, 1)
  assert.equal(persisted[0].name, 'test-query')
})

test('settings store persists tableColumns via useStorage', async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  const { useSettingsStore } = await import('../stores/settings.js')
  const store = useSettingsStore()

  store.toggleTableColumn('new_col')

  assert.ok(store.tableColumns.includes('new_col'))

  const persisted = JSON.parse(localStorage.getItem('vlogs_table_columns'))
  assert.ok(persisted.includes('new_col'))
})
