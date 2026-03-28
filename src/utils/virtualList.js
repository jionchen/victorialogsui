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
