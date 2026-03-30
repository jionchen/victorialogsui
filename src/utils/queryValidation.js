import { isLogsQLSyntax } from './queryBuilder.js'

export function validateQuery(query) {
  const text = String(query || '').trim()

  if (!text) {
    return { level: 'info', message: '当前为空查询，将返回全部日志。' }
  }

  if (!hasBalancedQuotes(text)) {
    return { level: 'error', message: '查询里存在未闭合的引号。' }
  }

  if (!hasBalancedBraces(text)) {
    return { level: 'error', message: 'Stream selector 大括号未闭合，请检查查询。' }
  }

  if (!isLogsQLSyntax(text)) {
    return { level: 'warning', message: '这段文本会按 _msg 子串匹配执行；如需精确过滤，请使用 LogsQL。' }
  }

  return { level: 'valid', message: 'LogsQL 语法看起来正常。' }
}

export function shouldShowValidationBadge(validation) {
  return validation?.level === 'valid' || validation?.level === 'warning' || validation?.level === 'error'
}

function hasBalancedBraces(text) {
  let depth = 0
  for (const char of text) {
    if (char === '{') depth++
    if (char === '}') depth--
    if (depth < 0) return false
  }
  return depth === 0
}

function hasBalancedQuotes(text) {
  let open = false
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"' && text[i - 1] !== '\\') {
      open = !open
    }
  }
  return !open
}
