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
