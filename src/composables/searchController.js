export function createSearchController({
  searchExecutor,
  getSearchParams,
  clearFieldCache,
  writeUrlState,
  logAudit,
}) {
  async function executeSearch() {
    return searchExecutor.execute(getSearchParams())
  }

  function runSearch() {
    clearFieldCache()
    writeUrlState()
    logAudit()
    return executeSearch()
  }

  return {
    executeSearch,
    runSearch,
  }
}
