import { test, describe, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeProxyTarget,
  getConfiguredProxyTargets,
  getAllowedProxyTargets,
  isStrictProxyMode,
  isAllowedProxyTarget,
  setRuntimeConfig,
} from '../src/api/client.js'

const RUNTIME_KEY = '__VLOGS_RUNTIME_CONFIG__'

function resetEnv() {
  delete process.env.VITE_ALLOWED_PROXY_TARGETS
  delete process.env.VITE_STRICT_PROXY_TARGETS
  delete globalThis[RUNTIME_KEY]
}

function setEnv(allowed, strict) {
  process.env.VITE_ALLOWED_PROXY_TARGETS = allowed
  process.env.VITE_STRICT_PROXY_TARGETS = strict
}

describe('normalizeProxyTarget', () => {
  test('normalizes http/https host without path or credentials', () => {
    assert.equal(normalizeProxyTarget('http://172.19.0.176:49428'), 'http://172.19.0.176:49428')
    assert.equal(normalizeProxyTarget('https://logs.example.com:9428/'), 'https://logs.example.com:9428')
  })

  test('rejects non-http protocols', () => {
    assert.equal(normalizeProxyTarget('ftp://172.19.0.176:49428'), null)
  })

  test('rejects urls with credentials, search or hash', () => {
    assert.equal(normalizeProxyTarget('http://user:pass@172.19.0.176:49428'), null)
    assert.equal(normalizeProxyTarget('http://172.19.0.176:49428?foo=bar'), null)
    assert.equal(normalizeProxyTarget('http://172.19.0.176:49428#anchor'), null)
  })

  test('returns empty string for empty/undefined input', () => {
    assert.equal(normalizeProxyTarget(''), '')
    assert.equal(normalizeProxyTarget(undefined), '')
    assert.equal(normalizeProxyTarget(null), '')
  })
})

describe('proxy target configuration (process.env)', () => {
  beforeEach(resetEnv)
  after(resetEnv)

  test('getConfiguredProxyTargets parses comma-separated list', () => {
    setEnv('http://172.19.0.176:49428,http://172.19.0.176:29428', 'true')
    assert.deepEqual(getConfiguredProxyTargets(), [
      'http://172.19.0.176:49428',
      'http://172.19.0.176:29428',
    ])
  })

  test('getAllowedProxyTargets includes default target and configured targets', () => {
    setEnv('http://172.19.0.176:49428', 'true')
    const allowed = getAllowedProxyTargets()
    assert.ok(allowed.includes('http://172.19.0.176:49428'))
    assert.ok(allowed.includes('http://invalid-target:9428'))
  })

  test('isStrictProxyMode defaults to true when env is unset', () => {
    resetEnv()
    assert.equal(isStrictProxyMode(), true)
  })

  test('isStrictProxyMode follows env value', () => {
    setEnv('', 'false')
    assert.equal(isStrictProxyMode(), false)
    setEnv('', 'true')
    assert.equal(isStrictProxyMode(), true)
  })

  test('isAllowedProxyTarget rejects unknown target in strict mode', () => {
    setEnv('http://172.19.0.176:49428', 'true')
    assert.equal(isAllowedProxyTarget('http://172.19.0.176:49428'), true)
    assert.equal(isAllowedProxyTarget('http://172.19.0.176:11111'), false)
  })

  test('isAllowedProxyTarget allows any valid target when strict mode is off', () => {
    setEnv('', 'false')
    assert.equal(isAllowedProxyTarget('http://172.19.0.176:11111'), true)
  })
})

describe('proxy target configuration (runtime config)', () => {
  beforeEach(resetEnv)
  after(resetEnv)

  test('runtime config overrides process.env', () => {
    setEnv('http://process-env:9428', 'true')
    setRuntimeConfig({
      VITE_ALLOWED_PROXY_TARGETS: 'http://runtime-config:9428',
      VITE_STRICT_PROXY_TARGETS: 'false',
    })

    assert.deepEqual(getConfiguredProxyTargets(), ['http://runtime-config:9428'])
    assert.equal(isStrictProxyMode(), false)
  })

  test('runtime config empty object falls back to process.env', () => {
    setEnv('http://fallback:9428', 'false')
    setRuntimeConfig({})

    assert.deepEqual(getConfiguredProxyTargets(), ['http://fallback:9428'])
    assert.equal(isStrictProxyMode(), false)
  })
})
