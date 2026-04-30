<template>
  <div class="dashboard-page">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <div class="dash-title">分析报告</div>
        <div class="dash-subtitle">AI 自动聚合评分、情感分布、用户痛点与声音，数据每 10 秒自动刷新。</div>
      </div>
      <div class="dash-actions">
        <a-tag v-if="dashboard?.runId" color="success">已有分析结果</a-tag>
        <a-tag v-else color="default">尚未分析</a-tag>
        <a-button @click="load" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </div>
    </div>

    <!-- AI Summary -->
    <div v-if="dashboard?.aiSummary" class="ai-summary-card">
      <div class="ai-summary-header">
        <BulbOutlined class="ai-icon" />
        <span class="ai-title">AI 智能总结</span>
        <span class="ai-badge">AI 生成</span>
      </div>
      <div class="ai-summary-text">{{ dashboard.aiSummary }}</div>
    </div>

    <!-- KPI row -->
    <div class="kpi-row">
      <div class="kpi-card kpi-blue">
        <div class="kpi-icon"><MessageOutlined /></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ dashboard?.reviewCount ?? '—' }}</div>
          <div class="kpi-label">评论总数</div>
        </div>
      </div>
      <div class="kpi-card kpi-amber">
        <div class="kpi-icon"><StarFilled /></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ dashboard?.avgRating ?? '—' }}</div>
          <div class="kpi-label">平均评分</div>
        </div>
      </div>
      <div class="kpi-card kpi-green">
        <div class="kpi-icon"><LikeOutlined /></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ positiveRate }}<span class="kpi-unit" v-if="dashboard">%</span></div>
          <div class="kpi-label">正向占比</div>
        </div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-icon"><TrophyOutlined /></div>
        <div class="kpi-body">
          <div class="kpi-value" :class="npsColorClass">{{ dashboard?.nps ?? '—' }}</div>
          <div class="kpi-label">NPS 净推荐值</div>
        </div>
      </div>
      <div class="kpi-card kpi-red">
        <div class="kpi-icon"><FrownOutlined /></div>
        <div class="kpi-body">
          <div class="kpi-value">{{ dashboard?.negativeCount ?? '—' }}</div>
          <div class="kpi-label">差评总数</div>
        </div>
      </div>
    </div>

    <!-- ============= 满意度与评分 ============= -->
    <div class="section-header section-header-sub">
      <DashboardOutlined />
      <span>满意度与评分</span>
    </div>

    <!-- NPS gauge + Sentiment pie -->
    <div class="main-row">
      <div class="chart-card nps-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">满意度 NPS</div>
            <div class="chart-subtitle">净推荐值 &gt;30 为良好，&gt;50 为优秀</div>
          </div>
          <div class="chart-accent" />
        </div>
        <div ref="gaugeRef" style="height: 260px; width: 100%" />
        <div class="breakdown-list">
          <div v-for="item in dashboard?.npsBreakdown || []" :key="item.label" class="breakdown-row">
            <div class="breakdown-name">{{ item.label }}</div>
            <div class="breakdown-track">
              <div
                class="breakdown-fill"
                :style="{ width: (item.percent || 0) + '%', background: breakdownColor(item.label) }"
              />
            </div>
            <div class="breakdown-meta">
              <span class="bd-pct">{{ item.percent }}%</span>
              <span class="bd-count">{{ item.count }} 条</span>
            </div>
          </div>
        </div>
      </div>

      <EChartCard
        title="整体情感分布"
        subtitle="正向 / 中性 / 负向评论占比"
        :option="sentimentOption"
      />
    </div>

    <!-- Rating distribution + Rating sentiment -->
    <div class="chart-row">
      <EChartCard
        title="评分分布"
        subtitle="各星级评论数量及占比"
        :option="ratingDistOption"
        height="300px"
      />
      <EChartCard
        title="各星级情感倾向"
        subtitle="按 1-5 星评分分组的情感堆叠分布"
        :option="ratingSentimentOption"
        height="300px"
      />
    </div>

    <!-- Trend -->
    <template v-if="(dashboard?.trend || []).length > 1">
      <div class="section-header section-header-sub">
        <LineChartOutlined />
        <span>时间趋势</span>
      </div>
      <EChartCard
        title="评论时间趋势"
        subtitle="按月统计评论数量与情感分布变化"
        :option="trendOption"
        height="360px"
      />
    </template>

    <!-- ============= 用户声音 ============= -->
    <div class="section-header section-header-sub">
      <SoundOutlined />
      <span>用户声音</span>
    </div>

    <!-- Word cloud + Issues -->
    <div class="chart-row">
      <EChartCard
        title="用户声音词云"
        subtitle="高频词汇聚合，字号越大出现次数越多"
        :option="wordCloudOption"
        height="300px"
      />
      <EChartCard
        title="用户问题统计"
        subtitle="AI 标记的主要痛点及出现频次"
        :option="issueOption"
        height="340px"
      />
    </div>

    <!-- Product Insights (AI generated) -->
    <template v-if="dashboard?.productInsights">
      <div class="section-header">
        <TeamOutlined />
        <span>产品总结</span>
        <span class="section-badge">AI 生成</span>
      </div>

      <div class="insights-grid">
        <div class="insight-card insight-persona">
          <div class="insight-header"><UserOutlined /><span>用户画像</span></div>
          <div class="insight-body markdown-body" v-html="renderMarkdown(dashboard.productInsights.userPersonas)" />
        </div>
        <div class="insight-card insight-scenario">
          <div class="insight-header"><HomeOutlined /><span>使用场景</span></div>
          <div class="insight-body markdown-body" v-html="renderMarkdown(dashboard.productInsights.usageScenarios)" />
        </div>
        <div class="insight-card insight-selling">
          <div class="insight-header"><ThunderboltOutlined /><span>吸引用户的卖点</span></div>
          <div class="insight-body markdown-body" v-html="renderMarkdown(dashboard.productInsights.sellingPoints)" />
        </div>
        <div class="insight-card insight-advantage">
          <div class="insight-header"><CheckCircleOutlined /><span>产品优点</span></div>
          <div class="insight-body markdown-body" v-html="renderMarkdown(dashboard.productInsights.advantages)" />
        </div>
        <div class="insight-card insight-improvement">
          <div class="insight-header"><ToolOutlined /><span>待改进点</span></div>
          <div class="insight-body markdown-body" v-html="renderMarkdown(dashboard.productInsights.improvements)" />
        </div>
        <div class="insight-card insight-expectation">
          <div class="insight-header"><RocketOutlined /><span>用户期待</span></div>
          <div class="insight-body markdown-body" v-html="renderMarkdown(dashboard.productInsights.expectations)" />
        </div>
      </div>
    </template>

    <!-- ============= 代表性评论 ============= -->
    <div v-if="hasRepresentativeReviews" class="section-header section-header-sub">
      <CommentOutlined />
      <span>代表性评论</span>
    </div>

    <!-- Representative reviews -->
    <div v-if="hasRepresentativeReviews" class="rep-section">
      <div class="rep-col">
        <div class="rep-header rep-positive-header">
          <LikeOutlined /> 好评精选
        </div>
        <template v-if="(dashboard?.representativeReviews?.positive || []).length">
          <div
            v-for="r in dashboard?.representativeReviews?.positive"
            :key="r.reviewId"
            class="rep-card rep-card-pos"
          >
            <div class="rep-stars">
              <span v-for="i in 5" :key="i" :class="i <= r.ratingStar ? 'star-filled' : 'star-empty'">★</span>
            </div>
            <div class="rep-text">{{ displayComment(r).slice(0, 120) }}{{ displayComment(r).length > 120 ? '…' : '' }}</div>
            <div class="rep-summary">{{ r.summary }}</div>
          </div>
        </template>
        <div v-else class="rep-empty rep-empty-pos">
          <SmileOutlined class="rep-empty-icon" />
          <div class="rep-empty-text">暂无好评精选</div>
          <div class="rep-empty-hint">未识别到正向情感评论</div>
        </div>
      </div>
      <div class="rep-col">
        <div class="rep-header rep-negative-header">
          <FrownOutlined /> 差评精选
        </div>
        <template v-if="(dashboard?.representativeReviews?.negative || []).length">
          <div
            v-for="r in dashboard?.representativeReviews?.negative"
            :key="r.reviewId"
            class="rep-card rep-card-neg"
          >
            <div class="rep-stars">
              <span v-for="i in 5" :key="i" :class="i <= r.ratingStar ? 'star-filled' : 'star-empty'">★</span>
            </div>
            <div class="rep-text">{{ displayComment(r).slice(0, 120) }}{{ displayComment(r).length > 120 ? '…' : '' }}</div>
            <div class="rep-summary">{{ r.summary }}</div>
          </div>
        </template>
        <div v-else class="rep-empty rep-empty-neg">
          <CheckCircleOutlined class="rep-empty-icon" />
          <div class="rep-empty-text">暂无差评精选</div>
          <div class="rep-empty-hint">未识别到负向情感评论，整体口碑良好 🎉</div>
        </div>
      </div>
    </div>

    <!-- ============= 渠道来源 ============= -->
    <div class="section-header section-header-sub">
      <ShopOutlined />
      <span>渠道分布</span>
    </div>

    <!-- Source distribution -->
    <EChartCard
      title="评论来源渠道"
      subtitle="按渠道统计的评论数量分布"
      :option="sourceOption"
      height="280px"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts";
import {
  BulbOutlined,
  CheckCircleOutlined,
  CommentOutlined,
  DashboardOutlined,
  FrownOutlined,
  HomeOutlined,
  LikeOutlined,
  LineChartOutlined,
  MessageOutlined,
  ReloadOutlined,
  RocketOutlined,
  ShopOutlined,
  SmileOutlined,
  SoundOutlined,
  StarFilled,
  TeamOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  TrophyOutlined,
  UserOutlined
} from "@ant-design/icons-vue";
import { marked } from "marked";
import EChartCard from "@/components/EChartCard.vue";
import { fetchDashboard } from "@/api";
import { useRoute } from "vue-router";
import type { DashboardDTO, RepresentativeReview, Sentiment } from "@review-ai/shared";
import {
  CHART_COLORS,
  getTooltip,
  getLegend,
  getXAxis,
  getYAxis,
  getGrid,
  getBarGradient,
  getPieItem,
  getSentimentColors,
  getWordCloudColors
} from "@/composables/useChartConfig";

const route = useRoute();
const taskId = computed(() => route.params.taskId as string);
const dashboard = ref<DashboardDTO | null>(null);
const loading = ref(false);
const gaugeRef = ref<HTMLDivElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;
let gaugeChart: echarts.ECharts | null = null;

const positiveRate = computed(() => {
  const dist = dashboard.value?.sentimentDistribution;
  if (!dist?.length) return "—";
  const total = dist.reduce((s, i) => s + i.count, 0);
  const pos = dist.find((i) => i.sentiment === "positive")?.count || 0;
  return total ? Math.round((pos / total) * 100) : 0;
});

const npsColorClass = computed(() => {
  const nps = dashboard.value?.nps;
  if (nps === undefined || nps === null) return "";
  if (nps >= 50) return "nps-excellent";
  if (nps >= 30) return "nps-good";
  if (nps >= 0) return "nps-neutral";
  return "nps-bad";
});

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string): string {
  if (!text) return "";
  try { return marked.parse(text) as string; } catch { return text; }
}

const hasRepresentativeReviews = computed(() => {
  const r = dashboard.value?.representativeReviews;
  return (r?.positive?.length || 0) > 0 || (r?.negative?.length || 0) > 0;
});

function displayComment(r: RepresentativeReview) {
  return (r.commentTr || r.comment || "").trim();
}

function breakdownColor(label: string) {
  if (label.includes("推荐")) return "#34d399";
  if (label.includes("中立")) return "#fbbf24";
  return "#f87171";
}

function sentimentText(sentiment: Sentiment) {
  if (sentiment === "positive") return "正向";
  if (sentiment === "negative") return "负向";
  return "中性";
}

function renderGauge() {
  if (!gaugeRef.value) return;
  if (!gaugeChart) gaugeChart = echarts.init(gaugeRef.value);

  const npsValue = dashboard.value?.nps ?? 0;
  let progressColor: string;
  if (npsValue >= 30) {
    progressColor = CHART_COLORS.positive[0];
  } else if (npsValue >= 0) {
    progressColor = CHART_COLORS.neutral[0];
  } else {
    progressColor = CHART_COLORS.negative[0];
  }

  gaugeChart.setOption(
    {
      series: [
        {
          type: "gauge",
          min: -100,
          max: 100,
          startAngle: 200,
          endAngle: -20,
          center: ["50%", "56%"],
          radius: "76%",
          splitNumber: 4,
          progress: {
            show: true,
            width: 18,
            roundCap: true,
            itemStyle: {
              color: {
                type: "linear",
                x: 0, y: 0, x2: 1, y2: 0,
                colorStops: [
                  { offset: 0, color: CHART_COLORS.negative[0] },
                  { offset: 0.5, color: CHART_COLORS.neutral[0] },
                  { offset: 1, color: CHART_COLORS.positive[0] }
                ]
              }
            }
          },
          axisLine: {
            lineStyle: { width: 18, color: [[1, "rgba(229,234,244,0.8)"]], roundCap: true }
          },
          axisTick: { show: false },
          splitLine: { length: 10, distance: -22, lineStyle: { color: "#cbd5e1", width: 2 } },
          axisLabel: { distance: 28, color: "#7b8494", fontSize: 11, fontWeight: 600 },
          pointer: {
            width: 5, length: "58%", offsetCenter: [0, 0],
            itemStyle: { color: progressColor }
          },
          anchor: {
            show: true, showAbove: true, size: 12,
            itemStyle: {
              borderWidth: 3, borderColor: "#fff", color: progressColor,
              shadowBlur: 10, shadowColor: "rgba(106,130,251,0.3)"
            }
          },
          detail: {
            fontSize: 38, fontWeight: 800, offsetCenter: [0, "38%"],
            formatter: (value: number) => `${Math.round(value)}`,
            color: "#243042"
          },
          title: { offsetCenter: [0, "64%"], color: "#7b8494", fontSize: 13, fontWeight: 600 },
          data: [{ value: npsValue, name: "NPS 净推荐值" }]
        }
      ]
    },
    true
  );
}

async function load() {
  if (!taskId.value) {
    dashboard.value = null;
    return;
  }
  loading.value = true;
  try {
    dashboard.value = await fetchDashboard(taskId.value);
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
  if (timer) { clearInterval(timer); timer = null; }
}

function onResize() {
  gaugeChart?.resize();
}

const sentimentColors = getSentimentColors();

const ratingSentimentOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  legend: getLegend({ data: ["正向", "中性", "负向"] }) as EChartsOption["legend"],
  color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
  xAxis: getXAxis({ data: (dashboard.value?.ratingSentiment || []).map((item) => `${item.ratingStar} 星`) }) as EChartsOption["xAxis"],
  yAxis: getYAxis({ minInterval: 1, splitNumber: 4, min: 0 }) as EChartsOption["yAxis"],
  grid: getGrid() as EChartsOption["grid"],
  series: [
    {
      name: "正向", type: "bar", stack: "sentiment", barWidth: 22, barMaxWidth: 28,
      itemStyle: { borderRadius: [4, 4, 0, 0], color: getBarGradient(CHART_COLORS.positive[0], CHART_COLORS.positive[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => item.positive)
    },
    {
      name: "中性", type: "bar", stack: "sentiment", barWidth: 22, barMaxWidth: 28,
      itemStyle: { color: getBarGradient(CHART_COLORS.neutral[0], CHART_COLORS.neutral[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => item.neutral)
    },
    {
      name: "负向", type: "bar", stack: "sentiment", barWidth: 22, barMaxWidth: 28,
      itemStyle: { borderRadius: [4, 4, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.negative[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => item.negative)
    }
  ]
}));

const ratingDistOption = computed<EChartsOption>(() => {
  const dist = dashboard.value?.ratingDistribution || [1, 2, 3, 4, 5].map((star) => ({ star, count: 0 }));
  const total = dist.reduce((s, d) => s + d.count, 0) || 1;
  const starColors = ["#6366f1", "#34d399", "#fbbf24", "#f97316", "#ef4444"];
  return {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `${p.name}: ${p.value} 条`;
      }
    },
    grid: { top: 8, bottom: 24, left: 56, right: 90 },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#f1f5f9" } },
      axisLabel: { color: "#98a1b2", fontSize: 11 }
    },
    yAxis: {
      type: "category",
      data: ["1 星", "2 星", "3 星", "4 星", "5 星"].reverse(),
      axisLabel: { color: "#7b8494", fontSize: 12, fontWeight: 600 },
      axisTick: { show: false },
      axisLine: { show: false }
    },
    series: [{
      type: "bar",
      barWidth: 14,
      barMaxWidth: 18,
      itemStyle: {
        borderRadius: [0, 6, 6, 0],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        color: (params: any) => starColors[params.dataIndex as number]
      },
      label: {
        show: true,
        position: "right",
        color: "#7b8494",
        fontSize: 12,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const pct = Math.round((params.value / total) * 100);
          return `${params.value}  (${pct}%)`;
        }
      },
      data: [5, 4, 3, 2, 1].map((star) => dist.find((d) => d.star === star)?.count || 0)
    }]
  } as unknown as EChartsOption;
});

const trendOption = computed<EChartsOption>(() => {
  const trend = dashboard.value?.trend || [];
  // Auto thin out labels when too many months
  const labelInterval = trend.length > 18 ? Math.ceil(trend.length / 12) : (trend.length > 10 ? 1 : 0);
  return {
    tooltip: getTooltip() as EChartsOption["tooltip"],
    legend: getLegend({ data: ["正向", "中性", "负向"] }) as EChartsOption["legend"],
    color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
    xAxis: getXAxis({
      data: trend.map((t) => t.period),
      axisLabel: { color: "#7b8494", fontSize: 11, rotate: 35, interval: labelInterval, margin: 10 }
    }) as EChartsOption["xAxis"],
    yAxis: getYAxis({ minInterval: 1, splitNumber: 4, min: 0 }) as EChartsOption["yAxis"],
    grid: { ...getGrid(), bottom: 56 } as EChartsOption["grid"],
    series: [
      {
        name: "正向", type: "bar", stack: "trend", barWidth: "32%", barMaxWidth: 22,
        itemStyle: { color: sentimentColors.positive },
        data: trend.map((t) => t.positive)
      },
      {
        name: "中性", type: "bar", stack: "trend", barMaxWidth: 22,
        itemStyle: { color: sentimentColors.neutral },
        data: trend.map((t) => t.neutral)
      },
      {
        name: "负向", type: "bar", stack: "trend", barMaxWidth: 22,
        itemStyle: { color: sentimentColors.negative },
        data: trend.map((t) => t.negative)
      }
    ]
  };
});

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

const sourceOption = computed<EChartsOption>(() => {
  const data = dashboard.value?.sourceDistribution || [];
  const rotate = data.length > 5 ? 25 : 0;
  return {
    tooltip: getTooltip() as EChartsOption["tooltip"],
    xAxis: getXAxis({
      data: data.map((item) => item.source),
      axisLabel: { color: "#7b8494", fontSize: 11, fontWeight: 500, interval: 0, rotate }
    }) as EChartsOption["xAxis"],
    yAxis: getYAxis({ minInterval: 1, splitNumber: 4, min: 0 }) as EChartsOption["yAxis"],
    grid: { ...getGrid(), bottom: rotate ? 56 : 36 } as EChartsOption["grid"],
    series: [{
      type: "bar", barWidth: 24, barMaxWidth: 32,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.primary[0], CHART_COLORS.accent[0]) },
      data: data.map((item) => item.count)
    }]
  };
});

const wordCloudOption = computed<EChartsOption>(() => ({
  series: [{
    type: "wordCloud",
    shape: "circle",
    width: "100%", height: "100%",
    sizeRange: [16, 76],
    rotationRange: [-20, 20],
    gridSize: 12,
    textStyle: {
      fontFamily: "PingFang SC, Microsoft YaHei, sans-serif",
      fontWeight: 700,
      color: (_value: unknown) => {
        const colors = getWordCloudColors();
        return colors[Math.floor(Math.random() * colors.length)];
      }
    },
    emphasis: { focus: "self", textStyle: { fontWeight: 800, shadowBlur: 8, shadowColor: "rgba(0,0,0,0.2)" } },
    data: dashboard.value?.wordCloud || []
  }]
}));

const issueOption = computed<EChartsOption>(() => {
  const issues = dashboard.value?.issues || [];
  const formatLabel = (s: string) => (s && s.length > 6 ? s.slice(0, 6) + "…" : s);
  return {
    tooltip: {
      ...(getTooltip() as Record<string, unknown>),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        const original = issues[p.dataIndex]?.issueName || p.name;
        return `${original}: ${p.value}`;
      }
    },
    xAxis: getXAxis({
      data: issues.map((item) => formatLabel(item.issueName)),
      axisLabel: { interval: 0, rotate: 35, color: "#7b8494", fontSize: 11, fontWeight: 500, margin: 10 }
    }) as EChartsOption["xAxis"],
    yAxis: getYAxis({ minInterval: 1, splitNumber: 4, min: 0 }) as EChartsOption["yAxis"],
    grid: { ...getGrid(), bottom: 72 } as EChartsOption["grid"],
    series: [{
      type: "bar", barWidth: 22, barMaxWidth: 28,
      itemStyle: { borderRadius: [4, 4, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.accent[0]) },
      data: issues.map((item) => item.count)
    }]
  } as unknown as EChartsOption;
});

watch(taskId, async () => { await load(); startPolling(); }, { immediate: true });

onMounted(() => window.addEventListener("resize", onResize));

onBeforeUnmount(() => {
  stopPolling();
  window.removeEventListener("resize", onResize);
  gaugeChart?.dispose();
});
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

/* ── Header ── */
.dash-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  padding: 8px 0 4px;
}

.dash-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a2844;
  letter-spacing: -0.02em;
}

.dash-subtitle {
  margin-top: 5px;
  font-size: 13px;
  color: #7b8494;
}

.dash-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

/* ── AI Summary ── */
.ai-summary-card {
  background: linear-gradient(135deg, #f0f4ff 0%, #fdf4ff 100%);
  border: 1px solid rgba(139, 92, 246, 0.18);
  border-radius: 20px;
  padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.07);
}

.ai-summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.ai-icon {
  font-size: 18px;
  color: #7c3aed;
}

.ai-title {
  font-size: 15px;
  font-weight: 700;
  color: #4c1d95;
}

.ai-badge {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 8px;
  border-radius: 999px;
}

.ai-summary-text {
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
}

/* ── KPI row ── */
.kpi-row {
  display: flex;
  gap: 14px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 20px;
  border: 1px solid rgba(229, 234, 244, 0.9);
  box-shadow: 0 8px 28px rgba(26, 38, 64, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  flex: 1;
  min-width: 0;
}

.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 42px rgba(26, 38, 64, 0.1);
}

.kpi-blue   { background: linear-gradient(135deg, #fff 0%, #eff4ff 100%); }
.kpi-amber  { background: linear-gradient(135deg, #fff 0%, #fffbeb 100%); }
.kpi-green  { background: linear-gradient(135deg, #fff 0%, #edfaf3 100%); }
.kpi-purple { background: linear-gradient(135deg, #fff 0%, #f4f0ff 100%); }
.kpi-red    { background: linear-gradient(135deg, #fff 0%, #fff2f2 100%); }

.kpi-icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}

.kpi-blue   .kpi-icon { background: rgba(106, 130, 251, 0.12); color: #5b73f5; }
.kpi-amber  .kpi-icon { background: rgba(251, 191, 36, 0.14);  color: #d97706; }
.kpi-green  .kpi-icon { background: rgba(52, 211, 153, 0.14);  color: #10b981; }
.kpi-purple .kpi-icon { background: rgba(139, 92, 246, 0.12);  color: #7c3aed; }
.kpi-red    .kpi-icon { background: rgba(248, 113, 113, 0.14); color: #ef4444; }

.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: #1a2844;
  line-height: 1;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.kpi-unit {
  font-size: 16px;
  font-weight: 600;
  margin-left: 2px;
  color: #6d7788;
}

.kpi-label {
  margin-top: 6px;
  font-size: 12px;
  color: #7b8494;
  font-weight: 500;
  white-space: nowrap;
}

.nps-excellent { color: #059669; }
.nps-good      { color: #10b981; }
.nps-neutral   { color: #d97706; }
.nps-bad       { color: #ef4444; }

/* ── Main row: NPS + sentiment pie ── */
.main-row {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 18px;
  align-items: stretch;
}

.nps-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 22px;
  border: 1px solid rgba(229, 234, 244, 0.95);
  box-shadow: 0 20px 54px rgba(26, 38, 64, 0.07);
  backdrop-filter: blur(18px);
  position: relative;
  overflow: hidden;
}

.nps-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(106, 130, 251, 0.6), rgba(255, 177, 94, 0.6), transparent);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 17px;
  font-weight: 700;
  color: #243042;
  letter-spacing: -0.01em;
}

.chart-subtitle {
  margin-top: 3px;
  font-size: 12px;
  color: #98a1b2;
}

.chart-accent {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6a82fb, #ffb15e);
  flex-shrink: 0;
  margin-top: 6px;
}

/* NPS breakdown bars */
.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(229, 234, 244, 0.7);
}

.breakdown-row {
  display: grid;
  grid-template-columns: 110px 1fr 90px;
  align-items: center;
  gap: 10px;
}

.breakdown-name {
  font-size: 12px;
  font-weight: 600;
  color: #516079;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breakdown-track {
  height: 8px;
  background: rgba(229, 234, 244, 0.8);
  border-radius: 999px;
  overflow: hidden;
}

.breakdown-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.6s ease;
}

.breakdown-meta {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  font-size: 12px;
}

.bd-pct   { font-weight: 700; color: #243042; }
.bd-count { color: #98a1b2; }

/* ── 2-col chart rows ── */
.chart-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

/* ── Representative reviews ── */
.rep-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.rep-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rep-header {
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px;
}

.rep-positive-header { color: #059669; }
.rep-negative-header { color: #dc2626; }

.rep-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 16px 18px;
  border: 1px solid rgba(229, 234, 244, 0.9);
  box-shadow: 0 4px 16px rgba(26, 38, 64, 0.05);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rep-card-pos { border-left: 3px solid #34d399; }
.rep-card-neg { border-left: 3px solid #f87171; }

.rep-stars { font-size: 14px; letter-spacing: 1px; }
.star-filled { color: #f59e0b; }
.star-empty  { color: #e5e7eb; }

.rep-text {
  font-size: 13px;
  color: #374151;
  line-height: 1.6;
}

.rep-summary {
  font-size: 12px;
  color: #6b7280;
  background: rgba(243, 244, 246, 0.7);
  border-radius: 8px;
  padding: 8px 10px;
  line-height: 1.5;
}

.rep-empty {
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(229, 234, 244, 1);
  border-radius: 16px;
  padding: 32px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: 160px;
  justify-content: center;
}

.rep-empty-pos { background: linear-gradient(135deg, rgba(236, 253, 245, 0.5), rgba(255, 255, 255, 0.6)); }
.rep-empty-neg { background: linear-gradient(135deg, rgba(254, 242, 242, 0.5), rgba(255, 255, 255, 0.6)); }

.rep-empty-icon {
  font-size: 32px;
  color: #cbd5e1;
  margin-bottom: 4px;
}

.rep-empty-pos .rep-empty-icon { color: #a7f3d0; }
.rep-empty-neg .rep-empty-icon { color: #86efac; }

.rep-empty-text {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.rep-empty-hint {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
}

/* ── Section header ── */
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 800;
  color: #1a2844;
  letter-spacing: -0.01em;
  padding: 8px 0 0;
  position: relative;
}

.section-header::before {
  content: "";
  width: 4px;
  height: 18px;
  background: linear-gradient(180deg, #6a82fb, #ffb15e);
  border-radius: 999px;
  flex-shrink: 0;
}

.section-header .anticon {
  font-size: 17px;
  color: #6366f1;
}

.section-header-sub {
  font-size: 15px;
  font-weight: 700;
  color: #4b5d7c;
  padding-top: 6px;
}

.section-header-sub::before {
  height: 14px;
  background: linear-gradient(180deg, #cbd5e1, #94a3b8);
}

.section-header-sub .anticon {
  font-size: 14px;
  color: #94a3b8;
}

.section-badge {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #7c3aed;
  background: rgba(139, 92, 246, 0.1);
  padding: 2px 8px;
  border-radius: 999px;
}

/* ── Insights grid ── */
.insights-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.insight-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(229, 234, 244, 0.9);
  border-radius: 20px;
  padding: 20px 22px;
  box-shadow: 0 8px 28px rgba(26, 38, 64, 0.06);
  position: relative;
  overflow: hidden;
}

.insight-card::before {
  content: "";
  position: absolute;
  top: 0; left: 0; bottom: 0;
  width: 4px;
}

.insight-persona::before     { background: linear-gradient(180deg, #6366f1, #818cf8); }
.insight-scenario::before    { background: linear-gradient(180deg, #f59e0b, #fbbf24); }
.insight-selling::before     { background: linear-gradient(180deg, #ec4899, #f472b6); }
.insight-advantage::before   { background: linear-gradient(180deg, #10b981, #34d399); }
.insight-improvement::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.insight-expectation::before { background: linear-gradient(180deg, #8b5cf6, #a78bfa); }

.insight-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a2844;
  margin-bottom: 14px;
}

.insight-persona     .insight-header .anticon { color: #6366f1; }
.insight-scenario    .insight-header .anticon { color: #f59e0b; }
.insight-selling     .insight-header .anticon { color: #ec4899; }
.insight-advantage   .insight-header .anticon { color: #10b981; }
.insight-improvement .insight-header .anticon { color: #ef4444; }
.insight-expectation .insight-header .anticon { color: #8b5cf6; }

.insight-body {
  font-size: 13px;
  color: #374151;
  line-height: 1.75;
}

/* Markdown styles */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  font-size: 14px;
  font-weight: 700;
  color: #1a2844;
  margin: 14px 0 8px;
  letter-spacing: -0.01em;
}
.markdown-body :deep(h3:first-child) { margin-top: 0; }
.markdown-body :deep(p) { margin: 6px 0; }
.markdown-body :deep(strong) { color: #1a2844; font-weight: 700; }
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 0;
  margin: 6px 0;
  list-style: none;
  counter-reset: insight-counter;
}
.markdown-body :deep(ul li) {
  position: relative;
  padding: 4px 0 4px 16px;
}
.markdown-body :deep(ul li::before) {
  content: "";
  position: absolute;
  left: 4px; top: 13px;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #94a3b8;
}
.markdown-body :deep(ol li) {
  counter-increment: insight-counter;
  position: relative;
  padding: 6px 0 6px 32px;
  min-height: 24px;
}
.markdown-body :deep(ol li::before) {
  content: counter(insight-counter);
  position: absolute;
  left: 0; top: 7px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  font-size: 11px;
  font-weight: 700;
  display: grid;
  place-items: center;
}
.insight-persona .markdown-body :deep(ol li::before),
.insight-persona .markdown-body :deep(ul li)::before { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
.insight-advantage .markdown-body :deep(ol li::before) { background: rgba(16, 185, 129, 0.15); color: #10b981; }
.insight-improvement .markdown-body :deep(ol li::before) { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.insight-expectation .markdown-body :deep(ol li::before) { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; }
.insight-selling .markdown-body :deep(ol li::before) { background: rgba(236, 72, 153, 0.15); color: #ec4899; }

@media (max-width: 1200px) {
  .kpi-row  { flex-wrap: wrap; }
  .kpi-card { flex: 1 1 calc(33% - 14px); }
}

@media (max-width: 960px) {
  .main-row   { grid-template-columns: 1fr; }
  .chart-row  { grid-template-columns: 1fr; }
  .rep-section { grid-template-columns: 1fr; }
  .insights-grid { grid-template-columns: 1fr; }
}
</style>
