import test from 'node:test'
import assert from 'node:assert/strict'

test('getStreamLabel prefers service-level container names before pod, host, and _stream fallback', async () => {
  const { getStreamLabel } = await import('../utils/formatters.js')

  assert.equal(getStreamLabel({ 'src_container.name': 'deployment-rule-engine' }), 'deployment-rule-engine')
  assert.equal(getStreamLabel({ src_container_name: 'deployment-dse-jt-unified' }), 'deployment-dse-jt-unified')
  assert.equal(getStreamLabel({ 'src_k8s.pod.name': 'deployment-rule-engine-abc123' }), 'deployment-rule-engine-abc123')
  assert.equal(getStreamLabel({ src_pod_name: 'deployment-rule-engine-def456' }), 'deployment-rule-engine-def456')
  assert.equal(getStreamLabel({ 'host.name': 'node-a' }), 'node-a')
  assert.equal(getStreamLabel({ _stream: '{host="node-a"}' }), '{host="node-a"}')
  assert.equal(getStreamLabel({}), '-')
})
