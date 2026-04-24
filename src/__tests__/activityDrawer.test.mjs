import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_KEYWORDS, countKeywordMatches, extractLogText } from '../utils/keywordStats.js'

test('DEFAULT_KEYWORDS contains expected error keywords', () => {
  assert.deepEqual(DEFAULT_KEYWORDS, [
    'error', 'exception', 'fail', 'failed', 'fatal',
    'panic', 'crash', 'warn', 'warning',
  ])
})

test('countKeywordMatches returns zero for empty logs', () => {
  const stats = countKeywordMatches([], ['error', 'warn'])
  assert.deepEqual(stats, [
    { keyword: 'error', count: 0 },
    { keyword: 'warn', count: 0 },
  ])
})

test('countKeywordMatches counts case-insensitively', () => {
  const logs = [
    { _msg: 'ERROR: something went wrong' },
    { _msg: 'warn: low disk space' },
  ]
  const stats = countKeywordMatches(logs, ['error', 'warn'])
  assert.equal(stats.find(s => s.keyword === 'error').count, 1)
  assert.equal(stats.find(s => s.keyword === 'warn').count, 1)
})

test('countKeywordMatches counts multiple keywords in same log separately', () => {
  const logs = [
    { _msg: 'error: failed to connect' },
  ]
  const stats = countKeywordMatches(logs, ['error', 'failed', 'warning'])
  assert.equal(stats.find(s => s.keyword === 'error').count, 1)
  assert.equal(stats.find(s => s.keyword === 'failed').count, 1)
  assert.equal(stats.find(s => s.keyword === 'warning').count, 0)
})

test('countKeywordMatches counts multiple occurrences across logs', () => {
  const logs = [
    { _msg: 'error 1' },
    { _msg: 'error 2' },
    { _msg: 'no match here' },
  ]
  const stats = countKeywordMatches(logs, ['error'])
  assert.equal(stats[0].count, 2)
})

test('countKeywordMatches sorts by count descending', () => {
  const logs = [
    { _msg: 'error A' },
    { _msg: 'error B' },
    { _msg: 'warn C' },
  ]
  const stats = countKeywordMatches(logs, ['warn', 'error'])
  assert.equal(stats[0].keyword, 'error')
  assert.equal(stats[0].count, 2)
  assert.equal(stats[1].keyword, 'warn')
  assert.equal(stats[1].count, 1)
})

test('countKeywordMatches handles missing _msg gracefully', () => {
  const logs = [
    { _time: '2026-04-21T00:00:00Z' },
    null,
    undefined,
  ]
  const stats = countKeywordMatches(logs, ['error'])
  assert.equal(stats[0].count, 0)
})

test('countKeywordMatches handles custom keywords', () => {
  const logs = [
    { _msg: 'timeout occurred' },
    { _msg: 'timeout again' },
    { _msg: 'all good' },
  ]
  const stats = countKeywordMatches(logs, ['timeout'])
  assert.equal(stats[0].keyword, 'timeout')
  assert.equal(stats[0].count, 2)
})

test('countKeywordMatches searches all fields when _msg is empty', () => {
  const logs = [
    { _time: '2026-04-21T00:00:00Z', exception: 'IndexOutOfBoundsException' },
    { _msg: 'normal log' },
  ]
  const stats = countKeywordMatches(logs, ['exception'])
  assert.equal(stats[0].count, 1)
})

test('countKeywordMatches finds keywords in nested objects', () => {
  const logs = [
    { _msg: 'An error occurred', details: { stack: 'java.lang.NullPointerException at Foo' } },
  ]
  const stats = countKeywordMatches(logs, ['exception'])
  assert.equal(stats[0].count, 1)
})

test('extractLogText concatenates all string values recursively', () => {
  const log = {
    _msg: 'main message',
    level: 'error',
    tags: ['tag1', 'tag2'],
    nested: { reason: 'timeout' },
  }
  const text = extractLogText(log)
  assert.ok(text.includes('main message'))
  assert.ok(text.includes('error'))
  assert.ok(text.includes('tag1'))
  assert.ok(text.includes('timeout'))
})

test('extractLogText handles primitives and nulls gracefully', () => {
  assert.equal(extractLogText(null), '')
  assert.equal(extractLogText(undefined), '')
  assert.equal(extractLogText('plain text'), 'plain text')
  assert.equal(extractLogText(42), '42')
})
