#!/bin/sh
set -e

CONFIG_DIR="${CONFIG_DIR:-/usr/share/nginx/html/vlogs-ui}"
CONFIG_FILE="${CONFIG_FILE:-${CONFIG_DIR}/config.json}"
NGINX_TEMPLATE="${NGINX_TEMPLATE:-/etc/nginx/conf.d/default.conf.template}"
NGINX_CONF="${NGINX_CONF:-/etc/nginx/conf.d/default.conf}"

# 默认值与 docker-compose.yml 保持一致
ALLOWED_TARGETS="${VITE_ALLOWED_PROXY_TARGETS:-http://victorialogs:9428}"
STRICT_MODE="${VITE_STRICT_PROXY_TARGETS:-true}"

# 生成前端运行时配置文件
mkdir -p "${CONFIG_DIR}"
cat > "${CONFIG_FILE}" <<EOF
{
  "VITE_ALLOWED_PROXY_TARGETS": "${ALLOWED_TARGETS}",
  "VITE_STRICT_PROXY_TARGETS": "${STRICT_MODE}"
}
EOF

# 生成 nginx map 白名单条目到临时文件
MAP_FILE=$(mktemp)
trap 'rm -f "${MAP_FILE}"' EXIT

DEFAULT_ADDED=false
IFS=','
for target in ${ALLOWED_TARGETS}; do
  # trim 前后空白
  trimmed=$(printf '%s' "${target}" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [ -z "${trimmed}" ] && continue

  # 基础校验: 必须是 http/https 开头, 且不含换行/引号/分号等可能破坏 nginx 配置的字符
  case "${trimmed}" in
    http://*|https://*)
      safe=$(printf '%s' "${trimmed}" | tr -d '"\;')
      if [ "${safe}" = "${trimmed}" ]; then
        printf '    "%s"    $http_x_proxy_target;\n' "${safe}" >> "${MAP_FILE}"
        if [ "${safe}" = "http://victorialogs:9428" ]; then
          DEFAULT_ADDED=true
        fi
      else
        echo "[entrypoint] skip unsafe proxy target: ${trimmed}" >&2
      fi
      ;;
    *)
      echo "[entrypoint] skip invalid proxy target: ${trimmed}" >&2
      ;;
  esac
done

# 若未显式包含默认后端, 也把它加入白名单, 保证向后兼容
if [ "${DEFAULT_ADDED}" != "true" ]; then
  printf '    "%s"    $http_x_proxy_target;\n' "http://victorialogs:9428" >> "${MAP_FILE}"
fi

# 从模板生成最终 nginx 配置
awk '
  /__ALLOWED_PROXY_TARGETS_MAP__/ {
    while ((getline line < mapfile) > 0) print line
    close(mapfile)
    next
  }
  { print }
' mapfile="${MAP_FILE}" "${NGINX_TEMPLATE}" > "${NGINX_CONF}"

# 校验配置, 失败时打印生成的配置以便排查
if ! nginx -t >/dev/null 2>&1; then
  echo "[entrypoint] nginx config test failed, generated config:" >&2
  cat "${NGINX_CONF}" >&2
  exit 1
fi

exec nginx -g 'daemon off;'
