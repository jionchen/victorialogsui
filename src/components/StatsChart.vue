<template>
  <div class="stats-chart">
    <v-chart
      v-if="chartOption"
      :option="chartOption"
      autoresize
      style="width: 100%; height: 300px;"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DatasetComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([BarChart, GridComponent, TooltipComponent, LegendComponent, DatasetComponent, CanvasRenderer])

const props = defineProps({
  data: { type: Array, required: true },
  groupFields: { type: Array, required: true },
  aggFunction: { type: String, required: true },
})

const chartOption = computed(() => {
  if (!props.data || props.data.length === 0) return null

  // VictoriaLogs stats format: each row has group fields + _count (or other agg column)
  const aggKey = props.aggFunction === 'count' ? '_count' : `_${props.aggFunction}`

  const sorted = [...props.data].sort((a, b) => (b[aggKey] || 0) - (a[aggKey] || 0))
  const topN = sorted.slice(0, 20)

  const labels = topN.map(row => {
    return props.groupFields.map(f => row[f] || '-').join(' / ')
  })

  const values = topN.map(row => row[aggKey] || 0)

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        interval: 0,
      },
    },
    yAxis: {
      type: 'value',
      name: props.aggFunction,
    },
    series: [
      {
        type: 'bar',
        data: values,
        itemStyle: {
          color: '#165dff',
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: { color: '#4080ff' },
        },
      },
    ],
  }
})
</script>

<style scoped>
.stats-chart {
  margin-top: 8px;
}
</style>
