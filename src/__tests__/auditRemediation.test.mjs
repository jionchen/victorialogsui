import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

async function readProjectFile(relativePath) {
  return readFile(path.join(rootDir, relativePath), 'utf8')
}

async function listSourceFiles(dir) {
  const entries = await readdir(path.join(rootDir, dir), { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const relativePath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await listSourceFiles(relativePath))
    } else if (/\.(js|mjs|vue)$/.test(entry.name)) {
      files.push(relativePath)
    }
  }
  return files
}

test('vite proxy verifies TLS certificates by default and only disables it with an explicit env flag', async () => {
  const { isInsecureProxyTlsAllowed } = await import('../../vite.config.js')

  const previous = process.env.VITE_INSECURE_PROXY_TLS
  delete process.env.VITE_INSECURE_PROXY_TLS
  assert.equal(isInsecureProxyTlsAllowed(), false)

  process.env.VITE_INSECURE_PROXY_TLS = 'true'
  assert.equal(isInsecureProxyTlsAllowed(), true)

  if (previous === undefined) {
    delete process.env.VITE_INSECURE_PROXY_TLS
  } else {
    process.env.VITE_INSECURE_PROXY_TLS = previous
  }
})

test('source files do not contain empty catch blocks', async () => {
  const files = await listSourceFiles('src')
  const offenders = []

  for (const file of files) {
    const content = await readProjectFile(file)
    if (/catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\{\s*(?:\/\*\s*ignore\s*\*\/)?\s*\}/.test(content)) {
      offenders.push(file)
    }
  }

  assert.deepEqual(offenders, [])
})

test('nginx exposes a lightweight health endpoint', async () => {
  const nginxConfig = await readProjectFile('nginx/default.conf.template')

  assert.match(nginxConfig, /location\s*=\s*\/health/)
  assert.match(nginxConfig, /return\s+200/)
})

test('eslint is strict enough for CI and ignores generated worktrees', async () => {
  const packageJson = JSON.parse(await readProjectFile('package.json'))
  const eslintConfig = await readProjectFile('eslint.config.js')

  assert.match(packageJson.scripts.lint, /--max-warnings=0/)
  assert.match(eslintConfig, /'\.claude\/\*\*'/)
  assert.match(eslintConfig, /'no-unused-vars':\s*'error'/)
  assert.match(eslintConfig, /'no-undef':\s*'error'/)
  assert.match(eslintConfig, /'vue\/no-mutating-props':\s*'error'/)
})

test('custom time range rejects an end time before the start time', async () => {
  const timeRangePicker = await readProjectFile('src/components/TimeRangePicker.vue')

  assert.match(timeRangePicker, /timeRangeError/)
  assert.match(timeRangePicker, /endDate\.getTime\(\)\s*<=\s*startDate\.getTime\(\)/)
  assert.match(timeRangePicker, /结束时间必须晚于开始时间/)
})

test('settings URL entry validates the new target before enabling add', async () => {
  const settingsPanel = await readProjectFile('src/components/SettingsPanel.vue')

  assert.match(settingsPanel, /newApiValidationMessage/)
  assert.match(settingsPanel, /canAddApi/)
  assert.match(settingsPanel, /:disabled="!canAddApi"/)
})

test('destructive UI actions ask for confirmation', async () => {
  const settingsPanel = await readProjectFile('src/components/SettingsPanel.vue')
  const auditPanel = await readProjectFile('src/components/AuditPanel.vue')
  const queryEditor = await readProjectFile('src/components/QueryEditor.vue')

  assert.match(settingsPanel, /confirm\(/)
  assert.match(auditPanel, /confirm\(/)
  assert.match(queryEditor, /confirm\(/)
})
