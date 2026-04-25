import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const LOG_TABLE_PATH = new URL('../components/LogTable.vue', import.meta.url)
const APP_PATH = new URL('../App.vue', import.meta.url)
const LIVE_TAIL_PATH = new URL('../components/LiveTailPanel.vue', import.meta.url)
const SAVED_VIEWS_PATH = new URL('../components/SavedViewsPanel.vue', import.meta.url)

test('log table exposes recovery actions for recoverable connection errors', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')

  assert.match(source, /connection-recovery/)
  assert.match(source, /配置 VictoriaLogs 地址/)
  assert.match(source, /重试查询/)
  assert.match(source, /emit\('configure-connection'\)/)
})

test('app wires log table connection recovery actions to settings and retry', async () => {
  const source = await readFile(APP_PATH, 'utf8')

  assert.match(source, /@configure-connection="openConnectionSettings"/)
  assert.match(source, /@retry-query="submitSearch"/)
  assert.match(source, /function openConnectionSettings/)
})

test('auto refresh panel uses polling wording instead of realtime wording', async () => {
  const source = await readFile(LIVE_TAIL_PATH, 'utf8')

  assert.match(source, /自动刷新/)
  assert.equal(source.includes('实时模式'), false)
})

test('saved views use modal review instead of window prompt', async () => {
  const source = await readFile(SAVED_VIEWS_PATH, 'utf8')

  assert.match(source, /a-modal/)
  assert.match(source, /保存前确认/)
  assert.equal(source.includes('window.prompt'), false)
})
