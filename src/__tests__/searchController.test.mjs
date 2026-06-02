import test from 'node:test'
import assert from 'node:assert/strict'
import { createSearchController } from '../composables/searchController.js'

test('runSearch triggers side-effects in correct order', async () => {
  const events = []

  const controller = createSearchController({
    searchExecutor: {
      execute: async (params) => {
        events.push({ type: 'execute', params })
      },
    },
    getSearchParams: () => ({ query: '*', limit: 500 }),
    clearFieldCache: () => events.push({ type: 'clearFieldCache' }),
    writeUrlState: () => events.push({ type: 'writeUrlState' }),
    logAudit: () => events.push({ type: 'logAudit' }),
  })

  await controller.runSearch()

  assert.equal(events.length, 4)
  assert.deepEqual(
    events.map(e => e.type),
    ['clearFieldCache', 'writeUrlState', 'logAudit', 'execute']
  )
})

test('executeSearch passes getSearchParams result to searchExecutor.execute', async () => {
  const expectedParams = { query: 'error', limit: 1000, start: '1h', end: 'now', step: '1m', rangeMs: 3600000 }
  let receivedParams = null

  const controller = createSearchController({
    searchExecutor: {
      execute: async (params) => {
        receivedParams = params
      },
    },
    getSearchParams: () => expectedParams,
    clearFieldCache: () => {},
    writeUrlState: () => {},
    logAudit: () => {},
  })

  await controller.executeSearch()

  assert.deepEqual(receivedParams, expectedParams)
})

test('executeSearch returns the promise from searchExecutor.execute', async () => {
  const sentinel = { done: true }

  const controller = createSearchController({
    searchExecutor: {
      execute: async () => sentinel,
    },
    getSearchParams: () => ({}),
    clearFieldCache: () => {},
    writeUrlState: () => {},
    logAudit: () => {},
  })

  const result = await controller.executeSearch()

  assert.equal(result, sentinel)
})

test('runSearch skips clearFieldCache when search params unchanged', async () => {
  const events = []

  const controller = createSearchController({
    searchExecutor: {
      execute: async () => {},
    },
    getSearchParams: () => ({ query: '*', limit: 500 }),
    clearFieldCache: () => events.push('clear'),
    writeUrlState: () => events.push('write'),
    logAudit: () => events.push('audit'),
  })

  await controller.runSearch()
  events.length = 0
  await controller.runSearch()

  assert.deepEqual(events, ['write', 'audit'])
})

test('runSearch clears cache again when search params change', async () => {
  const events = []
  let params = { query: '*', limit: 500 }

  const controller = createSearchController({
    searchExecutor: {
      execute: async () => {},
    },
    getSearchParams: () => params,
    clearFieldCache: () => events.push('clear'),
    writeUrlState: () => events.push('write'),
    logAudit: () => events.push('audit'),
  })

  await controller.runSearch()
  events.length = 0
  params = { query: 'error', limit: 500 }
  await controller.runSearch()

  assert.ok(events.includes('clear'))
})
