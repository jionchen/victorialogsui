import { REDACTION_PATTERNS } from '../../config/securityConfig.js'

export function redactSensitiveFields(record = {}, patterns = REDACTION_PATTERNS) {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => {
      const shouldRedact = patterns.some((pattern) => pattern.test(key))
      return [key, shouldRedact ? '***REDACTED***' : value]
    })
  )
}
