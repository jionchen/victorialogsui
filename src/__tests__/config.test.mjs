import test from 'node:test'
import assert from 'node:assert/strict'

test('shared config exports central app and storage constants', async () => {
  const { STORAGE_KEYS, SESSION_STORAGE_KEYS } = await import('../../config/storageKeys.js')
  const {
    MAX_AUDIT_EVENTS,
    MAX_QUERY_HISTORY,
    DEFAULTS_MIGRATION_VERSION,
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
    API_LOG_QUERY_TIMEOUT_MS,
    API_STATS_QUERY_TIMEOUT_MS,
    API_FIELD_QUERY_TIMEOUT_MS,
    API_PROXY_TIMEOUT_MS,
    AUXILIARY_QUERY_DELAY_MS,
    LARGE_QUERY_AUXILIARY_DELAY_MS,
  } = await import('../../config/proxyConfig.js')

  assert.equal(STORAGE_KEYS.auditEvents, 'vlogs_audit_events')
  assert.equal(STORAGE_KEYS.defaultsVersion, 'vlogs_defaults_version')
  assert.equal(SESSION_STORAGE_KEYS.auth, 'vlogs_auth')
  assert.equal(MAX_AUDIT_EVENTS, 200)
  assert.equal(MAX_QUERY_HISTORY, 20)
  assert.equal(DEFAULTS_MIGRATION_VERSION, '2026-04-10-defaults-v1')
  assert.deepEqual(DEFAULT_PINNED_FIELDS, [
    'src_namespace',
    'src_container_name',
    'src_pod_name',
  ])
  assert.deepEqual(DEFAULT_TABLE_COLUMNS, ['_stream'])
  assert.deepEqual(TIME_PRESETS.map(item => item.value), ['5m', '30m', '6h', '1d', '7d'])
  assert.equal(LOG_ROW_HEIGHT, 136)
  assert.equal(APP_BASE_PATH, '/vlogs-ui/')
  assert.equal(DEV_SERVER_HOST, '127.0.0.1')
  assert.equal(DEV_SERVER_PORT, 5173)
  assert.equal(DEFAULT_PROXY_TARGET, 'http://invalid-target:9428')
  assert.equal(MAX_API_RETRIES, 2)
  assert.equal(API_RETRY_DELAY_MS, 1000)
  assert.equal(API_PROXY_BASE_PATH, '/api')
  assert.equal(API_REQUEST_TIMEOUT_MS, 60000)
  assert.equal(API_CONNECTION_TEST_TIMEOUT_MS, 5000)
  assert.equal(API_LOG_QUERY_TIMEOUT_MS, 180000)
  assert.equal(API_STATS_QUERY_TIMEOUT_MS, 120000)
  assert.equal(API_FIELD_QUERY_TIMEOUT_MS, 90000)
  assert.equal(API_PROXY_TIMEOUT_MS, 240000)
  assert.equal(AUXILIARY_QUERY_DELAY_MS, 150)
  assert.equal(LARGE_QUERY_AUXILIARY_DELAY_MS, 800)
})
