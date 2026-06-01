<template>
  <div class="shared-report-page">
    <a-result
      v-if="error"
      status="404"
      title="报告不可访问"
      :sub-title="error"
    />

    <a-spin v-else-if="loading" tip="正在加载报告">
      <div class="shared-report-loading" />
    </a-spin>

    <main v-else-if="report" class="shared-report">
      <section class="shared-hero">
        <div>
          <div class="shared-kicker">ReviewIQ Shared Report</div>
          <h1>{{ report.share.title || report.task.productName || report.task.name }}</h1>
          <p>{{ report.task.name }} · {{ report.task.sourceChannel }} · {{ analysisTypeLabel(report.task.analysisType) }}</p>
        </div>
        <div class="shared-meta">
          <span>评论 {{ report.dashboard.reviewCount }}</span>
          <span>NPS {{ report.dashboard.nps }}</span>
          <span>浏览 {{ report.share.viewCount }}</span>
        </div>
      </section>

      <section v-if="report.dashboard.aiSummary" class="shared-summary">
        <div class="panel-label">AI Summary</div>
        <div>{{ report.dashboard.aiSummary }}</div>
      </section>

      <div class="shared-stat-grid">
        <article class="stat-card stat-card-primary">
          <div class="stat-label">评论总量</div>
          <div class="stat-value">{{ report.dashboard.reviewCount }}</div>
          <div class="stat-note">进入本次报告的样本量</div>
        </article>
        <article class="stat-card stat-card-success">
          <div class="stat-label">正向占比</div>
          <div class="stat-value">{{ positivePercent }}%</div>
          <div class="stat-note">用户认可和可放大的反馈</div>
        </article>
        <article class="stat-card stat-card-accent">
          <div class="stat-label">负向评论</div>
          <div class="stat-value">{{ report.dashboard.negativeCount }}</div>
          <div class="stat-note">需要优先跟进的问题信号</div>
        </article>
      </div>

      <div class="chart-row">
        <EChartCard title="整体情感分布" :option="sentimentOption" />
        <EChartCard title="评论来源分布" :option="sourceOption" />
      </div>

      <div class="chart-row">
        <EChartCard title="高频问题统计" :option="issueOption" />
        <EChartCard title="用户声音词云" :option="wordCloudOption" />
      </div>

      <section v-if="report.dashboard.productInsights" class="shared-insights">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">Strategic Insights</div>
            <div class="settings-section-title">{{ insightReportTitle }}</div>
          </div>
        </div>
        <div class="product-insights-grid">
          <article v-for="item in productInsightSections" :key="item.key" class="product-insight-card">
            <div class="product-insight-title">{{ item.title }}</div>
            <div class="product-insight-body">{{ item.content }}</div>
          </article>
        </div>
      </section>

      <section v-if="report.dashboard.issues.length" class="shared-evidence">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">Evidence</div>
            <div class="settings-section-title">主要问题证据</div>
          </div>
        </div>
        <div class="evidence-grid">
          <article v-for="item in report.dashboard.issues.slice(0, 8)" :key="item.issueName" class="evidence-card">
            <div>
              <div class="evidence-title">{{ item.issueName }}</div>
              <div class="muted">{{ item.count }} 条相关评论 · {{ item.sampleReviewIds.length }} 条样本</div>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import type { EChartsOption } from "echarts";
import EChartCard from "@/components/EChartCard.vue";
import { fetchSharedReport } from "@/api";
import type { Sentiment, SharedReportDTO } from "@review-ai/shared";
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

const route = useRoute();
const report = ref<SharedReportDTO | null>(null);
const loading = ref(true);
const error = ref("");

const sentimentColors = getSentimentColors();

const positivePercent = computed(() => {
  const positive = report.value?.dashboard.sentimentDistribution.find((item) => item.sentiment === "positive");
  return positive?.percent || 0;
});

const insightReportTitle = computed(() => {
  const type = report.value?.task.analysisType;
  if (type === "video") {
    return "视频内容反馈报告";
  }
  if (type === "tweet") {
    return "社媒舆情报告";
  }
  return "产品洞察报告";
});

const productInsightSections = computed(() => {
  const insights = report.value?.dashboard.productInsights;
  const type = report.value?.task.analysisType;
  if (!insights) {
    return [];
  }
  if (type === "video") {
    return [
      { key: "userPersonas", title: "观众画像", content: insights.userPersonas },
      { key: "usageScenarios", title: "观看场景", content: insights.usageScenarios },
      { key: "sellingPoints", title: "传播理由", content: insights.sellingPoints },
      { key: "advantages", title: "内容优势", content: insights.advantages },
      { key: "improvements", title: "待优化点", content: insights.improvements },
      { key: "expectations", title: "观众期待", content: insights.expectations }
    ].filter((item) => item.content);
  }
  return [
    { key: "userPersonas", title: "用户画像", content: insights.userPersonas },
    { key: "usageScenarios", title: "使用场景", content: insights.usageScenarios },
    { key: "sellingPoints", title: "核心理由", content: insights.sellingPoints },
    { key: "advantages", title: "优势信号", content: insights.advantages },
    { key: "improvements", title: "改进机会", content: insights.improvements },
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

function analysisTypeLabel(type?: string | null) {
  if (type === "video") {
    return "视频评论";
  }
  if (type === "tweet") {
    return "社媒评论";
  }
  return "商品评论";
}

const sentimentOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip("item") as EChartsOption["tooltip"],
  legend: getLegend({ bottom: 6 }) as EChartsOption["legend"],
  color: [sentimentColors.positive, sentimentColors.neutral, sentimentColors.negative],
  series: [
    {
      ...(getPieItem(["46%", "74%"]) as Record<string, unknown>),
      data: (report.value?.dashboard.sentimentDistribution || []).map((item) => ({
        name: sentimentText(item.sentiment),
        value: item.count
      }))
    }
  ]
}));

const sourceOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  xAxis: getXAxis({
    data: (report.value?.dashboard.sourceDistribution || []).map((item) => item.source)
  }) as EChartsOption["xAxis"],
  yAxis: getYAxis() as EChartsOption["yAxis"],
  grid: getGrid() as EChartsOption["grid"],
  series: [
    {
      type: "bar",
      barWidth: 42,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.primary[0], CHART_COLORS.cyan[0]) },
      data: (report.value?.dashboard.sourceDistribution || []).map((item) => item.count)
    }
  ]
}));

const issueOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  xAxis: getXAxis({
    data: (report.value?.dashboard.issues || []).map((item) => item.issueName),
    axisLabel: { interval: 0, rotate: 18, color: "#6b7280", fontSize: 12 }
  }) as EChartsOption["xAxis"],
  yAxis: getYAxis() as EChartsOption["yAxis"],
  grid: getGrid({ bottom: 70 }) as EChartsOption["grid"],
  series: [
    {
      type: "bar",
      barWidth: 36,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.accent[0]) },
      data: (report.value?.dashboard.issues || []).map((item) => item.count)
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
      sizeRange: [16, 68],
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
      data: report.value?.dashboard.wordCloud || []
    }
  ]
}));

async function load() {
  loading.value = true;
  error.value = "";
  try {
    report.value = await fetchSharedReport(String(route.params.token || ""));
  } catch (requestError: unknown) {
    const maybeError = requestError as { response?: { data?: { message?: string } } };
    error.value = maybeError.response?.data?.message || "分享链接不存在、已撤销或已过期。";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.shared-report-page {
  min-height: 100vh;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(8, 14, 26, 0.96), rgba(18, 30, 48, 0.94) 34%, rgba(241, 247, 253, 0.98) 34.1%),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.06) 0 1px, transparent 1px 86px);
}

.shared-report {
  width: min(1320px, 100%);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.shared-report-loading {
  min-height: 420px;
}

.shared-hero {
  min-height: 220px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: end;
  padding: 34px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  color: #ffffff;
  background:
    linear-gradient(135deg, rgba(13, 21, 36, 0.96), rgba(17, 31, 52, 0.86)),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 74px);
  box-shadow: 0 24px 70px rgba(7, 11, 19, 0.25);
}

.shared-kicker {
  color: #8cefff;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.shared-hero h1 {
  margin: 10px 0;
  font-size: 38px;
  line-height: 1.14;
}

.shared-hero p {
  margin: 0;
  color: rgba(235, 244, 255, 0.72);
}

.shared-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.shared-meta span {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  padding: 0 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  color: #dff9ff;
  background: rgba(255, 255, 255, 0.08);
  font-weight: 800;
}

.shared-summary,
.shared-insights,
.shared-evidence {
  padding: 22px;
  border: 1px solid rgba(116, 139, 174, 0.22);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--shadow-md);
  backdrop-filter: blur(18px);
}

.shared-summary {
  color: #111827;
  font-size: 15px;
  line-height: 1.8;
}

.shared-stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

@media (max-width: 960px) {
  .shared-report-page {
    padding: 16px;
  }

  .shared-hero,
  .shared-stat-grid {
    grid-template-columns: 1fr;
  }

  .shared-hero h1 {
    font-size: 28px;
  }

  .shared-meta {
    justify-content: flex-start;
  }
}
</style>
