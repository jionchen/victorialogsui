<template>
  <div class="settings-drawer">
    <div class="settings-drawer__section">
      <div class="settings-drawer__label">VictoriaLogs 连接</div>
      <div class="settings-connection-status" :class="{ 'is-ok': testResult?.ok, 'is-error': testResult && !testResult.ok }">
        <div class="settings-connection-status__title">
          {{ currentTargetLabel }}
        </div>
        <div class="settings-connection-status__detail">
          {{ testResult ? testResult.message : '配置地址后可测试连接，查询会通过 /api 代理发送。' }}
        </div>
      </div>
      <div class="settings-drawer__label">地址列表</div>
      <div v-for="item in settingsStore.apiBaseUrlList" :key="item.url" class="api-list-item" :class="{ active: item.url === apiUrl }">
        <div class="api-list-item__info" @click="selectApi(item.url)">
          <div class="api-list-item__name">{{ item.name }}</div>
          <div class="api-list-item__url">{{ item.url || '使用 vite/nginx 代理默认地址' }}</div>
        </div>
        <a-button type="text" status="danger" size="mini" @click.stop="removeApi(item.url)">
          <template #icon>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </template>
        </a-button>
      </div>

      <div class="add-api-form">
        <a-input v-model="newApiName" placeholder="名称 (如: 生产集群)" />
        <a-input v-model="newApiUrl" placeholder="http://IP:端口" />
        <a-button type="primary" :disabled="!canAddApi" @click="addNewApi">
          添加
        </a-button>
      </div>

      <div style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">
        {{ strictProxyMode ? '提示: 当前为受控模式，仅允许切换到部署配置声明过的后端地址。' : '提示: 当前为内网自由连接模式，可直接填写合法的 VictoriaLogs 地址。' }}
      </div>
      <div v-if="strictProxyMode" style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">
        允许列表: {{ allowedTargetLabels.join(' / ') || '仅默认代理' }}
      </div>
      <div v-if="addApiError || newApiValidationMessage" style="margin-top: 6px; font-size: 11px; color: var(--danger);">
        {{ addApiError || newApiValidationMessage }}
      </div>
    </div>

    <div class="settings-drawer__section">
      <div class="settings-drawer__label">认证 (Basic Auth)</div>
      <div class="settings-auth-row">
        <a-input
          v-model="authUsername"
          placeholder="用户名"
          style="flex: 1;"
          @change="onAuthChange"
        />
        <a-input-password
          v-model="authPassword"
          placeholder="密码"
          style="flex: 1;"
          @change="onAuthChange"
        />
      </div>
      <a-checkbox v-model="persistAuth" style="margin-top: 10px;" @change="onAuthChange">
        关闭浏览器后仍保留凭证
      </a-checkbox>
      <div class="settings-drawer__hint">
        默认仅保存在当前浏览器会话中；勾选后会持久保存在本地浏览器。
      </div>
    </div>

    <div class="settings-drawer__section">
      <div class="settings-drawer__label">默认结果数量</div>
      <a-select v-model="resultLimit" @change="onLimitChange">
        <a-option :value="100">100</a-option>
        <a-option :value="500">500</a-option>
        <a-option :value="1000">1000</a-option>
        <a-option :value="2000">2000</a-option>
      </a-select>
    </div>

    <div class="settings-drawer__section">
      <div class="settings-drawer__label">置顶字段 (逗号分隔)</div>
      <a-textarea
        v-model="pinnedFieldsText"
        :auto-size="{ minRows: 3, maxRows: 6 }"
        placeholder="src_namespace, src_container_name, src_pod_name"
        @change="onPinnedChange"
      />
      <div style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">
        这些字段将展示在侧边栏顶部并默认展开。
      </div>
    </div>

    <div class="settings-drawer__section">
      <div class="settings-drawer__label">时区</div>
      <a-select v-model="selectedTimezone" @change="onTimezoneChange">
        <a-option v-for="tz in timezoneOptions" :key="tz.value" :value="tz.value">{{ tz.label }}</a-option>
      </a-select>
      <div v-if="selectedTimezone === 'custom'" class="timezone-custom">
        <a-input-number v-model="customOffset" :min="-720" :max="840" placeholder="偏移分钟数" @change="onCustomOffsetChange" />
        <span class="timezone-custom__hint">例如: -480 = UTC+8, 0 = UTC</span>
      </div>
    </div>

    <div class="settings-drawer__section">
      <div class="settings-drawer__label">主题</div>
      <a-radio-group v-model="theme" @change="onThemeChange">
        <a-radio value="dark">深色</a-radio>
        <a-radio value="light">浅色</a-radio>
      </a-radio-group>
    </div>

    <div class="settings-drawer__section">
      <a-button type="primary" :loading="testing" @click="testConnection">
        测试连接
      </a-button>
      <div v-if="testResult" style="margin-top: 8px; font-size: 12px;" :style="{ color: testResult.ok ? 'var(--success)' : 'var(--danger)' }">
        {{ testResult.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import { useQueryStore } from '../stores/query.js'
import { API_CONNECTION_TEST_TIMEOUT_MS } from '../../config/proxyConfig.js'
import { setTimezoneOffset, getTimezoneOffset } from '../utils/timeUtils.js'
import { STORAGE_KEYS } from '../../config/storageKeys.js'
import { useStorage } from '../composables/useStorage.js'
import client, {
  getAuthCredentials,
  getAuthStorageMode,
  setAuth,
  getConfiguredProxyTargetOptions,
  isStrictProxyMode,
  normalizeProxyTarget,
} from '../api/client.js'

const TIMEZONE_OPTIONS = [
  { value: -480, label: 'UTC+8 (北京时间)' },
  { value: 0, label: 'UTC' },
  { value: -540, label: 'UTC+9 (东京)' },
  { value: 300, label: 'UTC-5 (纽约)' },
  { value: 'custom', label: '自定义' },
]

const settingsStore = useSettingsStore()
const queryStore = useQueryStore()

const apiUrl = computed(() => settingsStore.apiBaseUrl)
const newApiName = ref('')
const newApiUrl = ref('')

const savedAuth = getAuthCredentials()
const authUsername = ref(savedAuth.username || '')
const authPassword = ref(savedAuth.password || '')
const persistAuth = ref(getAuthStorageMode() === 'persistent')
const resultLimit = ref(settingsStore.resultLimit)
const pinnedFieldsText = ref(settingsStore.pinnedFields.join(', '))
const theme = ref(settingsStore.theme)
const testing = ref(false)
const testResult = ref(null)
const addApiError = ref('')
const allowedTargetOptions = getConfiguredProxyTargetOptions()
const allowedTargets = allowedTargetOptions.map(option => option.url)
const allowedTargetLabels = allowedTargetOptions.map(option => option.name)
const strictProxyMode = isStrictProxyMode()
const currentTargetLabel = computed(() => {
  return apiUrl.value || '使用默认代理地址'
})
const normalizedNewApiUrl = computed(() => normalizeProxyTarget(sanitizeApiInput(newApiUrl.value)))
const newApiValidationMessage = computed(() => {
  if (!newApiUrl.value.trim()) return ''
  if (!normalizedNewApiUrl.value) {
    return '请输入合法的 http/https 地址，且不要包含路径、账号密码或查询参数。'
  }
  if (
    strictProxyMode
    && !allowedTargets.includes(normalizedNewApiUrl.value)
  ) {
    return '该地址未在允许列表中，请先在部署配置中声明允许的后端地址。'
  }
  return ''
})
const canAddApi = computed(() => Boolean(newApiUrl.value.trim()) && !newApiValidationMessage.value)

const timezoneOptions = TIMEZONE_OPTIONS
const storedOffset = useStorage(STORAGE_KEYS.timezoneOffset, getTimezoneOffset(), {
  serialize: String,
  deserialize: (raw) => parseInt(raw, 10),
})
const customOffset = ref(storedOffset.value)
const selectedTimezone = ref(
  TIMEZONE_OPTIONS.find(t => t.value === storedOffset.value)?.value ?? 'custom'
)

function onTimezoneChange() {
  if (selectedTimezone.value === 'custom') {
    setTimezoneOffset(customOffset.value)
    storedOffset.value = customOffset.value
  } else {
    const offset = selectedTimezone.value
    customOffset.value = offset
    setTimezoneOffset(offset)
    storedOffset.value = offset
  }
}

function onCustomOffsetChange() {
  if (selectedTimezone.value === 'custom') {
    setTimezoneOffset(customOffset.value)
    storedOffset.value = customOffset.value
  }
}

function selectApi(url) {
  settingsStore.updateApiBaseUrl(url)
}

function sanitizeApiInput(raw) {
  let sanitizedUrl = raw.trim().replace(/\/$/, '')
  sanitizedUrl = sanitizedUrl.replace(/\/select\/vmui$/, '')
  sanitizedUrl = sanitizedUrl.replace(/\/select$/, '')

  if (sanitizedUrl && !sanitizedUrl.startsWith('http')) {
    sanitizedUrl = 'http://' + sanitizedUrl
  }
  return sanitizedUrl
}

function addNewApi() {
  addApiError.value = ''
  if (!canAddApi.value) return

  const normalized = normalizedNewApiUrl.value
  const ok = settingsStore.addApiBaseUrl(newApiName.value || '未命名', normalized)
  if (!ok) {
    addApiError.value = strictProxyMode
      ? '该地址未在允许列表中，请先在部署配置中声明允许的后端地址。'
      : '请输入合法的 http/https 地址，且不要包含路径、账号密码或查询参数。'
    return
  }

  settingsStore.updateApiBaseUrl(normalized)
  newApiName.value = ''
  newApiUrl.value = ''
}

function removeApi(url) {
  if (!confirm('确定要删除这个地址吗？')) return
  settingsStore.removeApiBaseUrl(url)
}

function onAuthChange() {
  setAuth(authUsername.value, authPassword.value, { persist: persistAuth.value })
}

function onLimitChange() {
  settingsStore.setResultLimit(resultLimit.value)
  queryStore.executeQuery()
}

function onPinnedChange() {
  const fields = pinnedFieldsText.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  settingsStore.setPinnedFields(fields)
}

function onThemeChange() {
  settingsStore.setTheme(theme.value)
}

async function testConnection() {
  testing.value = true
  testResult.value = null
  try {
    const params = new URLSearchParams()
    params.set('query', '*')
    params.set('limit', '1')
    params.set('start', '5m')
    params.set('end', 'now')
    await client.post('/select/logsql/query', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: API_CONNECTION_TEST_TIMEOUT_MS,
    })
    testResult.value = { ok: true, message: '连接成功' }
  } catch (e) {
    testResult.value = { ok: false, message: `连接失败: ${e.message}` }
  } finally {
    testing.value = false
  }
}
</script>
