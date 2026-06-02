import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'

test('log store sorts fetched logs by time descending by default', async () => {
  setActivePinia(createPinia())
  const { createLogsStore } = await import('../stores/logs.js')

  const useLogStore = createLogsStore({
    queryLogs: async () => ([
      { _time: '2026-04-10T08:00:00.000Z', _msg: 'older' },
      { _time: '2026-04-10T10:00:00.000Z', _msg: 'newer' },
    ]),
    queryHits: async () => null,
    getApiBaseUrl: () => 'http://logs.example.com',
  })

  const store = useLogStore()
  await store.fetchLogs({ query: '*', limit: 100, start: '24h', end: 'now' })

  assert.equal(store.sortOrder, 'desc')
  assert.deepEqual(store.logs.map(log => log._msg), ['newer', 'older'])
})

test('log store sorts by printable log time before falling back to collection time', async () => {
  setActivePinia(createPinia())
  const { createLogsStore } = await import('../stores/logs.js')

  const useLogStore = createLogsStore({
    queryLogs: async () => ([
      {
        _time: '2026-04-13T09:44:03Z',
        _msg: '[2026-04-13 17:44:02,959] INFO older printable time',
      },
      {
        _time: '2026-04-13T09:44:02Z',
        _msg: '[2026-04-13 17:44:03,100] INFO newer printable time',
      },
    ]),
    queryHits: async () => null,
    getApiBaseUrl: () => 'http://logs.example.com',
  })

  const store = useLogStore()
  await store.fetchLogs({ query: '*', limit: 100, start: '24h', end: 'now' })

  assert.deepEqual(store.logs.map(log => log._msg), [
    '[2026-04-13 17:44:03,100] INFO newer printable time',
    '[2026-04-13 17:44:02,959] INFO older printable time',
  ])
})

test('log store can toggle to ascending order without refetching', async () => {
  setActivePinia(createPinia())
  const { createLogsStore } = await import('../stores/logs.js')

  const useLogStore = createLogsStore({
    queryLogs: async () => ([
      { _time: '2026-04-10T08:00:00.000Z', _msg: 'older' },
      { _time: '2026-04-10T10:00:00.000Z', _msg: 'newer' },
    ]),
    queryHits: async () => null,
    getApiBaseUrl: () => 'http://logs.example.com',
  })

  const store = useLogStore()
  await store.fetchLogs({ query: '*', limit: 100, start: '24h', end: 'now' })
  store.toggleSortOrder()

  assert.equal(store.sortOrder, 'asc')
  assert.deepEqual(store.logs.map(log => log._msg), ['older', 'newer'])
})

test('log store keeps invalid timestamps at the end when sorting', async () => {
  setActivePinia(createPinia())
  const { sortLogsByTime } = await import('../stores/logs.js')

  const sorted = sortLogsByTime([
    { _time: 'invalid', _msg: 'broken' },
    { _time: '2026-04-10T10:00:00.000Z', _msg: 'valid' },
    { _msg: 'missing' },
  ], 'desc')

  assert.deepEqual(sorted.map(log => log._msg), ['valid', 'broken', 'missing'])
})

test('log store records histogram failures without clearing fetched logs', async () => {
  setActivePinia(createPinia())
  const { createLogsStore } = await import('../stores/logs.js')

  const useLogStore = createLogsStore({
    queryLogs: async () => ([
      { _time: '2026-04-10T10:00:00.000Z', _msg: 'kept log' },
    ]),
    queryHits: async () => {
      throw new Error('histogram gateway timeout')
    },
    getApiBaseUrl: () => 'http://logs.example.com',
  })

  const store = useLogStore()
  await store.fetchLogs({ query: '*', limit: 100, start: '24h', end: 'now' })
  await store.fetchHistogram({ query: '*', start: '24h', end: 'now', step: '1m' })

  assert.deepEqual(store.logs.map(log => log._msg), ['kept log'])
  assert.equal(store.histogramData, null)
  assert.equal(store.histogramError, 'histogram gateway timeout')
})

test('log store tracks loaded count from fetchLogs and total hits from fetchHistogram separately', async () => {
  setActivePinia(createPinia())
  const { createLogsStore } = await import('../stores/logs.js')

  const useLogStore = createLogsStore({
    queryLogs: async () => ([
      { _time: '2026-04-10T10:00:00.000Z', _msg: 'a' },
      { _time: '2026-04-10T09:00:00.000Z', _msg: 'b' },
    ]),
    queryHits: async () => ({ hits: [{ total: 500 }, { total: 250 }] }),
    getApiBaseUrl: () => 'http://logs.example.com',
  })

  const store = useLogStore()
  await store.fetchLogs({ query: '*', limit: 2, start: '24h', end: 'now' })

  // fetchLogs records how many rows were loaded, not the hit total.
  assert.equal(store.loadedCount, 2)
  assert.equal(store.totalHits, 0)

  await store.fetchHistogram({ query: '*', start: '24h', end: 'now', step: '1m' })

  // totalHits is authoritatively the aggregated histogram total, loadedCount stays untouched.
  assert.equal(store.totalHits, 750)
  assert.equal(store.loadedCount, 2)

  store.clearLogs()
  assert.equal(store.totalHits, 0)
  assert.equal(store.loadedCount, 0)
})

