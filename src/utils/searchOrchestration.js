import {
  AUXILIARY_QUERY_DELAY_MS,
  LARGE_QUERY_AUXILIARY_DELAY_MS,
} from '../../config/proxyConfig.js'

const LARGE_QUERY_LIMIT = 1000
const LARGE_QUERY_RANGE_MS = 24 * 60 * 60 * 1000

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function calculateAuxiliaryDelayMs({ limit = 0, rangeMs = 0 } = {}) {
  const numericLimit = Number(limit) || 0
  const numericRange = Number(rangeMs) || 0

  if (numericLimit >= LARGE_QUERY_LIMIT || numericRange >= LARGE_QUERY_RANGE_MS) {
    return LARGE_QUERY_AUXILIARY_DELAY_MS
  }

  return AUXILIARY_QUERY_DELAY_MS
}

export function createSearchExecutor({
  fetchLogs,
  fetchHistogram,
  loadFieldNames,
  loadFacets = () => {},
  auxiliaryDelayMs,
  onAuxiliaryError = () => {},
}) {
  let activeRunId = 0
  let auxiliaryPromise = Promise.resolve()

  async function runAuxiliary(runId, params) {
    const waitMs = auxiliaryDelayMs ?? calculateAuxiliaryDelayMs(params)
    await delay(waitMs)
    if (runId !== activeRunId) return

    await Promise.allSettled([
      fetchHistogram({
        query: params.query,
        start: params.start,
        end: params.end,
        step: params.step,
      }).catch((error) => {
        onAuxiliaryError('histogram', error)
      }),
      loadFieldNames({
        query: params.query,
        start: params.start,
        end: params.end,
      })
        .then(() => {
          if (runId !== activeRunId) return
          return loadFacets({
            query: params.query,
            start: params.start,
            end: params.end,
          }).catch((error) => {
            onAuxiliaryError('facets', error)
          })
        })
        .catch((error) => {
          onAuxiliaryError('fields', error)
        }),
    ])
  }

  async function execute(params) {
    const runId = ++activeRunId

    await fetchLogs({
      query: params.query,
      limit: params.limit,
      start: params.start,
      end: params.end,
    })

    if (runId !== activeRunId) return
    auxiliaryPromise = runAuxiliary(runId, params)
  }

  return {
    execute,
    waitForAuxiliary: () => auxiliaryPromise,
  }
}
