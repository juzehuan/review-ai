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
        <a-tag>{{ tasks.length }} 个任务</a-tag>
      </div>

      <a-table
        row-key="id"
        size="middle"
        :columns="taskColumns"
        :data-source="tasks"
        :pagination="{ pageSize: 10 }"
        :loading="loadingTasks"
        :scroll="{ x: 1440 }"
        :row-class-name="taskRowClassName"
        @row="taskRowProps"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task'">
            <div class="task-name-cell">
              <strong>{{ record.name }}</strong>
              <span>{{ record.productName }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'taskStatus'">
            <a-tag :color="taskStatusColor(record.status)">{{ taskStatusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'analysisType'">
            <a-tag>{{ analysisTypeLabel(record.analysisType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'analysisStatus'">
            <a-tag :color="runStatusColor(record.latestRunStatus)">{{ runStatusLabel(record.latestRunStatus) }}</a-tag>
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
              <a-button size="small" @click.stop="openLogs(record)">
                <template #icon><FileSearchOutlined /></template>
                分析日志
              </a-button>
              <a-button size="small" @click.stop="openActions(record)">
                <template #icon><CheckSquareOutlined /></template>
                行动项
              </a-button>
              <a-button size="small" :disabled="!canWriteWorkspace" @click.stop="appendReviews(record)">
                <template #icon><FileAddOutlined /></template>
                追加评论
              </a-button>
              <a-popconfirm title="确定删除该分析任务？评论、分析结果、报告分享和行动项都会被删除。" @confirm="removeTask(record)">
                <a-button
                  size="small"
                  danger
                  :disabled="!canDeleteTask(record)"
                  :loading="deletingTaskId === record.id"
                  @click.stop
                >
                  <template #icon><DeleteOutlined /></template>
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </section>

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
                <span>{{ record.successCount }}/{{ record.reviewCount }}，失败 {{ record.failedCount }}</span>
              </div>
            </template>
            <template v-else-if="column.key === 'time'">
              <div>{{ formatTime(record.startedAt) }}</div>
              <div class="muted">{{ formatTime(record.finishedAt) }}</div>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button size="small" @click.stop="selectRun(record)">日志</a-button>
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
          <a-tag v-if="selectedRun" :color="runStatusColor(selectedRun.status)">
            {{ runStatusLabel(selectedRun.status) }}
          </a-tag>
        </div>

        <div v-if="selectedRun" class="run-summary">
          <div>
            <span class="summary-label">模型</span>
            <strong>{{ selectedRun.provider }} / {{ selectedRun.modelName }}</strong>
          </div>
          <div>
            <span class="summary-label">进度</span>
            <strong>{{ selectedRun.successCount }}/{{ selectedRun.reviewCount }}</strong>
          </div>
          <div>
            <span class="summary-label">失败</span>
            <strong>{{ selectedRun.failedCount }}</strong>
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
          <div v-for="log in logs" :key="log.id" class="log-line" :class="`log-${log.level}`">
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
import { message } from "ant-design-vue";
import {
  CloudUploadOutlined,
  CheckSquareOutlined,
  DeleteOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  ReloadOutlined,
  RobotOutlined,
  StopOutlined,
  TableOutlined
} from "@ant-design/icons-vue";
import type { AnalysisRunDTO, AnalysisRunLogDTO, TaskListItem } from "@review-ai/shared";
import TaskImportModal from "@/components/TaskImportModal.vue";
import { cancelRun, createRun, deleteTask, fetchRunLogs, fetchRuns } from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const route = useRoute();
const {
  tasks,
  selectedTask,
  loadingTasks,
  workspace,
  workspaces,
  currentUser,
  refreshTasks,
  setSelectedTask
} = useTaskStore();
const runs = ref<AnalysisRunDTO[]>([]);
const logs = ref<AnalysisRunLogDTO[]>([]);
const selectedRun = ref<AnalysisRunDTO | null>(null);
const loading = ref(false);
const starting = ref(false);
const deletingTaskId = ref<string | null>(null);
const autoRefresh = ref(true);
const showImport = ref(false);
const showAppendImport = ref(false);
const appendTask = ref<TaskListItem | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

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

const taskColumns = [
  { title: "任务", key: "task", width: 260 },
  { title: "来源", dataIndex: "sourceChannel", key: "sourceChannel", width: 110 },
  { title: "分析类型", key: "analysisType", width: 120 },
  { title: "导入状态", key: "taskStatus", width: 120 },
  { title: "分析状态", key: "analysisStatus", width: 130 },
  { title: "创建时间", key: "createdAt", width: 180 },
  { title: "操作", key: "actions", width: 520 }
];

const runColumns = [
  { title: "状态", key: "status", width: 110 },
  { title: "模型", dataIndex: "modelName", key: "modelName", width: 180 },
  { title: "服务商", dataIndex: "provider", key: "provider", width: 110 },
  { title: "进度", key: "progress", width: 240 },
  { title: "开始/结束", key: "time", width: 180 },
  { title: "操作", key: "action", width: 130 }
];

const hasWorkerLog = computed(() => logs.value.some((log) => log.message.includes("Worker picked up")));

function canCancel(run: AnalysisRunDTO) {
  return ["queued", "running"].includes(run.status);
}

function canDeleteTask(task: TaskListItem) {
  return canWriteWorkspace.value && !["queued", "running"].includes(String(task.latestRunStatus || ""));
}

function runProgress(run: AnalysisRunDTO) {
  if (!run.reviewCount) {
    return 0;
  }
  return Math.min(Math.round((run.successCount / run.reviewCount) * 100), 100);
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

function formatMeta(meta: unknown) {
  return JSON.stringify(meta, null, 2);
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
    await refreshTasks();
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

async function loadRuns() {
  if (!selectedTask.value) {
    runs.value = [];
    selectedRun.value = null;
    logs.value = [];
    return;
  }

  runs.value = await fetchRuns(selectedTask.value.id);
  if (!selectedRun.value || !runs.value.some((run) => run.id === selectedRun.value?.id)) {
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
    await refreshTasks();
    await loadRuns();
    await loadLogs();
  } finally {
    loading.value = false;
  }
}

async function selectRun(run: AnalysisRunDTO) {
  selectedRun.value = run;
  logs.value = [];
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
    await refreshTasks();
    await loadRuns();
    await selectRun(run);
  } finally {
    starting.value = false;
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
  await refreshTasks();
  setSelectedTask(taskId);
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
  ([paramTaskId, queryTaskId]) => {
    const taskId = typeof paramTaskId === "string" ? paramTaskId : typeof queryTaskId === "string" ? queryTaskId : "";
    if (taskId && taskId !== selectedTask.value?.id) {
      setSelectedTask(taskId);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (!tasks.value.length) {
    await refreshTasks();
  }
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

.task-actions {
  gap: 8px 10px !important;
  flex-wrap: nowrap !important;
}

.task-actions :deep(.ant-btn) {
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.runs-layout {
  display: grid;
  grid-template-columns: minmax(560px, 1.15fr) minmax(420px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.run-progress-cell {
  display: grid;
  gap: 4px;
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
}
</style>
