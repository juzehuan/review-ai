<template>
  <div class="runs-page">
    <div class="page-toolbar runs-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">评论采集</div>
        <div class="toolbar-subtitle">把商品、视频或内容链接放进采集队列，完成后再一键导入评论并开始分析。</div>
      </div>
      <a-space wrap>
        <a-switch v-model:checked="autoRefresh" checked-children="自动刷新" un-checked-children="手动刷新" />
        <a-button @click="refreshPageData" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button v-if="crawlerEnabled" type="primary" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          新建采集任务
        </a-button>
      </a-space>
    </div>

    <div class="crawler-stats-grid">
      <div class="mini-stat-card mini-stat-cool">
        <div class="mini-stat-label">采集任务</div>
        <div class="mini-stat-value">{{ jobs.length }}</div>
        <div class="stat-note">当前账号下的全部采集队列</div>
      </div>
      <div class="mini-stat-card mini-stat-warm">
        <div class="mini-stat-label">运行中</div>
        <div class="mini-stat-value">{{ activeJobCount }}</div>
        <div class="stat-note">排队或正在抓取</div>
      </div>
      <div class="mini-stat-card mini-stat-cool">
        <div class="mini-stat-label">已采集评论</div>
        <div class="mini-stat-value">{{ fetchedRowCount }}</div>
        <div class="stat-note">可导入分析的评论总量</div>
      </div>
      <div class="mini-stat-card mini-stat-alert">
        <div class="mini-stat-label">异常任务</div>
        <div class="mini-stat-value">{{ failedJobCount }}</div>
        <div class="stat-note">需要检查链接或代理</div>
      </div>
    </div>

    <section class="task-list-panel">
      <div class="panel-head">
        <div>
          <div class="panel-label">Crawler</div>
          <div class="settings-section-title">全部采集任务</div>
        </div>
        <a-tag>{{ jobs.length }} 个任务</a-tag>
      </div>

      <a-table
        class="crawl-job-table"
        row-key="id"
        size="middle"
        :columns="columns"
        :data-source="jobs"
        :pagination="{ pageSize: 12 }"
        :loading="loading"
        :scroll="{ x: 1320 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'job'">
            <div class="task-name-cell">
              <strong>{{ record.name }}</strong>
              <span>{{ record.productName || record.normalizedUrl }}</span>
              <a class="crawl-url" :href="record.normalizedUrl" target="_blank" rel="noreferrer">{{ record.normalizedUrl }}</a>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="statusColor(record.status)">{{ statusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'progress'">
            <div class="run-progress-cell">
              <a-progress :percent="record.progress" size="small" :status="progressStatus(record.status)" />
              <span>已抓取 {{ record.fetchedRows }}/{{ record.maxReviews || '不限' }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'meta'">
            <div>{{ record.sourceChannel }} / {{ analysisTypeLabel(record.analysisType) }}</div>
            <div class="muted">{{ record.crawlChannelLabel || record.platform }}</div>
          </template>
          <template v-else-if="column.key === 'time'">
            <div>{{ formatTime(record.createdAt) }}</div>
            <div class="muted">{{ formatTime(record.finishedAt) }}</div>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space wrap>
              <a-button
                size="small"
                type="primary"
                :disabled="!canStart(record)"
                :loading="startingId === record.id"
                @click="startAnalysis(record)"
              >
                <template #icon><PlayCircleOutlined /></template>
                开始分析
              </a-button>
              <a-button v-if="record.taskId" size="small" @click="openTask(record)">
                <template #icon><FileSearchOutlined /></template>
                查看分析
              </a-button>
            </a-space>
          </template>
          <template v-else-if="column.key === 'error'">
            <a-tooltip v-if="record.lastError" :title="record.lastError">
              <div class="error-pill">
                <ExclamationCircleOutlined />
                <span>{{ errorSummary(record.lastError) }}</span>
              </div>
            </a-tooltip>
            <span v-else class="muted">-</span>
          </template>
        </template>
      </a-table>
    </section>

    <a-modal
      :open="showCreateModal"
      title="新建评论采集"
      width="720px"
      :confirm-loading="creating"
      ok-text="开始采集"
      cancel-text="取消"
      @cancel="showCreateModal = false"
      @ok="submitCrawlJob"
    >
      <a-form layout="vertical" class="import-form">
        <a-form-item label="任务名称">
          <a-input v-model:value="form.name" placeholder="例如：王局 YouTube 评论采集" />
        </a-form-item>
        <a-form-item label="商品/视频名称">
          <a-input v-model:value="form.productName" placeholder="可选，留空时会尽量从页面标题识别" />
        </a-form-item>
        <a-form-item label="评论链接">
          <a-input v-model:value="form.productUrl" placeholder="例如：https://www.youtube.com/watch?v=... 或 https://www.tiktok.com/@user/video/..." />
        </a-form-item>
        <a-form-item label="来源渠道">
          <a-select v-model:value="form.sourceChannel" :options="sourceChannelOptions" />
        </a-form-item>
        <a-form-item label="分析类型">
          <a-select v-model:value="form.analysisType" :options="analysisTypeOptions" />
          <div class="settings-help">{{ currentAnalysisTypeDescription }}</div>
        </a-form-item>
        <a-form-item label="最多采集条数">
          <a-input-number v-model:value="form.maxReviews" :min="0" :max="1000" class="full-input" />
          <div class="settings-help">填 0 表示不限，直到平台没有更多评论或采集超时。</div>
        </a-form-item>
        <div class="settings-help">AI 链接抓取当前仅支持 YouTube 视频和 TikTok 视频评论，系统会自动使用浏览器滚动/接口采集。</div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { ExclamationCircleOutlined, FileSearchOutlined, PlayCircleOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons-vue";
import { createCrawlJob, fetchCrawlJobs, fetchWorkspaceCrawlerSettings, startCrawlJobAnalysis } from "@/api";
import {
  ANALYSIS_TYPE_PRESETS,
  SOURCE_CHANNEL_PRESETS,
  inferAnalysisType,
  type AnalysisType,
  type CrawlJobDTO,
  type CrawlJobStatus,
  type CrawlerChannel
} from "@review-ai/shared";

const router = useRouter();
const jobs = ref<CrawlJobDTO[]>([]);
const loading = ref(false);
const autoRefresh = ref(true);
const startingId = ref<string | null>(null);
const showCreateModal = ref(false);
const creating = ref(false);
const crawlerEnabled = ref(true);
let timer: ReturnType<typeof setInterval> | null = null;

const form = reactive({
  name: "",
  productName: "",
  sourceChannel: "YouTube",
  analysisType: "video" as AnalysisType,
  productUrl: "",
  maxReviews: 200,
  crawlChannels: ["browser_intercept"] as CrawlerChannel[]
});

const sourceChannelOptions = SOURCE_CHANNEL_PRESETS.filter((channel) => ["YouTube", "TikTok Video"].includes(channel.value)).map((channel) => ({
  label: channel.label,
  value: channel.value
}));

const analysisTypeOptions = ANALYSIS_TYPE_PRESETS.map((item) => ({
  label: item.label,
  value: item.value
}));

const currentAnalysisTypeDescription = computed(() => {
  return ANALYSIS_TYPE_PRESETS.find((item) => item.value === form.analysisType)?.description || "";
});

const columns = [
  { title: "任务", key: "job", width: 360 },
  { title: "状态", key: "status", width: 110 },
  { title: "进度", key: "progress", width: 220 },
  { title: "来源", key: "meta", width: 160 },
  { title: "时间", key: "time", width: 170 },
  { title: "错误", key: "error" },
  { title: "操作", key: "actions", width: 190 }
];

const hasActiveJobs = computed(() => jobs.value.some((job) => ["queued", "running"].includes(job.status)));
const activeJobCount = computed(() => jobs.value.filter((job) => ["queued", "running"].includes(job.status)).length);
const failedJobCount = computed(() => jobs.value.filter((job) => job.status === "failed").length);
const fetchedRowCount = computed(() => jobs.value.reduce((total, job) => total + job.fetchedRows, 0));

function statusLabel(status: CrawlJobStatus) {
  return {
    queued: "排队中",
    running: "爬取中",
    completed: "已完成",
    failed: "失败",
    imported: "已开始分析"
  }[status];
}

function statusColor(status: CrawlJobStatus) {
  return {
    queued: "default",
    running: "processing",
    completed: "success",
    failed: "error",
    imported: "blue"
  }[status];
}

function progressStatus(status: CrawlJobStatus) {
  if (status === "failed") {
    return "exception";
  }
  if (status === "completed" || status === "imported") {
    return "success";
  }
  return "active";
}

function analysisTypeLabel(value: string) {
  return value === "video" ? "视频评论" : value === "tweet" ? "推文评论" : "商品评论";
}

function normalizeSourceChannel(value?: string | null) {
  const text = String(value || "").trim();
  return sourceChannelOptions.some((option) => option.value === text) ? text : "YouTube";
}

function inferSourceChannelFromUrl(value?: string | null) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("youtube.com") || text.includes("youtu.be")) {
    return "YouTube";
  }
  if (text.includes("tiktok.")) {
    if (/\/@[^/]+\/video\/\d+/i.test(text)) {
      return "TikTok Video";
    }
  }
  return "";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function errorSummary(value?: string | null) {
  const text = String(value || "").trim();
  if (!text) {
    return "-";
  }
  if (text.includes("collected 0 comments")) {
    return "未采集到评论";
  }
  if (text.includes("timed out") || text.includes("Timeout")) {
    return "采集超时";
  }
  if (text.includes("Unsupported crawl URL")) {
    return "暂不支持该链接";
  }
  if (text.includes("Could not parse")) {
    return "链接解析失败";
  }
  return text.length > 24 ? `${text.slice(0, 24)}...` : text;
}

function canStart(job: CrawlJobDTO) {
  return job.status === "completed" && !job.taskId && job.fetchedRows > 0;
}

async function loadJobs() {
  loading.value = true;
  try {
    jobs.value = await fetchCrawlJobs();
  } finally {
    loading.value = false;
  }
}

async function loadCrawlerSettings() {
  const setting = await fetchWorkspaceCrawlerSettings();
  crawlerEnabled.value = setting.enabled;
  return setting;
}

async function refreshPageData() {
  await Promise.all([
    loadCrawlerSettings().catch(() => {
      crawlerEnabled.value = true;
    }),
    loadJobs()
  ]);
}

async function startAnalysis(job: CrawlJobDTO) {
  if (!canStart(job)) {
    return;
  }
  startingId.value = job.id;
  try {
    const result = await startCrawlJobAnalysis(job.id);
    message.success("已导入评论并加入分析队列");
    await loadJobs();
    router.push(`/tasks/${result.taskId}/runs`);
  } finally {
    startingId.value = null;
  }
}

function openTask(job: CrawlJobDTO) {
  if (job.taskId) {
    router.push(`/tasks/${job.taskId}/runs`);
  }
}

function resetCreateForm() {
  form.name = "";
  form.productName = "";
  form.sourceChannel = "YouTube";
  form.analysisType = "video";
  form.productUrl = "";
  form.maxReviews = 200;
  form.crawlChannels = ["browser_intercept"];
}

async function openCreateModal() {
  resetCreateForm();
  try {
    const setting = await loadCrawlerSettings();
    if (!setting.enabled) {
      showCreateModal.value = false;
      message.warning("链接爬取已在爬虫设置中关闭。");
      return;
    }
    showCreateModal.value = true;
    form.sourceChannel = normalizeSourceChannel(setting.defaultSourceChannel);
    form.analysisType = inferAnalysisType(form.sourceChannel);
    form.maxReviews = setting.defaultMaxReviews ?? 200;
    form.crawlChannels = ["browser_intercept"];
  } catch {
    // 采集设置加载失败时保留默认值，不阻塞创建任务。
  }
}

watch(
  () => form.sourceChannel,
  (sourceChannel) => {
    form.analysisType = inferAnalysisType(sourceChannel);
  }
);

watch(
  () => form.productUrl,
  (productUrl) => {
    const sourceChannel = inferSourceChannelFromUrl(productUrl);
    if (!sourceChannel) {
      return;
    }
    form.sourceChannel = sourceChannel;
    form.analysisType = inferAnalysisType(sourceChannel);
    if (sourceChannel === "YouTube" || sourceChannel === "TikTok Video") {
      form.crawlChannels = ["browser_intercept"];
      if (sourceChannel === "TikTok Video") {
        form.maxReviews = 0;
      }
      if (!form.productName.trim()) {
        form.productName = sourceChannel === "YouTube" ? "YouTube 视频评论" : "TikTok 视频评论";
      }
    }
  }
);

async function submitCrawlJob() {
  if (!crawlerEnabled.value) {
    message.warning("链接爬取已在爬虫设置中关闭。");
    showCreateModal.value = false;
    return;
  }
  if (!form.name.trim()) {
    message.error("请填写采集任务名称。");
    return;
  }
  if (!form.productUrl.trim()) {
    message.error("请填写评论链接。");
    return;
  }
  creating.value = true;
  try {
    await createCrawlJob({
      name: form.name,
      productName: form.productName,
      sourceChannel: form.sourceChannel,
      analysisType: form.analysisType,
      productUrl: form.productUrl,
      maxReviews: form.maxReviews,
      crawlChannels: ["browser_intercept"]
    });
    message.success("评论采集任务已加入队列。");
    showCreateModal.value = false;
    await loadJobs();
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  refreshPageData();
  timer = setInterval(() => {
    if (autoRefresh.value && hasActiveJobs.value) {
      loadJobs();
    }
  }, 2500);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.crawl-url {
  color: #64748b;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.error-text {
  color: #b91c1c;
  overflow-wrap: anywhere;
}

.error-pill {
  align-items: center;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 999px;
  color: #b91c1c;
  display: inline-flex;
  gap: 6px;
  max-width: 260px;
  min-height: 26px;
  padding: 2px 10px;
}

.error-pill span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
