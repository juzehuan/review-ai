<template>
  <div class="workspace-overview-page">
    <div class="page-toolbar overview-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">{{ t("workspace.title") }}</div>
        <div class="toolbar-subtitle">{{ t("workspace.subtitle") }}</div>
      </div>
      <a-space wrap>
        <a-button href="/downloads/ReviewIQ-ordinary-user-manual.docx" :download="t('workspace.manualFilename')">
          <template #icon><DownloadOutlined /></template>
          {{ t("workspace.downloadManual") }}
        </a-button>
        <a-button @click="router.push('/help')">
          <template #icon><QuestionCircleOutlined /></template>
          {{ t("nav.helpCenter") }}
        </a-button>
        <a-button @click="refreshTasks" :loading="loadingTasks">
          <template #icon><ReloadOutlined /></template>
          {{ t("common.refresh") }}
        </a-button>
        <a-button type="primary" @click="router.push('/analysis-runs')">
          <template #icon><UnorderedListOutlined /></template>
          {{ t("nav.analysisRuns") }}
        </a-button>
      </a-space>
    </div>

    <div class="overview-band workspace-band">
      <div class="overview-copy">
        <div class="overview-kicker">{{ t("common.currentAccount") }}</div>
        <h2>{{ currentUser?.name || t("workspace.defaultUser") }}</h2>
        <p>{{ currentUser?.email || "-" }} · {{ workspace?.planTier || "pro" }}</p>
      </div>
      <div class="quota-strip">
        <div>
          <span>{{ t("workspace.reviewQuota") }}</span>
          <strong>{{ reviewUsage }}</strong>
        </div>
        <div>
          <span>{{ t("workspace.runQuota") }}</span>
          <strong>{{ runUsage }}</strong>
        </div>
      </div>
      <div class="quota-period-note">{{ quotaPeriodNote }}</div>
    </div>

    <div class="summary-grid">
      <div class="stat-card stat-card-primary">
        <div class="stat-label">{{ t("workspace.totalTasks") }}</div>
        <div class="stat-value">{{ totalTasks }}</div>
        <div class="stat-note">{{ t("workspace.totalTasksNote") }}</div>
      </div>
      <div class="stat-card stat-card-success">
        <div class="stat-label">{{ t("workspace.completedRuns") }}</div>
        <div class="stat-value">{{ completedRuns }}</div>
        <div class="stat-note">{{ t("workspace.completedRunsNote") }}</div>
      </div>
      <div class="stat-card stat-card-accent">
        <div class="stat-label">{{ t("workspace.activeRuns") }}</div>
        <div class="stat-value">{{ activeRuns }}</div>
        <div class="stat-note">{{ t("workspace.activeRunsNote") }}</div>
      </div>
    </div>

    <section class="workspace-table-panel">
      <div class="panel-head">
        <div>
          <div class="panel-label">{{ t("workspace.tasksKicker") }}</div>
          <div class="settings-section-title">{{ t("workspace.recentTasks") }}</div>
        </div>
        <a-button type="link" @click="router.push('/analysis-runs')">{{ t("common.viewAll") }}</a-button>
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
              <span v-if="currentUser?.isSuperAdmin">
                {{ record.workspaceOwnerName || record.workspaceOwnerEmail || "未设置负责人" }} · {{ record.workspaceName || record.workspaceSlug || record.workspaceId || "-" }}
              </span>
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
            <a-button size="small" @click="openTask(record)">{{ t("common.open") }}</a-button>
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
import { useI18n } from "@/i18n";

const router = useRouter();
const { locale, t } = useI18n();
const { tasks, workspace, currentUser, loadingTasks, refreshTasks, setSelectedTask } = useTaskStore();

const columns = computed(() => [
  { title: t("table.task"), key: "name", width: 260 },
  { title: t("table.source"), dataIndex: "sourceChannel", key: "sourceChannel", width: 120 },
  { title: t("table.type"), key: "analysisType", width: 110 },
  { title: t("table.importStatus"), key: "status", width: 120 },
  { title: t("table.analysisStatus"), key: "run", width: 130 },
  { title: t("table.createdAt"), key: "createdAt", width: 180 },
  { title: t("table.actions"), key: "action", width: 90 }
]);

const totalTasks = computed(() => tasks.value.length);
const completedRuns = computed(() => tasks.value.filter((task) => task.latestRunStatus === "completed").length);
const activeRuns = computed(() =>
  tasks.value.filter((task) => task.latestRunStatus === "queued" || task.latestRunStatus === "running").length
);
const recentTasks = computed(() => tasks.value.slice(0, 8));
const reviewUsage = computed(() => {
  if (currentUser.value?.isSuperAdmin) {
    return t("common.unlimited");
  }
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodReviewCount}/${workspace.value.monthlyReviewLimit}`;
});
const runUsage = computed(() => {
  if (currentUser.value?.isSuperAdmin) {
    return t("common.unlimited");
  }
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodRunCount}/${workspace.value.monthlyRunLimit}`;
});
const quotaPeriodNote = computed(() => {
  if (currentUser.value?.isSuperAdmin) {
    return t("workspace.quotaUnlimitedNote");
  }
  if (!workspace.value?.currentPeriodEndsAt) {
    return t("workspace.quotaPeriodUnknown");
  }
  return t("workspace.quotaPeriodNote", {
    days: workspace.value.currentPeriodRemainingDays ?? 0,
    date: formatDate(workspace.value.currentPeriodEndsAt)
  });
});

function openTask(task: TaskListItem) {
  setSelectedTask(task.id);
  router.push(`/tasks/${task.id}/runs`);
}

function taskStatusLabel(status?: string | null) {
  return status ? t(`status.task.${status}`) || status : t("status.task.unknown");
}

function analysisTypeLabel(type?: string | null) {
  if (type === "video") {
    return t("analysisType.video");
  }
  if (type === "tweet") {
    return t("analysisType.tweet");
  }
  return t("analysisType.product");
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
  return status ? t(`status.run.${status}`) || status : t("status.run.notAnalyzed");
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
  return new Date(value).toLocaleString(locale.value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(locale.value);
}

onMounted(refreshTasks);
</script>
