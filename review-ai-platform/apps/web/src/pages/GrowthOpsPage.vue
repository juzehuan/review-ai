<template>
  <div class="growth-page">
    <div class="growth-hero">
      <div>
        <div class="growth-kicker">Growth Command Center</div>
        <h1>增长运营工作台</h1>
        <p>每天看变化、看异常、看竞品差距，把 AI 分析沉淀成可交付的经营动作。</p>
      </div>
      <a-space wrap>
        <a-select v-model:value="activeTaskId" class="task-picker" placeholder="选择任务" @change="loadBrief">
          <a-select-option v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.productName || task.name }}
          </a-select-option>
        </a-select>
        <a-button :loading="loadingBrief" @click="loadBrief">
          <template #icon><ReloadOutlined /></template>
          刷新简报
        </a-button>
      </a-space>
    </div>

    <a-empty v-if="!tasks.length && !loadingTasks" description="还没有分析任务，请先导入或抓取评论。" />

    <template v-else>
      <section class="brief-grid">
        <div class="brief-card brief-card-main">
          <div class="section-head">
            <div>
              <span>每日变化简报</span>
              <strong>{{ brief?.productName || selectedTask?.productName || "未选择任务" }}</strong>
            </div>
            <a-tag :color="briefRiskColor">{{ briefRiskText }}</a-tag>
          </div>
          <p class="brief-summary">{{ brief?.summary || "选择一个已完成分析的任务后生成今日简报。" }}</p>
          <div class="metric-row">
            <div>
              <span>今日新增</span>
              <strong>{{ brief?.metrics.reviewsToday ?? "-" }}</strong>
            </div>
            <div>
              <span>负面占比</span>
              <strong>{{ brief?.metrics.negativePercent ?? "-" }}%</strong>
            </div>
            <div>
              <span>NPS</span>
              <strong>{{ brief?.metrics.nps ?? "-" }}</strong>
            </div>
            <div>
              <span>平均星级</span>
              <strong>{{ brief?.metrics.avgRating ?? "-" }}</strong>
            </div>
          </div>
        </div>

        <div class="brief-card">
          <div class="section-head">
            <div>
              <span>异常预警</span>
              <strong>{{ brief?.alerts.length || 0 }} 条</strong>
            </div>
          </div>
          <a-list :data-source="brief?.alerts || []" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <div class="alert-line">
                  <a-tag :color="alertColor(item.level)">{{ alertLabel(item.level) }}</a-tag>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </div>
      </section>

      <a-tabs v-model:activeKey="activeTab" class="growth-tabs">
        <a-tab-pane key="compare" tab="竞品/任务对比">
          <div class="growth-panel">
            <div class="panel-title-row">
              <div>
                <h2>多任务趋势对比</h2>
                <p>选择 2-8 个任务，对比 NPS、负面率、评分和主要风险。</p>
              </div>
              <a-button type="primary" :loading="loadingCompare" @click="runCompare">开始对比</a-button>
            </div>
            <a-checkbox-group v-model:value="compareTaskIds" class="compare-picker">
              <a-checkbox v-for="task in tasks" :key="task.id" :value="task.id">
                {{ task.productName || task.name }}
              </a-checkbox>
            </a-checkbox-group>
            <div v-if="compareResult" class="compare-result">
              <div class="winner-card">
                <span>当前领先</span>
                <strong>{{ compareResult.winner?.label || "暂无胜出任务" }}</strong>
                <p>{{ compareResult.winner?.reason || "需要至少两个已完成分析的任务。" }}</p>
              </div>
              <a-table
                row-key="taskId"
                :columns="compareColumns"
                :data-source="compareResult.items"
                :pagination="false"
                :scroll="{ x: 900 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'name'">
                    <strong>{{ record.productName || record.taskName }}</strong>
                    <div class="muted">{{ record.sourceChannel }}</div>
                  </template>
                  <template v-else-if="column.key === 'risk'">
                    <a-tag :color="record.negativePercent >= 30 ? 'error' : 'success'">
                      {{ record.negativePercent >= 30 ? "需关注" : "健康" }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="quality" tab="AI 纠错与提示词评测">
          <div class="quality-grid">
            <div class="growth-panel">
              <div class="panel-title-row">
                <div>
                  <h2>提示词评测</h2>
                  <p>从结构化输出、证据约束、分类口径和模型配置检查稳定性。</p>
                </div>
                <a-button type="primary" :loading="loadingPromptEval" @click="runPromptEval">立即评测</a-button>
              </div>
              <div v-if="promptEval" class="prompt-score">
                <a-progress type="circle" :percent="promptEval.score" :size="104" />
                <div>
                  <strong>{{ promptEval.modelName || "未配置模型" }}</strong>
                  <span>{{ promptEval.provider }} / {{ promptEval.promptVersion || "默认版本" }}</span>
                </div>
              </div>
              <a-list :data-source="promptEval?.checks || []" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-tag :color="item.passed ? 'success' : 'warning'">{{ item.passed ? "通过" : "待补强" }}</a-tag>
                    <div>
                      <strong>{{ item.label }}</strong>
                      <p class="muted">{{ item.detail }}</p>
                    </div>
                  </a-list-item>
                </template>
              </a-list>
            </div>

            <div class="growth-panel">
              <div class="panel-title-row">
                <div>
                  <h2>AI 结果纠错</h2>
                  <p>抽取当前任务的评论样本，修正情绪、摘要、痛点和建议。</p>
                </div>
                <a-button :loading="loadingReviews" @click="loadReviewSample">加载样本</a-button>
              </div>
              <a-select v-model:value="correction.reviewId" class="full-input" placeholder="选择评论样本">
                <a-select-option v-for="review in reviewSamples" :key="review.id" :value="review.id">
                  {{ review.summary || review.comment.slice(0, 48) }}
                </a-select-option>
              </a-select>
              <div class="correction-form">
                <a-select v-model:value="correction.sentiment" placeholder="修正情绪">
                  <a-select-option value="positive">正向</a-select-option>
                  <a-select-option value="neutral">中性</a-select-option>
                  <a-select-option value="negative">负向</a-select-option>
                </a-select>
                <a-input v-model:value="correction.topicLabelsText" placeholder="标签，逗号分隔" />
                <a-textarea v-model:value="correction.summary" :rows="3" placeholder="修正摘要" />
                <a-textarea v-model:value="correction.note" :rows="2" placeholder="纠错备注" />
                <a-button type="primary" :disabled="!correction.reviewId" :loading="submittingCorrection" @click="submitCorrection">
                  保存纠错
                </a-button>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <a-tab-pane key="delivery" tab="报告交付增强">
          <div class="growth-panel delivery-panel">
            <div class="panel-title-row">
              <div>
                <h2>客户/老板可读报告</h2>
                <p>一键生成公开报告链接，并支持打开后浏览器打印为 PDF。</p>
              </div>
              <a-space wrap>
                <a-button :disabled="!activeTaskId" @click="openReport">打开报告</a-button>
                <a-button type="primary" :disabled="!activeTaskId" :loading="creatingShare" @click="createShare">
                  生成交付链接
                </a-button>
              </a-space>
            </div>
            <div v-if="shareUrl" class="share-box">
              <a-input :value="shareUrl" readonly />
              <a-button @click="copyShareUrl">复制链接</a-button>
              <a-button @click="openShareUrl">打开交付页</a-button>
            </div>
            <div class="delivery-checks">
              <div><CheckCircleOutlined /> 公开链接可撤销</div>
              <div><CheckCircleOutlined /> 报告页面支持打印/PDF</div>
              <div><CheckCircleOutlined /> 指标、趋势、痛点和行动项完整展示</div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { CheckCircleOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import type { DailyBriefDTO, PromptEvalDTO, ReviewRowDTO, Sentiment, TaskCompareDTO } from "@review-ai/shared";
import {
  compareTasks,
  createReviewCorrection,
  createTaskReportShare,
  evaluatePrompts,
  fetchDailyBrief,
  fetchReviews
} from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const { tasks, selectedTask, selectedTaskId, loadingTasks, refreshTasks, setSelectedTask } = useTaskStore();
const activeTaskId = ref(selectedTaskId.value);
const activeTab = ref("compare");
const brief = ref<DailyBriefDTO | null>(null);
const compareResult = ref<TaskCompareDTO | null>(null);
const promptEval = ref<PromptEvalDTO | null>(null);
const reviewSamples = ref<ReviewRowDTO[]>([]);
const shareUrl = ref("");
const compareTaskIds = ref<string[]>([]);
const loadingBrief = ref(false);
const loadingCompare = ref(false);
const loadingPromptEval = ref(false);
const loadingReviews = ref(false);
const submittingCorrection = ref(false);
const creatingShare = ref(false);
const correction = reactive({
  reviewId: "",
  sentiment: undefined as Sentiment | undefined,
  topicLabelsText: "",
  summary: "",
  note: ""
});

const compareColumns = [
  { title: "任务", key: "name", width: 240 },
  { title: "评论数", dataIndex: "reviewCount", key: "reviewCount", width: 110 },
  { title: "负面占比", dataIndex: "negativePercent", key: "negativePercent", width: 120 },
  { title: "NPS", dataIndex: "nps", key: "nps", width: 100 },
  { title: "评分", dataIndex: "avgRating", key: "avgRating", width: 100 },
  { title: "首要问题", dataIndex: "topIssue", key: "topIssue", width: 220 },
  { title: "风险", key: "risk", width: 110 }
];

const briefRiskText = computed(() => {
  const level = brief.value?.alerts[0]?.level;
  if (level === "critical") {
    return "高风险";
  }
  if (level === "warning") {
    return "需关注";
  }
  return "稳定";
});

const briefRiskColor = computed(() => {
  const level = brief.value?.alerts[0]?.level;
  if (level === "critical") {
    return "error";
  }
  if (level === "warning") {
    return "warning";
  }
  return "success";
});

watch(activeTaskId, (taskId) => {
  if (taskId) {
    setSelectedTask(taskId);
  }
});

watch(selectedTaskId, (taskId) => {
  activeTaskId.value = taskId;
});

function alertColor(level: string) {
  if (level === "critical") {
    return "error";
  }
  if (level === "warning") {
    return "warning";
  }
  return "processing";
}

function alertLabel(level: string) {
  if (level === "critical") {
    return "紧急";
  }
  if (level === "warning") {
    return "预警";
  }
  return "提示";
}

async function loadBrief() {
  if (!activeTaskId.value) {
    return;
  }
  loadingBrief.value = true;
  try {
    brief.value = await fetchDailyBrief(activeTaskId.value);
  } catch (error) {
    message.warning("简报需要至少完成一次 AI 分析。");
  } finally {
    loadingBrief.value = false;
  }
}

async function runCompare() {
  if (compareTaskIds.value.length < 2) {
    message.warning("请选择至少 2 个任务。");
    return;
  }
  loadingCompare.value = true;
  try {
    compareResult.value = await compareTasks(compareTaskIds.value);
  } finally {
    loadingCompare.value = false;
  }
}

async function runPromptEval() {
  loadingPromptEval.value = true;
  try {
    promptEval.value = await evaluatePrompts();
  } finally {
    loadingPromptEval.value = false;
  }
}

async function loadReviewSample() {
  if (!activeTaskId.value) {
    return;
  }
  loadingReviews.value = true;
  try {
    const result = await fetchReviews(activeTaskId.value, {
      page: 1,
      pageSize: 8,
      needsAttention: true,
      sortBy: "commentTime",
      sortOrder: "desc"
    });
    reviewSamples.value = result.items;
    correction.reviewId = result.items[0]?.id || "";
  } finally {
    loadingReviews.value = false;
  }
}

function splitText(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function submitCorrection() {
  if (!activeTaskId.value || !correction.reviewId) {
    return;
  }
  submittingCorrection.value = true;
  try {
    await createReviewCorrection(activeTaskId.value, correction.reviewId, {
      sentiment: correction.sentiment,
      topicLabels: splitText(correction.topicLabelsText),
      summary: correction.summary,
      note: correction.note
    });
    message.success("纠错已保存，并会覆盖当前分析结果中的对应字段。");
    correction.summary = "";
    correction.note = "";
    correction.topicLabelsText = "";
  } finally {
    submittingCorrection.value = false;
  }
}

function openReport() {
  if (activeTaskId.value) {
    router.push(`/tasks/${activeTaskId.value}/report`);
  }
}

async function createShare() {
  if (!activeTaskId.value) {
    return;
  }
  creatingShare.value = true;
  try {
    const share = await createTaskReportShare(activeTaskId.value);
    shareUrl.value = share.shareUrl;
  } finally {
    creatingShare.value = false;
  }
}

async function copyShareUrl() {
  if (!shareUrl.value) {
    return;
  }
  await navigator.clipboard.writeText(shareUrl.value);
  message.success("交付链接已复制。");
}

function openShareUrl() {
  if (shareUrl.value) {
    window.open(shareUrl.value, "_blank", "noopener,noreferrer");
  }
}

onMounted(async () => {
  await refreshTasks();
  activeTaskId.value = selectedTaskId.value || tasks.value[0]?.id || "";
  compareTaskIds.value = tasks.value.slice(0, 3).map((task) => task.id);
  await loadBrief();
});
</script>

<style scoped>
.growth-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.growth-hero,
.brief-card,
.growth-panel {
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
}

.growth-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px;
  border-radius: 8px;
}

.growth-kicker {
  color: #2563eb;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.growth-hero h1,
.growth-panel h2 {
  margin: 4px 0;
  color: #0f172a;
}

.growth-hero p,
.growth-panel p,
.brief-summary,
.muted {
  margin: 0;
  color: #64748b;
}

.task-picker {
  width: 280px;
}

.brief-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(320px, 0.9fr);
  gap: 18px;
}

.brief-card,
.growth-panel {
  padding: 20px;
  border-radius: 8px;
}

.brief-card-main {
  min-height: 230px;
}

.section-head,
.panel-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.section-head span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.section-head strong {
  color: #0f172a;
  font-size: 20px;
}

.brief-summary {
  margin: 22px 0;
  font-size: 16px;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.metric-row div,
.winner-card,
.share-box {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 14px;
  background: #ffffff;
}

.metric-row span,
.winner-card span {
  display: block;
  color: #64748b;
  font-size: 12px;
}

.metric-row strong,
.winner-card strong {
  color: #0f172a;
  font-size: 24px;
}

.alert-line {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.alert-line p {
  margin: 4px 0 0;
  color: #64748b;
}

.growth-tabs {
  background: transparent;
}

.compare-picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin: 18px 0;
}

.compare-picker :deep(.ant-checkbox-wrapper) {
  margin-inline-start: 0;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #ffffff;
}

.compare-result {
  display: grid;
  gap: 16px;
}

.quality-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.prompt-score {
  display: flex;
  align-items: center;
  gap: 18px;
  margin: 18px 0;
}

.prompt-score strong,
.prompt-score span {
  display: block;
}

.correction-form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.full-input {
  width: 100%;
}

.delivery-panel {
  min-height: 260px;
}

.share-box {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  margin: 18px 0;
}

.delivery-checks {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.delivery-checks div {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f766e;
  font-weight: 700;
}

@media (max-width: 980px) {
  .growth-hero,
  .section-head,
  .panel-title-row {
    flex-direction: column;
  }

  .brief-grid,
  .quality-grid,
  .delivery-checks {
    grid-template-columns: 1fr;
  }

  .metric-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .share-box {
    grid-template-columns: 1fr;
  }

  .task-picker {
    width: 100%;
  }
}
</style>
