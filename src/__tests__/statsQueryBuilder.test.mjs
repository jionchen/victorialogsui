import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStatsQuery, AGGREGATE_FUNCTIONS } from '../utils/queryBuilder.js'

test('buildStatsQuery appends stats by clause', () => {
  const result = buildStatsQuery('level:error', ['namespace'])
  assert.equal(result, 'level:error | stats by (namespace) count()')
})

test('buildStatsQuery supports multiple group fields', () => {
  const result = buildStatsQuery('*', ['level', 'service'])
  assert.equal(result, '* | stats by (level, service) count()')
})

test('buildStatsQuery supports different aggregate functions', () => {
  const result = buildStatsQuery('*', ['level'], 'sum')
  assert.equal(result, '* | stats by (level) sum()')
})

test('buildStatsQuery returns base query when no fields', () => {
  const result = buildStatsQuery('level:error', [])
  assert.equal(result, 'level:error')
})

test('AGGREGATE_FUNCTIONS contains expected functions', () => {
  assert.deepEqual(AGGREGATE_FUNCTIONS, ['count', 'count_uniq', 'sum', 'avg', 'max', 'min'])
})
