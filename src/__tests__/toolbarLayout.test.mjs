import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

test('toolbar gives the log search box the dominant desktop width', async () => {
  const css = await readFile(path.join(rootDir, 'src/styles/index.css'), 'utf8')
  const queryEditor = await readFile(path.join(rootDir, 'src/components/QueryEditor.vue'), 'utf8')

  assert.match(css, /\.app-toolbar__row\s*\{[^}]*flex-wrap:\s*wrap/s)
  assert.match(css, /\.query-editor\s*\{[^}]*flex:\s*0\s+1\s+clamp\(500px,\s*39vw,\s*860px\)/s)
  assert.match(css, /\.query-editor\s*\{[^}]*min-width:\s*min\(500px,\s*100%\)/s)
  assert.match(queryEditor, /\.query-editor__main\s*\{[^}]*width:\s*100%/s)
  assert.match(queryEditor, /\.query-editor__input\s*\{[^}]*min-width:\s*0/s)
})
