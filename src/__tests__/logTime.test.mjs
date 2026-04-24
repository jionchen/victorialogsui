import test from 'node:test'
import assert from 'node:assert/strict'

test('extractLogMessageTime parses Java logs with comma milliseconds', async () => {
  const { extractLogMessageTime } = await import('../utils/logTime.js')

  assert.equal(
    extractLogMessageTime({
      _msg: '[2026-04-13 17:44:02,959] INFO  com.example.Service: ok',
      _time: '2026-04-13T09:44:03Z',
    }),
    '2026-04-13T09:44:02.959Z'
  )
})

test('extractLogMessageTime parses Java logs with dot milliseconds and seconds only', async () => {
  const { extractLogMessageTime } = await import('../utils/logTime.js')

  assert.equal(
    extractLogMessageTime({ _msg: '[2026-04-13 17:44:02.123] INFO ok' }),
    '2026-04-13T09:44:02.123Z'
  )
  assert.equal(
    extractLogMessageTime({ _msg: '[2026-04-13 17:44:02] INFO ok' }),
    '2026-04-13T09:44:02.000Z'
  )
})

test('extractLogMessageTime parses nginx access log timestamps with timezone offset', async () => {
  const { extractLogMessageTime } = await import('../utils/logTime.js')

  assert.equal(
    extractLogMessageTime({
      _msg: '10.42.0.1 - - [13/Apr/2026:17:33:55 +0800] "GET /health HTTP/1.1" 200',
    }),
    '2026-04-13T09:33:55.000Z'
  )
})

test('extractLogMessageTime parses ISO timestamps near the message prefix', async () => {
  const { extractLogMessageTime } = await import('../utils/logTime.js')

  assert.equal(
    extractLogMessageTime({ _msg: '2026-04-13T17:44:02.959+08:00 INFO ok' }),
    '2026-04-13T09:44:02.959Z'
  )
})

test('extractLogMessageTime does not use payload times far from the message prefix', async () => {
  const { extractLogMessageTime } = await import('../utils/logTime.js')

  assert.equal(
    extractLogMessageTime({
      _msg: `http request: ${'x'.repeat(320)} {"posTime":"2026-04-13 17:44:02"}`,
      _time: '2026-04-13T09:44:03Z',
    }),
    ''
  )
})

test('getLogDisplayTimestamp falls back to _time when the message has no printable time', async () => {
  const { getLogDisplayTimestamp } = await import('../utils/logTime.js')

  assert.equal(
    getLogDisplayTimestamp({
      _msg: 'service started',
      _time: '2026-04-13T09:44:03Z',
    }),
    '2026-04-13T09:44:03Z'
  )
})
