import test from 'node:test'
import assert from 'node:assert/strict'

test('shared config exports central app and storage constants', async () => {
  const { STORAGE_KEYS, SESSION_STORAGE_KEYS } = await import('../../config/storageKeys.js')
  const {
    MAX_AUDIT_EVENTS,
    MAX_QUERY_HISTORY,
    DEFAULT_PINNED_FIELDS,
    DEFAULT_TABLE_COLUMNS,
    APP_BASE_PATH,
    DEV_SERVER_HOST,
    DEV_SERVER_PORT,
  } = await import('../../config/appConfig.js')
  const { TIME_PRESETS, LOG_ROW_HEIGHT } = await import('../../config/uiConfig.js')
  const {
    DEFAULT_PROXY_TARGET,
    MAX_API_RETRIES,
    API_RETRY_DELAY_MS,
    API_PROXY_BASE_PATH,
    API_REQUEST_TIMEOUT_MS,
    API_CONNECTION_TEST_TIMEOUT_MS,
  } = await import('../../config/proxyConfig.js')

  assert.equal(STORAGE_KEYS.auditEvents, 'vlogs_audit_events')
  assert.equal(SESSION_STORAGE_KEYS.auth, 'vlogs_auth')
  assert.equal(MAX_AUDIT_EVENTS, 200)
  assert.equal(MAX_QUERY_HISTORY, 20)
  assert.deepEqual(DEFAULT_PINNED_FIELDS, [
    'src_k8s.namespace.name',
    'src_container.name',
    'src_k8s.pod.name',
  ])
  assert.deepEqual(DEFAULT_TABLE_COLUMNS, ['level', '_stream'])
  assert.deepEqual(TIME_PRESETS.map(item => item.value), ['5m', '30m', '6h', '1d', '7d'])
  assert.equal(LOG_ROW_HEIGHT, 40)
  assert.equal(APP_BASE_PATH, '/vlogs-ui/')
  assert.equal(DEV_SERVER_HOST, '127.0.0.1')
  assert.equal(DEV_SERVER_PORT, 5173)
  assert.equal(DEFAULT_PROXY_TARGET, 'http://172.19.0.176:19428')
  assert.equal(MAX_API_RETRIES, 2)
  assert.equal(API_RETRY_DELAY_MS, 1000)
  assert.equal(API_PROXY_BASE_PATH, '/api')
  assert.equal(API_REQUEST_TIMEOUT_MS, 60000)
  assert.equal(API_CONNECTION_TEST_TIMEOUT_MS, 5000)
})
