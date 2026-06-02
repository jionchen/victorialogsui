import test from 'node:test'
import assert from 'node:assert/strict'
import { createQueryCompletionEngine } from '../composables/queryCompletion.js'

function makeEngine(fields = [], streamFields = [], valuesMap = {}) {
  return createQueryCompletionEngine({
    getLogFieldNames: () => fields,
    getStreamFieldNames: () => streamFields,
    getFieldValues: (field) => valuesMap[field] || null,
  })
}

test('suggests log field names at start of query', () => {
  const engine = makeEngine([
    { value: 'level', hits: 100 },
    { value: 'namespace', hits: 50 },
  ])
  const suggestions = engine.getSuggestions('', 0)

  assert.equal(suggestions.length, 2)
  assert.equal(suggestions[0].label, 'level')
  assert.equal(suggestions[0].insertText, 'level:')
  assert.equal(suggestions[0].kind, 'field')
})

test('filters field names by prefix', () => {
  const engine = makeEngine([
    { value: 'level', hits: 100 },
    { value: 'namespace', hits: 50 },
  ])
  const suggestions = engine.getSuggestions('lev', 3)

  assert.equal(suggestions.length, 1)
  assert.equal(suggestions[0].label, 'level')
})

test('suggests stream field names inside braces', () => {
  const engine = makeEngine([], [
    { value: 'service', hits: 200 },
    { value: 'env', hits: 100 },
  ])
  const suggestions = engine.getSuggestions('{ser', 4)

  assert.equal(suggestions.length, 1)
  assert.equal(suggestions[0].label, 'service')
  assert.equal(suggestions[0].kind, 'stream-field')
})

test('suggests operators after a complete term', () => {
  const engine = makeEngine([
    { value: 'level', hits: 100 },
  ])
  const suggestions = engine.getSuggestions('level:error ', 12)

  const ops = suggestions.filter(s => s.kind === 'operator')
  assert.ok(ops.length > 0)
  assert.ok(ops.some(s => s.label === 'AND'))
})

test('suggests field values after field colon', () => {
  const engine = makeEngine(
    [{ value: 'level', hits: 100 }],
    [],
    { level: [{ value: 'error', hits: 50 }, { value: 'warn', hits: 30 }] }
  )
  const suggestions = engine.getSuggestions('level:err', 9)

  assert.equal(suggestions.length, 1)
  assert.equal(suggestions[0].label, 'error')
  assert.equal(suggestions[0].kind, 'value')
})

test('suggests pipe keywords after |', () => {
  const engine = makeEngine()
  const suggestions = engine.getSuggestions('error | sta', 11)

  assert.ok(suggestions.some(s => s.label === 'stats'))
  assert.equal(suggestions[0].kind, 'keyword')
})

test('returns empty for unknown context', () => {
  const engine = makeEngine()
  const suggestions = engine.getSuggestions('random gibberish here', 21)

  // In the middle of free text, no suggestions
  assert.equal(suggestions.length, 0)
})

test('sorts field suggestions by hits descending', () => {
  const engine = makeEngine([
    { value: 'a', hits: 10 },
    { value: 'b', hits: 100 },
    { value: 'c', hits: 50 },
  ])
  const suggestions = engine.getSuggestions('', 0)

  assert.deepEqual(suggestions.map(s => s.label), ['b', 'c', 'a'])
})

test('prefers prefix matches over substring matches', () => {
  const engine = makeEngine([
    { value: 'level', hits: 10 },
    { value: 'xlevel', hits: 100 },
  ])
  const suggestions = engine.getSuggestions('lev', 3)

  assert.equal(suggestions[0].label, 'level')
  assert.equal(suggestions[1].label, 'xlevel')
})
