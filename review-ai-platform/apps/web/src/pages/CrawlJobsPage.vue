<template>
  <div class="runs-page crawler-page">
    <div class="page-toolbar runs-hero crawler-hero">
      <div class="toolbar-title-block">
        <div class="panel-label">Comment Intelligence</div>
        <div class="toolbar-title">评论采集控制台</div>
        <div class="toolbar-subtitle">
          把 Shopee、YouTube、TikTok、Facebook 评论变成可持续监听的数据流，新评论自动入库、自动分析，任务状态一眼可见。
        </div>
      </div>
      <a-space wrap>
        <a-button :href="browserExtensionDownloadUrl" download="review-exporter.zip">
          <template #icon><DownloadOutlined /></template>
          下载浏览器插件
        </a-button>
        <a-switch v-model:checked="autoRefresh" checked-children="自动刷新" un-checked-children="手动刷新" />
        <a-button @click="() => refreshPageData()" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button :disabled="!crawlerEnabled" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          一次采集
        </a-button>
        <a-button type="primary" :disabled="!crawlerEnabled" @click="openMonitorModal">
          <template #icon><ThunderboltOutlined /></template>
          新建监听
        </a-button>
      </a-space>
    </div>

    <a-alert
      v-if="!crawlerEnabled"
      class="import-alert"
      type="warning"
      show-icon
      message="评论采集已关闭"
      description="请先在用户后台的抓取设置中启用评论采集，然后再创建监听任务或一次性采集任务。"
    />

    <div class="crawler-stats-grid">
      <div class="mini-stat-card mini-stat-cool">
        <div class="mini-stat-label">监听任务</div>
        <div class="mini-stat-value">{{ monitors.length }}</div>
        <div class="stat-note">会按设定频率自动抓取并分析</div>
      </div>
      <div class="mini-stat-card mini-stat-warm">
        <div class="mini-stat-label">运行中</div>
        <div class="mini-stat-value">{{ activeJobCount }}</div>
        <div class="stat-note">正在排队或抓取的采集任务</div>
      </div>
      <div class="mini-stat-card mini-stat-cool">
        <div class="mini-stat-label">已采集评论</div>
        <div class="mini-stat-value">{{ fetchedRowCount }}</div>
        <div class="stat-note">来自当前账号下的采集记录</div>
      </div>
      <div class="mini-stat-card mini-stat-alert">
        <div class="mini-stat-label">待处理异常</div>
        <div class="mini-stat-value">{{ failedJobCount + failedMonitorCount }}</div>
        <div class="stat-note">需要检查链接、网络代理或平台限制</div>
      </div>
    </div>

    <div class="crawler-health-strip" :class="{ 'crawler-health-strip-alert': stalledJobCount > 0 }">
      <div class="crawler-health-head">
        <div>
          <div class="panel-label">Queue Health</div>
          <div class="settings-section-title">采集运行观察</div>
        </div>
        <a-tag :color="crawlHealthStatusColor">{{ crawlHealthStatusLabel }}</a-tag>
      </div>
      <div class="crawler-health-metrics">
        <div class="crawler-health-metric">
          <span>疑似无更新</span>
          <strong>{{ stalledJobCount }}</strong>
          <small>{{ stalledJobSummary }}</small>
        </div>
        <div class="crawler-health-metric">
          <span>活跃采集量</span>
          <strong>{{ activeProgressText }}</strong>
          <small>{{ activeProgressNote }}</small>
        </div>
        <div class="crawler-health-metric">
          <span>当前速度</span>
          <strong>{{ currentFetchRateText }}</strong>
          <small>{{ fetchRateNote }}</small>
        </div>
        <div class="crawler-health-metric">
          <span>最近活动</span>
          <strong>{{ latestActivityText }}</strong>
          <small>{{ latestActivityNote }}</small>
        </div>
      </div>
    </div>

    <section class="task-list-panel monitor-list-panel">
      <div class="panel-head">
        <div>
          <div class="panel-label">Always-on Monitor</div>
          <div class="settings-section-title">持续监听任务</div>
        </div>
        <a-space wrap>
          <a-tag color="blue">{{ enabledMonitorCount }} 个已启用</a-tag>
          <a-button type="primary" :disabled="!crawlerEnabled" @click="openMonitorModal">
            <template #icon><ThunderboltOutlined /></template>
            新建监听
          </a-button>
        </a-space>
      </div>

      <a-empty v-if="!loading && monitors.length === 0" description="还没有持续监听任务">
        <a-button type="primary" :disabled="!crawlerEnabled" @click="openMonitorModal">创建第一个监听任务</a-button>
      </a-empty>

      <a-table
        v-else
        class="crawl-job-table"
        row-key="id"
        size="middle"
        :columns="monitorColumns"
        :data-source="monitors"
        :pagination="{ pageSize: 8 }"
        :loading="loading"
        :scroll="{ x: 1340 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'monitor'">
            <div class="task-name-cell">
              <strong>{{ record.name }}</strong>
              <span>{{ record.productName || record.normalizedUrl }}</span>
              <a class="crawl-url" :href="record.normalizedUrl" target="_blank" rel="noreferrer">{{ record.normalizedUrl }}</a>
            </div>
          </template>
          <template v-else-if="column.key === 'schedule'">
            <div class="schedule-cell">
              <strong>{{ intervalLabel(record.intervalMinutes) }}</strong>
              <span>下次：{{ formatTime(record.nextRunAt) }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <div class="monitor-status-cell">
              <a-switch
                :checked="record.enabled"
                :loading="monitorActionId === record.id"
                checked-children="启用"
                un-checked-children="暂停"
                @change="toggleMonitor(record, Boolean($event))"
              />
              <a-tag :color="record.autoAnalyze ? 'green' : 'default'">
                {{ record.autoAnalyze ? "自动分析" : "仅采集" }}
              </a-tag>
            </div>
          </template>
          <template v-else-if="column.key === 'meta'">
            <div>{{ record.sourceChannel }} / {{ analysisTypeLabel(record.analysisType) }}</div>
            <div class="muted">{{ platformLabel(record.platform) }}</div>
          </template>
          <template v-else-if="column.key === 'last'">
            <div>{{ formatTime(record.lastRunAt) }}</div>
            <div class="muted">创建于 {{ formatTime(record.createdAt) }}</div>
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
          <template v-else-if="column.key === 'actions'">
            <a-space class="crawl-actions">
              <a-button
                size="small"
                :disabled="hasActiveMonitorJob(record)"
                :loading="monitorActionId === record.id"
                @click="runMonitorNow(record)"
              >
                <template #icon><PlayCircleOutlined /></template>
                立即运行
              </a-button>
              <a-dropdown>
                <a-button size="small" @click.stop>
                  <template #icon><MoreOutlined /></template>
                  更多
                </a-button>
                <template #overlay>
                  <a-menu class="crawl-action-menu" @click.stop>
                    <a-menu-item key="task" :disabled="!record.taskId" @click="record.taskId && openTaskById(record.taskId)">
                      <FileSearchOutlined />
                      查看分析
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger @click="removeMonitor(record)">
                      删除
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
    </section>

    <section class="task-list-panel">
      <div class="panel-head">
        <div>
          <div class="panel-label">Crawler Queue</div>
          <div class="settings-section-title">采集记录</div>
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
        :scroll="{ x: 1480 }"
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
              <span>
                已抓取 {{ record.fetchedRows }}/{{ record.maxReviews || "不限" }}
              </span>
              <span v-if="record.coveragePercent !== null" class="muted">目标覆盖 {{ record.coveragePercent }}%</span>
              <span v-if="record.platformCoveragePercent != null" class="muted">
                平台覆盖 {{ record.platformCoveragePercent }}%
              </span>
              <span v-if="platformCoverageSummary(record)" class="muted">{{ platformCoverageSummary(record) }}</span>
              <span v-if="crawlThroughputSummary(record)" class="muted">{{ crawlThroughputSummary(record) }}</span>
              <a-tag v-if="record.stalled" color="orange" class="crawl-stalled-tag">
                疑似无更新 {{ durationLabel(record.updatedAgoSeconds) }}
              </a-tag>
              <a-tag v-if="record.partialDueToTimeout" color="orange" class="crawl-stalled-tag">
                部分结果：采集接近超时，可能未加载完全部评论
              </a-tag>
              <span v-if="record.stopReason" class="muted">停止原因：{{ stopReasonLabel(record.stopReason) }}</span>
              <span v-if="record.commentSortAttempted !== null" class="muted">
                评论排序：{{ record.commentSortSwitched ? "已切换所有评论" : "未确认所有评论" }}
              </span>
              <span v-if="crawlMetricSummary(record)" class="muted">{{ crawlMetricSummary(record) }}</span>
              <span v-if="record.endReached !== null" class="muted">末尾状态：{{ record.endReached ? "已到达" : "未确认" }}</span>
              <a-tooltip v-if="record.channelErrors.length" :title="record.channelErrors.join('\n')">
                <span class="muted">通道异常 {{ record.channelErrors.length }} 条</span>
              </a-tooltip>
            </div>
          </template>
          <template v-else-if="column.key === 'meta'">
            <div>{{ record.sourceChannel }} / {{ analysisTypeLabel(record.analysisType) }}</div>
            <div class="muted">{{ record.crawlChannelLabel || platformLabel(record.platform) }}</div>
          </template>
          <template v-else-if="column.key === 'time'">
            <div>{{ formatTime(record.createdAt) }}</div>
            <div class="muted">{{ formatTime(record.finishedAt) }}</div>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space class="crawl-actions">
              <a-button
                v-if="canRetry(record)"
                size="small"
                type="primary"
                ghost
                :loading="retryingId === record.id"
                @click="retryJob(record)"
              >
                <template #icon><ReloadOutlined /></template>
                重试
              </a-button>
              <a-button
                v-else
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
              <a-dropdown>
                <a-button size="small" @click.stop>
                  <template #icon><MoreOutlined /></template>
                  更多
                </a-button>
                <template #overlay>
                  <a-menu class="crawl-action-menu" @click.stop>
                    <a-menu-item key="delete" danger :disabled="!canDeleteJob(record)" @click="confirmRemoveJob(record)">
                      {{ deletingJobId === record.id ? "删除中" : "删除" }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
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
      :open="showMonitorModal"
      title="新建持续监听"
      width="760px"
      :confirm-loading="monitorCreating"
      ok-text="创建监听"
      cancel-text="取消"
      @cancel="showMonitorModal = false"
      @ok="submitCrawlMonitor"
    >
      <a-form layout="vertical" class="import-form">
        <div class="monitor-form-grid">
          <a-form-item label="监听名称">
            <a-input v-model:value="monitorForm.name" placeholder="例如：竞品 TikTok 视频舆情监听" />
          </a-form-item>
          <a-form-item label="内容名称">
            <a-input v-model:value="monitorForm.productName" placeholder="可选，默认使用视频标题或链接" />
          </a-form-item>
        </div>
        <a-form-item label="评论链接">
          <a-input v-model:value="monitorForm.productUrl" placeholder="支持 Shopee 商品、YouTube 视频、TikTok 视频、Facebook 帖子/图片/Reel 链接" />
        </a-form-item>
        <div class="monitor-form-grid">
          <a-form-item label="来源渠道">
            <a-select v-model:value="monitorForm.sourceChannel" :options="sourceChannelOptions" />
          </a-form-item>
          <a-form-item label="分析类型">
            <a-select v-model:value="monitorForm.analysisType" :options="analysisTypeOptions" />
          </a-form-item>
        </div>
        <div class="monitor-form-grid">
          <a-form-item label="每次最多采集">
            <a-input-number v-model:value="monitorForm.maxReviews" :min="0" :max="20000" class="full-input" />
            <div class="settings-help">填 0 表示不限，直到平台没有更多评论或采集超时。</div>
          </a-form-item>
          <a-form-item label="监听频率">
            <a-select v-model:value="monitorForm.intervalMinutes" :options="intervalOptions" />
            <div class="settings-help">建议从 6 小时起步，高频任务更容易触发平台限制。</div>
          </a-form-item>
        </div>
        <a-form-item label="自动处理">
          <a-switch v-model:checked="monitorForm.autoAnalyze" checked-children="采集后自动分析" un-checked-children="只采集不分析" />
          <div class="settings-help">{{ currentMonitorAnalysisTypeDescription }}</div>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="showCreateModal"
      title="新建一次性采集"
      width="720px"
      :confirm-loading="creating"
      ok-text="开始采集"
      cancel-text="取消"
      @cancel="showCreateModal = false"
      @ok="submitCrawlJob"
    >
      <a-form layout="vertical" class="import-form">
        <a-form-item label="任务名称">
          <a-input v-model:value="form.name" placeholder="例如：新品发布 YouTube 评论采集" />
        </a-form-item>
        <a-form-item label="内容名称">
          <a-input v-model:value="form.productName" placeholder="可选，留空时会尽量从页面标题识别" />
        </a-form-item>
        <a-form-item label="评论链接">
          <a-input v-model:value="form.productUrl" placeholder="支持 Shopee 商品、YouTube 视频、TikTok 视频、Facebook 帖子/图片/Reel 链接" />
        </a-form-item>
        <div class="monitor-form-grid">
          <a-form-item label="来源渠道">
            <a-select v-model:value="form.sourceChannel" :options="sourceChannelOptions" />
          </a-form-item>
          <a-form-item label="分析类型">
            <a-select v-model:value="form.analysisType" :options="analysisTypeOptions" />
          </a-form-item>
        </div>
        <a-form-item label="最多采集条数">
          <a-input-number v-model:value="form.maxReviews" :min="0" :max="20000" class="full-input" />
          <div class="settings-help">填 0 表示不限；采集完成后会自动导入并启动 AI 分析。</div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Modal, message } from "ant-design-vue";
import {
  DownloadOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  ThunderboltOutlined
} from "@ant-design/icons-vue";
import {
  createCrawlJob,
  createCrawlMonitor,
  deleteCrawlJob,
  deleteCrawlMonitor,
  fetchCrawlJobs,
  fetchCrawlMonitors,
  fetchWorkspaceCrawlerSettings,
  getWorkspaceSlug,
  retryCrawlJob,
  runCrawlMonitorNow,
  startCrawlJobAnalysis,
  updateCrawlMonitor
} from "@/api";
import {
  ANALYSIS_TYPE_PRESETS,
  CRAWL_SOURCE_CHANNEL_PRESETS,
  inferAnalysisType,
  normalizeCrawlSourceChannel,
  type AnalysisType,
  type CrawlJobDTO,
  type CrawlJobStatus,
  type CrawlMonitorDTO,
  type CrawlerChannel
} from "@review-ai/shared";

const router = useRouter();
const jobs = ref<CrawlJobDTO[]>(readWorkspaceCache<CrawlJobDTO>("crawl-jobs"));
const monitors = ref<CrawlMonitorDTO[]>(readWorkspaceCache<CrawlMonitorDTO>("crawl-monitors"));
const loading = ref(false);
const autoRefresh = ref(true);
const startingId = ref<string | null>(null);
const retryingId = ref<string | null>(null);
const deletingJobId = ref<string | null>(null);
const monitorActionId = ref<string | null>(null);
const showCreateModal = ref(false);
const showMonitorModal = ref(false);
const creating = ref(false);
const monitorCreating = ref(false);
const crawlerEnabled = ref(true);
const browserExtensionDownloadUrl = "/downloads/review-exporter.zip";
let timer: ReturnType<typeof setInterval> | null = null;

function workspaceCacheKey(kind: string) {
  return `reviewiq:${kind}:${getWorkspaceSlug() || "default"}`;
}

function readWorkspaceCache<T>(kind: string): T[] {
  try {
    const raw = window.sessionStorage.getItem(workspaceCacheKey(kind));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeWorkspaceCache<T>(kind: string, rows: T[]) {
  try {
    window.sessionStorage.setItem(workspaceCacheKey(kind), JSON.stringify(rows));
  } catch {
    // 缓存只是切页时的体验兜底，失败不影响主流程。
  }
}

const form = reactive({
  name: "",
  productName: "",
  sourceChannel: "YouTube",
  analysisType: "video" as AnalysisType,
  productUrl: "",
  maxReviews: 200,
  crawlChannels: ["browser_intercept"] as CrawlerChannel[]
});

const monitorForm = reactive({
  name: "",
  productName: "",
  sourceChannel: "YouTube",
  analysisType: "video" as AnalysisType,
  productUrl: "",
  maxReviews: 0,
  intervalMinutes: 360,
  autoAnalyze: true
});

const sourceChannelOptions = CRAWL_SOURCE_CHANNEL_PRESETS.map((channel) => ({
  label: channel.label,
  value: channel.value
}));

const analysisTypeOptions = ANALYSIS_TYPE_PRESETS.map((item) => ({
  label: item.label,
  value: item.value
}));

const intervalOptions = [
  { label: "每 30 分钟", value: 30 },
  { label: "每 1 小时", value: 60 },
  { label: "每 3 小时", value: 180 },
  { label: "每 6 小时", value: 360 },
  { label: "每 12 小时", value: 720 },
  { label: "每天", value: 1440 }
];

const currentMonitorAnalysisTypeDescription = computed(() => {
  return ANALYSIS_TYPE_PRESETS.find((item) => item.value === monitorForm.analysisType)?.description || "";
});

const columns = [
  { title: "任务", key: "job", width: 360 },
  { title: "状态", key: "status", width: 110 },
  { title: "进度", key: "progress", width: 300 },
  { title: "来源", key: "meta", width: 160 },
  { title: "时间", key: "time", width: 170 },
  { title: "错误", key: "error" },
  { title: "操作", key: "actions", width: 260 }
];

const monitorColumns = [
  { title: "监听对象", key: "monitor", width: 360 },
  { title: "频率", key: "schedule", width: 210 },
  { title: "状态", key: "status", width: 190 },
  { title: "来源", key: "meta", width: 150 },
  { title: "最近运行", key: "last", width: 190 },
  { title: "错误", key: "error" },
  { title: "操作", key: "actions", width: 220 }
];

const activeJobs = computed(() => jobs.value.filter((job) => ["queued", "running"].includes(job.status)));
const stalledJobs = computed(() => activeJobs.value.filter((job) => job.stalled));
const hasActiveJobs = computed(() => activeJobs.value.length > 0);
const activeJobCount = computed(() => activeJobs.value.length);
const failedJobCount = computed(() => jobs.value.filter((job) => job.status === "failed").length);
const fetchedRowCount = computed(() => jobs.value.reduce((total, job) => total + job.fetchedRows, 0));
const enabledMonitorCount = computed(() => monitors.value.filter((monitor) => monitor.enabled).length);
const failedMonitorCount = computed(() => monitors.value.filter((monitor) => Boolean(monitor.lastError)).length);
const hasEnabledMonitor = computed(() => monitors.value.some((monitor) => monitor.enabled));
const stalledJobCount = computed(() => stalledJobs.value.length);
const longestStalledJob = computed(() => {
  return [...stalledJobs.value].sort((a, b) => b.updatedAgoSeconds - a.updatedAgoSeconds)[0] || null;
});
const latestActivityJob = computed(() => {
  return [...jobs.value].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
});
const activeProgressText = computed(() => {
  if (!activeJobs.value.length) {
    return "暂无运行任务";
  }
  const fetched = activeJobs.value.reduce((total, job) => total + job.fetchedRows, 0);
  if (activeJobs.value.some((job) => !job.maxReviews)) {
    return `${fetched}/不限`;
  }
  const target = activeJobs.value.reduce((total, job) => total + job.maxReviews, 0);
  return `${fetched}/${target}`;
});
const activeProgressNote = computed(() => {
  return activeJobs.value.length ? `${activeJobs.value.length} 个任务正在排队或抓取` : "没有排队或抓取任务";
});
const activeFetchRates = computed(() => activeJobs.value.map((job) => job.fetchRatePerMinute).filter((value): value is number => value !== null));
const currentFetchRateText = computed(() => {
  if (!activeFetchRates.value.length) {
    return "-";
  }
  const average = activeFetchRates.value.reduce((total, value) => total + value, 0) / activeFetchRates.value.length;
  return `${Number(average.toFixed(1))}/分钟`;
});
const fetchRateNote = computed(() => {
  return activeFetchRates.value.length ? `${activeFetchRates.value.length} 个任务有速度回传` : "等待采集器回传速度";
});
const crawlHealthStatusLabel = computed(() => {
  if (stalledJobCount.value) {
    return "需要检查";
  }
  if (activeJobCount.value) {
    return "运行中";
  }
  return "空闲";
});
const crawlHealthStatusColor = computed(() => {
  if (stalledJobCount.value) {
    return "orange";
  }
  if (activeJobCount.value) {
    return "blue";
  }
  return "green";
});
const stalledJobSummary = computed(() => {
  if (!longestStalledJob.value) {
    return activeJobCount.value ? "运行任务正常更新" : "暂无运行中的采集任务";
  }
  return `最长静默 ${durationLabel(longestStalledJob.value.updatedAgoSeconds)} · ${shortJobName(longestStalledJob.value)}`;
});
const latestActivityText = computed(() => {
  if (!latestActivityJob.value) {
    return "-";
  }
  return `${durationLabel(latestActivityJob.value.updatedAgoSeconds)}前`;
});
const latestActivityNote = computed(() => {
  return latestActivityJob.value ? shortJobName(latestActivityJob.value) : "暂无采集记录";
});

function statusLabel(status: CrawlJobStatus) {
  return {
    queued: "排队中",
    running: "抓取中",
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
  return value === "video" ? "视频评论" : value === "tweet" ? "社媒评论" : "商品评论";
}

function platformLabel(value?: string | null) {
  const text = String(value || "").toLowerCase();
  if (text.includes("youtube")) {
    return "YouTube 视频";
  }
  if (text.includes("tiktok")) {
    return "TikTok 视频";
  }
  if (text.includes("facebook")) {
    return "Facebook 评论";
  }
  if (text.includes("shopee")) {
    return "Shopee 商品评论";
  }
  return value || "-";
}

function intervalLabel(value: number) {
  if (value >= 1440 && value % 1440 === 0) {
    return `每 ${value / 1440} 天`;
  }
  if (value >= 60 && value % 60 === 0) {
    return `每 ${value / 60} 小时`;
  }
  return `每 ${value} 分钟`;
}

function normalizeSourceChannel(value?: string | null) {
  return normalizeCrawlSourceChannel(value, "YouTube");
}

function inferSourceChannelFromUrl(value?: string | null) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("youtube.com") || text.includes("youtu.be")) {
    return "YouTube";
  }
  if (text.includes("tiktok.") && /\/@[^/]+\/video\/\d+/i.test(text)) {
    return "TikTok Video";
  }
  if (text.includes("shopee.")) {
    return "Shopee";
  }
  if (text.includes("facebook.") && /(story_fbid=|fbid=|[?&]v=|\/posts\/|\/videos\/|\/reel\/|\/photo\/|photo\.php|\/share\/[pv])/i.test(text)) {
    return "Facebook";
  }
  return "";
}

function defaultContentName(sourceChannel: string) {
  if (sourceChannel === "YouTube") {
    return "YouTube 视频评论";
  }
  if (sourceChannel === "TikTok Video") {
    return "TikTok 视频评论";
  }
  if (sourceChannel === "Facebook") {
    return "Facebook 帖子评论";
  }
  if (sourceChannel === "Shopee") {
    return "Shopee 商品评论";
  }
  return "评论采集";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString();
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

function stopReasonLabel(value?: string | null) {
  if (value === "max_reviews") {
    return "达到采集上限";
  }
  if (value === "no_more_comments") {
    return "没有更多评论";
  }
  if (value === "timeout") {
    return "采集超时";
  }
  if (value === "no_comments_found") {
    return "未发现评论";
  }
  return value || "-";
}

function shortJobName(job: CrawlJobDTO) {
  const text = String(job.name || job.productName || job.normalizedUrl || job.id).trim();
  return text.length > 28 ? `${text.slice(0, 28)}...` : text;
}

function crawlMetricSummary(job: CrawlJobDTO) {
  const parts = [
    job.nextRequests !== null ? `接口请求 ${job.nextRequests}` : "",
    job.payloadComments !== null ? `接口评论 ${job.payloadComments}` : "",
    job.domCommentCount !== null ? `DOM 评论 ${job.domCommentCount}` : "",
    job.domContentTextCount !== null ? `DOM 文本 ${job.domContentTextCount}` : "",
    job.loadMoreClicks !== null ? `加载更多 ${job.loadMoreClicks}` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function platformCoverageSummary(job: CrawlJobDTO) {
  const parts = [
    job.totalComments != null ? `平台总量 ${job.totalComments}` : "",
    job.platformRemainingRows != null ? `平台剩余约 ${job.platformRemainingRows} 条` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function durationLabel(seconds?: number | null) {
  if (seconds === null || seconds === undefined) {
    return "-";
  }
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} 小时 ${restMinutes} 分钟` : `${hours} 小时`;
}

function crawlThroughputSummary(job: CrawlJobDTO) {
  const parts = [
    job.importedRows > 0 ? `导入 ${job.importedRows}` : "",
    job.skippedDuplicate > 0 ? `重复 ${job.skippedDuplicate}` : "",
    job.durationSeconds !== null ? `耗时 ${durationLabel(job.durationSeconds)}` : "",
    job.fetchRatePerMinute !== null ? `速度 ${job.fetchRatePerMinute}/分钟` : "",
    ["queued", "running"].includes(job.status) && job.remainingSeconds !== null ? `预计剩余 ${durationLabel(job.remainingSeconds)}` : "",
    ["queued", "running"].includes(job.status) ? `更新于 ${durationLabel(job.updatedAgoSeconds)}前` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function canStart(job: CrawlJobDTO) {
  return job.status === "completed" && !job.taskId && job.fetchedRows > 0;
}

function canRetry(job: CrawlJobDTO) {
  return job.status === "failed";
}

function canDeleteJob(job: CrawlJobDTO) {
  return !["queued", "running"].includes(job.status);
}

function hasActiveMonitorJob(monitor: CrawlMonitorDTO) {
  return jobs.value.some((job) => job.id === monitor.lastCrawlJobId && ["queued", "running"].includes(job.status));
}

async function loadJobs() {
  const rows = await fetchCrawlJobs();
  jobs.value = rows;
  writeWorkspaceCache("crawl-jobs", rows);
}

async function loadMonitors() {
  const rows = await fetchCrawlMonitors();
  monitors.value = rows;
  writeWorkspaceCache("crawl-monitors", rows);
}

async function loadCrawlerSettings() {
  const setting = await fetchWorkspaceCrawlerSettings();
  crawlerEnabled.value = setting.enabled;
  return setting;
}

async function refreshPageData(options: { silent?: boolean } = {}) {
  loading.value = true;
  try {
    const results = await Promise.allSettled([loadCrawlerSettings(), loadJobs(), loadMonitors()]);
    if (results[0].status === "rejected") {
      crawlerEnabled.value = true;
    }
    if (!options.silent && results.some((result) => result.status === "rejected")) {
      message.warning("部分采集数据刷新失败，已保留上一次成功加载的记录。");
    }
  } finally {
    loading.value = false;
  }
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

async function retryJob(job: CrawlJobDTO) {
  if (!canRetry(job)) {
    return;
  }
  retryingId.value = job.id;
  try {
    await retryCrawlJob(job.id);
    message.success("已重新加入采集队列");
    await loadJobs();
  } finally {
    retryingId.value = null;
  }
}

async function removeJob(job: CrawlJobDTO) {
  if (!canDeleteJob(job)) {
    return;
  }
  deletingJobId.value = job.id;
  try {
    await deleteCrawlJob(job.id);
    jobs.value = jobs.value.filter((item) => item.id !== job.id);
    writeWorkspaceCache("crawl-jobs", jobs.value);
    message.success("采集记录已删除");
    await loadJobs();
  } finally {
    deletingJobId.value = null;
  }
}

function confirmRemoveJob(job: CrawlJobDTO) {
  if (!canDeleteJob(job) || deletingJobId.value === job.id) {
    return;
  }
  Modal.confirm({
    title: "删除采集记录",
    content: "已生成的分析任务不会被删除。",
    okText: "删除",
    cancelText: "取消",
    okButtonProps: { danger: true },
    async onOk() {
      await removeJob(job);
    }
  });
}

function openTask(job: CrawlJobDTO) {
  if (job.taskId) {
    openTaskById(job.taskId);
  }
}

function openTaskById(taskId: string) {
  router.push(`/tasks/${taskId}/runs`);
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

function resetMonitorForm() {
  monitorForm.name = "";
  monitorForm.productName = "";
  monitorForm.sourceChannel = "YouTube";
  monitorForm.analysisType = "video";
  monitorForm.productUrl = "";
  monitorForm.maxReviews = 0;
  monitorForm.intervalMinutes = 360;
  monitorForm.autoAnalyze = true;
}

async function openCreateModal() {
  resetCreateForm();
  try {
    const setting = await loadCrawlerSettings();
    if (!setting.enabled) {
      showCreateModal.value = false;
      message.warning("评论采集已在抓取设置中关闭。");
      return;
    }
    form.sourceChannel = normalizeSourceChannel(setting.defaultSourceChannel);
    form.analysisType = inferAnalysisType(form.sourceChannel);
    form.maxReviews = setting.defaultMaxReviews ?? 200;
    form.crawlChannels = ["browser_intercept"];
  } catch {
    // 采集设置失败时仍允许用户按默认值创建。
  }
  showCreateModal.value = true;
}

async function openMonitorModal() {
  resetMonitorForm();
  try {
    const setting = await loadCrawlerSettings();
    if (!setting.enabled) {
      showMonitorModal.value = false;
      message.warning("评论采集已在抓取设置中关闭。");
      return;
    }
    monitorForm.sourceChannel = normalizeSourceChannel(setting.defaultSourceChannel);
    monitorForm.analysisType = inferAnalysisType(monitorForm.sourceChannel);
    monitorForm.maxReviews = 0;
  } catch {
    // 采集设置失败时仍允许用户按默认值创建。
  }
  showMonitorModal.value = true;
}

function applyUrlInference(target: typeof form | typeof monitorForm, productUrl?: string | null) {
  const sourceChannel = inferSourceChannelFromUrl(productUrl);
  if (!sourceChannel) {
    return;
  }
  target.sourceChannel = sourceChannel;
  target.analysisType = inferAnalysisType(sourceChannel);
  if (sourceChannel === "TikTok Video" || sourceChannel === "Facebook") {
    target.maxReviews = 0;
  }
  if (!target.productName.trim()) {
    target.productName = defaultContentName(sourceChannel);
  }
}

watch(
  () => form.sourceChannel,
  (sourceChannel) => {
    form.analysisType = inferAnalysisType(sourceChannel);
  }
);

watch(
  () => monitorForm.sourceChannel,
  (sourceChannel) => {
    monitorForm.analysisType = inferAnalysisType(sourceChannel);
  }
);

watch(
  () => form.productUrl,
  (productUrl) => applyUrlInference(form, productUrl)
);

watch(
  () => monitorForm.productUrl,
  (productUrl) => applyUrlInference(monitorForm, productUrl)
);

async function submitCrawlJob() {
  if (!crawlerEnabled.value) {
    message.warning("评论采集已在抓取设置中关闭。");
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
    const job = await createCrawlJob({
      name: form.name,
      productName: form.productName,
      sourceChannel: form.sourceChannel,
      analysisType: form.analysisType,
      productUrl: form.productUrl,
      maxReviews: form.maxReviews,
      crawlChannels: ["browser_intercept"]
    });
    jobs.value = [job, ...jobs.value.filter((item) => item.id !== job.id)];
    writeWorkspaceCache("crawl-jobs", jobs.value);
    message.success("评论采集已加入队列，完成后会自动导入并启动 AI 分析。");
    showCreateModal.value = false;
    await loadJobs();
  } finally {
    creating.value = false;
  }
}

async function submitCrawlMonitor() {
  if (!crawlerEnabled.value) {
    message.warning("评论采集已在抓取设置中关闭。");
    showMonitorModal.value = false;
    return;
  }
  if (!monitorForm.name.trim()) {
    message.error("请填写监听任务名称。");
    return;
  }
  if (!monitorForm.productUrl.trim()) {
    message.error("请填写评论链接。");
    return;
  }
  monitorCreating.value = true;
  try {
    const monitor = await createCrawlMonitor({
      name: monitorForm.name,
      productName: monitorForm.productName,
      sourceChannel: monitorForm.sourceChannel,
      analysisType: monitorForm.analysisType,
      productUrl: monitorForm.productUrl,
      maxReviews: monitorForm.maxReviews,
      intervalMinutes: monitorForm.intervalMinutes,
      autoAnalyze: monitorForm.autoAnalyze
    });
    monitors.value = [monitor, ...monitors.value.filter((item) => item.id !== monitor.id)];
    writeWorkspaceCache("crawl-monitors", monitors.value);
    message.success("监听任务已创建，系统会自动发起首次采集。");
    showMonitorModal.value = false;
    await refreshPageData();
  } finally {
    monitorCreating.value = false;
  }
}

async function toggleMonitor(monitor: CrawlMonitorDTO, checked: boolean) {
  monitorActionId.value = monitor.id;
  try {
    await updateCrawlMonitor(monitor.id, { enabled: checked });
    message.success(checked ? "监听任务已启用" : "监听任务已暂停");
    await loadMonitors();
  } finally {
    monitorActionId.value = null;
  }
}

async function runMonitorNow(monitor: CrawlMonitorDTO) {
  monitorActionId.value = monitor.id;
  try {
    await runCrawlMonitorNow(monitor.id);
    message.success("已加入采集队列。");
    await refreshPageData();
  } finally {
    monitorActionId.value = null;
  }
}

function removeMonitor(monitor: CrawlMonitorDTO) {
  if (monitorActionId.value === monitor.id) {
    return;
  }
  Modal.confirm({
    title: "删除监听任务",
    content: `确定删除监听任务「${monitor.name}」吗？历史采集记录和分析任务不会被删除。`,
    okText: "删除",
    cancelText: "取消",
    okButtonProps: { danger: true },
    async onOk() {
      monitorActionId.value = monitor.id;
      try {
        await deleteCrawlMonitor(monitor.id);
        monitors.value = monitors.value.filter((item) => item.id !== monitor.id);
        writeWorkspaceCache("crawl-monitors", monitors.value);
        message.success("监听任务已删除");
        await loadMonitors();
      } finally {
        monitorActionId.value = null;
      }
    }
  });
}

onMounted(() => {
  refreshPageData();
  timer = setInterval(() => {
    if (autoRefresh.value && (hasActiveJobs.value || hasEnabledMonitor.value)) {
      refreshPageData({ silent: true });
    }
  }, 5000);
});

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.crawler-page {
  gap: 22px;
}

.crawler-hero {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(232, 247, 255, 0.9)),
    repeating-linear-gradient(90deg, rgba(47, 107, 255, 0.06) 0 1px, transparent 1px 64px);
}

.monitor-list-panel {
  border-color: rgba(0, 191, 216, 0.28);
}

.crawler-health-strip {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(18, 115, 209, 0.14);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 16px;
  padding: 18px 20px;
}

.crawler-health-strip-alert {
  border-color: rgba(245, 158, 11, 0.38);
  box-shadow: 0 12px 30px rgba(245, 158, 11, 0.12);
}

.crawler-health-head {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.crawler-health-metrics {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.crawler-health-metric {
  border-left: 1px solid rgba(148, 163, 184, 0.24);
  display: grid;
  gap: 4px;
  min-width: 0;
  padding-left: 14px;
}

.crawler-health-metric:first-child {
  border-left: 0;
  padding-left: 0;
}

.crawler-health-metric span,
.crawler-health-metric small {
  color: #64748b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crawler-health-metric strong {
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.monitor-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.schedule-cell,
.monitor-status-cell {
  display: grid;
  gap: 8px;
}

.crawl-actions {
  flex-wrap: nowrap !important;
}

.crawl-actions :deep(.ant-btn) {
  white-space: nowrap;
}

:global(.crawl-action-menu) {
  min-width: 132px;
}

:global(.crawl-action-menu .ant-dropdown-menu-item) {
  gap: 8px;
  min-height: 36px;
}

.schedule-cell strong {
  color: #0b1322;
}

.schedule-cell span {
  color: #64748b;
  font-size: 12px;
}

.crawl-url {
  color: #64748b;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.crawl-stalled-tag {
  justify-self: start;
  margin-inline-end: 0;
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

@media (max-width: 960px) {
  .monitor-form-grid {
    grid-template-columns: 1fr;
  }

  .crawler-health-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .crawler-health-metric:nth-child(odd) {
    border-left: 0;
    padding-left: 0;
  }
}

@media (max-width: 760px) {
  .crawler-page {
    gap: 14px;
  }

  .crawler-health-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .crawler-health-metrics {
    grid-template-columns: 1fr;
  }

  .crawler-health-metric {
    border-left: 0;
    border-top: 1px solid rgba(148, 163, 184, 0.24);
    padding-left: 0;
    padding-top: 12px;
  }

  .crawler-health-metric:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .crawl-actions {
    gap: 6px !important;
  }

  .crawl-actions :deep(.ant-btn) {
    padding-inline: 8px;
  }

  .schedule-cell,
  .monitor-status-cell {
    gap: 6px;
  }

  .error-pill {
    max-width: 180px;
  }
}
</style>
