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
        <div class="toolbar-title">分析报告</div>
        <div class="toolbar-subtitle">
          基于当前任务评论与 AI 分析结果生成的洞察报告。
        </div>
      </div>
      <a-space wrap>
        <a-button @click="load" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新报告
        </a-button>
        <a-button type="primary" @click="openShareModal">
          <template #icon><ShareAltOutlined /></template>
          分享报告
        </a-button>
        <a-button @click="openActionBoard">
          <template #icon><CheckSquareOutlined /></template>
          行动看板
        </a-button>
        <a-tag :color="dashboard?.runId ? 'green' : 'default'">
          {{ dashboard?.runId ? "已生成分析结果" : "等待首次分析" }}
        </a-tag>
      </a-space>
    </div>

    <a-modal
      :open="showShareModal"
      title="分享分析报告"
      width="720px"
      :footer="null"
      @cancel="showShareModal = false"
    >
      <div class="share-panel">
        <div class="share-panel-head">
          <div>
            <div class="panel-label">Public Link</div>
            <div class="settings-section-title">只读报告链接</div>
            <div class="settings-help">外部访问者无需登录，只能查看当前任务的报告汇总和图表。</div>
          </div>
          <a-button type="primary" :loading="shareCreating" @click="createShareLink">
            <template #icon><ShareAltOutlined /></template>
            生成链接
          </a-button>
        </div>

        <a-spin :spinning="shareLoading">
          <a-empty v-if="shares.length === 0" description="还没有分享链接" />
          <div v-else class="share-link-list">
            <article v-for="share in shares" :key="share.id" class="share-link-card" :class="{ disabled: !share.enabled || share.revokedAt }">
              <div class="share-link-main">
                <strong>{{ share.title || selectedTask?.productName || selectedTask?.name }}</strong>
                <a-input :value="share.shareUrl" readonly />
                <div class="muted">
                  浏览 {{ share.viewCount }} 次 · 创建于 {{ formatTime(share.createdAt) }}
                  <span v-if="share.revokedAt"> · 已撤销</span>
                </div>
              </div>
              <a-space wrap>
                <a-button size="small" :disabled="!share.enabled || Boolean(share.revokedAt)" @click="copyShareLink(share.shareUrl)">
                  <template #icon><CopyOutlined /></template>
                  复制
                </a-button>
                <a-button size="small" danger :disabled="!share.enabled || Boolean(share.revokedAt)" @click="revokeShareLink(share)">
                  撤销
                </a-button>
              </a-space>
            </article>
          </div>
        </a-spin>
      </div>
    </a-modal>

    <div class="overview-band">
      <div class="overview-copy">
        <div class="overview-kicker">当前项目</div>
        <h2>{{ selectedTask.productName }}</h2>
        <p>{{ selectedTask.name }} · {{ selectedTask.sourceChannel }} · {{ analysisTypeLabel(selectedTask.analysisType) }} · {{ selectedTask.status }}</p>
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

    <section v-if="dashboard?.qualityAlerts?.length" class="quality-alerts-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Quality Check</div>
          <div class="settings-section-title">分析质量提醒</div>
        </div>
      </div>
      <div class="quality-alert-list">
        <a-alert
          v-for="alert in dashboard.qualityAlerts"
          :key="alert.id"
          show-icon
          :type="qualityAlertType(alert.level)"
          :message="alert.title"
          :description="`${alert.detail} ${alert.recommendation}`"
        >
          <template #action>
            <a-button v-if="qualityAlertActionLabel(alert)" size="small" type="link" @click="openQualityAlertAction(alert)">
              {{ qualityAlertActionLabel(alert) }}
            </a-button>
          </template>
        </a-alert>
      </div>
    </section>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">评论总量</div>
        <div class="stat-value">{{ dashboard?.reviewCount || 0 }}</div>
        <div class="stat-note">已纳入本次洞察样本</div>
      </div>

      <div class="stat-card stat-card-accent">
        <div class="stat-label">{{ negativeMetricLabel }}</div>
        <div class="stat-value">{{ dashboard?.negativeCount || 0 }}</div>
        <div class="stat-note">{{ negativeMetricNote }}</div>
      </div>

      <div class="stat-card stat-card-success">
        <div class="stat-label">{{ scoreLabel }}</div>
        <div class="stat-value">{{ dashboard?.nps || 0 }}</div>
        <div class="stat-note">{{ scoreDescription }}</div>
      </div>

      <div class="stat-card stat-card-ink">
        <div class="stat-label">有效评论</div>
        <div class="stat-value">{{ dashboard?.contentProfile?.valuableCommentCount || 0 }}</div>
        <div class="stat-note">低价值评论 {{ dashboard?.contentProfile?.lowValueCommentRate || 0 }}% 已降权</div>
      </div>
    </div>

    <div class="chart-row chart-row-featured">
      <div class="chart-card">
        <div class="chart-header">
          <div>
            <div class="chart-title">{{ scoreChartTitle }}</div>
            <div class="chart-subtitle">{{ scoreChartSubtitle }}</div>
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
        <div class="insight-title">{{ voiceSummaryTitle }}</div>
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
              <span>{{ issueMetricLabel }}</span>
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

    <EChartCard
      v-if="showRatingCharts"
      title="各星级情感倾向"
      :option="ratingSentimentOption"
      clickable
      @chart-click="openRatingSentimentReviews"
    />

    <div class="chart-row">
      <EChartCard title="整体情感分布" :option="sentimentOption" clickable @chart-click="openSentimentReviews" />
      <EChartCard title="评论来源分布" :option="sourceOption" clickable @chart-click="openSourceReviews" />
    </div>

    <div class="chart-row">
      <EChartCard v-if="dashboard?.contentProfile?.categoryDistribution?.length" title="内容类别分布" :option="contentCategoryOption" />
      <EChartCard
        v-if="dashboard?.intentDistribution?.length"
        title="评论意图分布"
        :option="intentOption"
        clickable
        @chart-click="openIntentReviews"
      />
      <EChartCard title="用户声音词云" :option="wordCloudOption" clickable @chart-click="openKeywordReviews" />
      <EChartCard title="用户问题统计" :option="issueOption" clickable @chart-click="openIssueChartReviews" />
    </div>

    <section v-if="dashboard?.dynamicContentTags?.length" class="dynamic-tags-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Dynamic Topics</div>
          <div class="settings-section-title">动态内容标签</div>
        </div>
      </div>
      <div class="dynamic-tag-grid">
        <article v-for="tag in dashboard.dynamicContentTags.slice(0, 12)" :key="tag.label" class="dynamic-tag-card">
          <div class="dynamic-tag-head">
            <a-tag :color="dynamicTagColor(tag.kind)">{{ dynamicTagKindText(tag.kind) }}</a-tag>
            <span>{{ tag.count }} 条 · {{ tag.percent }}%</span>
          </div>
          <div class="dynamic-tag-title">{{ tag.label }}</div>
          <div class="dynamic-tag-meta">{{ sentimentText(tag.sentiment) }}为主 · {{ tag.sampleReviewIds.length }} 条证据</div>
          <a-button size="small" type="link" @click="openDynamicTagEvidence(tag)">查看证据</a-button>
        </article>
      </div>
    </section>

    <section v-if="dashboard?.duplicateProfile?.duplicateCommentCount" class="duplicate-noise-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Noise Control</div>
          <div class="settings-section-title">重复/相似评论聚合</div>
        </div>
      </div>
      <div class="duplicate-summary-strip">
        <div>
          <strong>{{ dashboard.duplicateProfile.duplicateRate }}%</strong>
          <span>重复评论占比</span>
        </div>
        <div>
          <strong>{{ dashboard.duplicateProfile.duplicateGroupCount }}</strong>
          <span>重复评论簇</span>
        </div>
        <div>
          <strong>{{ dashboard.duplicateProfile.largestGroupPercent }}%</strong>
          <span>最大重复簇占比</span>
        </div>
      </div>
      <div class="duplicate-group-grid">
        <article v-for="group in dashboard.duplicateProfile.topGroups" :key="group.sampleText" class="duplicate-group-card">
          <div class="duplicate-group-head">
            <a-tag :color="sentimentColor(group.sentiment)">{{ sentimentText(group.sentiment) }}</a-tag>
            <span>{{ group.count }} 条 · {{ group.percent }}%</span>
          </div>
          <p>{{ truncate(group.sampleText, 120) }}</p>
          <a-button size="small" type="link" @click="openEvidenceReviews(group.sampleReviewIds, '重复评论', 'duplicate')">查看证据</a-button>
        </article>
      </div>
    </section>

    <section v-if="dashboard?.insightClusters?.length" class="insight-clusters-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Opinion Clusters</div>
          <div class="settings-section-title">观点聚类与证据评论</div>
        </div>
      </div>
      <div class="insight-cluster-grid">
        <article v-for="cluster in dashboard.insightClusters" :key="cluster.id" class="insight-cluster-card">
          <div class="insight-cluster-head">
            <div>
              <div class="insight-cluster-title">{{ cluster.title }}</div>
              <div class="muted">{{ cluster.count }} 条评论 · {{ cluster.percent }}% · {{ sentimentText(cluster.sentiment) }}</div>
            </div>
            <a-button size="small" type="primary" ghost @click="openClusterEvidence(cluster.sampleReviewIds)">查看证据</a-button>
          </div>
          <p class="insight-cluster-summary">{{ cluster.summary }}</p>
          <a-space wrap>
            <a-tag v-for="intent in cluster.intentLabels" :key="intent" color="blue">{{ intent }}</a-tag>
            <a-tag v-for="topic in cluster.topicLabels.slice(0, 3)" :key="topic">{{ topic }}</a-tag>
          </a-space>
          <div class="cluster-evidence-list">
            <div v-for="review in cluster.evidenceReviews.slice(0, 2)" :key="review.reviewId" class="cluster-evidence-item">
              {{ truncate(review.commentTr || review.comment, 92) }}
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-if="dashboard?.issues?.length" class="evidence-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Evidence</div>
          <div class="settings-section-title">问题证据与行动项</div>
        </div>
      </div>
      <div class="evidence-grid">
        <article v-for="item in dashboard.issues.slice(0, 8)" :key="item.issueName" class="evidence-card">
          <div>
            <div class="evidence-title">{{ item.issueName }}</div>
            <div class="muted">{{ item.count }} 条相关评论 · {{ item.sampleReviewIds.length }} 条样本</div>
          </div>
          <a-space wrap>
            <a-button size="small" type="primary" ghost @click="openIssueEvidence(item.issueName)">
              查看证据
            </a-button>
            <a-button size="small" :loading="actionCreatingIssue === item.issueName" @click="createActionFromIssue(item)">
              生成行动项
            </a-button>
          </a-space>
        </article>
      </div>
    </section>
    <section v-if="dashboard?.productInsights" class="product-insights-panel">
      <div class="settings-section-head">
        <div>
          <div class="panel-label">Product Insights</div>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import type { EChartsOption } from "echarts";
import * as echarts from "echarts/lib/echarts";
import {
  CheckSquareOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  CopyOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  RobotOutlined,
  ShareAltOutlined
} from "@ant-design/icons-vue";
import EChartCard from "@/components/EChartCard.vue";
import { createActionItem, createTaskReportShare, fetchDashboard, fetchTaskReportShares, revokeTaskReportShare } from "@/api";
import { useTaskStore } from "@/composables";
import type { DashboardDTO, ReportShareDTO, Sentiment } from "@review-ai/shared";
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
const router = useRouter();
const { selectedTask, setSelectedTask } = useTaskStore();
const dashboard = ref<DashboardDTO | null>(null);
const shares = ref<ReportShareDTO[]>([]);
const loading = ref(false);
const shareLoading = ref(false);
const shareCreating = ref(false);
const showShareModal = ref(false);
const actionCreatingIssue = ref<string | null>(null);
const gaugeRef = ref<HTMLDivElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;
let gaugeChart: echarts.ECharts | null = null;

type ChartClickParams = {
  name?: string | number;
  seriesName?: string;
  data?: unknown;
};

type ChartDataPayload = {
  sentiment?: Sentiment;
  intent?: string;
  issueName?: string;
  ratingStar?: number;
  sourceChannel?: string;
};

type QualityAlert = DashboardDTO["qualityAlerts"][number];

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
const insightReportTitle = computed(() => {
  if (selectedTask.value?.analysisType === "video") {
    return "视频内容反馈报告";
  }
  if (selectedTask.value?.analysisType === "tweet") {
    return "推文舆情报告";
  }
  return "产品洞察报告";
});
const positivePercent = computed(() => {
  const positive = dashboard.value?.sentimentDistribution?.find((item) => item.sentiment === "positive");
  return positive?.percent || 0;
});
const isVideoTask = computed(() => selectedTask.value?.analysisType === "video");
const isTweetTask = computed(() => selectedTask.value?.analysisType === "tweet");
const scoreLabel = computed(() => dashboard.value?.scoreLabel || (isVideoTask.value ? "观众支持度" : isTweetTask.value ? "舆情支持度" : "NPS"));
const scoreDescription = computed(
  () =>
    dashboard.value?.scoreDescription ||
    (isVideoTask.value
      ? "正向观众占比与负向争议占比的净差"
      : isTweetTask.value
        ? "支持立场占比与反对/风险占比的净差"
        : "推荐者与批评者净差")
);
const scoreChartTitle = computed(() => (dashboard.value?.scoreKind === "nps" ? "满意度 NPS" : scoreLabel.value));
const scoreChartSubtitle = computed(() =>
  dashboard.value?.scoreKind === "nps" ? "按 1-5 星评价拆分推荐倾向" : "按情感与立场拆分支持、观望和争议"
);
const voiceSummaryTitle = computed(() => (isVideoTask.value ? "观众声音摘要" : isTweetTask.value ? "舆情声音摘要" : "客户声音摘要"));
const issueMetricLabel = computed(() => (isVideoTask.value ? "争议/澄清类型" : isTweetTask.value ? "风险/回应类型" : "高频问题类型"));
const negativeMetricLabel = computed(() => (isVideoTask.value ? "负向/争议观众" : isTweetTask.value ? "反对/风险评论" : "负向评论"));
const negativeMetricNote = computed(() =>
  isVideoTask.value ? "需要澄清或复盘的观众反馈" : isTweetTask.value ? "需要回应或降风险的讨论" : "需要运营跟进的低分反馈"
);
const showRatingCharts = computed(() => selectedTask.value?.analysisType === "product" && (dashboard.value?.ratingDistribution || []).some((item) => item.count > 0));
const productInsightSections = computed(() => {
  const insights = dashboard.value?.productInsights;
  if (!insights) {
    return [];
  }
  if (selectedTask.value?.analysisType === "video") {
    return [
      { key: "userPersonas", title: "观众画像", content: insights.userPersonas },
      { key: "usageScenarios", title: "观看场景", content: insights.usageScenarios },
      { key: "sellingPoints", title: "传播理由", content: insights.sellingPoints },
      { key: "advantages", title: "内容优势", content: insights.advantages },
      { key: "improvements", title: "待优化点", content: insights.improvements },
      { key: "expectations", title: "观众期待", content: insights.expectations }
    ].filter((item) => item.content);
  }
  if (selectedTask.value?.analysisType === "tweet") {
    return [
      { key: "userPersonas", title: "参与人群", content: insights.userPersonas },
      { key: "usageScenarios", title: "讨论场景", content: insights.usageScenarios },
      { key: "sellingPoints", title: "支持/扩散理由", content: insights.sellingPoints },
      { key: "advantages", title: "传播优势", content: insights.advantages },
      { key: "improvements", title: "风险与误解", content: insights.improvements },
      { key: "expectations", title: "回应期待", content: insights.expectations }
    ].filter((item) => item.content);
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

function sentimentColor(sentiment: Sentiment) {
  if (sentiment === "positive") {
    return "green";
  }
  if (sentiment === "negative") {
    return "red";
  }
  return "blue";
}

function qualityAlertType(level: DashboardDTO["qualityAlerts"][number]["level"]) {
  if (level === "critical") {
    return "error";
  }
  if (level === "warning") {
    return "warning";
  }
  return "info";
}

function dominantSentiment() {
  return [...(dashboard.value?.sentimentDistribution || [])].sort((a, b) => b.count - a.count)[0]?.sentiment;
}

function topIntentLabel() {
  return dashboard.value?.intentDistribution?.[0]?.label || "";
}

function topDynamicTag() {
  return dashboard.value?.dynamicContentTags?.[0];
}

function firstDuplicateGroup() {
  return dashboard.value?.duplicateProfile?.topGroups?.find((group) => group.sampleReviewIds.length);
}

function firstClusterReviewIds() {
  return dashboard.value?.insightClusters?.find((cluster) => cluster.sampleReviewIds.length)?.sampleReviewIds || [];
}

function topWordCloudKeyword() {
  return dashboard.value?.wordCloud?.[0]?.name || "";
}

function commerceNoiseKeyword() {
  const commerceWords = ["质量", "售后", "物流", "包装", "价格", "客服", "发货", "快递", "退换", "保修"];
  return dashboard.value?.wordCloud?.find((item) => commerceWords.some((word) => item.name.includes(word)))?.name || commerceWords[0];
}

function qualityAlertActionLabel(alert: QualityAlert) {
  if (alert.id === "duplicate-comment-rate") {
    return firstDuplicateGroup() ? "查看重复证据" : "";
  }
  if (["neutral-signal-negative-anomaly", "negative-rate-anomaly"].includes(alert.id)) {
    return "查看负向评论";
  }
  if (alert.id === "positive-signal-missing") {
    return "查看中性评论";
  }
  if (alert.id === "sentiment-concentration") {
    const sentiment = dominantSentiment();
    return sentiment ? `查看${sentimentText(sentiment)}评论` : "";
  }
  if (alert.id === "intent-concentration") {
    return topIntentLabel() ? "查看主要意图" : "";
  }
  if (["topic-concentration", "dynamic-tag-diversity-low", "dynamic-tag-concentration", "category-diversity-low"].includes(alert.id)) {
    return topDynamicTag() ? "查看动态标签" : "";
  }
  if (alert.id === "keyword-diversity-low") {
    return topWordCloudKeyword() ? "查看高频词评论" : "";
  }
  if (alert.id === "low-value-comment-rate") {
    return firstClusterReviewIds().length ? "查看有效聚类" : "";
  }
  if (alert.id === "commerce-noise") {
    return "搜索电商词";
  }
  return "";
}

function openQualityAlertAction(alert: QualityAlert) {
  if (["neutral-signal-negative-anomaly", "negative-rate-anomaly"].includes(alert.id)) {
    openFilteredReviews({ sentiment: "negative" }, "负向", "sentiment");
    return;
  }
  if (alert.id === "positive-signal-missing") {
    openFilteredReviews({ sentiment: "neutral" }, "中性", "sentiment");
    return;
  }
  if (alert.id === "sentiment-concentration") {
    const sentiment = dominantSentiment();
    if (sentiment) {
      openFilteredReviews({ sentiment }, sentimentText(sentiment), "sentiment");
    }
    return;
  }
  if (alert.id === "intent-concentration") {
    const intent = topIntentLabel();
    if (intent) {
      openFilteredReviews({ intent }, intent, "intent");
    }
    return;
  }
  if (alert.id === "duplicate-comment-rate") {
    const duplicateGroup = firstDuplicateGroup();
    if (duplicateGroup) {
      openEvidenceReviews(duplicateGroup.sampleReviewIds, "重复评论", "duplicate");
    }
    return;
  }
  if (["topic-concentration", "dynamic-tag-diversity-low", "dynamic-tag-concentration", "category-diversity-low"].includes(alert.id)) {
    const tag = topDynamicTag();
    if (tag) {
      openDynamicTagEvidence(tag);
    }
    return;
  }
  if (alert.id === "keyword-diversity-low") {
    const keyword = topWordCloudKeyword();
    if (keyword) {
      openFilteredReviews({ keyword }, keyword, "keyword");
    }
    return;
  }
  if (alert.id === "low-value-comment-rate") {
    openClusterEvidence(firstClusterReviewIds());
    return;
  }
  if (alert.id === "commerce-noise") {
    const keyword = commerceNoiseKeyword();
    openFilteredReviews({ keyword }, keyword, "keyword");
  }
}

function dynamicTagKindText(kind: DashboardDTO["dynamicContentTags"][number]["kind"]) {
  const labels: Record<DashboardDTO["dynamicContentTags"][number]["kind"], string> = {
    topic: "话题",
    entity: "实体",
    stance: "立场",
    question: "提问",
    meme: "玩梗",
    risk: "风险"
  };
  return labels[kind] || "话题";
}

function dynamicTagColor(kind: DashboardDTO["dynamicContentTags"][number]["kind"]) {
  const colors: Record<DashboardDTO["dynamicContentTags"][number]["kind"], string> = {
    topic: "blue",
    entity: "purple",
    stance: "green",
    question: "cyan",
    meme: "gold",
    risk: "red"
  };
  return colors[kind] || "blue";
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function analysisTypeLabel(type?: string | null) {
  if (type === "video") {
    return "视频评论";
  }
  if (type === "tweet") {
    return "推文评论";
  }
  return "商品评论";
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
          data: [{ value: npsValue, name: scoreLabel.value }]
        }
      ]
    },
    true
  );
}

async function load() {
  if (!selectedTask.value) {
    dashboard.value = null;
    shares.value = [];
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

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

async function loadShares() {
  if (!selectedTask.value) {
    shares.value = [];
    return;
  }
  shareLoading.value = true;
  try {
    shares.value = await fetchTaskReportShares(selectedTask.value.id);
  } finally {
    shareLoading.value = false;
  }
}

async function openShareModal() {
  if (!selectedTask.value) {
    message.warning("请先选择分析任务。");
    return;
  }
  showShareModal.value = true;
  await loadShares();
}

async function createShareLink() {
  if (!selectedTask.value) {
    return;
  }
  shareCreating.value = true;
  try {
    const share = await createTaskReportShare(selectedTask.value.id, {
      title: selectedTask.value.productName || selectedTask.value.name
    });
    await loadShares();
    await copyShareLink(share.shareUrl);
    message.success("分享链接已生成并复制。");
  } finally {
    shareCreating.value = false;
  }
}

async function copyShareLink(shareUrl: string) {
  await navigator.clipboard.writeText(shareUrl);
  message.success("分享链接已复制。");
}

async function revokeShareLink(share: ReportShareDTO) {
  if (!selectedTask.value) {
    return;
  }
  const confirmed = window.confirm("确定撤销这个分享链接吗？撤销后外部访问者将无法继续查看。");
  if (!confirmed) {
    return;
  }
  await revokeTaskReportShare(selectedTask.value.id, share.id);
  message.success("分享链接已撤销。");
  await loadShares();
}

function openActionBoard() {
  if (!selectedTask.value) {
    return;
  }
  router.push(`/tasks/${selectedTask.value.id}/actions`);
}

async function createActionFromIssue(issue: DashboardDTO["issues"][number]) {
  if (!selectedTask.value) {
    return;
  }
  actionCreatingIssue.value = issue.issueName;
  try {
    const dueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createActionItem(selectedTask.value.id, {
      title: `跟进问题：${issue.issueName}`,
      description: `报告中发现 ${issue.count} 条相关评论。建议定位样本证据、确认影响范围，并安排负责人跟进解决。`,
      priority: issue.count >= 10 ? "high" : "medium",
      status: "open",
      source: "report_issue",
      runId: dashboard.value?.runId || null,
      relatedReviewIds: issue.sampleReviewIds,
      dueAt
    });
    message.success("行动项已创建。");
    router.push(`/tasks/${selectedTask.value.id}/actions`);
  } finally {
    actionCreatingIssue.value = null;
  }
}

function openIssueEvidence(issueName: string) {
  if (!selectedTask.value) {
    return;
  }
  router.push({
    path: `/tasks/${selectedTask.value.id}/reviews`,
    query: {
      issue: issueName,
      evidenceLabel: issueName,
      evidenceType: "issue",
      ...(dashboard.value?.runId ? { runId: dashboard.value.runId } : {})
    }
  });
}

function openEvidenceReviews(reviewIds: string[], label: string, type: string) {
  if (!selectedTask.value || !reviewIds.length) {
    return;
  }
  router.push({
    path: `/tasks/${selectedTask.value.id}/reviews`,
    query: {
      reviewIds: reviewIds.join(","),
      evidenceLabel: label,
      evidenceType: type,
      ...(dashboard.value?.runId ? { runId: dashboard.value.runId } : {})
    }
  });
}

function openClusterEvidence(reviewIds: string[]) {
  openEvidenceReviews(reviewIds, "观点聚类", "cluster");
}

function openDynamicTagEvidence(tag: DashboardDTO["dynamicContentTags"][number]) {
  openEvidenceReviews(tag.sampleReviewIds, tag.label, "dynamic-tag");
}

function isSentiment(value: unknown): value is Sentiment {
  return value === "positive" || value === "neutral" || value === "negative";
}

function getChartParams(params: unknown): ChartClickParams {
  return params && typeof params === "object" ? (params as ChartClickParams) : {};
}

function getChartData(params: unknown): ChartDataPayload {
  const data = getChartParams(params).data;
  return data && typeof data === "object" ? (data as ChartDataPayload) : {};
}

function getChartName(params: unknown) {
  const name = getChartParams(params).name;
  if (typeof name === "string") {
    return name;
  }
  if (typeof name === "number") {
    return String(name);
  }
  return "";
}

function openFilteredReviews(query: Record<string, string>, label: string, type: string) {
  if (!selectedTask.value) {
    return;
  }
  router.push({
    path: `/tasks/${selectedTask.value.id}/reviews`,
    query: {
      ...query,
      evidenceLabel: label,
      evidenceType: type,
      ...(dashboard.value?.runId ? { runId: dashboard.value.runId } : {})
    }
  });
}

function openSentimentReviews(params: unknown) {
  const sentiment = getChartData(params).sentiment;
  if (!isSentiment(sentiment)) {
    return;
  }
  openFilteredReviews({ sentiment }, sentimentText(sentiment), "sentiment");
}

function openRatingSentimentReviews(params: unknown) {
  const data = getChartData(params);
  if (!data.ratingStar || !isSentiment(data.sentiment)) {
    return;
  }
  openFilteredReviews(
    { ratingStar: String(data.ratingStar), sentiment: data.sentiment },
    `${data.ratingStar} 星${sentimentText(data.sentiment)}`,
    "rating-sentiment"
  );
}

function openIntentReviews(params: unknown) {
  const intent = getChartData(params).intent || getChartName(params);
  if (!intent) {
    return;
  }
  openFilteredReviews({ intent }, intent, "intent");
}

function openSourceReviews(params: unknown) {
  const sourceChannel = getChartData(params).sourceChannel || getChartName(params);
  if (!sourceChannel) {
    return;
  }
  openFilteredReviews({ sourceChannel }, sourceChannel, "source");
}

function openKeywordReviews(params: unknown) {
  const keyword = getChartName(params);
  if (!keyword) {
    return;
  }
  openFilteredReviews({ keyword }, keyword, "keyword");
}

function openIssueChartReviews(params: unknown) {
  const issueName = getChartData(params).issueName || getChartName(params);
  if (!issueName) {
    return;
  }
  openIssueEvidence(issueName);
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
      data: (dashboard.value?.ratingSentiment || []).map((item) => ({
        value: item.positive,
        ratingStar: item.ratingStar,
        sentiment: "positive"
      }))
    },
    {
      name: "中性",
      type: "bar",
      stack: "sentiment",
      barWidth: 38,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.neutral[0], CHART_COLORS.neutral[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => ({
        value: item.neutral,
        ratingStar: item.ratingStar,
        sentiment: "neutral"
      }))
    },
    {
      name: "负向",
      type: "bar",
      stack: "sentiment",
      barWidth: 38,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.negative[0], CHART_COLORS.negative[1]) },
      data: (dashboard.value?.ratingSentiment || []).map((item) => ({
        value: item.negative,
        ratingStar: item.ratingStar,
        sentiment: "negative"
      }))
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
        value: item.count,
        sentiment: item.sentiment
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
      data: (dashboard.value?.sourceDistribution || []).map((item) => ({
        value: item.count,
        sourceChannel: item.source
      }))
    }
  ]
}));

const contentCategoryOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip("item") as EChartsOption["tooltip"],
  legend: getLegend({ bottom: 6 }) as EChartsOption["legend"],
  color: [CHART_COLORS.primary[0], CHART_COLORS.cyan[0], CHART_COLORS.positive[0], CHART_COLORS.accent[0], CHART_COLORS.negative[0]],
  series: [
    {
      ...(getPieItem(["42%", "72%"]) as Record<string, unknown>),
      data: (dashboard.value?.contentProfile?.categoryDistribution || []).map((item) => ({
        name: item.label,
        value: item.count
      }))
    }
  ]
}));

const intentOption = computed<EChartsOption>(() => ({
  tooltip: getTooltip() as EChartsOption["tooltip"],
  xAxis: getXAxis({
    data: (dashboard.value?.intentDistribution || []).map((item) => item.label),
    axisLabel: { interval: 0, rotate: 20, color: "#6b7280", fontSize: 12 }
  }) as EChartsOption["xAxis"],
  yAxis: getYAxis() as EChartsOption["yAxis"],
  grid: getGrid({ bottom: 76 }) as EChartsOption["grid"],
  series: [
    {
      type: "bar",
      barWidth: 34,
      itemStyle: { borderRadius: [6, 6, 0, 0], color: getBarGradient(CHART_COLORS.primary[0], CHART_COLORS.positive[0]) },
      data: (dashboard.value?.intentDistribution || []).map((item) => ({
        value: item.count,
        intent: item.label
      }))
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
      data: (dashboard.value?.issues || []).map((item) => ({
        value: item.count,
        issueName: item.issueName
      }))
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

watch(
  () => route.params.taskId,
  (taskId) => {
    if (typeof taskId === "string" && taskId !== selectedTask.value?.id) {
      setSelectedTask(taskId);
    }
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

<style scoped>
.share-panel {
  display: grid;
  gap: 16px;
}

.share-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.share-link-list {
  display: grid;
  gap: 12px;
}

.share-link-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid rgba(116, 139, 174, 0.2);
  border-radius: 10px;
  background: rgba(248, 250, 252, 0.9);
}

.share-link-card.disabled {
  opacity: 0.62;
}

.share-link-main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.share-link-main strong {
  color: #0f172a;
}

@media (max-width: 960px) {
  .share-panel-head,
  .share-link-card {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
