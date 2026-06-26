<template>
  <div class="workspace-overview-page">
    <div class="page-toolbar overview-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">用户后台</div>
        <div class="toolbar-subtitle">查看你的分析任务、评论额度和最近的处理进度。</div>
      </div>
      <a-space wrap>
        <a-button href="/downloads/ReviewIQ-ordinary-user-manual.docx" download="ReviewIQ-普通用户操作手册.docx">
          <template #icon><DownloadOutlined /></template>
          下载操作手册
        </a-button>
        <a-button @click="router.push('/help')">
          <template #icon><QuestionCircleOutlined /></template>
          帮助中心
        </a-button>
        <a-button @click="refreshTasks" :loading="loadingTasks">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button type="primary" @click="router.push('/analysis-runs')">
          <template #icon><UnorderedListOutlined /></template>
          分析记录
        </a-button>
      </a-space>
    </div>

    <div class="overview-band workspace-band">
      <div class="overview-copy">
        <div class="overview-kicker">当前账号</div>
        <h2>{{ currentUser?.name || "ReviewIQ 用户" }}</h2>
        <p>{{ currentUser?.email || "-" }} · {{ workspace?.planTier || "pro" }}</p>
      </div>
      <div class="quota-strip">
        <div>
          <span>评论额度</span>
          <strong>{{ reviewUsage }}</strong>
        </div>
        <div>
          <span>分析次数</span>
          <strong>{{ runUsage }}</strong>
        </div>
      </div>
    </div>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">任务总数</div>
        <div class="stat-value">{{ totalTasks }}</div>
        <div class="stat-note">当前账号下的分析项目</div>
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
        class="overview-task-table"
        row-key="id"
        size="middle"
        :columns="columns"
        :data-source="recentTasks"
        :pagination="false"
        :loading="loadingTasks"
        :scroll="{ x: 1040 }"
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
import { DownloadOutlined, QuestionCircleOutlined, ReloadOutlined, UnorderedListOutlined } from "@ant-design/icons-vue";
import type { TaskListItem } from "@review-ai/shared";
import { useTaskStore } from "@/composables";

const router = useRouter();
const { tasks, workspace, currentUser, loadingTasks, refreshTasks, setSelectedTask } = useTaskStore();

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
    return "社媒评论";
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
  return status ? labels[status] || status : "未分析";
}

function runStatusColor(status?: string | null) {
  if (status === "completed") {
    return "success";
  }
  if (status === "queued" || status === "running") {
    return "processing";
  }
  if (status === "failed" || status === "partial_failed") {
    return "error";
  }
  return "default";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

onMounted(refreshTasks);
</script>
