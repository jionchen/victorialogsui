import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { calculateVirtualWindow, calculateDynamicVirtualWindow } from '../src/utils/virtualList.js'

describe('calculateVirtualWindow', () => {
  test('empty list returns zeroed window', () => {
    const result = calculateVirtualWindow({
      total: 0,
      scrollTop: 0,
      containerHeight: 200,
      itemHeight: 20,
    })
    assert.deepEqual(result, { start: 0, end: 0, offsetTop: 0, totalHeight: 0 })
  })

  test('single item is fully contained in the window', () => {
    const result = calculateVirtualWindow({
      total: 1,
      scrollTop: 0,
      containerHeight: 100,
      itemHeight: 20,
    })
    assert.equal(result.start, 0)
    assert.equal(result.end, 1)
    assert.equal(result.offsetTop, 0)
    assert.equal(result.totalHeight, 20)
  })

  test('visible window in the middle of the list applies overscan on both sides', () => {
    const result = calculateVirtualWindow({
      total: 100,
      scrollTop: 400,
      containerHeight: 200,
      itemHeight: 20,
      overscan: 3,
    })
    // rawStart = 400/20 = 20, visibleCount = ceil(200/20) = 10
    assert.equal(result.start, 17)
    assert.equal(result.end, 33)
    assert.equal(result.offsetTop, 17 * 20)
    assert.equal(result.totalHeight, 100 * 20)
  })

  test('scrollTop at top boundary clamps start to 0', () => {
    const result = calculateVirtualWindow({
      total: 100,
      scrollTop: 0,
      containerHeight: 200,
      itemHeight: 20,
      overscan: 3,
    })
    assert.equal(result.start, 0)
    assert.equal(result.end, 13)
    assert.equal(result.offsetTop, 0)
  })

  test('scrollTop at bottom boundary clamps end to total', () => {
    const result = calculateVirtualWindow({
      total: 100,
      scrollTop: 100 * 20 - 200,
      containerHeight: 200,
      itemHeight: 20,
      overscan: 3,
    })
    // rawStart = 1800/20 = 90, end = min(100, 90 + 10 + 3)
    assert.equal(result.start, 87)
    assert.equal(result.end, 100)
    assert.equal(result.offsetTop, 87 * 20)
  })

  test('overscan of 0 yields exactly the visible rows', () => {
    const result = calculateVirtualWindow({
      total: 10,
      scrollTop: 25,
      containerHeight: 30,
      itemHeight: 10,
      overscan: 0,
    })
    assert.equal(result.start, 2)
    assert.equal(result.end, 5)
    assert.equal(result.offsetTop, 20)
  })

  test('invalid itemHeight and containerHeight fall back to safe minimums', () => {
    const result = calculateVirtualWindow({
      total: 5,
      scrollTop: 0,
      containerHeight: 0,
      itemHeight: 0,
    })
    // safeItemHeight = 1, safeContainerHeight = 1, visibleCount = 1
    assert.equal(result.start, 0)
    assert.equal(result.end, 4)
    assert.equal(result.totalHeight, 5)
  })

  test('undefined scrollTop is treated as 0', () => {
    const result = calculateVirtualWindow({
      total: 10,
      containerHeight: 50,
      itemHeight: 10,
      overscan: 0,
    })
    assert.equal(result.start, 0)
    assert.equal(result.offsetTop, 0)
  })
})

describe('calculateDynamicVirtualWindow', () => {
  test('empty list returns zeroed window', () => {
    const result = calculateDynamicVirtualWindow({
      itemHeights: [],
      estimatedItemHeight: 20,
      scrollTop: 0,
      containerHeight: 200,
    })
    assert.deepEqual(result, { start: 0, end: 0, offsetTop: 0, totalHeight: 0, visibleHeight: 0 })
  })

  test('single item window spans the whole item', () => {
    const result = calculateDynamicVirtualWindow({
      itemHeights: [50],
      estimatedItemHeight: 20,
      scrollTop: 0,
      containerHeight: 100,
    })
    assert.equal(result.start, 0)
    assert.equal(result.end, 1)
    assert.equal(result.offsetTop, 0)
    assert.equal(result.totalHeight, 50)
    assert.equal(result.visibleHeight, 50)
  })

  test('variable heights produce correct window via prefix offsets', () => {
    const result = calculateDynamicVirtualWindow({
      itemHeights: [10, 20, 30, 40, 50],
      estimatedItemHeight: 20,
      scrollTop: 30,
      containerHeight: 50,
      overscan: 0,
    })
    // prefix offsets: [0, 10, 30, 60, 100, 150]; viewport [30, 80)
    assert.equal(result.start, 2)
    assert.equal(result.end, 4)
    assert.equal(result.offsetTop, 30)
    assert.equal(result.totalHeight, 150)
    assert.equal(result.visibleHeight, 70)
  })

  test('scrollTop beyond content clamps to the last item', () => {
    const result = calculateDynamicVirtualWindow({
      itemHeights: [10, 10, 10],
      estimatedItemHeight: 10,
      scrollTop: 9999,
      containerHeight: 50,
      overscan: 0,
    })
    assert.equal(result.start, 2)
    assert.equal(result.end, 3)
    assert.equal(result.totalHeight, 30)
  })

  test('negative scrollTop is clamped to 0', () => {
    const result = calculateDynamicVirtualWindow({
      itemHeights: [10, 10, 10],
      estimatedItemHeight: 10,
      scrollTop: -100,
      containerHeight: 20,
      overscan: 0,
    })
    assert.equal(result.start, 0)
    assert.equal(result.offsetTop, 0)
  })

  test('invalid item heights fall back to estimatedItemHeight', () => {
    const result = calculateDynamicVirtualWindow({
      itemHeights: [NaN, -5, 0],
      estimatedItemHeight: 10,
      scrollTop: 0,
      containerHeight: 30,
    })
    assert.equal(result.totalHeight, 30)
    assert.equal(result.end, 3)
  })
})
