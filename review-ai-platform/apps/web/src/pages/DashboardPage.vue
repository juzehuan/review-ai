<template>
  <div v-if="!selectedTask" class="empty-state">
    <a-empty description="先创建分析项目并导入评论 CSV">
      <template #image>
        <CloudUploadOutlined class="empty-icon" />
      </template>
    </a-empty>
  </div>

  <div v-else class="dashboard-grid">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">经营看板</div>
        <div class="toolbar-subtitle">
          面向商品、运营和客服团队的评论洞察中心。
        </div>
      </div>
      <a-space wrap>
        <a-button @click="load" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新看板
        </a-button>
        <a-tag :color="dashboard?.runId ? 'green' : 'default'">
          {{ dashboard?.runId ? "已生成分析结果" : "等待首次分析" }}
        </a-tag>
      </a-space>
    </div>

    <div class="overview-band">
      <div class="overview-copy">
        <div class="overview-kicker">当前项目</div>
        <h2>{{ selectedTask.productName }}</h2>
        <p>{{ selectedTask.name }} · {{ selectedTask.sourceChannel }} · {{ selectedTask.status }}</p>
      </div>
      <div class="pipeline-strip">
        <div v-for="step in pipelineSteps" :key="step.label" class="pipeline-step" :class="{ active: step.active }">
          <component :is="step.icon" />
          <span>{{ step.label }}</span>
        </div>
      </div>
    </div>

    <section v-if="dashboard?.aiSummary" class="ai-summary-card">
      <div class="panel-label">AI 总结</div>
      <div class="ai-summary-text">{{ dashboard.aiSummary }}</div>
    </section>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">评论总量</div>
        <div class="stat-value">{{ dashboard?.reviewCount || 0 }}</div>
        <div class="stat-note">已纳入本次洞察样本</div>
      </div>

      <div class="stat-card stat-card-accent">
        <div class="stat-label">负向评论</div>
        <div class="stat-value">{{ dashboard?.negativeCount || 0 }}</div>
        <div class="stat-note">需要运营跟进的低分反馈</div>
      </div>

      <div class="stat-card stat-card-success">
        <div class="stat-label">NPS</div>
        <div class="stat-value">{{ dashboard?.nps || 0 }}</div>
        <div class="stat-note">推荐者与批评者净差</div>
      </div>
    </div>

    <div class="chart-row chart-row-featured">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">满意度 NPS</div>
            <div class="chart-subtitle">按 1-5 星评价拆分推荐倾向</div>
          </div>
        </div>
        <div class="nps-layout">
          <div ref="gaugeRef" class="chart-container nps-chart" />
          <a-table
            class="nps-table"
            size="small"
            :pagination="false"
            :columns="npsColumns"
            :data-source="dashboard?.npsBreakdown || []"
            row-key="label"
          />
        </div>
      </div>

      <div class="insight-panel">
        <div class="insight-title">客户声音摘要</div>
        <div class="insight-list">
          <div class="insight-item">
            <span class="insight-dot positive" />
            <div>
              <strong>{{ positivePercent }}%</strong>
              <span>正向情感占比</span>
            </div>
          </div>
          <div class="insight-item">
            <span class="insight-dot warning" />
            <div>
              <strong>{{ issueCount }}</strong>
              <span>高频问题类型</span>
            </div>
          </div>
          <div class="insight-item">
            <span class="insight-dot neutral" />
            <div>
              <strong>{{ dashboard?.wordCloud?.length || 0 }}</strong>
              <span>核心关键词</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EChartCard title="各星级情感倾向" :option="ratingSentimentOption" />

    <div class="chart-row">
      <EChartCard title="整体情感分布" :option="sentimentOption" />
      <EChartCard title="评论来源分布" :option="sourceOption" />
    </div>

    <div class="chart-row">
      <EChartCard title="用户声音词云" :option="wordCloudOption" />
      <EChartCard title="用户问题统计" :option="issueOption" />
    </div>
    <section v-if="dashboard?.productInsights" class="product-insights-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Product Insights</div>
          <div class="settings-section-title">产品洞察报告</div>
        </div>
      </div>
      <div class="product-insights-grid">
        <article v-for="item in productInsightSections" :key="item.key" class="product-insight-card">
          <div class="product-insight-title">{{ item.title }}</div>
          <div class="product-insight-body">{{ item.content }}</div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  RobotOutlined
} from "@ant-design/icons-vue";
import EChartCard from "@/components/EChartCard.vue";
import { fetchDashboard } from "@/api";
import { useTaskStore } from "@/composables";
import type { DashboardDTO, Sentiment } from "@review-ai/shared";
import {
  CHART_COLORS,
  getBarGradient,
  getGrid,
  getLegend,
  getPieItem,
  getSentimentColors,
  getTooltip,
  getWordCloudColors,
  getXAxis,
  getYAxis
} from "@/composables/useChartConfig";

const { selectedTask } = useTaskStore();
const dashboard = ref<DashboardDTO | null>(null);
const loading = ref(false);
const gaugeRef = ref<HTMLDivElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;
let gaugeChart: echarts.ECharts | null = null;

const npsColumns = [
  { title: "分类", dataIndex: "label", key: "label" },
  { title: "占比", dataIndex: "percent", key: "percent", customRender: ({ text }: { text: number }) => `${text}%` },
  { title: "数量", dataIndex: "count", key: "count" }
];

const pipelineSteps = computed(() => [
  { label: "导入", icon: DatabaseOutlined, active: Boolean(selectedTask.value) },
  { label: "AI 分析", icon: RobotOutlined, active: Boolean(dashboard.value?.runId) },
  { label: "洞察", icon: CheckCircleOutlined, active: Boolean(dashboard.value?.reviewCount) }
]);

const issueCount = computed(() => dashboard.value?.issues?.length || 0);
const positivePercent = computed(() => {
  const positive = dashboard.value?.sentimentDistribution?.find((item) => item.sentiment === "positive");
  return positive?.percent || 0;
});
const productInsightSections = computed(() => {
  const insights = dashboard.value?.productInsights;
  if (!insights) {
    return [];
  }
  return [
    { key: "userPersonas", title: "用户画像", content: insights.userPersonas },
    { key: "usageScenarios", title: "使用场景", content: insights.usageScenarios },
    { key: "sellingPoints", title: "销售卖点", content: insights.sellingPoints },
    { key: "advantages", title: "产品优势", content: insights.advantages },
    { key: "improvements", title: "待改进点", content: insights.improvements },
    { key: "expectations", title: "用户期待", content: insights.expectations }
  ].filter((item) => item.content);
});

function sentimentText(sentiment: Sentiment) {
  if (sentiment === "positive") {
    return "正向";
  }
  if (sentiment === "negative") {
    return "负向";
  }
  return "中性";
}

function renderGauge() {
  if (!gaugeRef.value) {
    return;
  }

  if (!gaugeChart) {
    gaugeChart = echarts.init(gaugeRef.value);
  }

  const npsValue = dashboard.value?.nps || 0;
  let progressColor = CHART_COLORS.neutral[0];
  if (npsValue >= 30) {
    progressColor = CHART_COLORS.positive[0];
  }
  if (npsValue < 0) {
    progressColor = CHART_COLORS.negative[0];
  }

  gaugeChart.setOption(
    {
      series: [
        {
          type: "gauge",
          min: -100,
          max: 100,
          progress: {
            show: true,
            width: 18,
            roundCap: true,
            itemStyle: { color: progressColor }
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: 18,
              color: [[1, "#e5e7eb"]]
            }
          },
          axisTick: { show: false },
          splitLine: { length: 10, distance: -22, lineStyle: { color: "#cbd5e1", width: 2 } },
          axisLabel: { distance: 14, color: "#6b7280", fontSize: 12 },
          pointer: { width: 5, length: "56%", itemStyle: { color: progressColor } },
          detail: {
            fontSize: 40,
            fontWeight: 800,
            offsetCenter: [0, "36%"],
            formatter: "{value}",
            color: "#111827"
          },
          title: { offsetCenter: [0, "8%"], color: "#6b7280", fontSize: 13 },
          data: [{ value: npsValue, name: "NPS 净推荐值" }]
        }
      ]
    },
    true
  );
}

async function load() {
  if (!selectedTask.value) {
    dashboard.value = null;
    return;
  }

  loading.value = true;
  try {
    dashboard.value = await fetchDashboard(selectedTask.value.id);
    renderGauge();
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  stopPolling();
  timer = setInterval(load, 10000);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function onResize() {
  gaugeChart?.resize();
}

const sentimentColors = getSentimentColors();

const ratingSentimentOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  legend: getLegend({ data: ["正向", "中性", "负向"] }) as EChartsOption["legend"],
  color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
  xAxis: getXAxis({
    data: (dashboard.value?.ratingSentiment || []).map((item) => `${item.ratingStar} 星`)
  }) as EChartsOption["xAxis"],
  yAxis: getYAxis() as EChartsOption["yAxis"],
  grid: getGrid() as EChartsOption["grid"],
  series: [
    {
      name: "正向",
      type: "bar",
      stack: "sentiment",
      barWidth: 38,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.positive[0], CHART_COLORS.positive[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => item.positive)
    },
    {
      name: "中性",
      type: "bar",
      stack: "sentiment",
      barWidth: 38,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.neutral[0], CHART_COLORS.neutral[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => item.neutral)
    },
    {
      name: "负向",
      type: "bar",
      stack: "sentiment",
      barWidth: 38,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.negative[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => item.negative)
    }
  ]
}));

const sentimentOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip("item") as EChartsOption["tooltip"],
  legend: getLegend({ bottom: 6 }) as EChartsOption["legend"],
  color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
  series: [
    {
      ...(getPieItem(["46%", "74%"]) as Record<string, unknown>),
      data: (dashboard.value?.sentimentDistribution || []).map((item) => ({
        name: sentimentText(item.sentiment),
        value: item.count
      }))
    }
  ]
}));

const sourceOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  xAxis: getXAxis({
    data: (dashboard.value?.sourceDistribution || []).map((item) => item.source)
  }) as EChartsOption["xAxis"],
  yAxis: getYAxis() as EChartsOption["yAxis"],
  grid: getGrid() as EChartsOption["grid"],
  series: [
    {
      type: "bar",
      barWidth: 42,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.primary[0], CHART_COLORS.accent[0]) },
      data: (dashboard.value?.sourceDistribution || []).map((item) => item.count)
    }
  ]
}));

const wordCloudOption = computed<EChartsOption>(() => ({
  series: [
    {
      type: "wordCloud",
      shape: "circle",
      width: "100%",
      height: "100%",
      sizeRange: [16, 70],
      rotationRange: [-20, 20],
      gridSize: 12,
      textStyle: {
        fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
        fontWeight: 700,
        color: () => {
          const colors = getWordCloudColors();
          return colors[Math.floor(Math.random() * colors.length)];
        }
      },
      data: dashboard.value?.wordCloud || []
    }
  ]
}));

const issueOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  xAxis: getXAxis({
    data: (dashboard.value?.issues || []).map((item) => item.issueName),
    axisLabel: { interval: 0, rotate: 18, color: "#6b7280", fontSize: 12 }
  }) as EChartsOption["xAxis"],
  yAxis: getYAxis() as EChartsOption["yAxis"],
  grid: getGrid({ bottom: 70 }) as EChartsOption["grid"],
  series: [
    {
      type: "bar",
      barWidth: 36,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.accent[0]) },
      data: (dashboard.value?.issues || []).map((item) => item.count)
    }
  ]
}));

watch(
  () => selectedTask.value?.id,
  async () => {
    await load();
    startPolling();
  },
  { immediate: true }
);

onMounted(() => window.addEventListener("resize", onResize));

onBeforeUnmount(() => {
  stopPolling();
  window.removeEventListener("resize", onResize);
  gaugeChart?.dispose();
});
</script>
