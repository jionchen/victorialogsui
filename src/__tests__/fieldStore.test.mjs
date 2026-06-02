import test from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

test('field store retries once and records an error state when loading values fails', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  let attempts = 0
  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => {
      attempts += 1
      throw new Error('network down')
    },
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  await store.loadFieldValues({ field: 'src_container.name', isStream: false, query: '*', start: '24h', end: 'now' })

  const state = store.getCachedValues({
    field: 'src_container.name',
    isStream: false,
    query: '*',
    start: '24h',
    end: 'now',
  })

  assert.equal(attempts, 2)
  assert.equal(state.status, 'error')
  assert.equal(state.error, 'network down')
  assert.deepEqual(state.values, [])
})

test('field store keeps the previous successful values when a refresh fails after retry', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  let attempts = 0
  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [{ value: 'src_container.name', hits: 10 }],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => {
      attempts += 1
      if (attempts === 1) {
        return [{ value: 'deployment-rule-engine', hits: 10 }]
      }
      throw new Error('timeout')
    },
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  const params = { field: 'src_container.name', isStream: false, query: '*', start: '24h', end: 'now' }

  await store.loadFieldValues(params)
  await store.loadFieldValues(params)

  const state = store.getCachedValues(params)
  assert.equal(attempts, 3)
  assert.equal(state.status, 'error')
  assert.equal(state.error, 'timeout')
  assert.deepEqual(state.values, [{ value: 'deployment-rule-engine', hits: 10 }])
})

test('field store ignores stale responses from older requests for the same cache key', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const first = deferred()
  const second = deferred()
  let attempts = 0
  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [{ value: 'src_container.name', hits: 20 }],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => {
      attempts += 1
      return attempts === 1 ? first.promise : second.promise
    },
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  const params = { field: 'src_container.name', isStream: false, query: '*', start: '24h', end: 'now' }

  const older = store.loadFieldValues(params)
  const newer = store.loadFieldValues(params)
  second.resolve([{ value: 'deployment-new', hits: 12 }])
  await newer
  first.resolve([{ value: 'deployment-old', hits: 5 }])
  await older

  const state = store.getCachedValues(params)
  assert.equal(state.status, 'success')
  assert.deepEqual(state.values, [{ value: 'deployment-new', hits: 12 }])
})

test('field store records field name failures without clearing existing field value cache', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => {
      throw new Error('field names gateway timeout')
    },
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [{ value: 'paas', hits: 8 }],
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  const params = { field: 'src_namespace', isStream: false, query: '*', start: '24h', end: 'now' }

  await store.loadFieldValues(params)
  await store.loadFieldNames({ query: '*', start: '24h', end: 'now' })

  assert.equal(store.error, 'field names gateway timeout')
  assert.deepEqual(store.getCachedValues(params).values, [{ value: 'paas', hits: 8 }])
})

test('field store does not fabricate evenly spread hits when per-value counts are missing', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [{ value: 'src_container.name', hits: 99 }],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [
      { value: 'a', hits: 0 },
      { value: 'b', hits: 0 },
      { value: 'c', hits: 0 },
    ],
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  const params = { field: 'src_container.name', isStream: false, query: '*', start: '24h', end: 'now' }

  await store.loadFieldNames({ query: '*', start: '24h', end: 'now' })
  await store.loadFieldValues(params)

  const state = store.getCachedValues(params)
  assert.equal(state.status, 'success')
  assert.equal(state.countsKnown, false)
  assert.equal(state.total, 0)
  assert.deepEqual(state.values.map(v => v.hits), [0, 0, 0])
})

test('field store marks counts as known when real per-value hits are present', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [{ value: 'src_container.name', hits: 30 }],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [
      { value: 'a', hits: 20 },
      { value: 'b', hits: 10 },
    ],
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  const params = { field: 'src_container.name', isStream: false, query: '*', start: '24h', end: 'now' }

  await store.loadFieldNames({ query: '*', start: '24h', end: 'now' })
  await store.loadFieldValues(params)

  const state = store.getCachedValues(params)
  assert.equal(state.status, 'success')
  assert.equal(state.countsKnown, true)
  assert.equal(state.total, 30)
  assert.deepEqual(state.values, [{ value: 'a', hits: 20 }, { value: 'b', hits: 10 }])
})


test('field store increments names version only after field names load successfully', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  let shouldFail = true
  const useFieldStore = createFieldsStore({
    getFieldNames: async () => {
      if (shouldFail) throw new Error('field names timeout')
      return [{ value: 'src_namespace', hits: 10 }]
    },
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [],
    getStreamFieldValues: async () => [],
  })

  const store = useFieldStore()
  assert.equal(store.namesVersion, 0)

  await store.loadFieldNames({ query: '*', start: '24h', end: 'now' })
  assert.equal(store.namesVersion, 0)

  shouldFail = false
  await store.loadFieldNames({ query: '*', start: '24h', end: 'now' })
  assert.equal(store.namesVersion, 1)
})

test('loadFacets writes aligned-key cache entries with known numeric counts', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [],
    getStreamFieldValues: async () => [],
    queryFacets: async () => ({
      facets: [
        {
          field_name: 'src_namespace',
          values: [
            { field_value: 'prod', hits: 12 },
            { field_value: 'dev', hits: 30 },
          ],
        },
      ],
    }),
  })

  const store = useFieldStore()
  await store.loadFacets({ query: '*', start: '1h', end: 'now' })

  const state = store.getCachedValues({
    field: 'src_namespace',
    isStream: false,
    query: '*',
    start: '1h',
    end: 'now',
    filter: '',
  })

  assert.equal(state.status, 'success')
  assert.equal(state.countsKnown, true)
  assert.equal(state.loading, false)
  assert.equal(state.total, 42)
  assert.deepEqual(state.values, [{ value: 'dev', hits: 30 }, { value: 'prod', hits: 12 }])
})

test('loadFacets coerces string hits into numbers', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [],
    getStreamFieldValues: async () => [],
    queryFacets: async () => ({
      facets: [
        {
          field_name: 'level',
          values: [
            { field_value: 'info', hits: '5' },
            { field_value: 'error', hits: '10' },
          ],
        },
      ],
    }),
  })

  const store = useFieldStore()
  await store.loadFacets({ query: '*', start: '1h', end: 'now' })

  const state = store.getCachedValues({
    field: 'level',
    isStream: false,
    query: '*',
    start: '1h',
    end: 'now',
    filter: '',
  })

  assert.equal(state.total, 15)
  assert.deepEqual(state.values, [{ value: 'error', hits: 10 }, { value: 'info', hits: 5 }])
  assert.equal(typeof state.values[0].hits, 'number')
})

test('loadFacets does not throw or pollute cache on empty or malformed responses', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [],
    getStreamFieldNames: async () => [],
    getFieldValues: async () => [],
    getStreamFieldValues: async () => [],
    queryFacets: async () => ({ unexpected: true }),
  })

  const store = useFieldStore()
  await store.loadFacets({ query: '*', start: '1h', end: 'now' })

  assert.deepEqual(store.fieldValuesCache, {})
})

test('loadFacets classifies a stream-named field under the stream cache key', async () => {
  setActivePinia(createPinia())
  const { createFieldsStore } = await import('../stores/fields.js')

  const useFieldStore = createFieldsStore({
    getFieldNames: async () => [],
    getStreamFieldNames: async () => [{ value: 'src_stream', hits: 100 }],
    getFieldValues: async () => [],
    getStreamFieldValues: async () => [],
    queryFacets: async () => ({
      facets: [
        {
          field_name: 'src_stream',
          values: [{ field_value: 'app-1', hits: 7 }],
        },
      ],
    }),
  })

  const store = useFieldStore()
  await store.loadFieldNames({ query: '*', start: '1h', end: 'now' })
  await store.loadFacets({ query: '*', start: '1h', end: 'now' })

  const streamState = store.getCachedValues({
    field: 'src_stream',
    isStream: true,
    query: '*',
    start: '1h',
    end: 'now',
    filter: '',
  })
  assert.equal(streamState.status, 'success')
  assert.deepEqual(streamState.values, [{ value: 'app-1', hits: 7 }])

  const logState = store.getCachedValues({
    field: 'src_stream',
    isStream: false,
    query: '*',
    start: '1h',
    end: 'now',
    filter: '',
  })
  assert.equal(logState.status, 'idle')
})
