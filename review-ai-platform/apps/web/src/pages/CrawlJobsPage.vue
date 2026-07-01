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
        :scroll="{ x: 1420 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'monitor'">
            <div class="task-name-cell">
              <strong>{{ record.name }}</strong>
              <span>{{ record.productName || record.normalizedUrl }}</span>
              <a class="crawl-url" :href="record.normalizedUrl" target="_blank" rel="noreferrer">{{ record.normalizedUrl }}</a>
              <span v-if="record.workspaceName || record.workspaceSlug" class="muted">
                空间：{{ record.workspaceName || record.workspaceSlug }}
              </span>
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
                    <a-menu-item key="crawl-job" :disabled="!record.lastCrawlJobId" @click="record.lastCrawlJobId && openCrawlJobById(record.lastCrawlJobId)">
                      <CloudDownloadOutlined />
                      打开采集
                    </a-menu-item>
                    <a-menu-item key="task" :disabled="!record.taskId" @click="record.taskId && openTaskById(record.taskId, record.latestRunId)">
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
        <a-space class="crawl-job-toolbar" wrap>
          <a-segmented
            v-model:value="crawlJobStatusFilter"
            class="crawl-job-status-filter"
            :options="crawlJobStatusOptions"
            @change="handleCrawlJobStatusChange"
          />
          <a-tag>{{ crawlJobTotal }} 个任务</a-tag>
        </a-space>
      </div>

      <a-table
        class="crawl-job-table"
        row-key="id"
        size="middle"
        :columns="columns"
        :data-source="jobs"
        :pagination="crawlJobPagination"
        :loading="loading"
        :row-class-name="crawlJobRowClassName"
        :scroll="{ x: 1480 }"
        @change="handleCrawlJobTableChange"
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
              <div class="crawl-progress-headline">
                <strong>已抓取 {{ record.fetchedRows }}/{{ record.maxReviews || "不限" }}</strong>
                <a-tag v-if="record.coveragePercent !== null" color="blue" class="crawl-progress-tag">
                  目标覆盖 {{ record.coveragePercent }}%
                </a-tag>
                <a-tag v-if="record.platformCoveragePercent != null" color="cyan" class="crawl-progress-tag">
                  平台覆盖 {{ record.platformCoveragePercent }}%
                </a-tag>
              </div>
              <div v-if="crawlCoverageStats(record).length" class="crawl-progress-grid">
                <div v-for="stat in crawlCoverageStats(record)" :key="stat.label" class="crawl-progress-stat">
                  <span>{{ stat.label }}</span>
                  <strong>{{ stat.value }}</strong>
                </div>
              </div>
              <div v-if="crawlRunSignals(record).length" class="crawl-signal-list">
                <span v-for="signal in crawlRunSignals(record)" :key="signal">{{ signal }}</span>
              </div>
              <div class="crawl-alert-tags">
                <a-tag v-if="record.stalled" color="orange" class="crawl-stalled-tag">
                  疑似无更新 {{ durationLabel(record.updatedAgoSeconds) }}
                </a-tag>
                <a-tag v-if="record.partialDueToTimeout" color="orange" class="crawl-stalled-tag">
                  部分结果：采集接近超时，可能未加载完全部评论
                </a-tag>
                <a-tag
                  v-if="isRequestStatusWarning(record.lastRequestStatus)"
                  :color="requestStatusColor(record.lastRequestStatus)"
                  class="crawl-stalled-tag"
                >
                  请求异常 {{ record.lastRequestStatus }}
                </a-tag>
              </div>
              <div v-if="crawlJobDiagnostic(record)" class="crawl-diagnostic-tip">
                <ExclamationCircleOutlined />
                <span>{{ crawlJobDiagnostic(record) }}</span>
              </div>
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
            <div v-if="record.workspaceName || record.workspaceSlug" class="muted">
              空间：{{ record.workspaceName || record.workspaceSlug }}
            </div>
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
            <div class="settings-help">{{ crawlAnalysisTypeHint(monitorForm) }}</div>
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
            <div class="settings-help">{{ crawlAnalysisTypeHint(form) }}</div>
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
import { useRoute, useRouter } from "vue-router";
import { Modal, message } from "ant-design-vue";
import {
  CloudDownloadOutlined,
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
import { useI18n } from "@/i18n";
import {
  ANALYSIS_TYPE_PRESETS,
  CRAWL_SOURCE_CHANNEL_PRESETS,
  inferAnalysisType,
  normalizeCrawlSourceChannel,
  type AnalysisType,
  type CrawlJobDTO,
  type CrawlJobStatus,
  type CrawlJobStatusCounts,
  type CrawlJobStatusFilter,
  type CrawlMonitorDTO,
  type CrawlerChannel
} from "@review-ai/shared";

const router = useRouter();
const route = useRoute();
const { t } = useI18n();
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

function emptyCrawlJobStatusCounts(): CrawlJobStatusCounts {
  return {
    all: 0,
    active: 0,
    queued: 0,
    running: 0,
    completed: 0,
    failed: 0,
    imported: 0
  };
}

function crawlJobStatusCountsFromRows(rows: CrawlJobDTO[]): CrawlJobStatusCounts {
  const counts = emptyCrawlJobStatusCounts();
  for (const row of rows) {
    counts[row.status] += 1;
    counts.all += 1;
  }
  counts.active = counts.queued + counts.running;
  return counts;
}

const crawlJobStatusFilter = ref<CrawlJobStatusFilter>("all");
const crawlJobPage = ref(1);
const crawlJobPageSize = ref(12);
const crawlJobTotal = ref(jobs.value.length);
const crawlJobStatusCounts = ref<CrawlJobStatusCounts>(crawlJobStatusCountsFromRows(jobs.value));
const crawlJobTotals = ref({
  fetchedRows: jobs.value.reduce((total, job) => total + job.fetchedRows, 0),
  importedRows: jobs.value.reduce((total, job) => total + job.importedRows, 0),
  skippedDuplicate: jobs.value.reduce((total, job) => total + job.skippedDuplicate, 0)
});

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
  { title: "进度", key: "progress", width: 380 },
  { title: "来源", key: "meta", width: 190 },
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

const crawlJobStatusOptions = computed(() => {
  const counts = crawlJobStatusCounts.value;
  return [
    { label: `全部 ${formatCount(counts.all)}`, value: "all" },
    { label: `运行中 ${formatCount(counts.active)}`, value: "active" },
    { label: `排队 ${formatCount(counts.queued)}`, value: "queued" },
    { label: `抓取中 ${formatCount(counts.running)}`, value: "running" },
    { label: `已完成 ${formatCount(counts.completed)}`, value: "completed" },
    { label: `失败 ${formatCount(counts.failed)}`, value: "failed" },
    { label: `已分析 ${formatCount(counts.imported)}`, value: "imported" }
  ];
});

const crawlJobPagination = computed(() => ({
  current: crawlJobPage.value,
  pageSize: crawlJobPageSize.value,
  total: crawlJobTotal.value,
  showSizeChanger: true,
  pageSizeOptions: ["12", "24", "50", "100"],
  showTotal: (total: number) => `共 ${formatCount(total)} 个任务`
}));

const activeJobs = computed(() => jobs.value.filter((job) => ["queued", "running"].includes(job.status)));
const stalledJobs = computed(() => activeJobs.value.filter((job) => job.stalled));
const activeJobCount = computed(() => crawlJobStatusCounts.value.active);
const hasActiveJobs = computed(() => activeJobCount.value > 0);
const failedJobCount = computed(() => crawlJobStatusCounts.value.failed);
const fetchedRowCount = computed(() => crawlJobTotals.value.fetchedRows);
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
    return activeJobCount.value ? `${activeJobCount.value} 个运行中` : "暂无运行任务";
  }
  const fetched = activeJobs.value.reduce((total, job) => total + job.fetchedRows, 0);
  if (activeJobs.value.some((job) => !job.maxReviews)) {
    return `${fetched}/不限`;
  }
  const target = activeJobs.value.reduce((total, job) => total + job.maxReviews, 0);
  return `${fetched}/${target}`;
});
const activeProgressNote = computed(() => {
  if (activeJobs.value.length) {
    return `${activeJobs.value.length} 个当前页任务正在排队或抓取`;
  }
  return activeJobCount.value ? "切到运行中筛选查看详情" : "没有排队或抓取任务";
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
const highlightedCrawlJobId = computed(() => (typeof route.query.jobId === "string" ? route.query.jobId : ""));

function statusLabel(status: CrawlJobStatus) {
  return {
    queued: "排队中",
    running: "抓取中",
    completed: "已完成",
    failed: "失败",
    imported: "已开始分析"
  }[status];
}

function crawlJobRowClassName(record: CrawlJobDTO) {
  return record.id === highlightedCrawlJobId.value ? "selected-crawl-job-row" : "";
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

function analysisTypeI18nLabel(value: AnalysisType) {
  return t(`analysisType.${value}`);
}

function crawlAnalysisTypeHint(target: { sourceChannel: string; productUrl: string; analysisType: AnalysisType }) {
  const recommended = inferAnalysisType(target.sourceChannel, target.productUrl);
  const recommendedLabel = analysisTypeI18nLabel(recommended);
  if (target.analysisType !== recommended) {
    return t("crawl.analysisTypeMismatch", {
      recommended: recommendedLabel,
      current: analysisTypeI18nLabel(target.analysisType)
    });
  }
  if (target.sourceChannel === "Facebook" && recommended === "video") {
    return t("crawl.facebookVideoAnalysisHint");
  }
  if (target.sourceChannel === "Facebook") {
    return t("crawl.facebookPostAnalysisHint");
  }
  return t("crawl.analysisTypeRecommended", { type: recommendedLabel });
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

function formatCount(value?: number | null) {
  return value === null || value === undefined ? "-" : value.toLocaleString();
}

function shortCursor(value: string) {
  return value.length > 24 ? `${value.slice(0, 12)}...${value.slice(-8)}` : value;
}

function crawlCoverageStats(job: CrawlJobDTO) {
  const stats = [
    { label: "目标上限", value: job.maxReviews > 0 ? formatCount(job.maxReviews) : "不限" }
  ];
  if (job.totalComments !== null) {
    stats.push({ label: "平台总量", value: formatCount(job.totalComments) });
  }
  if (job.platformRemainingRows !== null) {
    stats.push({ label: "平台剩余", value: `约 ${formatCount(job.platformRemainingRows)} 条` });
  }
  if (job.importedRows > 0) {
    stats.push({ label: "已导入", value: formatCount(job.importedRows) });
  }
  if (job.skippedDuplicate > 0) {
    stats.push({ label: "重复跳过", value: formatCount(job.skippedDuplicate) });
  }
  return stats;
}

function crawlMetricSummary(job: CrawlJobDTO) {
  const parts = [
    job.nextRequests !== null ? `接口请求 ${job.nextRequests}` : "",
    job.payloadComments !== null ? `接口评论 ${job.payloadComments}` : "",
    job.domCommentCount !== null ? `DOM 评论 ${job.domCommentCount}` : "",
    job.domContentTextCount !== null ? `DOM 文本 ${job.domContentTextCount}` : "",
    job.loadMoreClicks !== null ? `加载更多 ${job.loadMoreClicks}` : "",
    job.cursor ? `游标 ${shortCursor(job.cursor)}` : "",
    job.hasMore !== null ? `还有更多 ${job.hasMore ? "是" : "否"}` : "",
    job.lastRequestStatus !== null ? `请求状态 ${job.lastRequestStatus}` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function isRequestStatusWarning(status?: number | null) {
  return typeof status === "number" && status >= 400;
}

function requestStatusColor(status?: number | null) {
  if (status === 429) {
    return "orange";
  }
  if (typeof status === "number" && status >= 500) {
    return "red";
  }
  return "volcano";
}

function requestStatusAdvice(status?: number | null) {
  if (status === 401 || status === 403) {
    return "平台拒绝访问，优先检查登录态、账号权限、评论区可见性和代理地区。";
  }
  if (status === 429) {
    return "平台触发限流，建议降低单次采集量或频率，更换代理后再重试。";
  }
  if (typeof status === "number" && status >= 500) {
    return "平台或代理链路返回服务异常，建议稍后重试并检查代理稳定性。";
  }
  if (typeof status === "number" && status >= 400) {
    return "平台拒绝了本次请求，建议检查链接、接口签名、浏览器环境或登录态。";
  }
  return "";
}

function crawlJobDiagnostic(job: CrawlJobDTO) {
  const statusAdvice = requestStatusAdvice(job.lastRequestStatus);
  if (statusAdvice) {
    return statusAdvice;
  }
  if (job.commentSortAttempted && job.commentSortSwitched === false) {
    return "评论排序未确认切到全部评论，可能只抓到相关评论；建议检查登录态和页面语言后重试。";
  }
  if (job.partialDueToTimeout || job.stopReason === "timeout") {
    return "采集接近超时提前返回，建议降低单次最大采集量，或改用监听任务分批采集。";
  }
  if (job.stopReason === "max_reviews") {
    return "已达到本次采集上限，如需更多评论可提高最大采集条数后重新采集。";
  }
  if (job.platformRemainingRows !== null && job.platformRemainingRows > 0 && ["completed", "imported"].includes(job.status)) {
    return `平台仍约有 ${formatCount(job.platformRemainingRows)} 条未覆盖，可提高采集上限或用监听任务继续补采。`;
  }
  if (job.stalled) {
    return "任务长时间没有更新，可能卡在页面加载、代理访问或平台风控，建议稍后刷新或联系管理员查看后台诊断。";
  }
  if (job.status === "failed") {
    return "采集失败，先看错误摘要；确认链接公开、评论区开启、代理和登录态正常后再重试。";
  }
  if (job.status === "completed" && job.fetchedRows === 0) {
    return "未采集到评论，先确认链接公开可访问、评论区开启，必要时换登录态或代理再试。";
  }
  return "";
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

function crawlRunSignals(job: CrawlJobDTO) {
  const isActive = ["queued", "running"].includes(job.status);
  const parts = [
    job.queuePosition !== null ? `排队第 ${job.queuePosition} 位` : "",
    job.durationSeconds !== null ? `耗时 ${durationLabel(job.durationSeconds)}` : "",
    job.fetchRatePerMinute !== null ? `速度 ${job.fetchRatePerMinute}/分钟` : "",
    isActive && job.remainingSeconds !== null ? `预计剩余 ${durationLabel(job.remainingSeconds)}` : "",
    isActive ? `更新于 ${durationLabel(job.updatedAgoSeconds)}前` : "",
    job.progressEventAt ? `进度回传 ${formatTime(job.progressEventAt)}` : "",
    job.stopReason ? `停止原因 ${stopReasonLabel(job.stopReason)}` : ""
  ].filter(Boolean);
  return parts;
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
  const result = await fetchCrawlJobs({
    jobId: highlightedCrawlJobId.value || undefined,
    status: crawlJobStatusFilter.value,
    page: crawlJobPage.value,
    pageSize: crawlJobPageSize.value
  });
  if (result.items.length === 0 && result.total > 0 && result.page > 1) {
    crawlJobPage.value = result.page - 1;
    await loadJobs();
    return;
  }
  jobs.value = result.items;
  crawlJobPage.value = result.page;
  crawlJobPageSize.value = result.pageSize;
  crawlJobTotal.value = result.total;
  crawlJobStatusCounts.value = result.statusCounts;
  crawlJobTotals.value = result.totals;
  writeWorkspaceCache("crawl-jobs", result.items);
}

async function handleCrawlJobStatusChange() {
  crawlJobPage.value = 1;
  await loadJobs();
}

async function handleCrawlJobTableChange(pagination: { current?: number; pageSize?: number }) {
  const nextPageSize = pagination.pageSize || crawlJobPageSize.value;
  crawlJobPage.value = nextPageSize === crawlJobPageSize.value ? pagination.current || 1 : 1;
  crawlJobPageSize.value = nextPageSize;
  await loadJobs();
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
    openTaskById(result.taskId, result.run.id);
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
    crawlJobStatusFilter.value = "active";
    crawlJobPage.value = 1;
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
    openTaskById(job.taskId, job.latestRunId);
  }
}

function openTaskById(taskId: string, runId?: string | null) {
  router.push({ path: `/tasks/${taskId}/runs`, query: runId ? { runId } : undefined });
}

function openCrawlJobById(jobId: string) {
  router.push({ path: "/crawl-jobs", query: { jobId } });
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
  target.analysisType = inferAnalysisType(sourceChannel, productUrl);
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
    form.analysisType = inferAnalysisType(sourceChannel, form.productUrl);
  }
);

watch(
  () => monitorForm.sourceChannel,
  (sourceChannel) => {
    monitorForm.analysisType = inferAnalysisType(sourceChannel, monitorForm.productUrl);
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

watch(
  () => route.query.jobId,
  async () => {
    if (highlightedCrawlJobId.value) {
      crawlJobStatusFilter.value = "all";
      crawlJobPage.value = 1;
    }
    if (!loading.value) {
      await loadJobs();
    }
  }
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
    await createCrawlJob({
      name: form.name,
      productName: form.productName,
      sourceChannel: form.sourceChannel,
      analysisType: form.analysisType,
      productUrl: form.productUrl,
      maxReviews: form.maxReviews,
      crawlChannels: ["browser_intercept"]
    });
    crawlJobStatusFilter.value = "active";
    crawlJobPage.value = 1;
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
    crawlJobStatusFilter.value = "active";
    crawlJobPage.value = 1;
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

.crawl-job-toolbar {
  justify-content: flex-end;
}

.crawl-job-status-filter {
  max-width: min(100%, 760px);
  overflow-x: auto;
}

.crawl-url {
  color: #64748b;
  font-size: 12px;
  overflow-wrap: anywhere;
}

:global(.selected-crawl-job-row) td {
  background: #eff6ff !important;
}

.crawl-progress-headline,
.crawl-alert-tags,
.crawl-signal-list {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.crawl-progress-headline strong {
  color: #0f172a;
  font-size: 13px;
}

.crawl-progress-tag,
.crawl-stalled-tag {
  margin-inline-end: 0;
}

.crawl-progress-grid {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 8px;
}

.crawl-progress-stat {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.crawl-progress-stat span {
  color: #64748b;
  font-size: 11px;
  line-height: 1.2;
}

.crawl-progress-stat strong {
  color: #0f172a;
  font-size: 13px;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crawl-signal-list span {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #1d4ed8;
  font-size: 12px;
  line-height: 1.45;
  padding: 2px 6px;
}

.crawl-diagnostic-tip {
  align-items: flex-start;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  color: #9a3412;
  display: flex;
  gap: 6px;
  font-size: 12px;
  line-height: 1.45;
  max-width: 520px;
  padding: 6px 8px;
}

.crawl-diagnostic-tip span {
  overflow-wrap: anywhere;
}

.crawl-stalled-tag {
  justify-self: start;
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
