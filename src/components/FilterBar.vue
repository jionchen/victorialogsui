<template>
  <div class="filter-bar">
    <div
      v-for="filter in queryStore.filters"
      :key="filter.id"
      class="filter-pill"
      :class="{ disabled: filter.disabled, negated: filter.negated }"
      @click="queryStore.toggleFilterDisabled(filter.id)"
    >
      <span class="filter-pill__field">{{ filter.field }}:</span>
      <span class="filter-pill__value">
        {{ filter.negated ? 'NOT ' : '' }}{{ filter.values.join(', ') }}
      </span>
      <button
        class="filter-pill__btn"
        title="切换排除"
        @click.stop="queryStore.toggleFilterNegated(filter.id)"
      >
        {{ filter.negated ? '+' : '−' }}
      </button>
      <button
        class="filter-pill__btn"
        title="删除筛选"
        @click.stop="queryStore.removeFilter(filter.id)"
      >
        ✕
      </button>
    </div>
    <button
      v-if="queryStore.filters.length > 1"
      class="filter-bar__clear"
      @click="queryStore.clearAllFilters()"
    >
      清除全部
    </button>
  </div>
</template>

<script setup>
import { useQueryStore } from '../stores/query.js'

const queryStore = useQueryStore()
</script>
