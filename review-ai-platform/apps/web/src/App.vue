<template>
  <router-view v-if="isPublicRoute" />

  <a-layout v-else class="app-shell">
    <a-layout-sider theme="light" width="288" class="app-sidebar">
      <div class="brand-block">
        <div class="brand-mark">RI</div>
        <div class="brand-copy">
          <div class="brand-title">ReviewIQ</div>
          <div class="brand-subtitle">Customer Intelligence</div>
        </div>
      </div>

      <div class="workspace-card">
        <div class="workspace-card-top">
          <span>Workspace</span>
          <a-tag color="blue">{{ workspace?.planTier || "pro" }}</a-tag>
        </div>
        <a-select
          :value="workspace?.slug"
          class="workspace-select"
          :bordered="false"
          @change="handleWorkspaceChange"
        >
          <a-select-option v-for="item in workspaces" :key="item.slug" :value="item.slug">
            {{ item.name }}
          </a-select-option>
        </a-select>
        <div class="workspace-card-meta">{{ usageText }} reviews used</div>
        <a-progress :percent="usagePercent" :show-info="false" size="small" />
      </div>

      <nav class="side-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="side-nav-item"
          :class="{ active: route.path === item.path, disabled: item.disabled }"
          :disabled="item.disabled"
          @click="router.push(item.path)"
        >
          <component :is="item.icon" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="current-project">
        <div class="section-label">Current Project</div>
        <div class="project-card">
          <div class="project-name">{{ selectedTask?.name || "尚未选择项目" }}</div>
          <div class="project-desc">{{ selectedTask?.productName || "导入评论 CSV 后开始分析" }}</div>
          <div class="project-footer">
            <span>{{ selectedTask?.sourceChannel || "CSV" }}</span>
            <a-tag :color="runStatusColor(selectedTask?.latestRunStatus)">
              {{ runStatusLabel(selectedTask?.latestRunStatus) }}
            </a-tag>
          </div>
        </div>
      </div>

      <button type="button" class="new-project-button" :disabled="!canWriteWorkspace" @click="showImport = true">
        <PlusOutlined />
        <span>新建分析项目</span>
      </button>
    </a-layout-sider>

    <a-layout class="app-main">
      <header class="topbar">
        <div class="topbar-left">
          <div class="topbar-eyebrow">ReviewIQ Cloud</div>
          <div class="topbar-title">{{ currentTitle }}</div>
        </div>

        <div class="topbar-actions">
          <a-select
            :value="selectedTaskId || undefined"
            placeholder="切换分析项目"
            class="task-select"
            :loading="loadingTasks"
            @change="setSelectedTask"
          >
            <a-select-option v-for="task in tasks" :key="task.id" :value="task.id">
              {{ task.name }}
            </a-select-option>
          </a-select>
          <a-button @click="refreshTasks" :loading="loadingTasks">
            <template #icon><ReloadOutlined /></template>
          </a-button>
          <a-button type="primary" :disabled="!canWriteWorkspace" @click="showImport = true">
            <template #icon><CloudUploadOutlined /></template>
            导入评论
          </a-button>
          <a-button :disabled="!canWriteWorkspace || !selectedTask" @click="showAppendImport = true">
            <template #icon><FileAddOutlined /></template>
            追加评论
          </a-button>
          <a-dropdown>
            <button type="button" class="account-chip">
              <span class="account-avatar">{{ accountInitial }}</span>
              <span class="account-name">{{ currentUser?.name || "账号" }}</span>
            </button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="email" disabled>{{ currentUser?.email || "-" }}</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </header>

      <main class="app-content">
        <router-view />
      </main>
    </a-layout>
  </a-layout>

  <TaskImportModal :open="showImport" @close="showImport = false" @success="handleImportSuccess" />
  <TaskImportModal
    :open="showAppendImport"
    :append-task="selectedTask"
    @close="showAppendImport = false"
    @success="handleImportSuccess"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  BarChartOutlined,
  CloudUploadOutlined,
  CrownOutlined,
  FileAddOutlined,
  LogoutOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TableOutlined,
  TeamOutlined
} from "@ant-design/icons-vue";
import TaskImportModal from "@/components/TaskImportModal.vue";
import { getAuthToken, logout } from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const route = useRoute();
const showImport = ref(false);
const showAppendImport = ref(false);
const {
  tasks,
  workspace,
  workspaces,
  currentUser,
  selectedTask,
  selectedTaskId,
  loadingTasks,
  refreshTasks,
  bootstrapAuth,
  switchWorkspace,
  setSelectedTask,
  clearAuthState
} = useTaskStore();

const currentWorkspaceRole = computed(() => {
  const slug = workspace.value?.slug;
  return workspaces.value.find((item) => item.slug === slug)?.role || null;
});

const canManageUsers = computed(() => {
  return Boolean(
    currentUser.value?.isSuperAdmin ||
      currentWorkspaceRole.value === "owner" ||
      currentWorkspaceRole.value === "admin"
  );
});

const canWriteWorkspace = computed(() => {
  return Boolean(
    currentUser.value?.isSuperAdmin ||
      currentWorkspaceRole.value === "owner" ||
      currentWorkspaceRole.value === "admin" ||
      currentWorkspaceRole.value === "analyst"
  );
});

const navItems = computed(() => [
  { path: "/dashboard", label: "经营看板", icon: BarChartOutlined, disabled: false },
  { path: "/reviews", label: "评论工作台", icon: TableOutlined, disabled: false },
  ...(canManageUsers.value ? [{ path: "/users", label: "用户管理", icon: TeamOutlined, disabled: false }] : []),
  ...(currentUser.value?.isSuperAdmin
    ? [{ path: "/admin", label: "超管后台", icon: CrownOutlined, disabled: false }]
    : []),
  { path: "/settings", label: "空间设置", icon: SettingOutlined, disabled: false }
]);

const isPublicRoute = computed(() => Boolean(route.meta.public));
const currentTitle = computed(() => {
  if (route.path === "/reviews") {
    return "评论工作台";
  }
  if (route.path === "/users") {
    return "用户管理";
  }
  if (route.path === "/admin") {
    return "超管后台";
  }
  if (route.path === "/settings") {
    return "空间设置";
  }
  return "经营看板";
});

const usageText = computed(() => {
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodReviewCount}/${workspace.value.monthlyReviewLimit}`;
});

const usagePercent = computed(() => {
  if (!workspace.value?.monthlyReviewLimit) {
    return 0;
  }
  return Math.min(Math.round((workspace.value.currentPeriodReviewCount / workspace.value.monthlyReviewLimit) * 100), 100);
});

const accountInitial = computed(() => (currentUser.value?.name || currentUser.value?.email || "U").slice(0, 1).toUpperCase());

function runStatusLabel(status?: string | null) {
  if (status === "running") {
    return "分析中";
  }
  if (status === "queued") {
    return "排队中";
  }
  if (status === "completed") {
    return "已完成";
  }
  if (status === "partial_failed") {
    return "部分失败";
  }
  if (status === "failed") {
    return "失败";
  }
  return "草稿";
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

async function handleImportSuccess(taskId: string) {
  await refreshTasks();
  setSelectedTask(taskId);
  router.push("/dashboard");
}

async function handleLogout() {
  await logout();
  clearAuthState();
  router.push("/login");
}

async function handleWorkspaceChange(slug: unknown) {
  if (typeof slug !== "string") {
    return;
  }
  await switchWorkspace(slug);
}

onMounted(() => {
  if (getAuthToken()) {
    bootstrapAuth();
  }
});
</script>
