/**
 * LogsQL Query Builder
 * Constructs LogsQL queries from user filter selections
 */

/**
 * Build LogsQL from filters
 * @param {Array} filters - [{field, values, type, negated}]
 * @param {string} freeText - optional free text query
 * @returns {string} LogsQL query
 */
export function buildLogsQL(filters = [], freeText = '') {
  const streamFilters = filters.filter(f => f.type === 'stream' && !f.disabled)
  const logFilters = filters.filter(f => f.type === 'log' && !f.disabled)

  const parts = []

  // Build stream filter: {key1="val1",key2="val2"}
  if (streamFilters.length > 0) {
    const streamParts = []
    for (const f of streamFilters) {
      const activeValues = f.values || []
      if (activeValues.length === 0) continue
      
      if (f.negated) {
        // Negated stream filters need different approach
        for (const v of activeValues) {
          streamParts.push(`${f.field}!="${v}"`)
        }
      } else if (activeValues.length === 1) {
        streamParts.push(`${f.field}="${activeValues[0]}"`)
      } else {
        // Multiple values: use regex
        const escaped = activeValues.map(v => escapeRegex(v))
        streamParts.push(`${f.field}=~"^(${escaped.join('|')})$"`)
      }
    }
    if (streamParts.length > 0) {
      parts.push(`{${streamParts.join(',')}}`)
    }
  }

  // Build log field filters
  for (const f of logFilters) {
    const activeValues = f.values || []
    if (activeValues.length === 0) continue

    if (f.negated) {
      if (activeValues.length === 1) {
        parts.push(`NOT ${f.field}:${quoteIfNeeded(activeValues[0])}`)
      } else {
        parts.push(`NOT ${f.field}:in(${activeValues.map(quoteIfNeeded).join(', ')})`)
      }
    } else if (activeValues.length === 1) {
      parts.push(`${f.field}:${quoteIfNeeded(activeValues[0])}`)
    } else {
      parts.push(`${f.field}:in(${activeValues.map(quoteIfNeeded).join(', ')})`)
    }
  }

  // Append free text
  if (freeText.trim()) {
    const text = freeText.trim()
    // 如果已经是 LogsQL 语法 (包含 : { } | AND OR NOT 等)，直接使用
    if (isLogsQLSyntax(text)) {
      parts.push(text)
    } else {
      // 纯文本关键字 → 使用子串匹配，解决中文等非空格分词语言的搜索问题
      // VictoriaLogs 的 word 匹配按空格/标点分词，中文连续字符串无法被正确分词
      const escaped = text.replace(/"/g, '\\"')
      parts.push(`_msg:~"${escaped}"`)
    }
  }

  return parts.join(' ') || '*'
}

/**
 * Check if text looks like LogsQL syntax rather than plain keywords
 */
export function isLogsQLSyntax(text) {
  // Contains field:value, stream selector {}, logical operators, pipes, regex, etc.
  return /[:{}|]/.test(text) ||
    /\b(AND|OR|NOT|IN)\b/.test(text) ||
    /~"/.test(text) ||
    text.startsWith('*') ||
    text.startsWith('_')
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function quoteIfNeeded(val) {
  if (/[\s"',():]/.test(val) || val === '') {
    return `"${val.replace(/"/g, '\\"')}"`
  }
  return val
}

/**
 * Parse basic LogsQL back into filters (best effort)
 */
export function parseBasicLogsQL(query) {
  // This is a simplified parser — full LogsQL parsing is complex
  // It handles the most common patterns we generate
  const filters = []
  let freeText = query

  // Extract stream filter {key="val",...}
  const streamMatch = query.match(/^\{([^}]+)\}/)
  if (streamMatch) {
    freeText = query.slice(streamMatch[0].length).trim()
    const pairs = streamMatch[1].split(',')
    for (const pair of pairs) {
      const eqMatch = pair.match(/^([^=!]+)(!=|=~"|=")(.+)$/)
      if (eqMatch) {
        const field = eqMatch[1].trim()
        const op = eqMatch[2]
        let rawVal = eqMatch[3].replace(/^"|"$/g, '')
        
        if (op === '!=') {
          filters.push({ field, values: [rawVal], type: 'stream', negated: true, disabled: false })
        } else {
          filters.push({ field, values: [rawVal], type: 'stream', negated: false, disabled: false })
        }
      }
    }
  }

  return { filters, freeText }
}

export const AGGREGATE_FUNCTIONS = ['count', 'count_uniq', 'sum', 'avg', 'max', 'min']

export function buildStatsQuery(baseQuery, byFields, aggFn = 'count') {
  if (!byFields || byFields.length === 0) return baseQuery
  const fields = byFields.join(', ')
  return `${baseQuery} | stats by (${fields}) ${aggFn}()`
}
