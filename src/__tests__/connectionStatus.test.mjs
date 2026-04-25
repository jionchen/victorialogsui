import test from 'node:test'
import assert from 'node:assert/strict'

test('connection errors are classified as recoverable gateway problems', async () => {
  const { classifyConnectionError } = await import('../utils/connectionStatus.js')

  assert.deepEqual(classifyConnectionError({ response: { status: 504 }, message: 'Gateway timeout' }), {
    recoverable: true,
    status: 504,
    title: 'VictoriaLogs 连接不可用',
    detail: '代理或 VictoriaLogs 后端暂时不可达，请检查数据源地址后重试。',
  })
})

test('network errors are classified as recoverable connection problems', async () => {
  const { classifyConnectionError } = await import('../utils/connectionStatus.js')

  const result = classifyConnectionError({ code: 'ERR_NETWORK', message: 'Network Error' })

  assert.equal(result.recoverable, true)
  assert.equal(result.status, null)
  assert.match(result.detail, /网络连接/)
})
