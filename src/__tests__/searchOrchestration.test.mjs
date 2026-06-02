import test from 'node:test'
import assert from 'node:assert/strict'

test('search executor resolves after main logs and runs auxiliary requests in the background', async () => {
  const { createSearchExecutor } = await import('../utils/searchOrchestration.js')
  const events = []
  let resolveHistogram
  let rejectFields

  const executor = createSearchExecutor({
    auxiliaryDelayMs: 0,
    fetchLogs: async () => {
      events.push('logs')
    },
    fetchHistogram: async () => {
      events.push('histogram-start')
      await new Promise(resolve => { resolveHistogram = resolve })
      events.push('histogram-done')
    },
    loadFieldNames: async () => {
      events.push('fields-start')
      await new Promise((resolve, reject) => { rejectFields = reject })
    },
    onAuxiliaryError: (source, error) => {
      events.push(`${source}:${error.message}`)
    },
  })

  await executor.execute({ query: '*', limit: 500, start: '5m', end: 'now', step: '1m' })

  assert.deepEqual(events, ['logs'])

  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(events, ['logs', 'histogram-start', 'fields-start'])

  rejectFields(new Error('field names timeout'))
  resolveHistogram()
  await executor.waitForAuxiliary()

  assert.equal(events[0], 'logs')
  assert.ok(events.includes('histogram-start'))
  assert.ok(events.includes('fields-start'))
  assert.ok(events.includes('histogram-done'))
  assert.ok(events.includes('fields:field names timeout'))
})

test('large queries use a longer auxiliary delay to reduce backend contention', async () => {
  const { calculateAuxiliaryDelayMs } = await import('../utils/searchOrchestration.js')

  assert.equal(calculateAuxiliaryDelayMs({ limit: 500, rangeMs: 5 * 60 * 1000 }), 150)
  assert.equal(calculateAuxiliaryDelayMs({ limit: 2000, rangeMs: 5 * 60 * 1000 }), 800)
  assert.equal(calculateAuxiliaryDelayMs({ limit: 500, rangeMs: 2 * 24 * 60 * 60 * 1000 }), 800)
})

test('search executor loads facets once per execute, after field names succeed', async () => {
  const { createSearchExecutor } = await import('../utils/searchOrchestration.js')
  const events = []

  const executor = createSearchExecutor({
    auxiliaryDelayMs: 0,
    fetchLogs: async () => { events.push('logs') },
    fetchHistogram: async () => { events.push('histogram') },
    loadFieldNames: async () => { events.push('fields') },
    loadFacets: async () => { events.push('facets') },
    onAuxiliaryError: (source, error) => { events.push(`${source}:${error.message}`) },
  })

  await executor.execute({ query: '*', limit: 500, start: '5m', end: 'now', step: '1m' })
  await executor.waitForAuxiliary()

  const facetsCount = events.filter(e => e === 'facets').length
  assert.equal(facetsCount, 1)
  assert.ok(events.indexOf('fields') < events.indexOf('facets'))
})

test('search executor routes facets failures through onAuxiliaryError', async () => {
  const { createSearchExecutor } = await import('../utils/searchOrchestration.js')
  const events = []

  const executor = createSearchExecutor({
    auxiliaryDelayMs: 0,
    fetchLogs: async () => { events.push('logs') },
    fetchHistogram: async () => { events.push('histogram') },
    loadFieldNames: async () => { events.push('fields') },
    loadFacets: async () => { throw new Error('facets boom') },
    onAuxiliaryError: (source, error) => { events.push(`${source}:${error.message}`) },
  })

  await executor.execute({ query: '*', limit: 500, start: '5m', end: 'now', step: '1m' })
  await executor.waitForAuxiliary()

  assert.ok(events.includes('facets:facets boom'))
})

test('search executor does not load facets for a stale run', async () => {
  const { createSearchExecutor } = await import('../utils/searchOrchestration.js')
  const events = []
  const fieldGates = []

  const executor = createSearchExecutor({
    auxiliaryDelayMs: 0,
    fetchLogs: async () => { events.push('logs') },
    fetchHistogram: async () => { events.push('histogram') },
    loadFieldNames: async () => {
      events.push('fields')
      await new Promise(resolve => { fieldGates.push(resolve) })
    },
    loadFacets: async () => { events.push('facets') },
    onAuxiliaryError: () => {},
  })

  // First run: reaches loadFieldNames and blocks.
  await executor.execute({ query: '*', limit: 500, start: '5m', end: 'now', step: '1m' })
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(fieldGates.length, 1)

  // Second run invalidates the first run's runId, then also blocks on field names.
  await executor.execute({ query: 'error', limit: 500, start: '5m', end: 'now', step: '1m' })
  await new Promise(resolve => setTimeout(resolve, 0))

  // Resolve the first (now stale) run's field names: facets must NOT fire for it.
  fieldGates[0]()
  await new Promise(resolve => setTimeout(resolve, 0))

  const facetsCount = events.filter(e => e === 'facets').length
  assert.equal(facetsCount, 0)
})
