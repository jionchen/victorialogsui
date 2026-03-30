import { ANALYST_HIDDEN_FIELDS } from '../../config/securityConfig.js'

const ANALYST_HIDDEN_FIELD_SET = new Set(ANALYST_HIDDEN_FIELDS)

export function canViewField(field, role = 'admin') {
  if (role === 'admin') return true
  return !ANALYST_HIDDEN_FIELD_SET.has(field)
}
