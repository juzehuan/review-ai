<template>
  <div class="chart-card" @mouseenter="hovering = true" @mouseleave="hovering = false">
    <div class="chart-header">
      <div>
        <div class="chart-title">{{ title }}</div>
        <div v-if="subtitle" class="chart-subtitle">{{ subtitle }}</div>
      </div>
      <div class="chart-accent" :style="{ opacity: hovering ? 1 : 0.6 }" />
    </div>
    <div ref="container" class="chart-container" :style="height ? { height } : {}" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as echarts from "echarts";
import "echarts-wordcloud";

const props = defineProps<{
  title: string;
  subtitle?: string;
  option: echarts.EChartsOption;
  height?: string;
}>();

const container = ref<HTMLDivElement | null>(null);
const hovering = ref(false);
let chart: echarts.ECharts | null = null;

function render() {
  if (!container.value) {
    return;
  }

  if (!chart) {
    chart = echarts.init(container.value, undefined, { renderer: "canvas" });
  }

  chart.setOption(
    {
      animation: true,
      animationDuration: 700,
      animationDurationUpdate: 350,
      animationEasing: "cubicOut",
      animationEasingUpdate: "cubicOut",
      ...props.option
    },
    true
  );
  chart.resize();
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
  background: rgba(255, 255, 255, 0.92);
  border-radius: 20px;
  padding: 20px 22px;
  border: 1px solid rgba(229, 234, 244, 0.95);
  box-shadow: 0 4px 16px rgba(26, 38, 64, 0.04), 0 16px 40px rgba(26, 38, 64, 0.05);
  backdrop-filter: blur(18px);
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.chart-card::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(106, 130, 251, 0.18), rgba(255, 177, 94, 0.18), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(26, 38, 64, 0.06), 0 24px 60px rgba(26, 38, 64, 0.1);
  border-color: rgba(142, 163, 255, 0.45);
}

.chart-card:hover::after { opacity: 1; }

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.chart-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a2844;
  letter-spacing: -0.01em;
}

.chart-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: #98a1b2;
  font-weight: 400;
  line-height: 1.4;
}

.chart-accent {
  width: 32px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6a82fb, #ffb15e);
  transition: opacity 0.25s ease, width 0.3s ease;
}

.chart-card:hover .chart-accent {
  width: 48px;
}

.chart-container {
  width: 100%;
  flex: 1;
  min-height: 160px;
}
</style>
