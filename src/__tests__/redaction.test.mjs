import test from 'node:test'
import assert from 'node:assert/strict'

test('redactSensitiveFields masks common secret-like values', async () => {
  const { redactSensitiveFields } = await import('../utils/redaction.js')

  const result = redactSensitiveFields({
    token: 'abcdef123456',
    'user.email': 'alice@example.com',
    message: 'safe',
  })

  assert.equal(result.token, '***REDACTED***')
  assert.equal(result['user.email'], '***REDACTED***')
  assert.equal(result.message, 'safe')
})

test('canViewField restricts internal fields for analyst role', async () => {
  const { canViewField } = await import('../utils/permissions.js')

  assert.equal(canViewField('_stream_id', 'analyst'), false)
  assert.equal(canViewField('_stream_id', 'admin'), true)
  assert.equal(canViewField('service', 'analyst'), true)
})
