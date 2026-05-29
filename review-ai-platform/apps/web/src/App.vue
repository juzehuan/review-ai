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
        <div v-for="section in navSections" :key="section.label" class="side-nav-section">
          <div class="side-nav-group" :class="{ active: sectionActive(section) }">
            <component :is="section.icon" />
            <span>{{ section.label }}</span>
          </div>
          <div class="side-nav-children">
            <button
              v-for="item in section.items"
              :key="item.path"
              type="button"
              class="side-nav-subitem"
              :class="{ active: itemActive(item), disabled: item.disabled }"
              :disabled="item.disabled"
              @click="router.push(item.path)"
            >
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>
      </nav>
    </a-layout-sider>

    <a-layout class="app-main">
      <header class="topbar">
        <div class="topbar-left">
          <div class="topbar-eyebrow">ReviewIQ Cloud</div>
          <div class="topbar-title">{{ workspace?.name || "Workspace" }}</div>
        </div>

        <div class="topbar-actions">
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
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  FolderOpenOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined
} from "@ant-design/icons-vue";
import { getAuthToken, logout } from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const route = useRoute();
const {
  workspace,
  workspaces,
  currentUser,
  bootstrapAuth,
  switchWorkspace,
  clearAuthState
} = useTaskStore();

type NavItem = { path: string; label: string; disabled: boolean };
type NavSection = { label: string; icon: unknown; items: NavItem[] };

const navSections = computed<NavSection[]>(() => [
  {
    label: "工作台",
    icon: FolderOpenOutlined,
    items: [
      { path: "/dashboard", label: "空间概览", disabled: false },
      { path: "/crawl-jobs", label: "评论采集", disabled: false },
      { path: "/analysis-runs", label: "分析任务", disabled: false }
    ]
  },
  {
    label: "平台",
    icon: TeamOutlined,
    items: [
      ...(currentUser.value?.isSuperAdmin ? [{ path: "/admin", label: "超管后台", disabled: false }] : [])
    ]
  },
  {
    label: "设置",
    icon: SettingOutlined,
    items: [
      { path: "/settings/workspace", label: "空间与成员", disabled: false },
      { path: "/settings/ai", label: "AI 设置", disabled: false },
      { path: "/settings/crawler", label: "爬虫设置", disabled: false }
    ]
  }
].filter((section) => section.items.length));

const isPublicRoute = computed(() => Boolean(route.meta.public));
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

function sectionActive(section: NavSection) {
  if (section.label === "工作台" && ["/reviews", "/report"].includes(route.path)) {
    return true;
  }
  if (section.label === "工作台" && route.path.startsWith("/tasks/")) {
    return true;
  }
  return section.items.some((item) => item.path === route.path);
}

function itemActive(item: NavItem) {
  if (item.path === "/analysis-runs" && route.path.startsWith("/tasks/")) {
    return true;
  }
  return route.path === item.path;
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
