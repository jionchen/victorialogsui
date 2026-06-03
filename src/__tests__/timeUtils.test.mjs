import test from 'node:test'
import assert from 'node:assert/strict'

test('time presets keep the compact set for the toolbar', async () => {
  const { TIME_PRESETS } = await import('../utils/timeUtils.js')
  const values = TIME_PRESETS.map(item => item.value)

  assert.deepEqual(values, ['5m', '30m', '6h', '1d', '7d'])
})

test('formatTimestamp respects default timezone offset (UTC+8)', async () => {
  const { formatTimestamp, DEFAULT_TIMEZONE_OFFSET } = await import('../utils/timeUtils.js')

  assert.equal(DEFAULT_TIMEZONE_OFFSET, -480)

  // 2026-01-15T08:30:00Z = 2026-01-15 16:30:00 in UTC+8
  const result = formatTimestamp('2026-01-15T08:30:00.000Z')
  assert.equal(result, '2026-01-15 16:30:00')
})

test('formatTimeShort respects default timezone offset', async () => {
  const { formatTimeShort } = await import('../utils/timeUtils.js')

  const result = formatTimeShort('2026-01-15T08:30:00.000Z')
  assert.equal(result, '16:30:00')
})

test('formatTimestampUtc uses explicit offset', async () => {
  const { formatTimestampUtc } = await import('../utils/timeUtils.js')

  // UTC+0
  const utcResult = formatTimestampUtc('2026-01-15T08:30:00.000Z', 0)
  assert.equal(utcResult, '2026-01-15 08:30:00')

  // UTC+9 (Tokyo)
  const tokyoResult = formatTimestampUtc('2026-01-15T08:30:00.000Z', -540)
  assert.equal(tokyoResult, '2026-01-15 17:30:00')

  // UTC-5 (New York)
  const nyResult = formatTimestampUtc('2026-01-15T08:30:00.000Z', 300)
  assert.equal(nyResult, '2026-01-15 03:30:00')
})

test('setTimezoneOffset and getTimezoneOffset work', async () => {
  const { setTimezoneOffset, getTimezoneOffset, formatTimestamp, DEFAULT_TIMEZONE_OFFSET } = await import('../utils/timeUtils.js')

  // Default is UTC+8
  assert.equal(getTimezoneOffset(), DEFAULT_TIMEZONE_OFFSET)

  // Change to UTC
  setTimezoneOffset(0)
  assert.equal(getTimezoneOffset(), 0)

  const utcResult = formatTimestamp('2026-01-15T08:30:00.000Z')
  assert.equal(utcResult, '2026-01-15 08:30:00')

  // Change to UTC+9
  setTimezoneOffset(-540)
  const tokyoResult = formatTimestamp('2026-01-15T08:30:00.000Z')
  assert.equal(tokyoResult, '2026-01-15 17:30:00')

  // Reset to default for other tests
  setTimezoneOffset(DEFAULT_TIMEZONE_OFFSET)
})

test('formatTimestamp handles empty input', async () => {
  const { formatTimestamp } = await import('../utils/timeUtils.js')

  assert.equal(formatTimestamp(''), '')
  assert.equal(formatTimestamp(null), '')
  assert.equal(formatTimestamp(undefined), '')
})

test('formatTimeShort handles empty input', async () => {
  const { formatTimeShort } = await import('../utils/timeUtils.js')

  assert.equal(formatTimeShort(''), '')
  assert.equal(formatTimeShort(null), '')
  assert.equal(formatTimeShort(undefined), '')
})

test('calculateStep returns correct step values', async () => {
  const { calculateStep } = await import('../utils/timeUtils.js')

  assert.equal(calculateStep(5 * 60 * 1000), '10s')
  assert.equal(calculateStep(30 * 60 * 1000), '30s')
  assert.equal(calculateStep(3 * 60 * 60 * 1000), '5m')
  assert.equal(calculateStep(12 * 60 * 60 * 1000), '30m')
  assert.equal(calculateStep(3 * 24 * 60 * 60 * 1000), '3h')
  assert.equal(calculateStep(30 * 24 * 60 * 60 * 1000), '1d')
})
