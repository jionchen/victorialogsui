import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildLogsQL,
  isLogsQLSyntax,
  parseBasicLogsQL,
  buildStatsQuery,
  AGGREGATE_FUNCTIONS,
} from '../src/utils/queryBuilder.js'

describe('buildLogsQL', () => {
  test('returns match-all for no input', () => {
    assert.equal(buildLogsQL(), '*')
    assert.equal(buildLogsQL([], ''), '*')
  })

  test('returns match-all for whitespace-only free text', () => {
    assert.equal(buildLogsQL([], '   '), '*')
  })

  test('builds stream filter with single value', () => {
    const q = buildLogsQL([{ field: 'app', values: ['web'], type: 'stream' }])
    assert.equal(q, '{app="web"}')
  })

  test('builds stream filter with multiple values as anchored regex', () => {
    const q = buildLogsQL([{ field: 'app', values: ['web', 'api'], type: 'stream' }])
    assert.equal(q, '{app=~"^(web|api)$"}')
  })

  test('escapes regex metacharacters in multi-value stream filter', () => {
    const q = buildLogsQL([{ field: 'host', values: ['a.b', 'c+d'], type: 'stream' }])
    assert.equal(q, '{host=~"^(a\\.b|c\\+d)$"}')
  })

  test('builds negated stream filter per value', () => {
    const q = buildLogsQL([{ field: 'app', values: ['web', 'api'], type: 'stream', negated: true }])
    assert.equal(q, '{app!="web",app!="api"}')
  })

  test('combines multiple stream filters into one selector', () => {
    const q = buildLogsQL([
      { field: 'app', values: ['web'], type: 'stream' },
      { field: 'env', values: ['prod'], type: 'stream' },
    ])
    assert.equal(q, '{app="web",env="prod"}')
  })

  test('skips stream filters with empty or missing values', () => {
    assert.equal(buildLogsQL([{ field: 'app', values: [], type: 'stream' }]), '*')
    assert.equal(buildLogsQL([{ field: 'app', type: 'stream' }]), '*')
  })

  test('skips disabled filters', () => {
    const q = buildLogsQL([
      { field: 'app', values: ['web'], type: 'stream', disabled: true },
      { field: 'level', values: ['error'], type: 'log', disabled: true },
    ])
    assert.equal(q, '*')
  })

  test('builds log filter with single bare value', () => {
    const q = buildLogsQL([{ field: 'level', values: ['error'], type: 'log' }])
    assert.equal(q, 'level:error')
  })

  test('quotes log filter values containing spaces and escapes inner quotes', () => {
    const q = buildLogsQL([{ field: 'msg', values: ['connection "lost" now'], type: 'log' }])
    assert.equal(q, 'msg:"connection \\"lost\\" now"')
  })

  test('quotes empty string value', () => {
    const q = buildLogsQL([{ field: 'msg', values: [''], type: 'log' }])
    assert.equal(q, 'msg:""')
  })

  test('quotes values containing colon, comma, parens', () => {
    const q = buildLogsQL([{ field: 'src', values: ['a:b'], type: 'log' }])
    assert.equal(q, 'src:"a:b"')
    const q2 = buildLogsQL([{ field: 'src', values: ['f(x)'], type: 'log' }])
    assert.equal(q2, 'src:"f(x)"')
  })

  test('builds log filter with multiple values using in()', () => {
    const q = buildLogsQL([{ field: 'level', values: ['error', 'warn x'], type: 'log' }])
    assert.equal(q, 'level:in(error, "warn x")')
  })

  test('builds negated log filters', () => {
    assert.equal(
      buildLogsQL([{ field: 'level', values: ['debug'], type: 'log', negated: true }]),
      'NOT level:debug'
    )
    assert.equal(
      buildLogsQL([{ field: 'level', values: ['debug', 'info'], type: 'log', negated: true }]),
      'NOT level:in(debug, info)'
    )
  })

  test('combines stream filters, log filters and free text in order', () => {
    const q = buildLogsQL(
      [
        { field: 'level', values: ['error'], type: 'log' },
        { field: 'app', values: ['web'], type: 'stream' },
      ],
      'timeout'
    )
    assert.equal(q, '{app="web"} level:error _msg:~"timeout"')
  })

  test('wraps plain keyword free text in substring match', () => {
    assert.equal(buildLogsQL([], 'timeout'), '_msg:~"timeout"')
  })

  test('wraps unicode (Chinese) free text in substring match', () => {
    assert.equal(buildLogsQL([], '数据库连接失败'), '_msg:~"数据库连接失败"')
  })

  test('escapes double quotes in plain free text', () => {
    assert.equal(buildLogsQL([], 'say "hi"'), '_msg:~"say \\"hi\\""')
  })

  test('passes through free text that already looks like LogsQL', () => {
    assert.equal(buildLogsQL([], 'level:error'), 'level:error')
    assert.equal(buildLogsQL([], '{app="web"}'), '{app="web"}')
    assert.equal(buildLogsQL([], 'error AND timeout'), 'error AND timeout')
    assert.equal(buildLogsQL([], '* | stats count()'), '* | stats count()')
  })
})

describe('isLogsQLSyntax', () => {
  test('plain keywords are not LogsQL', () => {
    assert.equal(isLogsQLSyntax('timeout error'), false)
    assert.equal(isLogsQLSyntax('数据库'), false)
  })

  test('detects field:value, braces, pipes and regex match', () => {
    assert.equal(isLogsQLSyntax('level:error'), true)
    assert.equal(isLogsQLSyntax('{app="web"}'), true)
    assert.equal(isLogsQLSyntax('a | stats count()'), true)
    assert.equal(isLogsQLSyntax('_msg:~"x"'), true)
  })

  test('detects logical operators as whole words only', () => {
    assert.equal(isLogsQLSyntax('a AND b'), true)
    assert.equal(isLogsQLSyntax('NOT a'), true)
    assert.equal(isLogsQLSyntax('a and b'), false)
    assert.equal(isLogsQLSyntax('ANDROID'), false)
  })

  test('detects leading wildcard and underscore-prefixed fields', () => {
    assert.equal(isLogsQLSyntax('*'), true)
    assert.equal(isLogsQLSyntax('_time'), true)
  })
})

describe('parseBasicLogsQL', () => {
  test('query without stream selector is all free text', () => {
    const { filters, freeText } = parseBasicLogsQL('plain error text')
    assert.deepEqual(filters, [])
    assert.equal(freeText, 'plain error text')
  })

  test('parses single stream filter and remaining free text', () => {
    const { filters, freeText } = parseBasicLogsQL('{app="web"} level:error')
    assert.deepEqual(filters, [
      { field: 'app', values: ['web'], type: 'stream', negated: false, disabled: false },
    ])
    assert.equal(freeText, 'level:error')
  })

  test('parses multiple comma-separated stream pairs', () => {
    const { filters, freeText } = parseBasicLogsQL('{app="web",env="prod"}')
    assert.equal(filters.length, 2)
    assert.deepEqual(filters[0], { field: 'app', values: ['web'], type: 'stream', negated: false, disabled: false })
    assert.deepEqual(filters[1], { field: 'env', values: ['prod'], type: 'stream', negated: false, disabled: false })
    assert.equal(freeText, '')
  })

  test('parses negated stream filter', () => {
    const { filters } = parseBasicLogsQL('{app!="web"}')
    assert.deepEqual(filters, [
      { field: 'app', values: ['web'], type: 'stream', negated: true, disabled: false },
    ])
  })

  test('round-trips a single-value stream filter built by buildLogsQL', () => {
    const built = buildLogsQL([{ field: 'app', values: ['web'], type: 'stream' }])
    const { filters, freeText } = parseBasicLogsQL(built)
    assert.deepEqual(filters, [
      { field: 'app', values: ['web'], type: 'stream', negated: false, disabled: false },
    ])
    assert.equal(freeText, '')
  })
})

describe('buildStatsQuery', () => {
  test('returns base query when byFields is empty or missing', () => {
    assert.equal(buildStatsQuery('*', []), '*')
    assert.equal(buildStatsQuery('*', null), '*')
    assert.equal(buildStatsQuery('*', undefined), '*')
  })

  test('appends stats pipe with default count aggregate', () => {
    assert.equal(buildStatsQuery('level:error', ['app']), 'level:error | stats by (app) count()')
  })

  test('joins multiple by-fields and uses given aggregate', () => {
    assert.equal(
      buildStatsQuery('*', ['app', 'level'], 'count_uniq'),
      '* | stats by (app, level) count_uniq()'
    )
  })

  test('exports known aggregate functions', () => {
    assert.ok(AGGREGATE_FUNCTIONS.includes('count'))
    assert.ok(AGGREGATE_FUNCTIONS.includes('avg'))
  })
})
