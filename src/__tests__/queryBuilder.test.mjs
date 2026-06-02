import test from 'node:test'
import assert from 'node:assert/strict'

test('buildLogsQL returns * for empty filters and empty freeText', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  assert.equal(buildLogsQL([], ''), '*')
  assert.equal(buildLogsQL(), '*')
})

test('buildLogsQL stream single value uses {field="val"}', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [{ field: 'app', values: ['api'], type: 'stream', negated: false }]
  assert.equal(buildLogsQL(filters, ''), '{app="api"}')
})

test('buildLogsQL stream multiple values uses anchored regex with escaped values', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [{ field: 'app', values: ['a.b', 'c*d'], type: 'stream', negated: false }]
  assert.equal(buildLogsQL(filters, ''), '{app=~"^(a\\.b|c\\*d)$"}')
})

test('buildLogsQL stream negated emits one field!="val" per value', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [{ field: 'app', values: ['api', 'web'], type: 'stream', negated: true }]
  assert.equal(buildLogsQL(filters, ''), '{app!="api",app!="web"}')
})

test('buildLogsQL log single value uses field:value and quotes when needed', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  assert.equal(
    buildLogsQL([{ field: 'level', values: ['error'], type: 'log', negated: false }], ''),
    'level:error'
  )
  // value with space/colon/quote -> quoted with internal quote escaped
  assert.equal(
    buildLogsQL([{ field: 'msg', values: ['login failed: "x"'], type: 'log', negated: false }], ''),
    'msg:"login failed: \\"x\\""'
  )
})

test('buildLogsQL log multiple values uses field:in(a, b)', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [{ field: 'level', values: ['error', 'warn'], type: 'log', negated: false }]
  assert.equal(buildLogsQL(filters, ''), 'level:in(error, warn)')
})

test('buildLogsQL log negated single value uses NOT field:value', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [{ field: 'level', values: ['error'], type: 'log', negated: true }]
  assert.equal(buildLogsQL(filters, ''), 'NOT level:error')
})

test('buildLogsQL log negated multiple values uses NOT field:in(...)', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [{ field: 'level', values: ['error', 'warn'], type: 'log', negated: true }]
  assert.equal(buildLogsQL(filters, ''), 'NOT level:in(error, warn)')
})

test('buildLogsQL ignores disabled filters', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [
    { field: 'app', values: ['api'], type: 'stream', negated: false, disabled: true },
    { field: 'level', values: ['error'], type: 'log', negated: false, disabled: true }
  ]
  assert.equal(buildLogsQL(filters, ''), '*')
})

test('buildLogsQL skips filters with empty values', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  const filters = [
    { field: 'app', values: [], type: 'stream', negated: false },
    { field: 'level', values: [], type: 'log', negated: false }
  ]
  assert.equal(buildLogsQL(filters, ''), '*')
})

test('buildLogsQL treats pure Chinese freeText as substring match on _msg', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  assert.equal(buildLogsQL([], '登录失败'), '_msg:~"登录失败"')
})

test('buildLogsQL passes through freeText that is already LogsQL syntax', async () => {
  const { buildLogsQL } = await import('../utils/queryBuilder.js')

  assert.equal(buildLogsQL([], 'level:error'), 'level:error')
  assert.equal(buildLogsQL([], 'foo AND bar'), 'foo AND bar')
  assert.equal(buildLogsQL([], '{app="api"}'), '{app="api"}')
  assert.equal(buildLogsQL([], 'a | stats count()'), 'a | stats count()')
})

test('isLogsQLSyntax detects syntax markers and returns false for plain keywords', async () => {
  const { isLogsQLSyntax } = await import('../utils/queryBuilder.js')

  assert.equal(isLogsQLSyntax('level:error'), true)
  assert.equal(isLogsQLSyntax('{app="api"}'), true)
  assert.equal(isLogsQLSyntax('a | stats'), true)
  assert.equal(isLogsQLSyntax('foo AND bar'), true)
  assert.equal(isLogsQLSyntax('foo OR bar'), true)
  assert.equal(isLogsQLSyntax('NOT foo'), true)
  assert.equal(isLogsQLSyntax('field=~"re"'), true)
  assert.equal(isLogsQLSyntax('*tail'), true)
  assert.equal(isLogsQLSyntax('_msg'), true)

  assert.equal(isLogsQLSyntax('error'), false)
  assert.equal(isLogsQLSyntax('login failed'), false)
})

test('parseBasicLogsQL round-trips a single-value stream selector', async () => {
  const { buildLogsQL, parseBasicLogsQL } = await import('../utils/queryBuilder.js')

  const query = buildLogsQL([{ field: 'app', values: ['api'], type: 'stream', negated: false }], '')
  const { filters, freeText } = parseBasicLogsQL(query)

  assert.equal(freeText, '')
  assert.deepEqual(filters, [
    { field: 'app', values: ['api'], type: 'stream', negated: false, disabled: false }
  ])
})

test('parseBasicLogsQL round-trips a negated stream selector', async () => {
  const { buildLogsQL, parseBasicLogsQL } = await import('../utils/queryBuilder.js')

  const query = buildLogsQL([{ field: 'app', values: ['api'], type: 'stream', negated: true }], '')
  const { filters, freeText } = parseBasicLogsQL(query)

  assert.equal(freeText, '')
  assert.deepEqual(filters, [
    { field: 'app', values: ['api'], type: 'stream', negated: true, disabled: false }
  ])
})

test('parseBasicLogsQL splits out the freeText after a stream selector', async () => {
  const { buildLogsQL, parseBasicLogsQL } = await import('../utils/queryBuilder.js')

  const query = buildLogsQL([{ field: 'app', values: ['api'], type: 'stream', negated: false }], 'level:error')
  const { filters, freeText } = parseBasicLogsQL(query)

  assert.equal(freeText, 'level:error')
  assert.deepEqual(filters, [
    { field: 'app', values: ['api'], type: 'stream', negated: false, disabled: false }
  ])
})
