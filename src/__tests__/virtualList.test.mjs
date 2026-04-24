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

test('calculateDynamicVirtualWindow returns a bounded window for mixed row heights', async () => {
  const { calculateDynamicVirtualWindow } = await import('../utils/virtualList.js')

  const result = calculateDynamicVirtualWindow({
    itemHeights: [40, 80, 40, 40],
    estimatedItemHeight: 60,
    scrollTop: 90,
    containerHeight: 80,
    overscan: 0,
  })

  assert.equal(result.start, 1)
  assert.equal(result.end, 4)
  assert.equal(result.offsetTop, 40)
  assert.equal(result.totalHeight, 200)
  assert.equal(result.visibleHeight, 160)
})

test('calculateDynamicVirtualWindow falls back to the estimated height for unknown rows', async () => {
  const { calculateDynamicVirtualWindow } = await import('../utils/virtualList.js')

  const result = calculateDynamicVirtualWindow({
    itemHeights: [undefined, 60, 0],
    estimatedItemHeight: 50,
    scrollTop: 0,
    containerHeight: 60,
    overscan: 1,
  })

  assert.equal(result.start, 0)
  assert.equal(result.end, 3)
  assert.equal(result.totalHeight, 160)
})
