const RECOVERABLE_STATUS = new Set([502, 503, 504])

export function classifyConnectionError(error) {
  const status = error?.response?.status ?? null
  const message = error?.message || ''
  const networkCode = error?.code || ''

  if (RECOVERABLE_STATUS.has(status)) {
    return {
      recoverable: true,
      status,
      title: 'VictoriaLogs 连接不可用',
      detail: '代理或 VictoriaLogs 后端暂时不可达，请检查数据源地址后重试。',
    }
  }

  if (!status && (networkCode === 'ERR_NETWORK' || /network|timeout|failed/i.test(message))) {
    return {
      recoverable: true,
      status: null,
      title: 'VictoriaLogs 连接不可用',
      detail: '网络连接或代理请求失败，请检查 VictoriaLogs 地址、认证信息和网络连通性。',
    }
  }

  return {
    recoverable: false,
    status,
    title: '查询失败',
    detail: message || '请求 VictoriaLogs 时发生未知错误。',
  }
}
