<template>
  <div class="chart-card" :class="{ 'chart-card-clickable': clickable }" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <div class="chart-header">
      <div class="chart-title">{{ title }}</div>
      <div class="chart-accent" :style="{ opacity: hovering ? 1 : 0.6 }" />
    </div>
    <div ref="container" class="chart-container" :style="{ height: height || '320px' }" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { ECharts, EChartsOption } from "echarts";
import echarts from "@/utils/echarts";

const props = defineProps<{
  title: string;
  option: EChartsOption;
  height?: string;
  clickable?: boolean;
}>();

const emit = defineEmits<{
  chartClick: [params: unknown];
}>();

const container = ref<HTMLDivElement | null>(null);
const hovering = ref(false);
let chart: ECharts | null = null;

function handleChartClick(params: unknown) {
  emit("chartClick", params);
}

function render() {
  if (!container.value) {
    return;
  }

  const currentChart = chart ?? echarts.init(container.value);
  chart = currentChart;
  currentChart.off("click", handleChartClick);
  currentChart.on("click", handleChartClick);
  currentChart.setOption(props.option, true);
  currentChart.resize();
}

onMounted(render);
watch(() => props.option, render, { deep: true });
window.addEventListener("resize", render);

onBeforeUnmount(() => {
  window.removeEventListener("resize", render);
  chart?.dispose();
});
</script>

<style scoped>
.chart-card {
  position: relative;
  background: #ffffff;
  border-radius: 8px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
}

.chart-card:hover {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  border-color: #93c5fd;
}

.chart-card-clickable .chart-container {
  cursor: pointer;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.chart-title {
  font-size: 17px;
  font-weight: 800;
  color: #111827;
}

.chart-accent {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: #1d4ed8;
  transition: opacity 0.25s ease;
}

.chart-container {
  width: 100%;
}
</style>
