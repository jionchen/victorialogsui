// 轻量级日志通道：开发环境输出调试信息，生产环境静默调试日志。
// node ESM 测试环境下 import.meta.env 为 undefined，DEV 天然为 false（自动静默）。
const DEV = import.meta.env?.DEV === true

export const logger = {
  // debug/info/warn 仅在开发环境输出
  debug(...args) {
    if (DEV) console.debug(...args)
  },
  info(...args) {
    if (DEV) console.info(...args)
  },
  warn(...args) {
    if (DEV) console.warn(...args)
  },
  // error 始终输出，保证生产环境仍能暴露真实错误
  error(...args) {
    console.error(...args)
  },
}
