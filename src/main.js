import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import App from './App.vue'
import './styles/index.css'
import { initializeRuntimeConfig } from './api/client.js'

async function bootstrap() {
  await initializeRuntimeConfig()

  const app = createApp(App)
  app.use(createPinia())
  app.use(ArcoVue)
  app.mount('#app')
}

bootstrap().catch((err) => {
  console.error('[bootstrap] failed to start app:', err)
})
