export function calculateVirtualWindow({
  total,
  scrollTop,
  containerHeight,
  itemHeight,
  overscan = 3,
}) {
  const safeTotal = Math.max(0, total || 0)
  const safeItemHeight = Math.max(1, itemHeight || 1)
  const safeContainerHeight = Math.max(safeItemHeight, containerHeight || safeItemHeight)
  const visibleCount = Math.ceil(safeContainerHeight / safeItemHeight)
  const rawStart = Math.floor((scrollTop || 0) / safeItemHeight)
  const start = Math.max(0, rawStart - overscan)
  const end = Math.min(safeTotal, rawStart + visibleCount + overscan)

  return {
    start,
    end,
    offsetTop: start * safeItemHeight,
    totalHeight: safeTotal * safeItemHeight,
  }
}

function sanitizeHeight(height, fallback) {
  const value = Number(height)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function buildPrefixOffsets(itemHeights = [], fallbackHeight = 1) {
  const safeFallback = Math.max(1, fallbackHeight || 1)
  const offsets = [0]

  for (const itemHeight of itemHeights) {
    offsets.push(offsets[offsets.length - 1] + sanitizeHeight(itemHeight, safeFallback))
  }

  return offsets
}

function findFirstPrefixAtOrAbove(prefixOffsets, target) {
  let low = 0
  let high = prefixOffsets.length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (prefixOffsets[mid] < target) {
      low = mid + 1
    } else {
      high = mid
    }
  }

  return low
}

function findItemIndexAtOffset(prefixOffsets, offset) {
  const itemCount = Math.max(0, prefixOffsets.length - 1)
  if (itemCount === 0) return 0

  const firstPrefixAfterOffset = findFirstPrefixAtOrAbove(prefixOffsets, Math.max(0, offset) + 1)
  return Math.max(0, Math.min(itemCount - 1, firstPrefixAfterOffset - 1))
}

export function calculateDynamicVirtualWindow({
  itemHeights = [],
  estimatedItemHeight,
  scrollTop,
  containerHeight,
  overscan = 3,
}) {
  const safeEstimatedHeight = Math.max(1, estimatedItemHeight || 1)
  const prefixOffsets = buildPrefixOffsets(itemHeights, safeEstimatedHeight)
  const total = Math.max(0, itemHeights.length || 0)
  const totalHeight = prefixOffsets[prefixOffsets.length - 1] || 0

  if (total === 0) {
    return { start: 0, end: 0, offsetTop: 0, totalHeight: 0, visibleHeight: 0 }
  }

  const safeContainerHeight = Math.max(safeEstimatedHeight, containerHeight || safeEstimatedHeight)
  const safeScrollTop = Math.max(0, scrollTop || 0)
  const viewportEnd = safeScrollTop + safeContainerHeight

  const rawStart = findItemIndexAtOffset(prefixOffsets, safeScrollTop)
  const rawEnd = Math.max(rawStart + 1, findFirstPrefixAtOrAbove(prefixOffsets, viewportEnd))
  const start = Math.max(0, rawStart - overscan)
  const end = Math.min(total, rawEnd + overscan)

  return {
    start,
    end,
    offsetTop: prefixOffsets[start],
    totalHeight,
    visibleHeight: prefixOffsets[end] - prefixOffsets[start],
  }
}
