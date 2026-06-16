import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'graphify-out/**', '.claude/**']
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-empty': 'error',
      'no-useless-escape': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'error',
      'vue/require-default-prop': 'off',
      'vue/attributes-order': 'warn',
      'vue/order-in-components': 'warn',
      'vue/no-mutating-props': 'error'
    }
  },
  prettier
]
