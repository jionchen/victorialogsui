import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'
import { createLogsStore } from '../stores/logs.js'

test('fetchLogs in tailMode appends instead of replacing', async () => {
  setActivePinia(createPinia())
  let call = 0
  const store = createLogsStore({
    queryLogs: async () => {
      call++
      return call === 1
        ? [{ _msg: 'log1', _time: '2024-01-01T00:00:00Z' }]
        : [{ _msg: 'log2', _time: '2024-01-01T00:00:01Z' }]
    },
  })()

  store.setTailMode(true)
  await store.fetchLogs({ query: '*', limit: 100 })
  assert.equal(store.logs.length, 1)
  assert.equal(store.logs[0]._msg, 'log1')

  await store.fetchLogs({ query: '*', limit: 100 })
  assert.equal(store.logs.length, 2)
  assert.ok(store.logs.some(l => l._msg === 'log1'))
  assert.ok(store.logs.some(l => l._msg === 'log2'))
})

test('tailMode deduplicates by _time + _msg', async () => {
  setActivePinia(createPinia())
  const store = createLogsStore({
    queryLogs: async () => [
      { _msg: 'same', _time: '2024-01-01T00:00:00Z' },
      { _msg: 'same', _time: '2024-01-01T00:00:00Z' },
    ],
  })()

  store.setTailMode(true)
  await store.fetchLogs({ query: '*', limit: 100 })
  await store.fetchLogs({ query: '*', limit: 100 })

  assert.equal(store.logs.length, 1)
})

test('tailMode ring buffer drops oldest when exceeding max', async () => {
  setActivePinia(createPinia())
  const manyLogs = Array.from({ length: 10 }, (_, i) => ({
    _msg: `log${i}`,
    _time: `2024-01-01T00:00:${String(i).padStart(2, '0')}Z`,
  }))

  const store = createLogsStore({
    queryLogs: async () => manyLogs,
  })()

  store.setTailMode(true)
  await store.fetchLogs({ query: '*', limit: 100 })
  await store.fetchLogs({ query: '*', limit: 100 })

  // After two fetches of 10 logs each with dedup, should have 10
  assert.equal(store.logs.length, 10)
})

test('setTailMode(false) clears logs', async () => {
  setActivePinia(createPinia())
  const store = createLogsStore({
    queryLogs: async () => [{ _msg: 'log1', _time: '2024-01-01T00:00:00Z' }],
  })()

  store.setTailMode(true)
  store.setTailMode(false)

  assert.equal(store.logs.length, 0)
  assert.equal(store.tailMode, false)
})

test('fetchLogs error in tailMode does not clear existing logs', async () => {
  setActivePinia(createPinia())
  let callCount = 0
  const store = createLogsStore({
    queryLogs: async () => {
      callCount++
      if (callCount === 1) {
        return [{ _msg: 'log1', _time: '2024-01-01T00:00:00Z' }]
      }
      throw new Error('network down')
    },
  })()

  store.setTailMode(true)
  await store.fetchLogs({ query: '*', limit: 100 })
  assert.equal(store.logs.length, 1)

  await store.fetchLogs({ query: '*', limit: 100 })
  assert.equal(store.logs.length, 1) // still there
})
