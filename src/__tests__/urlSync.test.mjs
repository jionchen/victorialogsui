import test from 'node:test'
import assert from 'node:assert/strict'
import { createUrlSync } from '../composables/urlSync.js'

test('writeState encodes url state into s param', () => {
  let replacedHref = null

  const urlSync = createUrlSync({
    getUrlState: () => 'ABC',
    loadUrlState: () => {},
    getCurrentHref: () => 'http://localhost:5173/',
    getSearchString: () => '',
    replaceState: (href) => { replacedHref = href },
  })

  urlSync.writeState()

  assert.ok(replacedHref)
  const url = new URL(replacedHref)
  assert.equal(url.searchParams.get('s'), 'ABC')
})

test('writeState preserves existing search params', () => {
  let replacedHref = null

  const urlSync = createUrlSync({
    getUrlState: () => 'STATE',
    loadUrlState: () => {},
    getCurrentHref: () => 'http://localhost:5173/?foo=bar',
    getSearchString: () => '?foo=bar',
    replaceState: (href) => { replacedHref = href },
  })

  urlSync.writeState()

  const url = new URL(replacedHref)
  assert.equal(url.searchParams.get('foo'), 'bar')
  assert.equal(url.searchParams.get('s'), 'STATE')
})

test('readInitialState loads URL state when s param present', () => {
  let loadedState = null

  const urlSync = createUrlSync({
    getUrlState: () => '',
    loadUrlState: (s) => { loadedState = s },
    getCurrentHref: () => 'http://localhost:5173/?s=XYZ',
    getSearchString: () => '?s=XYZ',
    replaceState: () => {},
  })

  urlSync.readInitialState()

  assert.equal(loadedState, 'XYZ')
})

test('readInitialState does nothing when s param absent', () => {
  let loadedState = null

  const urlSync = createUrlSync({
    getUrlState: () => '',
    loadUrlState: (s) => { loadedState = s },
    getCurrentHref: () => 'http://localhost:5173/',
    getSearchString: () => '',
    replaceState: () => {},
  })

  urlSync.readInitialState()

  assert.equal(loadedState, null)
})

test('readInitialState returns true when s param present', () => {
  const urlSync = createUrlSync({
    getUrlState: () => '',
    loadUrlState: () => {},
    getCurrentHref: () => 'http://localhost:5173/?s=XYZ',
    getSearchString: () => '?s=XYZ',
    replaceState: () => {},
  })

  const result = urlSync.readInitialState()

  assert.equal(result, true)
})

test('readInitialState returns false when s param absent', () => {
  const urlSync = createUrlSync({
    getUrlState: () => '',
    loadUrlState: () => {},
    getCurrentHref: () => 'http://localhost:5173/',
    getSearchString: () => '',
    replaceState: () => {},
  })

  const result = urlSync.readInitialState()

  assert.equal(result, false)
})
