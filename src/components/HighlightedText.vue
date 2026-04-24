<template>
  <template v-for="(part, index) in parts" :key="`${index}-${part.match ? 'hit' : 'plain'}`">
    <mark v-if="part.match" class="text-highlight">{{ part.text }}</mark>
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { buildHighlightedParts } from '../utils/highlighting.js'

const props = defineProps({
  text: { type: [String, Number], default: '' },
  phrase: { type: String, default: '' },
  terms: { type: Array, default: () => [] },
})

const parts = computed(() => {
  const terms = props.terms.length > 0
    ? props.terms
    : (props.phrase ? [props.phrase] : [])

  return buildHighlightedParts(props.text, terms)
})
</script>
