const OPERATORS = ['AND', 'OR', 'NOT', 'IN']
const PIPE_KEYWORDS = ['stats', 'by', 'count', 'count_uniq', 'sum', 'avg', 'max', 'min']

function getLastToken(text, cursorPos) {
  const before = text.slice(0, cursorPos)
  // Find the start of the current token (space or bracket delimited)
  const match = before.match(/([^\s{}()|,]*)$/)
  return match ? match[1] : ''
}

function detectContext(text, cursorPos) {
  const before = text.slice(0, cursorPos)

  // Inside stream selector braces: { ... }
  const openBraces = (before.match(/{/g) || []).length
  const closeBraces = (before.match(/}/g) || []).length
  if (openBraces > closeBraces) {
    // Check if we're after = or : inside braces
    const sinceLastBrace = before.slice(before.lastIndexOf('{') + 1)
    if (/[=:]/.test(sinceLastBrace)) {
      return { type: 'stream-value', field: extractFieldBeforeOp(sinceLastBrace) }
    }
    return { type: 'stream-field' }
  }

  // After a pipe | → pipeline keywords
  const lastPipe = before.lastIndexOf('|')
  if (lastPipe >= 0 && !before.slice(lastPipe + 1).trim().includes(' ')) {
    return { type: 'pipe-keyword' }
  }

  // After a known field name + colon → field value
  const fieldValueMatch = before.match(/(?:^|\s)([\w_]+):\s*([^\s]*)$/)
  if (fieldValueMatch) {
    return { type: 'field-value', field: fieldValueMatch[1] }
  }

  // After space following a complete term → operators or fields
  const lastSpace = before.trimEnd().match(/\s/)
  if (lastSpace || before.endsWith(' ') || before === '') {
    // Check if preceded by a complete field:value or }
    const trimmed = before.trimEnd()
    if (/[}\w_]\s*$/.test(trimmed)) {
      return { type: 'operator-or-field' }
    }
  }

  // Bare field name at start or after space/operator
  const bareMatch = before.match(/(?:^|\s|\()(\w*)$/)
  if (bareMatch) {
    return { type: 'field' }
  }

  return { type: 'none' }
}

function extractFieldBeforeOp(text) {
  const m = text.match(/([\w_]+)\s*[=:]/)
  return m ? m[1] : null
}

function fuzzyFilter(items, prefix) {
  const p = prefix.toLowerCase()
  return items
    .filter(item => item.value.toLowerCase().includes(p))
    .sort((a, b) => {
      const aStarts = a.value.toLowerCase().startsWith(p)
      const bStarts = b.value.toLowerCase().startsWith(p)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return (b.hits || 0) - (a.hits || 0)
    })
    .map(item => ({ label: item.value, kind: 'field', detail: item.hits ? String(item.hits) : undefined }))
}

export function createQueryCompletionEngine({
  getLogFieldNames,
  getStreamFieldNames,
  getFieldValues,
}) {
  function getSuggestions(text, cursorPos) {
    const ctx = detectContext(text, cursorPos)
    const prefix = getLastToken(text, cursorPos)

    switch (ctx.type) {
      case 'stream-field': {
        const fields = getStreamFieldNames()
        return fuzzyFilter(fields, prefix).map(s => ({ ...s, kind: 'stream-field' }))
      }
      case 'stream-value': {
        const values = getFieldValues(ctx.field)
        if (values) {
          return fuzzyFilter(values, prefix).map(s => ({ ...s, kind: 'value' }))
        }
        return []
      }
      case 'field':
      case 'operator-or-field': {
        const fields = getLogFieldNames()
        const fieldSuggestions = fuzzyFilter(fields, prefix).map(s => ({ ...s, kind: 'field', insertText: s.label + ':' }))
        if (prefix || ctx.type === 'operator-or-field') {
          const opSuggestions = OPERATORS
            .filter(op => op.toLowerCase().startsWith(prefix.toLowerCase()))
            .map(op => ({ label: op, kind: 'operator', insertText: op + ' ' }))
          return [...opSuggestions, ...fieldSuggestions]
        }
        return fieldSuggestions
      }
      case 'field-value': {
        const values = getFieldValues(ctx.field)
        if (values) {
          const before = text.slice(0, cursorPos)
          const valueMatch = before.match(/:\s*([^\s]*)$/)
          const valuePrefix = valueMatch ? valueMatch[1] : prefix
          return fuzzyFilter(values, valuePrefix).map(s => ({ ...s, kind: 'value' }))
        }
        return []
      }
      case 'pipe-keyword': {
        return PIPE_KEYWORDS
          .filter(kw => kw.toLowerCase().startsWith(prefix.toLowerCase()))
          .map(kw => ({ label: kw, kind: 'keyword', insertText: kw + ' ' }))
      }
      default:
        return []
    }
  }

  return { getSuggestions }
}
