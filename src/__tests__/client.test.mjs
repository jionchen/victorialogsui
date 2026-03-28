import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.localStorage = {
  getItem() {
    return null
  },
  setItem() {},
  removeItem() {},
}

globalThis.sessionStorage = {
  getItem() {
    return null
  },
  setItem() {},
  removeItem() {},
}

globalThis.window = { location: { origin: 'http://localhost:5173' } }

test('normalizeProxyTarget strips path and rejects credentials or query fragments', async () => {
  const { normalizeProxyTarget } = await import('../api/client.js')

  assert.equal(normalizeProxyTarget('http://172.19.0.176:19428/select/logsql'), 'http://172.19.0.176:19428')
  assert.equal(normalizeProxyTarget('https://logs.example.com/'), 'https://logs.example.com')
  assert.equal(normalizeProxyTarget('https://user:pass@logs.example.com'), null)
  assert.equal(normalizeProxyTarget('https://logs.example.com?token=1'), null)
})

test('allowed proxy targets must come from the configured allowlist', async () => {
  const { isAllowedProxyTarget } = await import('../api/client.js')

  assert.equal(isAllowedProxyTarget('http://172.19.0.176:19428'), true)
  assert.equal(isAllowedProxyTarget('https://evil.example.com'), false)
})
