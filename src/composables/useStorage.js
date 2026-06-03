import { ref, watch } from 'vue'
import { logger } from '../utils/logger.js'

const isBrowser = typeof localStorage !== 'undefined'

export function useStorage(key, defaultValue, options = {}) {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    onError = (e) => logger.warn(`useStorage parse error for key "${key}":`, e),
  } = options

  function read() {
    if (!isBrowser) return defaultValue
    try {
      const raw = localStorage.getItem(key)
      if (raw === null) return defaultValue
      return deserialize(raw)
    } catch (e) {
      onError(e)
      return defaultValue
    }
  }

  const stored = ref(read())

  function write(value) {
    if (!isBrowser) return
    try {
      if (value === undefined || value === null) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, serialize(value))
      }
    } catch (e) {
      onError(e)
    }
  }

  watch(
    stored,
    (value) => write(value),
    { deep: true, flush: 'sync' }
  )

  return stored
}
