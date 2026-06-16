const RESERVED_TOKEN_RE = /^(?:AND|OR|NOT|IN)$/iu
const REGEX_EXACT_ALT_RE = /^\^\((.*)\)\$$/u

function decodePhrase(raw = '') {
  return raw
    .replace(/\\\\/g, '\\')
    .replace(/\\"/g, '"')
}

function normalizeTerms(terms = []) {
  const seen = new Set()
  const normalized = []

  for (const raw of terms) {
    const value = String(raw ?? '').trim()
    if (!value || RESERVED_TOKEN_RE.test(value)) continue

    const key = value.toLocaleLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push(value)
  }

  return normalized
}

function splitQueryText(text = '', { splitWords = false } = {}) {
  const source = String(text ?? '').trim()
  if (!source) return []

  const segments = source
    .split(/\b(?:AND|OR)\b/iu)
    .map(part => part.trim())
    .filter(Boolean)

  if (!splitWords) return segments

  return segments.flatMap(segment => segment.split(/\s+/u).map(part => part.trim()).filter(Boolean))
}

function splitRegexAlternatives(pattern = '') {
  const terms = []
  let current = ''
  let escaped = false

  for (const char of pattern) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '|') {
      if (current) terms.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (escaped) current += '\\'
  if (current) terms.push(current)
  return terms
}

function unescapeRegexLiteral(value = '') {
  return String(value ?? '').replace(/\\([.*+?^${}()|[\]\\])/g, '$1')
}

function extractRegexTerms(value = '') {
  const match = String(value ?? '').match(REGEX_EXACT_ALT_RE)
  if (!match) return []

  return splitRegexAlternatives(match[1])
    .map(unescapeRegexLiteral)
    .filter(Boolean)
}

function extractInValues(list = '') {
  const values = []
  const valueRe = /"((?:\\.|[^"])*)"|([^,\s][^,)]*)/gu

  for (const match of String(list ?? '').matchAll(valueRe)) {
    const raw = match[1] !== undefined ? decodePhrase(match[1]) : String(match[2] ?? '').trim()
    if (!raw) continue
    values.push(raw)
  }

  return values
}

function extractBareValueTerms(raw = '') {
  const value = String(raw ?? '').trim()
  if (!value || RESERVED_TOKEN_RE.test(value) || value === '*') return []
  return [value]
}

function extractResidualTerms(query = '', { splitWords = false } = {}) {
  const cleaned = splitWords
    ? String(query ?? '')
      .replace(/[{}()[\],]/g, ' ')
      .replace(/\b(?:AND|OR|NOT|IN)\b/giu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    : String(query ?? '').trim()

  if (!cleaned) return []

  return splitWords
    ? cleaned.split(/\s+/u).map(part => part.trim()).filter(Boolean)
    : splitQueryText(cleaned)
}

function collectPatternMatches(source = '', regex, extractor) {
  const matches = []
  const re = new RegExp(regex.source, regex.flags)

  for (const match of source.matchAll(re)) {
    matches.push({
      index: match.index ?? 0,
      length: match[0].length,
      terms: extractor(match),
    })
  }

  return matches
}

export function extractHighlightTerms(query = '') {
  const source = String(query ?? '').trim()
  if (!source || source === '*') return []

  const matches = [
    ...collectPatternMatches(source, /_msg:~"((?:\\.|[^"])*)"/gu, match => splitQueryText(decodePhrase(match[1]))),
    ...collectPatternMatches(source, /([A-Za-z_][A-Za-z0-9_.-]*)\s*:in\(([^)]*)\)/gu, match => extractInValues(match[2])),
    ...collectPatternMatches(source, /([A-Za-z_][A-Za-z0-9_.-]*)\s*(?::~|=~)\s*"((?:\\.|[^"])*)"/gu, match => extractRegexTerms(decodePhrase(match[2]))),
    ...collectPatternMatches(source, /([A-Za-z_][A-Za-z0-9_.-]*)\s*(?::|=|!=)\s*"((?:\\.|[^"])*)"/gu, match => splitQueryText(decodePhrase(match[2]))),
    ...collectPatternMatches(source, /([A-Za-z_][A-Za-z0-9_.-]*)\s*(?::|=|!=)\s*([^\s,(){}[\]]+)/gu, match => extractBareValueTerms(match[2])),
  ]
    .filter(match => match.terms.length > 0)
    .sort((a, b) => a.index - b.index || b.length - a.length)

  const collected = []
  let remainder = ''
  let cursor = 0

  for (const match of matches) {
    if (match.index < cursor) continue

    remainder += `${source.slice(cursor, match.index)} `
    collected.push(...match.terms)
    cursor = match.index + match.length
  }

  remainder += source.slice(cursor)
  const hasStructuredSyntax = /[:={}[\](),]/.test(source)
  collected.push(...extractResidualTerms(remainder, { splitWords: hasStructuredSyntax }))

  return normalizeTerms(collected)
}

export function getHighlightTerms({
  isManualMode = false,
  freeTextQuery = '',
  manualQuery = '',
  effectiveQuery = '',
} = {}) {
  const manual = String(manualQuery || '').trim()
  const freeText = String(freeTextQuery || '').trim()
  const effective = String(effectiveQuery || '').trim()

  if (isManualMode) {
    if (manual) return extractHighlightTerms(manual)
    return extractHighlightTerms(effective)
  }

  if (!freeText && !effective) return []
  return extractHighlightTerms(effective || freeText)
}

export function getHighlightPhrase(options = {}) {
  return getHighlightTerms(options).join(' ')
}

export function buildHighlightedParts(text = '', terms = []) {
  const source = String(text ?? '')
  const needles = normalizeTerms(Array.isArray(terms) ? terms : [terms])
  const sortedNeedles = [...needles].sort((a, b) => b.length - a.length)

  if (!source) return []
  if (sortedNeedles.length === 0) return [{ text: source, match: false }]

  const lowerSource = source.toLocaleLowerCase()
  const parts = []
  let cursor = 0

  while (cursor < source.length) {
    let selectedMatch = null

    for (const needle of sortedNeedles) {
      const lowerNeedle = needle.toLocaleLowerCase()
      const matchIndex = lowerSource.indexOf(lowerNeedle, cursor)
      if (matchIndex === -1) continue

      if (!selectedMatch || matchIndex < selectedMatch.index || (matchIndex === selectedMatch.index && needle.length > selectedMatch.length)) {
        selectedMatch = { index: matchIndex, length: needle.length }
      }
    }

    if (!selectedMatch) {
      parts.push({ text: source.slice(cursor), match: false })
      break
    }

    if (selectedMatch.index > cursor) {
      parts.push({ text: source.slice(cursor, selectedMatch.index), match: false })
    }

    parts.push({
      text: source.slice(selectedMatch.index, selectedMatch.index + selectedMatch.length),
      match: true,
    })
    cursor = selectedMatch.index + selectedMatch.length
  }

  return parts.length > 0 ? parts : [{ text: source, match: false }]
}
