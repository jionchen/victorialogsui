<template>
  <a-drawer
    :visible="visible"
    title="活动记录"
    :width="360"
    placement="right"
    @update:visible="emit('update:visible', $event)"
  >
    <AuditPanel show-clear />
  </a-drawer>
</template>

<script setup>
import AuditPanel from './AuditPanel.vue'

defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:visible'])
</script>
