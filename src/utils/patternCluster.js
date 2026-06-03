/**
 * Simplified Drain-style log pattern clustering
 * Groups similar log messages by replacing variable tokens with <*>
 */

// Common log words that should stay FIXED even if they look like variables
const FIXED_WORDS = new Set([
  'get', 'post', 'put', 'delete', 'patch', 'head', 'options',
  'http', 'https', 'tcp', 'udp', 'ip', 'url', 'uri', 'api',
  'user', 'users', 'admin', 'root', 'guest', 'login', 'logout',
  'request', 'response', 'error', 'warn', 'warning', 'info', 'debug',
  'trace', 'fatal', 'critical', 'success', 'failed', 'failure',
  'connect', 'connection', 'disconnect', 'timeout', 'retry',
  'start', 'started', 'stop', 'stopped', 'restart', 'restarting',
  'create', 'created', 'update', 'updated', 'delete', 'deleted',
  'read', 'write', 'open', 'close', 'closed', 'send', 'sent',
  'receive', 'received', 'process', 'processed', 'handle', 'handled',
  'execute', 'executed', 'run', 'running', 'complete', 'completed',
  'init', 'initialize', 'initialized', 'load', 'loaded', 'save', 'saved',
  'config', 'configuration', 'setting', 'settings', 'env', 'environment',
  'server', 'client', 'service', 'services', 'app', 'application',
  'database', 'db', 'cache', 'redis', 'mysql', 'postgres', 'mongo',
  'file', 'files', 'path', 'dir', 'directory', 'folder',
  'task', 'tasks', 'job', 'jobs', 'queue', 'worker',
  'event', 'events', 'message', 'messages', 'notification',
  'session', 'sessions', 'token', 'tokens', 'cookie', 'cookies',
  'auth', 'authentication', 'authorization', 'permission', 'permissions',
  'role', 'roles', 'group', 'groups', 'org', 'organization',
  'node', 'nodes', 'pod', 'pods', 'container', 'containers',
  'host', 'hosts', 'hostname', 'domain', 'domains',
  'metric', 'metrics', 'monitor', 'monitoring', 'alert', 'alerts',
  'build', 'deploy', 'deployment', 'release', 'version', 'tag',
  'git', 'commit', 'branch', 'merge', 'pull', 'push',
  'test', 'tests', 'testing', 'benchmark', 'profile', 'profiling',
  'import', 'export', 'sync', 'synchronize', 'replicate', 'replication',
  'backup', 'restore', 'migrate', 'migration', 'upgrade', 'downgrade',
  'valid', 'invalid', 'active', 'inactive', 'enabled', 'disabled',
  'available', 'unavailable', 'ready', 'notready', 'pending',
  'true', 'false', 'yes', 'no', 'on', 'off', 'null', 'undefined',
  'ok', 'done', 'end', 'exit', 'abort', 'cancel', 'skip',
  'found', 'notfound', 'missing', 'exists', 'duplicate',
  'new', 'old', 'current', 'previous', 'next', 'last', 'first',
  'id', 'uuid', 'guid', 'name', 'names', 'key', 'keys', 'value', 'values',
  'type', 'types', 'kind', 'category', 'status', 'state', 'mode',
  'index', 'indices', 'shard', 'shards', 'replica', 'replicas',
  'partition', 'partitions', 'topic', 'topics', 'consumer', 'producer',
  'route', 'routes', 'endpoint', 'endpoints', 'handler', 'handlers',
  'controller', 'middleware', 'filter', 'interceptor', 'resolver',
  'component', 'module', 'plugin', 'extension', 'library',
  'function', 'method', 'class', 'interface', 'object', 'instance',
  'param', 'params', 'arg', 'args', 'argument', 'arguments', 'option', 'options',
  'header', 'headers', 'body', 'payload', 'query', 'queries',
  'where', 'select', 'insert', 'update', 'delete', 'from', 'join',
  'table', 'tables', 'column', 'columns', 'row', 'rows', 'record', 'records',
  'schema', 'migration', 'seed', 'seeder', 'factory',
  'json', 'xml', 'yaml', 'yml', 'csv', 'tsv', 'html', 'css', 'js', 'ts',
  'ms', 's', 'sec', 'seconds', 'min', 'minute', 'minutes', 'hour', 'hours',
  'day', 'days', 'week', 'weeks', 'month', 'months', 'year', 'years',
  'kb', 'mb', 'gb', 'tb', 'pb', 'bytes', 'b', 'bit', 'bits',
  'cpu', 'memory', 'mem', 'ram', 'disk', 'storage', 'network', 'io',
  'pid', 'ppid', 'tid', 'uid', 'gid', 'sid',
  'linux', 'windows', 'macos', 'darwin', 'ubuntu', 'debian', 'centos',
  'go', 'golang', 'java', 'python', 'py', 'ruby', 'rb', 'php', 'node', 'nodejs',
  'react', 'vue', 'angular', 'svelte', 'next', 'nuxt',
  'docker', 'kubernetes', 'k8s', 'helm', 'terraform', 'ansible',
  'aws', 'gcp', 'azure', 'aliyun', 'tencent', 'huawei',
  'grafana', 'prometheus', 'elasticsearch', 'kibana', 'logstash',
  'nginx', 'apache', 'tomcat', 'jetty', 'iis', 'caddy',
  'mysql', 'mariadb', 'postgresql', 'sqlite', 'mongodb', 'redis', 'memcached',
  'kafka', 'rabbitmq', 'rocketmq', 'pulsar', 'nats',
  'etcd', 'zookeeper', 'consul', 'vault',
  'github', 'gitlab', 'bitbucket', 'gitea', 'jenkins', 'drone',
])

// Regex patterns for variable tokens (order matters: more specific first)
const VARIABLE_PATTERNS = [
  { regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, name: 'uuid' },
  { regex: /^[0-9a-f]{32}$/i, name: 'md5' },
  { regex: /^[0-9a-f]{40}$/i, name: 'sha1' },
  { regex: /^[0-9a-f]{64}$/i, name: 'sha256' },
  { regex: /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i, name: 'mac' },
  { regex: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/, name: 'ip' },
  { regex: /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/, name: 'timestamp' },
  { regex: /^\d{4}-\d{2}-\d{2}$/, name: 'date' },
  { regex: /^\d{2}:\d{2}:\d{2}(?:\.\d+)?$/, name: 'time' },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, name: 'date_slash' },
  { regex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, name: 'email' },
  { regex: /^https?:\/\/[^\s]+$/, name: 'url' },
  { regex: /^\/?[a-zA-Z0-9_\-/]+\.[a-zA-Z0-9]+$/, name: 'filepath' },
  { regex: /^0x[0-9a-f]+$/i, name: 'hex' },
  { regex: /^[0-9a-f]{8,}$/i, name: 'hex_long' },
  { regex: /^-?\d+\.\d+$/, name: 'float' },
  { regex: /^-?\d+$/, name: 'number' },
]

// Number with common units that should be treated as a single variable
const NUMBER_WITH_UNIT = /^(-?\d+(?:\.\d+)?)(ms|s|sec|seconds?|min|minutes?|h|hours?|d|days?|kb|mb|gb|tb|pb|bytes?|b|%)$/i

// Number followed by space then unit word
const NUMBER_THEN_UNIT = /^-?\d+(?:\.\d+)?$/
const UNIT_WORDS = new Set([
  'ms', 's', 'sec', 'second', 'seconds',
  'min', 'minute', 'minutes',
  'h', 'hour', 'hours',
  'd', 'day', 'days',
  'kb', 'mb', 'gb', 'tb', 'pb',
  'byte', 'bytes', 'b',
  '%',
])

/**
 * Check if a token is a variable (should be replaced with <*>)
 */
function isVariable(token, nextToken) {
  if (!token || token.length === 0) return false

  // Single uppercase letters (likely module/class identifiers) - check before FIXED_WORDS
  if (/^[A-Z]$/.test(token)) {
    return true
  }

  // Check number+unit pattern first (e.g., "45ms", "30000ms")
  if (NUMBER_WITH_UNIT.test(token)) return true

  // Protocol versions like HTTP/1.1, HTTP/2, TLS/1.3 - check before variable patterns
  if (/^[A-Z]+\/\d+(?:\.\d+)?$/.test(token)) {
    return false
  }

  // Check variable patterns
  for (const { regex } of VARIABLE_PATTERNS) {
    if (regex.test(token)) return true
  }

  // Check if this is a number followed by a unit word (e.g., "5" followed by "seconds")
  if (NUMBER_THEN_UNIT.test(token) && nextToken && UNIT_WORDS.has(nextToken.toLowerCase())) {
    return true
  }

  // Common fixed words - don't treat as variable
  const lower = token.toLowerCase()
  if (FIXED_WORDS.has(lower)) return false

  // Path-like tokens starting with / and containing numbers: /api/users/123
  if (/^\/[a-zA-Z0-9_\-/.]+$/.test(token) && /\d/.test(token)) {
    return true
  }

  return false
}

/**
 * Tokenize a log message into words/tokens
 * Handles: whitespace, punctuation, JSON, paths, quoted strings
 */
function tokenize(msg) {
  if (!msg || typeof msg !== 'string') return []

  const trimmed = msg.trim()
  if (trimmed.length === 0) return []

  // If it's a JSON string, try to extract the message field or flatten
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      // Try to find a message field
      const msgField = parsed.msg || parsed.message || parsed._msg || parsed.log || parsed.text
      if (msgField && typeof msgField === 'string') {
        return tokenize(msgField)
      }
      // Flatten JSON to string for tokenization
      const flat = JSON.stringify(parsed)
      return tokenizeString(flat)
    } catch {
      // Not valid JSON, tokenize as string
      return tokenizeString(trimmed)
    }
  }

  return tokenizeString(trimmed)
}

/**
 * Tokenize a plain string
 */
function tokenizeString(str) {
  const tokens = []
  let current = ''

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]

    // Keep alphanumeric, underscore, dot, slash, colon, hyphen, @, %, + as part of token
    if (/[a-zA-Z0-9_./:@%+-]/.test(ch)) {
      current += ch
    } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
    } else {
      // Punctuation - treat as separate token if not part of a word
      if (current.length > 0) {
        tokens.push(current)
        current = ''
      }
      // Only keep meaningful punctuation as standalone tokens
      if (ch === '=' || ch === '>' || ch === '<') {
        tokens.push(ch)
      }
    }
  }

  if (current.length > 0) {
    tokens.push(current)
  }

  return tokens
}

/**
 * Extract pattern template from a log message
 * Replaces variable tokens with <*>
 */
export function extractPattern(msg) {
  const tokens = tokenize(msg)
  if (tokens.length === 0) return '<empty>'

  const patternTokens = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    const nextToken = tokens[i + 1]
    if (isVariable(token, nextToken)) {
      patternTokens.push('<*>')
      // If this was a number followed by a unit, skip the unit token too
      if (NUMBER_THEN_UNIT.test(token) && nextToken && UNIT_WORDS.has(nextToken.toLowerCase())) {
        i++ // skip the unit word
      }
    } else {
      patternTokens.push(token)
    }
  }

  return patternTokens.join(' ')
}

/**
 * Cluster logs by pattern
 * @param {Array} logs - array of log objects (each should have _msg field)
 * @param {Object} options - clustering options
 * @returns {Array} clusters sorted by count desc
 */
export function clusterLogs(logs, options = {}) {
  const { maxSamples = 3, maxLogs = 5000 } = options

  if (!logs || logs.length === 0) return []

  // Limit processing for performance
  const toProcess = logs.length > maxLogs ? logs.slice(0, maxLogs) : logs

  const clusterMap = new Map()

  for (const log of toProcess) {
    const msg = log._msg || log.msg || log.message || ''
    const pattern = extractPattern(msg)

    let cluster = clusterMap.get(pattern)
    if (!cluster) {
      cluster = {
        pattern,
        count: 0,
        samples: [],
      }
      clusterMap.set(pattern, cluster)
    }

    cluster.count++

    // Keep up to maxSamples
    if (cluster.samples.length < maxSamples) {
      cluster.samples.push(log)
    }
  }

  // Convert to array and sort by count desc
  const clusters = Array.from(clusterMap.values())
  clusters.sort((a, b) => b.count - a.count)

  return clusters
}

/**
 * Check if logs were truncated during clustering
 */
export function wasTruncated(logs, maxLogs = 5000) {
  return !!(logs && logs.length > maxLogs)
}
