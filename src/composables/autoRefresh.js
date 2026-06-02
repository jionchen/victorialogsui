export function createAutoRefresh({
  onTick,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let timer = null

  function sync(interval) {
    clearIntervalFn(timer)
    if (interval > 0) {
      timer = setIntervalFn(() => onTick(), interval)
    }
  }

  function stop() {
    clearIntervalFn(timer)
    timer = null
  }

  return {
    sync,
    stop,
  }
}
