import test from 'node:test'
import assert from 'node:assert/strict'

test('parseNdjsonChunk keeps trailing partial line for the next chunk', async () => {
  const { parseNdjsonChunk } = await import('../api/logs.js')

  const first = parseNdjsonChunk('{"_msg":"one"}\n{"_msg":"tw', '')
  const second = parseNdjsonChunk('o"}\n{"_msg":"three"}\n', first.remainder)

  assert.equal(first.items.length, 1)
  assert.equal(first.items[0]._msg, 'one')
  assert.equal(second.items.length, 2)
  assert.equal(second.items[0]._msg, 'two')
  assert.equal(second.items[1]._msg, 'three')
  assert.equal(second.remainder, '')
})
