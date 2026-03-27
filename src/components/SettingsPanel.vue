<template>
  <div style="display: flex; flex-direction: column; gap: 20px;">
    <!-- API Connection List -->
    <div class="settings-drawer__section">
      <div class="settings-drawer__label">VictoriaLogs 地址列表</div>
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

      <!-- Add New API -->
      <div class="add-api-form">
        <a-input v-model="newApiName" placeholder="名称 (如: 生产集群)" size="small" />
        <a-input v-model="newApiUrl" placeholder="http://IP:端口" size="small" />
        <a-button type="primary" size="small" @click="addNewApi" :disabled="!newApiUrl">
          添加
        </a-button>
      </div>
      
      <div style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">
        提示: 点击地址切换。所有请求通过本地代理转发，无跨域问题。
      </div>
    </div>

    <!-- Authentication -->
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
    </div>

    <!-- Result Limit -->
    <div class="settings-drawer__section">
      <div class="settings-drawer__label">默认结果数量</div>
      <a-select v-model="resultLimit" @change="onLimitChange">
        <a-option :value="100">100</a-option>
        <a-option :value="500">500</a-option>
        <a-option :value="1000">1000</a-option>
        <a-option :value="2000">2000</a-option>
      </a-select>
    </div>

    <!-- Pinned Fields -->
    <div class="settings-drawer__section">
      <div class="settings-drawer__label">置顶字段 (逗号分隔)</div>
      <a-textarea
        v-model="pinnedFieldsText"
        :auto-size="{ minRows: 3, maxRows: 6 }"
        placeholder="src_k8s.namespace.name, src_container.name, src_k8s.pod.name"
        @change="onPinnedChange"
      />
      <div style="margin-top: 6px; font-size: 11px; color: var(--text-muted);">
        这些字段将展示在侧边栏顶部并默认展开。
      </div>
    </div>

    <!-- Theme -->
    <div class="settings-drawer__section">
      <div class="settings-drawer__label">主题</div>
      <a-radio-group v-model="theme" @change="onThemeChange">
        <a-radio value="dark">深色</a-radio>
        <a-radio value="light">浅色</a-radio>
      </a-radio-group>
    </div>

    <!-- Connection Test -->
    <div class="settings-drawer__section">
      <a-button type="primary" @click="testConnection" :loading="testing">
        测试连接
      </a-button>
      <div v-if="testResult" style="margin-top: 8px; font-size: 12px;" :style="{ color: testResult.ok ? 'var(--success)' : 'var(--danger)' }">
        {{ testResult.message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings.js'
import client, { getAuthCredentials, setAuth } from '../api/client.js'

const settingsStore = useSettingsStore()

const apiUrl = computed(() => settingsStore.apiBaseUrl)
const newApiName = ref('')
const newApiUrl = ref('')

const savedAuth = getAuthCredentials()
const authUsername = ref(savedAuth.username || '')
const authPassword = ref(savedAuth.password || '')
const resultLimit = ref(settingsStore.resultLimit)
const pinnedFieldsText = ref(settingsStore.pinnedFields.join(', '))
const theme = ref(settingsStore.theme)
const testing = ref(false)
const testResult = ref(null)

function selectApi(url) {
  settingsStore.updateApiBaseUrl(url)
}

function addNewApi() {
  if (!newApiUrl.value) return
  
  // Sanitize URL: remove trailing slash, /select/vmui, etc.
  let sanitizedUrl = newApiUrl.value.trim().replace(/\/$/, '')
  sanitizedUrl = sanitizedUrl.replace(/\/select\/vmui$/, '')
  sanitizedUrl = sanitizedUrl.replace(/\/select$/, '')
  
  // Ensure protocol
  if (sanitizedUrl && !sanitizedUrl.startsWith('http')) {
    sanitizedUrl = 'http://' + sanitizedUrl
  }
  
  settingsStore.addApiBaseUrl(newApiName.value || '未命名', sanitizedUrl)
  // 添加后自动选中该地址
  settingsStore.updateApiBaseUrl(sanitizedUrl)
  newApiName.value = ''
  newApiUrl.value = ''
}

function removeApi(url) {
  settingsStore.removeApiBaseUrl(url)
}

function onAuthChange() {
  setAuth(authUsername.value, authPassword.value)
}

function onLimitChange() {
  settingsStore.setResultLimit(resultLimit.value)
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
      timeout: 5000,
    })
    testResult.value = { ok: true, message: '连接成功' }
  } catch (e) {
    testResult.value = { ok: false, message: `连接失败: ${e.message}` }
  } finally {
    testing.value = false
  }
}
</script>
