<template>
  <div class="runs-page">
    <div class="page-toolbar runs-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">分析任务</div>
        <div class="toolbar-subtitle">管理空间内所有任务，进入评论列表、分析报告，并查看实时分析日志。</div>
      </div>
      <a-space wrap>
        <a-switch v-model:checked="autoRefresh" checked-children="自动刷新" un-checked-children="手动刷新" />
        <a-button @click="refreshAll" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" :disabled="!canWriteWorkspace" @click="showImport = true">
          <template #icon><CloudUploadOutlined /></template>
          新建分析项目
        </a-button>
      </a-space>
    </div>

    <section class="task-list-panel">
      <div class="panel-head">
        <div>
          <div class="panel-label">Tasks</div>
          <div class="settings-section-title">全部任务列表</div>
        </div>
        <a-space class="task-list-toolbar" wrap>
          <a-segmented
            v-model:value="taskStatusFilter"
            class="task-status-filter"
            :options="taskStatusOptions"
            @change="handleTaskStatusChange"
          />
          <a-tag>{{ taskListTotal }} 个任务</a-tag>
        </a-space>
      </div>

      <a-table
        row-key="id"
        size="middle"
        :columns="taskColumns"
        :data-source="taskRows"
        :pagination="taskPagination"
        :loading="loadingTasks"
        :scroll="{ x: currentUser?.isSuperAdmin ? 1650 : 1440 }"
        :row-class-name="taskRowClassName"
        @row="taskRowProps"
        @change="handleTaskTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task'">
            <div class="task-name-cell">
              <strong>{{ record.name }}</strong>
              <span>{{ record.productName }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'workspace'">
            <div class="task-name-cell">
              <strong>{{ record.workspaceOwnerName || record.workspaceOwnerEmail || "未设置负责人" }}</strong>
              <span>{{ record.workspaceName || record.workspaceSlug || record.workspaceId || "-" }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <a-tag :color="taskStatusColor(record.status)">{{ taskStatusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'analysisType'">
            <a-tag>{{ analysisTypeLabel(record.analysisType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'analysisStatus'">
            <div class="task-analysis-cell">
              <a-tag :color="runStatusColor(record.latestRunStatus)">{{ runStatusLabel(record.latestRunStatus) }}</a-tag>
              <template v-if="record.latestRunStatus">
                <a-progress
                  :percent="record.latestRunProgressPercent"
                  size="small"
                  :status="taskRunProgressStatus(record)"
                />
                <span class="muted">{{ taskRunMetricSummary(record) }}</span>
                <a-tag v-if="record.latestRunStalled" color="orange" class="task-run-stalled-tag">
                  疑似无日志 {{ durationLabel(record.latestRunLastActivityAgoSeconds) }}
                </a-tag>
                <a-tooltip v-if="record.latestRunLastError" :title="record.latestRunLastError">
                  <span class="task-run-error">最新错误：{{ errorSummary(record.latestRunLastError) }}</span>
                </a-tooltip>
              </template>
            </div>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space class="task-actions">
              <a-button size="small" type="primary" ghost @click.stop="openReviews(record)">
                <template #icon><TableOutlined /></template>
                评论列表
              </a-button>
              <a-button size="small" @click.stop="openReport(record)">
                <template #icon><FileTextOutlined /></template>
                分析报告
              </a-button>
              <a-dropdown>
                <a-button size="small" @click.stop>
                  更多
                  <template #icon><MoreOutlined /></template>
                </a-button>
                <template #overlay>
                  <a-menu class="task-action-menu" @click.stop>
                    <a-menu-item key="logs" @click="openLogs(record)">
                      <FileSearchOutlined />
                      分析日志
                    </a-menu-item>
                    <a-menu-item key="actions" @click="openActions(record)">
                      <CheckSquareOutlined />
                      行动项
                    </a-menu-item>
                    <a-menu-item key="append" :disabled="!canWriteWorkspace" @click="appendReviews(record)">
                      <FileAddOutlined />
                      追加评论
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger :disabled="!canDeleteTask(record)" @click="confirmRemoveTask(record)">
                      <DeleteOutlined />
                      {{ deletingTaskId === record.id ? "删除中" : "删除" }}
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
    </section>

    <div class="analysis-health-strip" :class="{ 'analysis-health-strip-alert': stalledRunCount > 0 }">
      <div class="analysis-health-head">
        <div>
          <div class="panel-label">AI Queue Health</div>
          <div class="settings-section-title">AI 分析运行观察</div>
        </div>
        <a-tag :color="analysisHealthStatusColor">{{ analysisHealthStatusLabel }}</a-tag>
      </div>
      <div class="analysis-health-metrics">
        <div class="analysis-health-metric">
          <span>疑似无日志</span>
          <strong>{{ stalledRunCount }}</strong>
          <small>{{ stalledRunSummary }}</small>
        </div>
        <div class="analysis-health-metric">
          <span>活跃分析量</span>
          <strong>{{ activeRunProgressText }}</strong>
          <small>{{ activeRunProgressNote }}</small>
        </div>
        <div class="analysis-health-metric">
          <span>失败占比</span>
          <strong>{{ activeFailureRateText }}</strong>
          <small>{{ activeFailureRateNote }}</small>
        </div>
        <div class="analysis-health-metric">
          <span>最近日志</span>
          <strong>{{ latestRunActivityText }}</strong>
          <small>{{ latestRunActivityNote }}</small>
        </div>
      </div>
    </div>

    <div class="runs-layout">
      <section class="runs-table-panel">
        <div class="panel-head">
          <div>
            <div class="panel-label">Runs</div>
            <div class="settings-section-title">{{ selectedTask?.name || "选择任务后查看批次" }}</div>
          </div>
          <a-space wrap>
            <a-button
              type="primary"
              :disabled="!selectedTask || !canWriteWorkspace"
              @click="startAnalysis"
              :loading="starting"
            >
              <template #icon><RobotOutlined /></template>
              新建分析
            </a-button>
            <a-button v-if="selectedRun && canCancel(selectedRun)" danger @click="cancelSelectedRun">
              <template #icon><StopOutlined /></template>
              停止当前任务
            </a-button>
            <a-button
              v-if="selectedRun && canRetry(selectedRun)"
              :loading="retryingRunId === selectedRun.id"
              @click="retryOne(selectedRun)"
            >
              <template #icon><ReloadOutlined /></template>
              重试当前批次
            </a-button>
          </a-space>
        </div>

        <a-empty v-if="!selectedTask" description="请选择上方任务查看分析批次" />
        <a-table
          v-else
          row-key="id"
          size="middle"
          :columns="runColumns"
          :data-source="runs"
          :pagination="{ pageSize: 8 }"
          :loading="loading"
          :row-class-name="runRowClassName"
          @row="runRowProps"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="runStatusColor(record.status)">{{ runStatusLabel(record.status) }}</a-tag>
            </template>
            <template v-else-if="column.key === 'progress'">
              <div class="run-progress-cell">
                <a-progress :percent="runProgress(record)" size="small" :status="progressStatus(record)" />
                <span>
                  已处理 {{ record.processedCount }}/{{ record.reviewCount }}，成功 {{ record.successCount }}，失败 {{ record.failedCount }}
                </span>
                <span v-if="runMetricSummary(record)" class="muted">{{ runMetricSummary(record) }}</span>
                <a-tag v-if="record.stalled" color="orange" class="analysis-stalled-tag">
                  疑似无日志 {{ durationLabel(record.lastActivityAgoSeconds) }}
                </a-tag>
              </div>
            </template>
            <template v-else-if="column.key === 'time'">
              <div>{{ formatTime(record.startedAt) }}</div>
              <div class="muted">{{ formatTime(record.finishedAt) }}</div>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button size="small" @click.stop="selectRun(record)">日志</a-button>
                <a-button
                  v-if="canRetry(record)"
                  size="small"
                  :loading="retryingRunId === record.id"
                  @click.stop="retryOne(record)"
                >
                  重试
                </a-button>
                <a-button v-if="canCancel(record)" size="small" danger @click.stop="cancelOne(record)">停止</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </section>

      <section class="run-log-panel">
        <div class="log-panel-head">
          <div>
            <div class="log-title">实时日志</div>
            <div class="muted">{{ selectedTask ? selectedTask.name : "未选择任务" }}</div>
          </div>
          <div class="log-head-actions">
            <a-segmented v-model:value="logLevelFilter" size="small" :options="logLevelOptions" />
            <a-tag v-if="selectedRun" :color="runStatusColor(selectedRun.status)">
              {{ runStatusLabel(selectedRun.status) }}
            </a-tag>
          </div>
        </div>

        <div v-if="selectedRun" class="run-summary">
          <div>
            <span class="summary-label">模型</span>
            <strong>{{ selectedRun.provider }} / {{ selectedRun.modelName }}</strong>
          </div>
          <div>
            <span class="summary-label">进度</span>
            <strong>{{ selectedRun.processedCount }}/{{ selectedRun.reviewCount }}</strong>
          </div>
          <div>
            <span class="summary-label">失败</span>
            <strong>{{ selectedRun.failedCount }} · {{ selectedRun.failureRatePercent }}%</strong>
          </div>
          <div>
            <span class="summary-label">速度</span>
            <strong>{{ selectedRun.throughputPerMinute ?? "-" }}/分钟</strong>
          </div>
        </div>

        <a-alert
          v-if="selectedRun?.status === 'queued' && !hasWorkerLog"
          type="warning"
          show-icon
          class="queue-alert"
          message="任务仍在排队"
          description="如果长时间只有 queued 记录，且没有 Worker picked up analysis run，通常说明 worker 没有运行、Redis 队列未连通，或 worker 还没有消费到该任务。"
        />

        <a-alert v-if="selectedRun?.lastError" type="error" show-icon class="queue-alert" :message="selectedRun.lastError" />

        <div class="logs-box">
          <div v-if="!selectedTask" class="logs-empty">选择任务后查看日志</div>
          <div v-else-if="!selectedRun" class="logs-empty">该任务暂无分析批次</div>
          <div v-else-if="!logs.length" class="logs-empty">暂无日志，等待 worker 写入</div>
          <div v-else-if="!filteredLogs.length" class="logs-empty">当前筛选下暂无日志</div>
          <div v-for="log in filteredLogs" :key="log.id" class="log-line" :class="`log-${log.level}`">
            <span class="log-time">{{ formatTime(log.createdAt) }}</span>
            <a-tag :color="logColor(log.level)" class="log-level">{{ log.level }}</a-tag>
            <span class="log-message">{{ log.message }}</span>
            <pre v-if="log.meta" class="log-meta">{{ formatMeta(log.meta) }}</pre>
          </div>
        </div>
      </section>
    </div>
  </div>

  <TaskImportModal :open="showImport" @close="showImport = false" @success="handleImportSuccess" />
  <TaskImportModal
    :open="showAppendImport"
    :append-task="appendTask"
    @close="closeAppendImport"
    @success="handleImportSuccess"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Modal, message } from "ant-design-vue";
import {
  CloudUploadOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  MoreOutlined,
  ReloadOutlined,
  RobotOutlined,
  StopOutlined,
  TableOutlined
} from "@ant-design/icons-vue";
import type { AnalysisRunDTO, AnalysisRunLogDTO, TaskListItem, TaskStatusCounts, TaskStatusFilter } from "@review-ai/shared";
import TaskImportModal from "@/components/TaskImportModal.vue";
import { cancelRun, createRun, deleteTask, fetchRunLogs, fetchRuns, fetchTaskList } from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const route = useRoute();
const {
  tasks,
  selectedTask,
  selectedTaskId,
  loadingTasks,
  workspace,
  workspaces,
  currentUser,
  setSelectedTask
} = useTaskStore();
const runs = ref<AnalysisRunDTO[]>([]);
const logs = ref<AnalysisRunLogDTO[]>([]);
const selectedRun = ref<AnalysisRunDTO | null>(null);
const loading = ref(false);
const starting = ref(false);
const retryingRunId = ref<string | null>(null);
const deletingTaskId = ref<string | null>(null);
const autoRefresh = ref(true);
const logLevelFilter = ref<"all" | "warn" | "error">("all");
const showImport = ref(false);
const showAppendImport = ref(false);
const appendTask = ref<TaskListItem | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;
const requestedRunId = computed(() => (typeof route.query.runId === "string" ? route.query.runId : ""));
const taskRows = ref<TaskListItem[]>(tasks.value);
const taskListPage = ref(1);
const taskListPageSize = ref(10);
const taskListTotal = ref(tasks.value.length);

function emptyTaskStatusCounts(): TaskStatusCounts {
  return {
    all: 0,
    draft: 0,
    imported: 0,
    analyzing: 0,
    completed: 0,
    failed: 0
  };
}

function taskStatusCountsFromRows(rows: TaskListItem[]): TaskStatusCounts {
  const counts = emptyTaskStatusCounts();
  for (const row of rows) {
    counts[row.status] += 1;
    counts.all += 1;
  }
  return counts;
}

const taskStatusFilter = ref<TaskStatusFilter>("all");
const taskStatusCounts = ref<TaskStatusCounts>(taskStatusCountsFromRows(tasks.value));

const currentWorkspaceRole = computed(() => {
  const slug = workspace.value?.slug;
  return workspaces.value.find((item) => item.slug === slug)?.role || null;
});

const canWriteWorkspace = computed(() => {
  return Boolean(
    currentUser.value?.isSuperAdmin ||
      currentWorkspaceRole.value === "owner" ||
      currentWorkspaceRole.value === "admin" ||
      currentWorkspaceRole.value === "analyst"
  );
});

const taskColumns = computed(() => [
  { title: "任务", key: "task", width: 260 },
  ...(currentUser.value?.isSuperAdmin ? [{ title: "所属用户/空间", key: "workspace", width: 210 }] : []),
  { title: "来源", dataIndex: "sourceChannel", key: "sourceChannel", width: 110 },
  { title: "分析类型", key: "analysisType", width: 120 },
  { title: "导入状态", key: "taskStatus", width: 120 },
  { title: "分析状态", key: "analysisStatus", width: 260 },
  { title: "创建时间", key: "createdAt", width: 180 },
  { title: "操作", key: "actions", width: 280 }
]);

const runColumns = [
  { title: "状态", key: "status", width: 110 },
  { title: "模型", dataIndex: "modelName", key: "modelName", width: 180 },
  { title: "服务商", dataIndex: "provider", key: "provider", width: 110 },
  { title: "进度", key: "progress", width: 320 },
  { title: "开始/结束", key: "time", width: 180 },
  { title: "操作", key: "action", width: 180 }
];

const taskStatusOptions = computed(() => {
  const counts = taskStatusCounts.value;
  return [
    { label: `全部 ${formatCount(counts.all)}`, value: "all" },
    { label: `草稿 ${formatCount(counts.draft)}`, value: "draft" },
    { label: `已导入 ${formatCount(counts.imported)}`, value: "imported" },
    { label: `分析中 ${formatCount(counts.analyzing)}`, value: "analyzing" },
    { label: `已完成 ${formatCount(counts.completed)}`, value: "completed" },
    { label: `失败 ${formatCount(counts.failed)}`, value: "failed" }
  ];
});

const taskPagination = computed(() => ({
  current: taskListPage.value,
  pageSize: taskListPageSize.value,
  total: taskListTotal.value,
  showSizeChanger: true,
  pageSizeOptions: ["10", "20", "50", "100"],
  showTotal: (total: number) => `共 ${formatCount(total)} 个任务`
}));

const logLevelOptions = [
  { label: "全部", value: "all" },
  { label: "警告", value: "warn" },
  { label: "错误", value: "error" }
];

const hasWorkerLog = computed(() => logs.value.some((log) => log.message.includes("Worker picked up")));
const filteredLogs = computed(() =>
  logLevelFilter.value === "all" ? logs.value : logs.value.filter((log) => log.level === logLevelFilter.value)
);
const activeRuns = computed(() => runs.value.filter((run) => ["queued", "running"].includes(run.status)));
const stalledRuns = computed(() => activeRuns.value.filter((run) => run.stalled));
const stalledRunCount = computed(() => stalledRuns.value.length);
const longestStalledRun = computed(() => {
  return [...stalledRuns.value].sort((a, b) => b.lastActivityAgoSeconds - a.lastActivityAgoSeconds)[0] || null;
});
const latestActivityRun = computed(() => {
  return [...runs.value].sort((a, b) => b.lastActivityAgoSeconds - a.lastActivityAgoSeconds).at(-1) || null;
});
const activeRunProgressText = computed(() => {
  if (!activeRuns.value.length) {
    return "暂无运行批次";
  }
  const processed = activeRuns.value.reduce((total, run) => total + run.processedCount, 0);
  const total = activeRuns.value.reduce((sum, run) => sum + run.reviewCount, 0);
  return `${processed}/${total}`;
});
const activeRunProgressNote = computed(() => {
  return activeRuns.value.length ? `${activeRuns.value.length} 个批次正在排队或分析` : "没有排队或分析批次";
});
const activeFailureRateText = computed(() => {
  const reviewCount = activeRuns.value.reduce((total, run) => total + run.reviewCount, 0);
  if (!reviewCount) {
    return "-";
  }
  const failedCount = activeRuns.value.reduce((total, run) => total + run.failedCount, 0);
  return `${Number(((failedCount / reviewCount) * 100).toFixed(1))}%`;
});
const activeFailureRateNote = computed(() => {
  if (!activeRuns.value.length) {
    return "暂无运行批次";
  }
  const failedCount = activeRuns.value.reduce((total, run) => total + run.failedCount, 0);
  return `运行批次失败 ${failedCount} 条`;
});
const analysisHealthStatusLabel = computed(() => {
  if (stalledRunCount.value) {
    return "需要检查";
  }
  if (activeRuns.value.length) {
    return "运行中";
  }
  return "空闲";
});
const analysisHealthStatusColor = computed(() => {
  if (stalledRunCount.value) {
    return "orange";
  }
  if (activeRuns.value.length) {
    return "blue";
  }
  return "green";
});
const stalledRunSummary = computed(() => {
  if (!selectedTask.value) {
    return "选择任务后查看批次";
  }
  if (!longestStalledRun.value) {
    return activeRuns.value.length ? "运行批次正常写入日志" : "暂无运行中的分析批次";
  }
  return `最长无日志 ${durationLabel(longestStalledRun.value.lastActivityAgoSeconds)} · ${shortRunName(longestStalledRun.value)}`;
});
const latestRunActivityText = computed(() => {
  if (!latestActivityRun.value?.lastActivityAt) {
    return "-";
  }
  return `${durationLabel(latestActivityRun.value.lastActivityAgoSeconds)}前`;
});
const latestRunActivityNote = computed(() => {
  return latestActivityRun.value ? shortRunName(latestActivityRun.value) : "暂无分析批次";
});

function canCancel(run: AnalysisRunDTO) {
  return ["queued", "running"].includes(run.status);
}

function canRetry(run: AnalysisRunDTO) {
  return canWriteWorkspace.value && ["failed", "partial_failed"].includes(run.status);
}

function canDeleteTask(task: TaskListItem) {
  return canWriteWorkspace.value && !["queued", "running"].includes(String(task.latestRunStatus || ""));
}

function runProgress(run: AnalysisRunDTO) {
  return run.progressPercent;
}

function taskRunProgressStatus(task: TaskListItem) {
  if (task.latestRunStatus === "failed") {
    return "exception";
  }
  if (task.latestRunStatus === "completed") {
    return "success";
  }
  return "active";
}

function taskRunMetricSummary(task: TaskListItem) {
  const parts = [
    `已处理 ${task.latestRunProcessedCount}/${task.latestRunReviewCount}`,
    `成功 ${task.latestRunSuccessCount}`,
    `失败 ${task.latestRunFailedCount}`,
    task.latestRunFailureRatePercent > 0 ? `失败率 ${task.latestRunFailureRatePercent}%` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function progressStatus(run: AnalysisRunDTO) {
  if (run.status === "failed") {
    return "exception";
  }
  if (run.status === "completed") {
    return "success";
  }
  return "active";
}

function taskStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    draft: "草稿",
    imported: "已导入",
    analyzing: "分析中",
    completed: "已完成",
    failed: "失败"
  };
  return status ? labels[status] || status : "未知";
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

function taskStatusColor(status?: string | null) {
  if (status === "completed" || status === "imported") {
    return "success";
  }
  if (status === "analyzing") {
    return "processing";
  }
  if (status === "failed") {
    return "error";
  }
  return "default";
}

function runStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    queued: "排队中",
    running: "分析中",
    completed: "已完成",
    partial_failed: "部分失败",
    failed: "失败"
  };
  return status ? labels[status] || status : "尚未分析";
}

function runStatusColor(status?: string | null) {
  if (status === "running" || status === "queued") {
    return "processing";
  }
  if (status === "completed") {
    return "success";
  }
  if (status === "partial_failed") {
    return "warning";
  }
  if (status === "failed") {
    return "error";
  }
  return "default";
}

function logColor(level: string) {
  if (level === "error") {
    return "red";
  }
  if (level === "warn") {
    return "orange";
  }
  return "blue";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function formatCount(value?: number | null) {
  return value === null || value === undefined ? "-" : value.toLocaleString();
}

function errorSummary(value?: string | null) {
  const text = String(value || "").trim();
  return text.length > 28 ? `${text.slice(0, 28)}...` : text;
}

function formatMeta(meta: unknown) {
  return JSON.stringify(meta, null, 2);
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

function shortRunName(run: AnalysisRunDTO) {
  const text = `${run.provider} / ${run.modelName}`;
  return text.length > 30 ? `${text.slice(0, 30)}...` : text;
}

function runMetricSummary(run: AnalysisRunDTO) {
  const parts = [
    `耗时 ${durationLabel(run.durationSeconds)}`,
    run.throughputPerMinute !== null ? `速度 ${run.throughputPerMinute}/分钟` : "",
    run.estimatedRemainingSeconds !== null ? `预计剩余 ${durationLabel(run.estimatedRemainingSeconds)}` : "",
    run.lastActivityAt ? `最后日志 ${durationLabel(run.lastActivityAgoSeconds)}前` : ""
  ].filter(Boolean);
  return parts.join(" · ");
}

function taskRowClassName(record: TaskListItem) {
  return record.id === selectedTask.value?.id ? "selected-task-row" : "";
}

function runRowClassName(record: AnalysisRunDTO) {
  return record.id === selectedRun.value?.id ? "selected-run-row" : "";
}

function taskRowProps(record: TaskListItem) {
  return {
    onClick: () => openLogs(record)
  };
}

function runRowProps(record: AnalysisRunDTO) {
  return {
    onClick: () => selectRun(record)
  };
}

function selectTask(task: TaskListItem) {
  if (selectedTask.value?.id !== task.id) {
    selectedRun.value = null;
    logs.value = [];
  }
  setSelectedTask(task.id);
  router.replace(`/tasks/${task.id}/runs`);
}

function openReviews(task: TaskListItem) {
  setSelectedTask(task.id);
  router.push(`/tasks/${task.id}/reviews`);
}

function openReport(task: TaskListItem) {
  setSelectedTask(task.id);
  router.push(`/tasks/${task.id}/report`);
}

function openLogs(task: TaskListItem) {
  selectTask(task);
}

function openActions(task: TaskListItem) {
  setSelectedTask(task.id);
  router.push(`/tasks/${task.id}/actions`);
}

function appendReviews(task: TaskListItem) {
  appendTask.value = task;
  showAppendImport.value = true;
}

function closeAppendImport() {
  showAppendImport.value = false;
  appendTask.value = null;
}

async function removeTask(task: TaskListItem) {
  if (!canDeleteTask(task)) {
    return;
  }
  deletingTaskId.value = task.id;
  try {
    await deleteTask(task.id);
    message.success("分析任务已删除");
    if (selectedTask.value?.id === task.id) {
      setSelectedTask("");
      selectedRun.value = null;
      logs.value = [];
    }
    tasks.value = tasks.value.filter((item) => item.id !== task.id);
    taskRows.value = taskRows.value.filter((item) => item.id !== task.id);
    await loadTaskPage();
    if (selectedTask.value) {
      router.replace(`/tasks/${selectedTask.value.id}/runs`);
    } else {
      router.replace("/analysis-runs");
    }
    await loadRuns();
    await loadLogs();
  } finally {
    deletingTaskId.value = null;
  }
}

function confirmRemoveTask(task: TaskListItem) {
  if (!canDeleteTask(task) || deletingTaskId.value === task.id) {
    return;
  }
  Modal.confirm({
    title: "删除分析任务",
    content: "评论、分析结果、报告分享和行动项都会被删除。",
    okText: "删除",
    cancelText: "取消",
    okButtonProps: { danger: true },
    async onOk() {
      await removeTask(task);
    }
  });
}

function mergeTaskRowsIntoStore(rows: TaskListItem[]) {
  const rowIds = new Set(rows.map((task) => task.id));
  tasks.value = [...rows, ...tasks.value.filter((task) => !rowIds.has(task.id))];
}

async function loadTaskPage(options: { targetTaskId?: string; resetPage?: boolean } = {}) {
  if (options.resetPage) {
    taskListPage.value = 1;
  }
  loadingTasks.value = true;
  try {
    const result = await fetchTaskList({
      taskId: options.targetTaskId || selectedTaskId.value || undefined,
      status: taskStatusFilter.value,
      page: taskListPage.value,
      pageSize: taskListPageSize.value
    });
    if (result.items.length === 0 && result.total > 0 && result.page > 1) {
      taskListPage.value = result.page - 1;
      await loadTaskPage(options);
      return;
    }

    taskRows.value = result.items;
    taskListPage.value = result.page;
    taskListPageSize.value = result.pageSize;
    taskListTotal.value = result.total;
    taskStatusCounts.value = result.statusCounts;
    mergeTaskRowsIntoStore(result.items);

    if (options.targetTaskId && result.items.some((task) => task.id === options.targetTaskId)) {
      setSelectedTask(options.targetTaskId);
    } else if (!selectedTask.value && result.items[0]) {
      setSelectedTask(result.items[0].id);
    }
  } finally {
    loadingTasks.value = false;
  }
}

async function handleTaskStatusChange() {
  taskListPage.value = 1;
  await loadTaskPage();
}

async function handleTaskTableChange(pagination: { current?: number; pageSize?: number }) {
  const nextPageSize = pagination.pageSize || taskListPageSize.value;
  taskListPage.value = nextPageSize === taskListPageSize.value ? pagination.current || 1 : 1;
  taskListPageSize.value = nextPageSize;
  await loadTaskPage();
}

async function loadRuns() {
  if (!selectedTask.value) {
    runs.value = [];
    selectedRun.value = null;
    logs.value = [];
    return;
  }

  runs.value = await fetchRuns(selectedTask.value.id);
  const routeRun = requestedRunId.value ? runs.value.find((run) => run.id === requestedRunId.value) || null : null;
  if (routeRun) {
    if (selectedRun.value?.id !== routeRun.id) {
      logs.value = [];
    }
    selectedRun.value = routeRun;
  } else if (!selectedRun.value || !runs.value.some((run) => run.id === selectedRun.value?.id)) {
    selectedRun.value = runs.value[0] || null;
    logs.value = [];
  } else {
    selectedRun.value = runs.value.find((run) => run.id === selectedRun.value?.id) || selectedRun.value;
  }
}

async function loadLogs(incremental = false) {
  if (!selectedTask.value || !selectedRun.value) {
    logs.value = [];
    return;
  }

  const after = incremental ? logs.value.at(-1)?.createdAt : undefined;
  const result = await fetchRunLogs(selectedTask.value.id, selectedRun.value.id, { after, limit: incremental ? 200 : 300 });
  if (result.run) {
    selectedRun.value = result.run;
  }
  logs.value = incremental ? [...logs.value, ...result.logs] : result.logs;
}

async function refreshAll() {
  loading.value = true;
  try {
    await loadTaskPage();
    await loadRuns();
    await loadLogs();
  } finally {
    loading.value = false;
  }
}

async function selectRun(run: AnalysisRunDTO) {
  selectedRun.value = run;
  logs.value = [];
  if (selectedTask.value) {
    await router.replace({ path: `/tasks/${selectedTask.value.id}/runs`, query: { runId: run.id } });
  }
  await loadLogs();
}

async function startAnalysis() {
  if (!selectedTask.value) {
    return;
  }
  starting.value = true;
  try {
    const run = await createRun(selectedTask.value.id);
    message.success("分析任务已加入队列");
    await loadTaskPage({ targetTaskId: selectedTask.value.id });
    await loadRuns();
    await selectRun(run);
  } finally {
    starting.value = false;
  }
}

async function retryOne(run: AnalysisRunDTO) {
  if (!selectedTask.value || !canRetry(run) || retryingRunId.value) {
    return;
  }
  retryingRunId.value = run.id;
  try {
    const nextRun = await createRun(selectedTask.value.id);
    message.success("分析任务已重新加入队列");
    await loadTaskPage({ targetTaskId: selectedTask.value.id });
    await loadRuns();
    await selectRun(nextRun);
  } finally {
    retryingRunId.value = null;
  }
}

async function cancelOne(run: AnalysisRunDTO) {
  if (!selectedTask.value) {
    return;
  }
  await cancelRun(selectedTask.value.id, run.id);
  message.success("已发送停止请求");
  await refreshAll();
}

async function cancelSelectedRun() {
  if (selectedRun.value) {
    await cancelOne(selectedRun.value);
  }
}

async function handleImportSuccess(taskId: string) {
  showImport.value = false;
  showAppendImport.value = false;
  appendTask.value = null;
  if (taskId.startsWith("crawl-job:")) {
    router.replace("/crawl-jobs");
    return;
  }
  taskStatusFilter.value = "all";
  taskListPage.value = 1;
  setSelectedTask(taskId);
  await loadTaskPage({ targetTaskId: taskId });
  router.replace(`/tasks/${taskId}/runs`);
  await refreshAll();
}

function startPolling() {
  stopPolling();
  timer = setInterval(async () => {
    if (!autoRefresh.value || !selectedTask.value) {
      return;
    }
    await loadRuns();
    await loadLogs(true);
  }, 2500);
}

function stopPolling() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

watch(
  () => selectedTask.value?.id,
  async () => {
    await loadRuns();
    await loadLogs();
  },
  { immediate: true }
);

watch(
  () => [route.params.taskId, route.query.taskId],
  async ([paramTaskId, queryTaskId]) => {
    const taskId = typeof paramTaskId === "string" ? paramTaskId : typeof queryTaskId === "string" ? queryTaskId : "";
    if (taskId && taskId !== selectedTask.value?.id) {
      taskStatusFilter.value = "all";
      taskListPage.value = 1;
      setSelectedTask(taskId);
      await loadTaskPage({ targetTaskId: taskId });
    }
  },
  { immediate: true }
);

watch(
  () => route.query.runId,
  async () => {
    if (!selectedTask.value || !requestedRunId.value || selectedRun.value?.id === requestedRunId.value) {
      return;
    }
    await loadRuns();
    await loadLogs();
  }
);

onMounted(async () => {
  await loadTaskPage({ targetTaskId: selectedTaskId.value || undefined });
  startPolling();
});
onUnmounted(stopPolling);
</script>

<style scoped>
.runs-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.runs-hero,
.panel-head {
  align-items: center;
  justify-content: space-between;
}

.panel-head {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.task-list-panel,
.runs-table-panel,
.run-log-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.task-name-cell {
  display: grid;
  gap: 4px;
}

.task-name-cell span {
  color: #64748b;
  font-size: 12px;
}

.task-list-toolbar {
  justify-content: flex-end;
}

.task-status-filter {
  max-width: min(100%, 680px);
  overflow-x: auto;
}

.task-analysis-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.task-analysis-cell :deep(.ant-tag) {
  justify-self: start;
  margin-inline-end: 0;
}

.task-run-stalled-tag {
  justify-self: start;
}

.task-run-error {
  color: #b91c1c;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-actions {
  gap: 6px !important;
  flex-wrap: nowrap !important;
}

.task-actions :deep(.ant-btn) {
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

:global(.task-action-menu) {
  min-width: 150px;
}

:global(.task-action-menu .ant-dropdown-menu-item) {
  gap: 8px;
  min-height: 36px;
}

.runs-layout {
  display: grid;
  grid-template-columns: minmax(560px, 1.15fr) minmax(420px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.analysis-health-strip {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(59, 130, 246, 0.14);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  display: grid;
  gap: 16px;
  padding: 18px 20px;
}

.analysis-health-strip-alert {
  border-color: rgba(245, 158, 11, 0.38);
  box-shadow: 0 12px 30px rgba(245, 158, 11, 0.12);
}

.analysis-health-head {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.analysis-health-metrics {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.analysis-health-metric {
  border-left: 1px solid rgba(148, 163, 184, 0.24);
  display: grid;
  gap: 4px;
  min-width: 0;
  padding-left: 14px;
}

.analysis-health-metric:first-child {
  border-left: 0;
  padding-left: 0;
}

.analysis-health-metric span,
.analysis-health-metric small {
  color: #64748b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-health-metric strong {
  color: #0f172a;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.run-progress-cell {
  display: grid;
  gap: 4px;
}

.analysis-stalled-tag {
  justify-self: start;
  margin-inline-end: 0;
}

.run-log-panel {
  min-height: 640px;
}

.log-panel-head,
.run-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.log-title {
  font-size: 16px;
  font-weight: 700;
}

.log-head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.muted,
.summary-label {
  color: #64748b;
  font-size: 12px;
}

.run-summary {
  margin: 14px 0;
  padding: 12px;
  border-radius: 8px;
  background: #f8fafc;
}

.run-summary > div {
  display: grid;
  gap: 4px;
}

.queue-alert {
  margin-bottom: 12px;
}

.logs-box {
  height: 480px;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #0f172a;
  padding: 12px;
  color: #e2e8f0;
  font-family: Consolas, "Courier New", monospace;
}

.logs-empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: #94a3b8;
}

.log-line {
  display: grid;
  grid-template-columns: 148px 68px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  padding: 7px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 12px;
}

.log-time {
  color: #94a3b8;
}

.log-message {
  overflow-wrap: anywhere;
}

.log-meta {
  grid-column: 3;
  margin: 4px 0 0;
  padding: 8px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.82);
  color: #cbd5e1;
  white-space: pre-wrap;
}

.log-error .log-message {
  color: #fecaca;
}

.log-warn .log-message {
  color: #fed7aa;
}

:global(.selected-task-row) td,
:global(.selected-run-row) td {
  background: #eff6ff !important;
}

@media (max-width: 1120px) {
  .runs-layout {
    grid-template-columns: 1fr;
  }

  .analysis-health-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .analysis-health-metric:nth-child(odd) {
    border-left: 0;
    padding-left: 0;
  }
}

@media (max-width: 760px) {
  .task-actions {
    gap: 6px !important;
  }

  .analysis-health-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .analysis-health-metrics {
    grid-template-columns: 1fr;
  }

  .analysis-health-metric {
    border-left: 0;
    border-top: 1px solid rgba(148, 163, 184, 0.24);
    padding-left: 0;
    padding-top: 12px;
  }

  .analysis-health-metric:first-child {
    border-top: 0;
    padding-top: 0;
  }

  .task-actions :deep(.ant-btn) {
    padding-inline: 8px;
  }

  .run-log-panel {
    min-height: auto;
  }

  .run-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .logs-box {
    height: 360px;
    padding: 10px;
  }

  .log-line {
    grid-template-columns: 1fr auto;
    gap: 6px;
  }

  .log-message {
    grid-column: 1 / -1;
  }

  .log-meta {
    grid-column: 1 / -1;
    max-width: 100%;
    overflow: auto;
  }
}
</style>
