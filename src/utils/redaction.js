const DEFAULT_PATTERNS = [
  /token/i,
  /secret/i,
  /password/i,
  /authorization/i,
  /cookie/i,
  /email/i,
]

export function redactSensitiveFields(record = {}, patterns = DEFAULT_PATTERNS) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      const shouldRedact = patterns.some((pattern) => pattern.test(key))
      return [key, shouldRedact ? '***REDACTED***' : value]
    })
  )
}
