export function createUrlSync({
  getUrlState,
  loadUrlState,
  getCurrentHref,
  getSearchString,
  replaceState,
}) {
  function writeState() {
    const url = new URL(getCurrentHref())
    url.searchParams.set('s', getUrlState())
    replaceState(url.toString())
  }

  function readInitialState() {
    const s = new URLSearchParams(getSearchString()).get('s')
    if (s) {
      loadUrlState(s)
      return true
    }
    return false
  }

  return {
    writeState,
    readInitialState,
  }
}
