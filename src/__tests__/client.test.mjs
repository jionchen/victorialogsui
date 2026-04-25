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

  assert.equal(isAllowedProxyTarget('http://invalid-target:9428', { strict: true }), true)
  assert.equal(isAllowedProxyTarget('https://evil.example.com', { strict: true }), false)
})

test('non-strict proxy mode allows any normalized http target', async () => {
  const { isAllowedProxyTarget } = await import('../api/client.js')

  assert.equal(isAllowedProxyTarget('https://logs.internal.example.com', { strict: false }), true)
  assert.equal(isAllowedProxyTarget('https://user:pass@logs.internal.example.com', { strict: false }), false)
})

test('client retries gateway timeout responses before succeeding', async () => {
  const { default: client } = await import('../api/client.js')
  const originalAdapter = client.defaults.adapter
  let attempts = 0

  client.defaults.adapter = async (config) => {
    attempts += 1
    if (attempts === 1) {
      const error = new Error('gateway timeout')
      error.config = config
      error.response = { status: 504, data: 'timeout' }
      throw error
    }
    return {
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: { ok: true },
    }
  }

  try {
    const response = await client.get('/retry-504', { retryDelayMs: 0 })
    assert.equal(response.data.ok, true)
    assert.equal(attempts, 2)
  } finally {
    client.defaults.adapter = originalAdapter
  }
})

test('auth credentials are saved to session storage by default', async () => {
  const sessionData = new Map()
  const localData = new Map()
  globalThis.sessionStorage = {
    getItem(key) { return sessionData.get(key) || null },
    setItem(key, value) { sessionData.set(key, String(value)) },
    removeItem(key) { sessionData.delete(key) },
  }
  globalThis.localStorage = {
    getItem(key) { return localData.get(key) || null },
    setItem(key, value) { localData.set(key, String(value)) },
    removeItem(key) { localData.delete(key) },
  }

  const { getAuthCredentials, setAuth } = await import(`../api/client.js?auth-default-${Date.now()}`)
  setAuth('paas', 'secret')

  assert.deepEqual(getAuthCredentials(), { username: 'paas', password: 'secret' })
  assert.equal(sessionData.has('vlogs_auth'), true)
  assert.equal(localData.has('vlogs_auth'), false)
})
