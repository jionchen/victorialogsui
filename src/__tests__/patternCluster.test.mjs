import { describe, it } from 'node:test'
import assert from 'node:assert'
import { extractPattern, clusterLogs, wasTruncated } from '../utils/patternCluster.js'

describe('extractPattern', () => {
  it('replaces IP address', () => {
    const result = extractPattern('User logged in from 192.168.1.1')
    assert.strictEqual(result, 'User logged in from <*>')
  })

  it('replaces HTTP path and duration in request message', () => {
    const result = extractPattern('Request GET /api/users/123 took 45ms')
    assert.strictEqual(result, 'Request GET <*> took <*>')
  })

  it('replaces timeout duration with ms unit', () => {
    const result = extractPattern('Connection timeout after 30000ms')
    assert.strictEqual(result, 'Connection timeout after <*>')
  })

  it('replaces UUID tokens', () => {
    const result = extractPattern('Transaction 550e8400-e29b-41d4-a716-446655440000 completed')
    assert.strictEqual(result, 'Transaction <*> completed')
  })

  it('replaces email addresses', () => {
    const result = extractPattern('Password reset sent to user@example.com')
    assert.strictEqual(result, 'Password reset sent to <*>')
  })

  it('replaces hex strings', () => {
    const result = extractPattern('Hash abcdef1234567890abcdef1234567890 found')
    assert.strictEqual(result, 'Hash <*> found')
  })

  it('replaces timestamps', () => {
    const result = extractPattern('Event at 2024-01-15T10:30:45.123Z triggered')
    assert.strictEqual(result, 'Event at <*> triggered')
  })

  it('replaces URLs', () => {
    const result = extractPattern('Fetching https://api.example.com/v1/data')
    assert.strictEqual(result, 'Fetching <*>')
  })

  it('keeps common log words fixed', () => {
    const result = extractPattern('GET /api/v1/users HTTP/1.1 200 OK')
    assert.strictEqual(result, 'GET <*> HTTP/1.1 <*> OK')
  })

  it('handles JSON with message field', () => {
    const result = extractPattern('{"msg":"User logged in from 10.0.0.1","level":"info"}')
    assert.strictEqual(result, 'User logged in from <*>')
  })

  it('handles empty string', () => {
    const result = extractPattern('')
    assert.strictEqual(result, '<empty>')
  })

  it('handles null/undefined', () => {
    assert.strictEqual(extractPattern(null), '<empty>')
    assert.strictEqual(extractPattern(undefined), '<empty>')
  })

  it('keeps pure text unchanged', () => {
    const result = extractPattern('Server started successfully')
    assert.strictEqual(result, 'Server started successfully')
  })

  it('handles number with unit ms', () => {
    const result = extractPattern('Query took 150ms')
    assert.strictEqual(result, 'Query took <*>')
  })

  it('handles number with unit seconds', () => {
    const result = extractPattern('Process completed in 5 seconds')
    assert.strictEqual(result, 'Process completed in <*>')
  })

  it('handles number with unit KB', () => {
    const result = extractPattern('File size is 2048KB')
    assert.strictEqual(result, 'File size is <*>')
  })

  it('handles MAC address', () => {
    const result = extractPattern('Device aa:bb:cc:dd:ee:ff connected')
    assert.strictEqual(result, 'Device <*> connected')
  })

  it('replaces pure numbers', () => {
    const result = extractPattern('Status code 404 not found')
    assert.strictEqual(result, 'Status code <*> not found')
  })

  it('replaces float numbers', () => {
    const result = extractPattern('Latency is 12.34 ms')
    assert.strictEqual(result, 'Latency is <*>')
  })
})

describe('clusterLogs', () => {
  it('groups identical patterns together', () => {
    const logs = [
      { _msg: 'User logged in from 192.168.1.1' },
      { _msg: 'User logged in from 10.0.0.1' },
      { _msg: 'User logged in from 192.168.1.1' },
    ]
    const clusters = clusterLogs(logs)
    assert.strictEqual(clusters.length, 1)
    assert.strictEqual(clusters[0].pattern, 'User logged in from <*>')
    assert.strictEqual(clusters[0].count, 3)
  })

  it('groups different patterns separately', () => {
    const logs = [
      { _msg: 'User logged in from 192.168.1.1' },
      { _msg: 'Request GET /api/users took 45ms' },
      { _msg: 'User logged in from 10.0.0.1' },
      { _msg: 'Request POST /api/orders took 120ms' },
    ]
    const clusters = clusterLogs(logs)
    // GET and POST are different fixed words, /api/users vs /api/orders are different paths
    // So we get 3 clusters: 2x login, 1x GET request, 1x POST request
    assert.strictEqual(clusters.length, 3)
    assert.strictEqual(clusters[0].count, 2) // login pattern
    assert.strictEqual(clusters[1].count, 1) // GET request
    assert.strictEqual(clusters[2].count, 1) // POST request
  })

  it('sorts by count descending', () => {
    const logs = [
      { _msg: 'Rare event happened' },
      { _msg: 'Common event occurred' },
      { _msg: 'Common event occurred' },
      { _msg: 'Common event occurred' },
      { _msg: 'Another rare event' },
    ]
    const clusters = clusterLogs(logs)
    assert.strictEqual(clusters[0].count, 3)
    assert.strictEqual(clusters[1].count, 1)
    assert.strictEqual(clusters[2].count, 1)
  })

  it('keeps up to 3 sample logs', () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      _msg: `Request GET /api/users/${i} took ${i}ms`,
      id: i,
    }))
    const clusters = clusterLogs(logs)
    assert.strictEqual(clusters.length, 1)
    assert.strictEqual(clusters[0].count, 10)
    assert.strictEqual(clusters[0].samples.length, 3)
    // Samples should be the first 3 logs
    assert.strictEqual(clusters[0].samples[0].id, 0)
    assert.strictEqual(clusters[0].samples[1].id, 1)
    assert.strictEqual(clusters[0].samples[2].id, 2)
  })

  it('returns empty array for empty input', () => {
    assert.deepStrictEqual(clusterLogs([]), [])
    assert.deepStrictEqual(clusterLogs(null), [])
    assert.deepStrictEqual(clusterLogs(undefined), [])
  })

  it('uses fallback msg fields', () => {
    const logs = [
      { msg: 'Error in module A' },
      { message: 'Error in module B' },
    ]
    const clusters = clusterLogs(logs)
    assert.strictEqual(clusters.length, 1)
    assert.strictEqual(clusters[0].pattern, 'Error in module <*>')
    assert.strictEqual(clusters[0].count, 2)
  })

  it('respects maxLogs option', () => {
    const logs = Array.from({ length: 100 }, (_, i) => ({
      _msg: `Log entry ${i}`,
    }))
    const clusters = clusterLogs(logs, { maxLogs: 50 })
    assert.strictEqual(clusters[0].count, 50)
  })

  it('respects maxSamples option', () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({
      _msg: `Same message ${i}`,
    }))
    const clusters = clusterLogs(logs, { maxSamples: 5 })
    assert.strictEqual(clusters[0].samples.length, 5)
  })
})

describe('wasTruncated', () => {
  it('returns true when logs exceed maxLogs', () => {
    assert.strictEqual(wasTruncated(Array(6000), 5000), true)
  })

  it('returns false when logs are within limit', () => {
    assert.strictEqual(wasTruncated(Array(1000), 5000), false)
  })

  it('returns false for empty/null input', () => {
    assert.strictEqual(wasTruncated(null), false)
    assert.strictEqual(wasTruncated([]), false)
  })
})
