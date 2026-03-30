import test from 'node:test'
import assert from 'node:assert/strict'

test('time presets keep the compact set for the toolbar', async () => {
  const { TIME_PRESETS } = await import('../utils/timeUtils.js')
  const values = TIME_PRESETS.map(item => item.value)

  assert.deepEqual(values, ['5m', '30m', '6h', '1d', '7d'])
})
