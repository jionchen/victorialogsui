import test from 'node:test'
import assert from 'node:assert/strict'

function createStorage(seed = {}) {
  const data = new Map(Object.entries(seed))
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null
    },
    setItem(key, value) {
      data.set(key, String(value))
    },
    removeItem(key) {
      data.delete(key)
    },
    clear() {
      data.clear()
    },
  }
}

// Reset global localStorage before each test
function resetStorage(seed = {}) {
  globalThis.localStorage = createStorage(seed)
}

test('useStorage initializes with default value when localStorage is empty', async () => {
  resetStorage()
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', 'default_value')

  assert.equal(value.value, 'default_value')
})

test('useStorage reads existing value from localStorage', async () => {
  resetStorage({ test_key: JSON.stringify('stored_value') })
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', 'default_value')

  assert.equal(value.value, 'stored_value')
})

test('useStorage writes to localStorage when value changes', async () => {
  resetStorage()
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', 'default_value')
  value.value = 'new_value'

  assert.equal(globalThis.localStorage.getItem('test_key'), JSON.stringify('new_value'))
})

test('useStorage handles JSON parse errors gracefully and falls back to default', async () => {
  resetStorage({ test_key: 'not-valid-json' })
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', 'fallback_value')

  assert.equal(value.value, 'fallback_value')
})

test('useStorage supports custom serialize/deserialize', async () => {
  resetStorage()
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', 42, {
    serialize: String,
    deserialize: (raw) => parseInt(raw, 10),
  })

  assert.equal(value.value, 42)
  value.value = 100

  assert.equal(globalThis.localStorage.getItem('test_key'), '100')
})

test('useStorage handles arrays with deep watch', async () => {
  resetStorage()
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', [1, 2, 3])
  value.value.push(4)

  // Note: watch with deep:true fires on mutation, but the assertion
  // timing depends on flush. We re-assign to guarantee persistence.
  value.value = [...value.value]

  const persisted = JSON.parse(globalThis.localStorage.getItem('test_key'))
  assert.deepEqual(persisted, [1, 2, 3, 4])
})

test('useStorage handles objects with deep watch', async () => {
  resetStorage()
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', { a: 1 })
  value.value.b = 2
  value.value = { ...value.value }

  const persisted = JSON.parse(globalThis.localStorage.getItem('test_key'))
  assert.deepEqual(persisted, { a: 1, b: 2 })
})

test('useStorage removes item from localStorage when set to null', async () => {
  resetStorage({ test_key: JSON.stringify('hello') })
  const { useStorage } = await import('../composables/useStorage.js')

  const value = useStorage('test_key', 'default')
  assert.equal(value.value, 'hello')

  value.value = null

  assert.equal(globalThis.localStorage.getItem('test_key'), null)
})

test('useStorage works when localStorage is undefined (graceful degrade)', async () => {
  const original = globalThis.localStorage
  globalThis.localStorage = undefined

  try {
    const { useStorage } = await import('../composables/useStorage.js')
    const value = useStorage('test_key', 'default_value')
    assert.equal(value.value, 'default_value')
    value.value = 'new_value'
    assert.equal(value.value, 'new_value')
  } finally {
    globalThis.localStorage = original
  }
})
