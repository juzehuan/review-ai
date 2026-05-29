<template>
  <div class="workspace-overview-page">
    <div class="page-toolbar overview-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">空间概览</div>
        <div class="toolbar-subtitle">从空间维度查看任务、用量和整体分析推进状态。</div>
      </div>
      <a-space wrap>
        <a-button @click="refreshTasks" :loading="loadingTasks">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="router.push('/analysis-runs')">
          <template #icon><UnorderedListOutlined /></template>
          分析任务
        </a-button>
      </a-space>
    </div>

    <div class="overview-band workspace-band">
      <div class="overview-copy">
        <div class="overview-kicker">当前空间</div>
        <h2>{{ workspace?.name || "Workspace" }}</h2>
        <p>{{ workspace?.slug || "-" }} · {{ workspace?.planTier || "free" }}</p>
      </div>
      <div class="quota-strip">
        <div>
          <span>评论用量</span>
          <strong>{{ reviewUsage }}</strong>
        </div>
        <div>
          <span>分析用量</span>
          <strong>{{ runUsage }}</strong>
        </div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">任务总数</div>
        <div class="stat-value">{{ totalTasks }}</div>
        <div class="stat-note">空间内所有分析项目</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-label">已完成分析</div>
        <div class="stat-value">{{ completedRuns }}</div>
        <div class="stat-note">最新批次完成的任务</div>
      </div>
      <div class="stat-card stat-card-accent">
        <div class="stat-label">进行中</div>
        <div class="stat-value">{{ activeRuns }}</div>
        <div class="stat-note">排队或分析中的任务</div>
      </div>
    </div>

    <section class="workspace-table-panel">
      <div class="panel-head">
        <div>
          <div class="panel-label">Tasks</div>
          <div class="settings-section-title">最近分析任务</div>
        </div>
        <a-button type="link" @click="router.push('/analysis-runs')">查看全部</a-button>
      </div>

      <a-table
        row-key="id"
        size="middle"
        :columns="columns"
        :data-source="recentTasks"
        :pagination="false"
        :loading="loadingTasks"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="task-name-cell">
              <strong>{{ record.name }}</strong>
              <span>{{ record.productName }}</span>
            </div>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="taskStatusColor(record.status)">{{ taskStatusLabel(record.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'analysisType'">
            <a-tag>{{ analysisTypeLabel(record.analysisType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'run'">
            <a-tag :color="runStatusColor(record.latestRunStatus)">{{ runStatusLabel(record.latestRunStatus) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button size="small" @click="openTask(record)">打开</a-button>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ReloadOutlined, UnorderedListOutlined } from "@ant-design/icons-vue";
import type { TaskListItem } from "@review-ai/shared";
import { useTaskStore } from "@/composables";

const router = useRouter();
const { tasks, workspace, loadingTasks, refreshTasks, setSelectedTask } = useTaskStore();

const columns = [
  { title: "任务", key: "name", width: 260 },
  { title: "来源", dataIndex: "sourceChannel", key: "sourceChannel", width: 120 },
  { title: "类型", key: "analysisType", width: 110 },
  { title: "导入状态", key: "status", width: 120 },
  { title: "分析状态", key: "run", width: 130 },
  { title: "创建时间", key: "createdAt", width: 180 },
  { title: "操作", key: "action", width: 90 }
];

const totalTasks = computed(() => tasks.value.length);
const completedRuns = computed(() => tasks.value.filter((task) => task.latestRunStatus === "completed").length);
const activeRuns = computed(() =>
  tasks.value.filter((task) => task.latestRunStatus === "queued" || task.latestRunStatus === "running").length
);
const recentTasks = computed(() => tasks.value.slice(0, 8));
const reviewUsage = computed(() => {
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodReviewCount}/${workspace.value.monthlyReviewLimit}`;
});
const runUsage = computed(() => {
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodRunCount}/${workspace.value.monthlyRunLimit}`;
});

function openTask(task: TaskListItem) {
  setSelectedTask(task.id);
  router.push(`/tasks/${task.id}/runs`);
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

function formatTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

onMounted(() => {
  if (!tasks.value.length) {
    refreshTasks();
  }
});
</script>

<style scoped>
.workspace-overview-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.overview-hero {
  align-items: center;
  justify-content: space-between;
}

.workspace-band {
  align-items: center;
}

.quota-strip {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.quota-strip > div {
  min-width: 140px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  gap: 4px;
}

.quota-strip span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
}

.quota-strip strong {
  color: #fff;
  font-size: 20px;
}

.workspace-table-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.task-name-cell {
  display: grid;
  gap: 4px;
}

.task-name-cell span {
  color: #64748b;
  font-size: 12px;
}
</style>
