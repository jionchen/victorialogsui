<template>
  <div class="histogram-panel">
    <div class="histogram-panel__header">
      <span class="histogram-panel__title">日志命中分布</span>
      <span class="histogram-panel__meta">
        <span class="histogram-panel__total">
        共命中: <strong>{{ formatNumber(totalHitsDisplay) }}</strong> 条 · 已加载 <strong>{{ formatNumber(logStore.loadedCount) }}</strong> 条
        </span>
        <span
          v-if="logStore.isTruncated"
          class="histogram-panel__truncated"
          title="可缩小时间范围或提高结果上限以查看更多"
        >
          ⚠ 已截断 · 仅展示前 {{ formatNumber(logStore.loadedCount) }} / 共 {{ formatNumber(totalHitsDisplay) }} 条
        </span>
      </span>
    </div>
    <div class="histogram-panel__chart" ref="chartRef">
      <div v-if="logStore.histogramLoading" class="loading-spinner" style="height: 100%;">
        <a-spin />
      </div>
      <div v-else-if="logStore.histogramError" class="histogram-panel__error">
        <span>统计加载失败，可重试</span>
        <button class="link-btn" @click="retryHistogram">重试</button>
      </div>
      <v-chart
        ref="echartsInstanceRef"
        v-else-if="chartOption"
        :option="chartOption"
        autoresize
        style="height: 100%; cursor: crosshair;"
        @zr:mousedown="onBrushStart"
        @zr:mouseup="onBrushEnd"
      />
      <div v-else class="empty-state" style="padding: 12px;">
        <div class="empty-state__text" style="font-size: 12px;">暂无柱状图数据</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { useLogStore } from '../stores/logs.js'
import { useQueryStore } from '../stores/query.js'
import { useSettingsStore } from '../stores/settings.js'
import { formatNumber } from '../utils/formatters.js'
import { LOG_LEVEL_COLORS } from '../../config/uiConfig.js'

use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const logStore = useLogStore()
const queryStore = useQueryStore()
const settingsStore = useSettingsStore()
const chartRef = ref(null)
const echartsInstanceRef = ref(null)
const totalFromHistogram = ref(0)

const totalHitsDisplay = computed(() => {
  return totalFromHistogram.value || logStore.totalHits
})

// Read theme-aware colors from CSS variables
function getThemeColors() {
  const style = getComputedStyle(document.documentElement)
  return {
    borderColor: style.getPropertyValue('--border-color').trim() || '#383850',
    textMuted: style.getPropertyValue('--text-muted').trim() || '#6c6c8a',
    borderLight: style.getPropertyValue('--border-light').trim() || '#2a2a40',
    bgSurface: style.getPropertyValue('--bg-surface').trim() || '#252536',
    textPrimary: style.getPropertyValue('--text-primary').trim() || '#e0e0f0',
    textSecondary: style.getPropertyValue('--text-secondary').trim() || '#a0a0c0',
    accent: style.getPropertyValue('--accent').trim() || '#7c6ef0',
  }
}

// Update total as a side-effect via watch instead of inside computed
watch(() => logStore.histogramData, (data) => {
  if (data?.hits) {
    let total = 0
    for (const h of data.hits) {
      total += h.total || 0
    }
    totalFromHistogram.value = total
  } else {
    totalFromHistogram.value = 0
  }
}, { immediate: true })

const chartOption = computed(() => {
  const data = logStore.histogramData
  if (!data?.hits || data.hits.length === 0) return null

  // Access theme to trigger recompute on theme change
  const _theme = settingsStore.theme
  const hits = data.hits

  const hasLevels = hits.some(h => h.fields?.level)

  if (hasLevels) {
    // Stacked bar by level
    const seriesMap = {}
    for (const hit of hits) {
      const level = hit.fields?.level || 'other'
      if (!seriesMap[level]) {
        seriesMap[level] = { name: level, type: 'bar', stack: 'total', data: [], itemStyle: { color: LOG_LEVEL_COLORS[level] || '#7c6ef0' } }
      }
      const timestamps = hit.timestamps || []
      const values = hit.values || []
      for (let i = 0; i < timestamps.length; i++) {
        seriesMap[level].data.push([timestamps[i], values[i] || 0])
      }
    }

    return buildChartOption(Object.values(seriesMap))
  } else {
    // Single series
    const hit = hits[0]
    const colors = getThemeColors()
    const seriesData = (hit.timestamps || []).map((t, i) => [t, (hit.values || [])[i] || 0])
    return buildChartOption([{
      name: 'hits',
      type: 'bar',
      data: seriesData,
      itemStyle: { color: colors.accent, borderRadius: [2, 2, 0, 0] },
    }])
  }
})

function buildChartOption(series) {
  const colors = getThemeColors()
  return {
    grid: { left: 44, right: 16, top: 8, bottom: 24 },
    xAxis: {
      type: 'time',
      axisLine: { lineStyle: { color: colors.borderColor } },
      axisLabel: { color: colors.textMuted, fontSize: 10 },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 10, formatter: (v) => formatNumber(v) },
      splitLine: { lineStyle: { color: colors.borderLight, type: 'dashed' } },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.bgSurface,
      borderColor: colors.borderColor,
      textStyle: { color: colors.textPrimary, fontSize: 12 },
    },
    legend: {
      show: series.length > 1,
      bottom: 0,
      textStyle: { color: colors.textSecondary, fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10,
    },
    series,
  }
}

function retryHistogram() {
  const { start, end } = queryStore.timeRange
  logStore.fetchHistogram({
    query: queryStore.effectiveQuery,
    start,
    end,
    step: queryStore.histogramStep,
  })
}

// Brush select for zoom (simplified)
let brushStartX = null

function onBrushStart(e) {
  brushStartX = e.offsetX
}

function onBrushEnd(e) {
  if (brushStartX !== null && Math.abs(e.offsetX - brushStartX) > 20) {
    if (echartsInstanceRef.value) {
      const startMs = echartsInstanceRef.value.convertFromPixel({ xAxisIndex: 0 }, brushStartX)
      const endMs = echartsInstanceRef.value.convertFromPixel({ xAxisIndex: 0 }, e.offsetX)
      
      if (startMs && endMs) {
        const times = [startMs, endMs].sort()
        const startIso = new Date(times[0]).toISOString()
        const endIso = new Date(times[1]).toISOString()
        queryStore.setCustomTime(startIso, endIso)
      }
    }
  } else if (brushStartX !== null && Math.abs(e.offsetX - brushStartX) <= 5) {
    // Click on bar could zoom in around it
    if (echartsInstanceRef.value) {
      const clickMs = echartsInstanceRef.value.convertFromPixel({ xAxisIndex: 0 }, e.offsetX)
      if (clickMs) {
        // Zoom into a ±5% arbitrary range around the clicked area, based on current range
        const currentRangeMs = queryStore.timeRange.rangeMs
        const windowMs = currentRangeMs * 0.05
        queryStore.setCustomTime(
          new Date(clickMs - windowMs).toISOString(),
          new Date(clickMs + windowMs).toISOString()
        )
      }
    }
  }
  brushStartX = null
}
</script>
