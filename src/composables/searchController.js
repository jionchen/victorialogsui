export function createSearchController({
  searchExecutor,
  getSearchParams,
  clearFieldCache,
  writeUrlState,
  logAudit,
}) {
  let lastSearchKey = null

  function getSearchKey() {
    const params = getSearchParams()
    const sorted = Object.keys(params).sort().reduce((acc, k) => {
      acc[k] = params[k]
      return acc
    }, {})
    return JSON.stringify(sorted)
  }

  async function executeSearch() {
    return searchExecutor.execute(getSearchParams())
  }

  function runSearch() {
    const currentKey = getSearchKey()
    if (currentKey !== lastSearchKey) {
      clearFieldCache()
      lastSearchKey = currentKey
    }
    writeUrlState()
    logAudit()
    return executeSearch()
  }

  return {
    executeSearch,
    runSearch,
  }
}
