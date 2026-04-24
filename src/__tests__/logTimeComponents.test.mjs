import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const LOG_DETAIL_PATH = new URL('../components/LogDetail.vue', import.meta.url)
const LOG_CONTEXT_PATH = new URL('../components/LogContextModal.vue', import.meta.url)

test('log detail shows printable log time and labels raw _time as collection time', async () => {
  const source = await readFile(LOG_DETAIL_PATH, 'utf8')

  assert.equal(source.includes("['日志时间', formatLogTimestamp(getLogDisplayTimestamp(props.log))]"), true)
  assert.equal(source.includes("key === '_time' ? '采集时间 (_time)' : key"), true)
  assert.equal(source.includes("field !== '日志时间' && field !== '采集时间 (_time)'"), true)
})

test('context modal displays printable log time while keeping _time for the query window', async () => {
  const source = await readFile(LOG_CONTEXT_PATH, 'utf8')

  assert.equal(source.includes('formatLogTimestamp(getLogDisplayTimestamp(log))'), true)
  assert.equal(source.includes('formatLogTimestamp(getLogDisplayTimestamp(item))'), true)
  assert.equal(source.includes('const d = new Date(props.log._time)'), true)
})
