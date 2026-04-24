export const DEFAULT_THEME = 'dark'
export const DEFAULT_RESULT_LIMIT = 500
export const DEFAULT_SECURITY_ROLE = 'admin'
export const DEFAULT_REDACTION_ENABLED = true
export const DEFAULT_AUTH_CREDENTIALS = Object.freeze({ username: '', password: '' })
export const DEFAULT_TIME_PRESET = '5m'
export const APP_BASE_PATH = '/vlogs-ui/'
export const DEV_SERVER_HOST = '127.0.0.1'
export const DEV_SERVER_PORT = 5173

export const MAX_AUDIT_EVENTS = 200
export const MAX_QUERY_HISTORY = 20
export const MAX_SAVED_VIEWS = 20
export const MAX_SAVED_QUERIES = 20
export const DEFAULTS_MIGRATION_VERSION = '2026-04-10-defaults-v1'

export const DEFAULT_PINNED_FIELDS = [
  'src_namespace',
  'src_container_name',
  'src_pod_name',
]

export const DEFAULT_TABLE_COLUMNS = ['_stream']
