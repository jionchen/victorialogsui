import test from 'node:test'
import assert from 'node:assert/strict'

test('getHighlightTerms returns both tokens from a plain-text AND query', async () => {
  const { getHighlightTerms } = await import('../utils/highlighting.js')

  assert.deepEqual(getHighlightTerms({
    isManualMode: true,
    manualQuery: '14080145170 AND 0200',
    effectiveQuery: '_msg:~"14080145170 AND 0200"',
  }), ['14080145170', '0200'])
})

test('getHighlightTerms extracts multiple tokens from an explicit _msg substring query', async () => {
  const { getHighlightTerms } = await import('../utils/highlighting.js')

  assert.deepEqual(getHighlightTerms({
    isManualMode: true,
    manualQuery: '_msg:~"支付失败 AND timeout"',
    effectiveQuery: '_msg:~"支付失败 AND timeout"',
  }), ['支付失败', 'timeout'])
})

test('getHighlightTerms keeps field values but excludes field names and operators', async () => {
  const { getHighlightTerms } = await import('../utils/highlighting.js')

  assert.deepEqual(getHighlightTerms({
    isManualMode: true,
    manualQuery: 'status:500 AND host.name:"gateway"',
    effectiveQuery: 'status:500 AND host.name:"gateway"',
  }), ['500', 'gateway'])
})

test('getHighlightTerms keeps unquoted field values that look like identifiers', async () => {
  const { getHighlightTerms } = await import('../utils/highlighting.js')

  assert.deepEqual(getHighlightTerms({
    isManualMode: true,
    manualQuery: 'host.name:gateway AND src_namespace:paas',
    effectiveQuery: 'host.name:gateway AND src_namespace:paas',
  }), ['gateway', 'paas'])
})

test('getHighlightTerms extracts stream values and free-text tokens from mixed queries', async () => {
  const { getHighlightTerms } = await import('../utils/highlighting.js')

  assert.deepEqual(getHighlightTerms({
    effectiveQuery: '{src_namespace="paas"} error timeout',
  }), ['paas', 'error', 'timeout'])
})

test('buildHighlightedParts highlights every case-insensitive match without changing original text', async () => {
  const { buildHighlightedParts } = await import('../utils/highlighting.js')

  assert.deepEqual(
    buildHighlightedParts('Error <tag> error', ['error']),
    [
      { text: 'Error', match: true },
      { text: ' <tag> ', match: false },
      { text: 'error', match: true },
    ]
  )
})

test('buildHighlightedParts handles exact Chinese and punctuation phrases safely', async () => {
  const { buildHighlightedParts } = await import('../utils/highlighting.js')

  assert.deepEqual(
    buildHighlightedParts('支付失败(foo) 后重试', ['支付失败(foo)']),
    [
      { text: '支付失败(foo)', match: true },
      { text: ' 后重试', match: false },
    ]
  )
})

test('buildHighlightedParts highlights multiple terms without overlapping shorter matches first', async () => {
  const { buildHighlightedParts } = await import('../utils/highlighting.js')

  assert.deepEqual(
    buildHighlightedParts('gateway timeout gateway', ['gate', 'gateway', 'timeout']),
    [
      { text: 'gateway', match: true },
      { text: ' ', match: false },
      { text: 'timeout', match: true },
      { text: ' ', match: false },
      { text: 'gateway', match: true },
    ]
  )
})

test('buildHighlightedParts returns the original text when there is no match', async () => {
  const { buildHighlightedParts } = await import('../utils/highlighting.js')

  assert.deepEqual(
    buildHighlightedParts('service started', ['timeout']),
    [{ text: 'service started', match: false }]
  )
})
