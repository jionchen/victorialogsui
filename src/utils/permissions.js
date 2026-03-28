const ANALYST_HIDDEN_FIELDS = new Set(['_stream_id'])

export function canViewField(field, role = 'admin') {
  if (role === 'admin') return true
  return !ANALYST_HIDDEN_FIELDS.has(field)
}
