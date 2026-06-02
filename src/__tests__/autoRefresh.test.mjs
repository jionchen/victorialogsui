import test from 'node:test'
import assert from 'node:assert/strict'
import { createAutoRefresh } from '../composables/autoRefresh.js'

test('sync(0) clears without setting new interval', () => {
  const events = []

  const autoRefresh = createAutoRefresh({
    onTick: () => events.push('tick'),
    setIntervalFn: () => { events.push('setInterval'); return 42 },
    clearIntervalFn: (id) => events.push('clearInterval:' + id),
  })

  autoRefresh.sync(0)

  assert.deepEqual(events, ['clearInterval:null'])
})

test('sync(n>0) sets interval that calls onTick', () => {
  const events = []
  let intervalCallback = null

  const autoRefresh = createAutoRefresh({
    onTick: () => events.push('tick'),
    setIntervalFn: (fn) => { events.push('setInterval'); intervalCallback = fn; return 42 },
    clearIntervalFn: (id) => events.push('clearInterval:' + id),
  })

  autoRefresh.sync(5000)

  assert.deepEqual(events, ['clearInterval:null', 'setInterval'])

  // Simulate the interval firing
  intervalCallback()
  assert.deepEqual(events, ['clearInterval:null', 'setInterval', 'tick'])
})

test('sync replaces previous interval', () => {
  const events = []

  const autoRefresh = createAutoRefresh({
    onTick: () => {},
    setIntervalFn: () => 99,
    clearIntervalFn: (id) => events.push('clearInterval:' + id),
  })

  autoRefresh.sync(5000)
  autoRefresh.sync(3000)

  assert.deepEqual(events, ['clearInterval:null', 'clearInterval:99'])
})

test('stop clears the timer', () => {
  const events = []

  const autoRefresh = createAutoRefresh({
    onTick: () => {},
    setIntervalFn: () => 77,
    clearIntervalFn: (id) => events.push('clearInterval:' + id),
  })

  autoRefresh.sync(5000)
  events.length = 0
  autoRefresh.stop()

  assert.deepEqual(events, ['clearInterval:77'])
})
