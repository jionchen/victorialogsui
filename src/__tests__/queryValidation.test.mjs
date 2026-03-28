import test from 'node:test'
import assert from 'node:assert/strict'

test('validateQuery flags unmatched braces as an error', async () => {
  const { validateQuery } = await import('../utils/queryValidation.js')
  const result = validateQuery('{service="api"')

  assert.equal(result.level, 'error')
  assert.match(result.message, /括号|selector/i)
})

test('validateQuery warns when plain text will be converted to substring search', async () => {
  const { validateQuery } = await import('../utils/queryValidation.js')
  const result = validateQuery('timeout exception')

  assert.equal(result.level, 'warning')
  assert.match(result.message, /子串|LogsQL/i)
})
