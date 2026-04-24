import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const LOG_TABLE_PATH = new URL('../components/LogTable.vue', import.meta.url)

test('log table exposes the time sort control from the time header instead of the toolbar', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')

  assert.equal(source.includes('log-panel__sort-btn'), false)
  assert.equal(source.includes('log-row__time-header'), true)
  assert.equal(source.includes('log-row__time-sort-arrow'), true)
  assert.match(source, /@click="logStore\.toggleSortOrder\(\)"/)
})

test('log table renders message previews through a dedicated multi-line preview container', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')

  assert.equal(source.includes('log-row__msg-preview'), true)
  assert.equal(source.includes(':style="{ height: `${LOG_ROW_HEIGHT}px` }"'), false)
  assert.equal(source.includes(':ref="setLogRowRef(log)"'), true)
})

test('log table displays printable log time instead of raw collection time', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')

  assert.equal(source.includes('getLogDisplayTimestamp(log)'), true)
  assert.equal(source.includes('getLogTimeTitle(log)'), true)
  assert.equal(source.includes('formatTimestamp(log._time)'), false)
})
