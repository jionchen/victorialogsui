import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { extractPattern, clusterLogs, wasTruncated } from '../src/utils/patternCluster.js'

describe('extractPattern', () => {
  test('empty and invalid inputs return <empty>', () => {
    assert.equal(extractPattern(''), '<empty>')
    assert.equal(extractPattern('   '), '<empty>')
    assert.equal(extractPattern(null), '<empty>')
    assert.equal(extractPattern(undefined), '<empty>')
    assert.equal(extractPattern(12345), '<empty>')
  })

  test('masks plain numbers', () => {
    assert.equal(extractPattern('worker exited with code 137'), 'worker exited with code <*>')
  })

  test('masks number+unit tokens like 45ms', () => {
    assert.equal(extractPattern('request took 45ms'), 'request took <*>')
  })

  test('masks number followed by a unit word and skips the unit', () => {
    assert.equal(extractPattern('retry after 5 seconds'), 'retry after <*>')
  })

  test('masks uuids', () => {
    assert.equal(
      extractPattern('user 550e8400-e29b-41d4-a716-446655440000 logged in'),
      'user <*> logged in'
    )
  })

  test('masks ip addresses with and without port', () => {
    assert.equal(extractPattern('connection from 192.168.1.100:8080'), 'connection from <*>')
    assert.equal(extractPattern('connection from 10.0.0.1'), 'connection from <*>')
  })

  test('keeps fixed words even when adjacent tokens are masked', () => {
    assert.equal(extractPattern('GET /api/users/123 returned 200'), 'GET <*> returned <*>')
  })

  test('two logs differing only in variables produce the same pattern', () => {
    const a = extractPattern('connection from 192.168.1.5 timeout after 30ms')
    const b = extractPattern('connection from 10.0.0.42 timeout after 950ms')
    assert.equal(a, b)
  })

  test('extracts the message field from JSON logs', () => {
    assert.equal(extractPattern('{"level":"info","msg":"user login failed"}'), 'user login failed')
  })

  test('non-ascii-only message tokenizes to <empty>', () => {
    assert.equal(extractPattern('用户登录失败'), '<empty>')
  })
})

describe('clusterLogs', () => {
  test('empty or missing input returns empty array', () => {
    assert.deepEqual(clusterLogs([]), [])
    assert.deepEqual(clusterLogs(null), [])
    assert.deepEqual(clusterLogs(undefined), [])
  })

  test('identical-shape logs cluster together', () => {
    const logs = [
      { _msg: 'user 101 login failed' },
      { _msg: 'user 202 login failed' },
      { _msg: 'user 303 login failed' },
    ]
    const clusters = clusterLogs(logs)
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0].count, 3)
    assert.equal(clusters[0].pattern, 'user <*> login failed')
  })

  test('distinct logs separate into different clusters sorted by count desc', () => {
    const logs = [
      { _msg: 'database connection failed' },
      { _msg: 'cache miss for key abc' },
      { _msg: 'database connection failed' },
    ]
    const clusters = clusterLogs(logs)
    assert.equal(clusters.length, 2)
    assert.equal(clusters[0].pattern, 'database connection failed')
    assert.equal(clusters[0].count, 2)
    assert.equal(clusters[1].count, 1)
  })

  test('samples are capped at maxSamples', () => {
    const logs = Array.from({ length: 10 }, (_, i) => ({ _msg: `worker exited with code ${i}` }))
    const clusters = clusterLogs(logs, { maxSamples: 2 })
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0].count, 10)
    assert.equal(clusters[0].samples.length, 2)
    assert.equal(clusters[0].samples[0], logs[0])
  })

  test('falls back to msg and message fields, missing message clusters as <empty>', () => {
    const logs = [{ msg: 'cache miss for key abc' }, { message: 'cache miss for key xyz' }, {}]
    const clusters = clusterLogs(logs)
    const patterns = clusters.map((c) => c.pattern)
    assert.ok(patterns.includes('cache miss for key abc'))
    assert.ok(patterns.includes('<empty>'))
  })

  test('processes at most maxLogs entries', () => {
    const logs = Array.from({ length: 20 }, () => ({ _msg: 'database connection failed' }))
    const clusters = clusterLogs(logs, { maxLogs: 5 })
    assert.equal(clusters.length, 1)
    assert.equal(clusters[0].count, 5)
  })
})

describe('wasTruncated', () => {
  test('reports truncation only when logs exceed maxLogs', () => {
    assert.equal(wasTruncated(null), false)
    assert.equal(wasTruncated([], 5), false)
    assert.equal(wasTruncated(new Array(5), 5), false)
    assert.equal(wasTruncated(new Array(6), 5), true)
  })
})
