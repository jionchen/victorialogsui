import { test, describe, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  TIME_PRESETS,
  DEFAULT_TIMEZONE_OFFSET,
  setTimezoneOffset,
  getTimezoneOffset,
  calculateStep,
  getTimeRange,
  formatTimestamp,
  formatTimeShort,
  formatTimestampUtc,
} from '../src/utils/timeUtils.js'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// 2024-01-15 12:00:00 UTC — mid-January avoids DST transitions on any host timezone
const TS = Date.UTC(2024, 0, 15, 12, 0, 0)

describe('calculateStep', () => {
  test('returns 10s up to and including 15 minutes', () => {
    assert.equal(calculateStep(0), '10s')
    assert.equal(calculateStep(15 * MIN), '10s')
  })

  test('returns 30s above 15 minutes up to 1 hour', () => {
    assert.equal(calculateStep(15 * MIN + 1), '30s')
    assert.equal(calculateStep(HOUR), '30s')
  })

  test('returns 5m above 1 hour up to 6 hours', () => {
    assert.equal(calculateStep(HOUR + 1), '5m')
    assert.equal(calculateStep(6 * HOUR), '5m')
  })

  test('returns 30m above 6 hours up to 1 day', () => {
    assert.equal(calculateStep(6 * HOUR + 1), '30m')
    assert.equal(calculateStep(DAY), '30m')
  })

  test('returns 3h above 1 day up to 7 days', () => {
    assert.equal(calculateStep(DAY + 1), '3h')
    assert.equal(calculateStep(7 * DAY), '3h')
  })

  test('returns 1d beyond 7 days', () => {
    assert.equal(calculateStep(7 * DAY + 1), '1d')
    assert.equal(calculateStep(365 * DAY), '1d')
  })
})

describe('getTimeRange', () => {
  test('returns start/end/rangeMs for a known preset', () => {
    assert.deepEqual(getTimeRange('5m'), { start: '5m', end: 'now', rangeMs: 5 * MIN })
    assert.deepEqual(getTimeRange('7d'), { start: '7d', end: 'now', rangeMs: 7 * DAY })
  })

  test('falls back to 1h/now for unknown preset', () => {
    assert.deepEqual(getTimeRange('42y'), { start: '1h', end: 'now' })
    assert.deepEqual(getTimeRange(''), { start: '1h', end: 'now' })
    assert.deepEqual(getTimeRange(undefined), { start: '1h', end: 'now' })
  })

  test('re-exports TIME_PRESETS', () => {
    assert.ok(Array.isArray(TIME_PRESETS))
    assert.ok(TIME_PRESETS.some(p => p.value === '5m'))
  })
})

describe('timezone offset configuration', () => {
  beforeEach(() => setTimezoneOffset(DEFAULT_TIMEZONE_OFFSET))
  after(() => setTimezoneOffset(DEFAULT_TIMEZONE_OFFSET))

  test('default offset is UTC+8', () => {
    assert.equal(DEFAULT_TIMEZONE_OFFSET, -480)
    assert.equal(getTimezoneOffset(), -480)
  })

  test('setTimezoneOffset updates the configured offset', () => {
    setTimezoneOffset(0)
    assert.equal(getTimezoneOffset(), 0)
    setTimezoneOffset(300)
    assert.equal(getTimezoneOffset(), 300)
  })
})

describe('formatTimestampUtc', () => {
  test('formats an epoch-ms timestamp at UTC (offset 0)', () => {
    assert.equal(formatTimestampUtc(TS, 0), '2024-01-15 12:00:00')
  })

  test('applies positive-UTC offsets (UTC+8)', () => {
    assert.equal(formatTimestampUtc(TS, -480), '2024-01-15 20:00:00')
  })

  test('applies negative-UTC offsets (UTC-5)', () => {
    assert.equal(formatTimestampUtc(TS, 300), '2024-01-15 07:00:00')
  })

  test('rolls over date boundaries', () => {
    const lateNight = Date.UTC(2024, 0, 15, 23, 30, 0)
    assert.equal(formatTimestampUtc(lateNight, -480), '2024-01-16 07:30:00')
  })

  test('accepts ISO string input', () => {
    assert.equal(formatTimestampUtc('2024-01-15T12:00:00Z', 0), '2024-01-15 12:00:00')
  })

  test('pads single-digit components', () => {
    assert.equal(formatTimestampUtc(Date.UTC(2024, 2, 5, 4, 5, 6), 0), '2024-03-05 04:05:06')
  })

  test('returns empty string for falsy input', () => {
    assert.equal(formatTimestampUtc(''), '')
    assert.equal(formatTimestampUtc(null), '')
    assert.equal(formatTimestampUtc(undefined), '')
    assert.equal(formatTimestampUtc(0), '')
  })

  test('falls back to String(ts) when Date construction throws', () => {
    // BigInt cannot be passed to new Date() — exercises the catch path
    assert.equal(formatTimestampUtc(123n, 0), '123')
  })
})

describe('formatTimestamp', () => {
  beforeEach(() => setTimezoneOffset(0))
  after(() => setTimezoneOffset(DEFAULT_TIMEZONE_OFFSET))

  test('formats using the configured timezone offset', () => {
    assert.equal(formatTimestamp(TS), '2024-01-15 12:00:00')
    setTimezoneOffset(-480)
    assert.equal(formatTimestamp(TS), '2024-01-15 20:00:00')
  })

  test('returns empty string for falsy input', () => {
    assert.equal(formatTimestamp(''), '')
    assert.equal(formatTimestamp(null), '')
    assert.equal(formatTimestamp(undefined), '')
  })

  test('falls back to String(ts) when Date construction throws', () => {
    assert.equal(formatTimestamp(456n), '456')
  })
})

describe('formatTimeShort', () => {
  beforeEach(() => setTimezoneOffset(0))
  after(() => setTimezoneOffset(DEFAULT_TIMEZONE_OFFSET))

  test('formats time-only with padding', () => {
    assert.equal(formatTimeShort(Date.UTC(2024, 0, 15, 23, 5, 9)), '23:05:09')
  })

  test('applies the configured timezone offset', () => {
    setTimezoneOffset(-480)
    assert.equal(formatTimeShort(Date.UTC(2024, 0, 15, 23, 5, 9)), '07:05:09')
  })

  test('returns empty string for falsy input', () => {
    assert.equal(formatTimeShort(''), '')
    assert.equal(formatTimeShort(null), '')
    assert.equal(formatTimeShort(0), '')
  })

  test('falls back to String(ts) when Date construction throws', () => {
    assert.equal(formatTimeShort(789n), '789')
  })
})
