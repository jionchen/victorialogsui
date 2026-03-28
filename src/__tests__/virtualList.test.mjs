import test from 'node:test'
import assert from 'node:assert/strict'

test('calculateVirtualWindow returns bounded window with overscan', async () => {
  const { calculateVirtualWindow } = await import('../utils/virtualList.js')

  const result = calculateVirtualWindow({
    total: 1000,
    scrollTop: 600,
    containerHeight: 300,
    itemHeight: 30,
    overscan: 3,
  })

  assert.equal(result.start, 17)
  assert.equal(result.end, 33)
  assert.equal(result.offsetTop, 510)
})

test('calculateVirtualWindow handles small datasets', async () => {
  const { calculateVirtualWindow } = await import('../utils/virtualList.js')

  const result = calculateVirtualWindow({
    total: 5,
    scrollTop: 0,
    containerHeight: 300,
    itemHeight: 30,
    overscan: 3,
  })

  assert.equal(result.start, 0)
  assert.equal(result.end, 5)
  assert.equal(result.totalHeight, 150)
})
