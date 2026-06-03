import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const LOG_TABLE_PATH = new URL('../components/LogTable.vue', import.meta.url)
const FIELD_ITEM_PATH = new URL('../components/FieldItem.vue', import.meta.url)
const QUERY_EDITOR_PATH = new URL('../components/QueryEditor.vue', import.meta.url)
const LOG_CONTEXT_MODAL_PATH = new URL('../components/LogContextModal.vue', import.meta.url)
const APP_PATH = new URL('../App.vue', import.meta.url)
const STYLES_PATH = new URL('../styles/index.css', import.meta.url)

test('LogTable: sortable time header has aria-sort attribute', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')
  assert.equal(source.includes('aria-sort'), true)
  assert.match(source, /:aria-sort="logStore\.sortOrder === 'desc' \? 'descending' : 'ascending'"/)
})

test('LogTable: log rows have role=button, tabindex, aria-expanded, and keyboard handlers', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')
  assert.match(source, /role="button"/)
  assert.match(source, /tabindex="0"/)
  assert.match(source, /:aria-expanded="expandedIndex === index"/)
  assert.match(source, /@keydown\.enter="toggleExpand\(index\)"/)
  assert.match(source, /@keydown\.space\.prevent="toggleExpand\(index\)"/)
})

test('LogTable: column remove button has aria-label', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')
  assert.match(source, /:aria-label="`移除列 \$\{col\}`"/)
})

test('LogTable: export dropdown trigger has aria-haspopup', async () => {
  const source = await readFile(LOG_TABLE_PATH, 'utf8')
  assert.match(source, /aria-haspopup="true"/)
})

test('FieldItem: header has role=button, tabindex, aria-expanded, aria-label, and keyboard handlers', async () => {
  const source = await readFile(FIELD_ITEM_PATH, 'utf8')
  assert.match(source, /role="button"/)
  assert.match(source, /tabindex="0"/)
  assert.match(source, /:aria-expanded="expanded"/)
  assert.match(source, /:aria-label="`字段 \$\{field\.value\}\$\{isStream \? '（Stream 字段）' : '（日志字段）'\}`"/)
  assert.match(source, /@keydown\.enter="toggleExpand"/)
  assert.match(source, /@keydown\.space\.prevent="toggleExpand"/)
})

test('FieldItem: filter buttons have aria-label in Chinese', async () => {
  const source = await readFile(FIELD_ITEM_PATH, 'utf8')
  assert.match(source, /:aria-label="`添加过滤条件 \$\{val\.value\}`"/)
  assert.match(source, /:aria-label="`排除过滤条件 \$\{val\.value\}`"/)
})

test('FieldItem: load more text is wrapped in span with aria-live', async () => {
  const source = await readFile(FIELD_ITEM_PATH, 'utf8')
  assert.match(source, /aria-live="polite"/)
})

test('QueryEditor: input has aria-label and combobox role', async () => {
  const source = await readFile(QUERY_EDITOR_PATH, 'utf8')
  assert.match(source, /aria-label="查询输入"/)
  assert.match(source, /:role="showSuggestions && suggestions\.length > 0 \? 'combobox' : undefined"/)
  assert.match(source, /:aria-autocomplete="showSuggestions && suggestions\.length > 0 \? 'list' : undefined"/)
  assert.match(source, /:aria-expanded="showSuggestions && suggestions\.length > 0"/)
})

test('QueryEditor: suggestions dropdown has listbox role with option items', async () => {
  const source = await readFile(QUERY_EDITOR_PATH, 'utf8')
  assert.match(source, /role="listbox"/)
  assert.match(source, /role="option"/)
  assert.match(source, /:aria-selected="idx === selectedIndex"/)
})

test('LogContextModal: modal has dialog role, aria-modal, and aria-labelledby', async () => {
  const source = await readFile(LOG_CONTEXT_MODAL_PATH, 'utf8')
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby="context-modal-title"/)
  assert.match(source, /:esc-to-close="true"/)
})

test('App: global keyboard shortcuts have aria-keyshortcuts', async () => {
  const source = await readFile(APP_PATH, 'utf8')
  assert.match(source, /aria-keyshortcuts="t"/)
  assert.match(source, /aria-keyshortcuts="Control\+Enter"/)
})

test('App: drawer has esc-to-close and mask-closable', async () => {
  const source = await readFile(APP_PATH, 'utf8')
  assert.match(source, /:esc-to-close="true"/)
  assert.match(source, /:mask-closable="true"/)
})

test('Styles: focus-visible styles are present', async () => {
  const source = await readFile(STYLES_PATH, 'utf8')
  assert.match(source, /:focus-visible \{/)
  assert.match(source, /outline: 2px solid var\(--accent\);/)
  assert.match(source, /outline-offset: 2px;/)
})

test('Styles: log-row and field-item__header have focus-visible styles', async () => {
  const source = await readFile(STYLES_PATH, 'utf8')
  assert.match(source, /\.log-row:focus-visible \{/)
  assert.match(source, /\.field-item__header:focus-visible \{/)
})
