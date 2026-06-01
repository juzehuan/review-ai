<template>
  <router-view v-if="isPublicRoute" />

  <a-layout v-else class="app-shell">
    <a-layout-sider theme="light" width="288" class="app-sidebar">
      <div class="brand-block">
        <div class="brand-mark">RI</div>
        <div class="brand-copy">
          <div class="brand-title">ReviewIQ</div>
          <div class="brand-subtitle">{{ currentUser?.isSuperAdmin ? "Admin Console" : "User Console" }}</div>
        </div>
      </div>

      <div class="workspace-card">
        <div class="workspace-card-top">
          <span>用户配额</span>
          <a-tag :color="currentUser?.isSuperAdmin ? 'purple' : 'blue'">
            {{ currentUser?.isSuperAdmin ? "超管" : "用户" }}
          </a-tag>
        </div>
        <div class="quota-card-title">{{ currentUser?.name || "当前账号" }}</div>
        <div class="workspace-card-meta">{{ usageText }} 评论额度已用</div>
        <a-progress :percent="usagePercent" :show-info="false" size="small" />
        <div class="workspace-card-meta quota-card-secondary">{{ runUsageText }} 分析次数已用</div>
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
          <div class="topbar-eyebrow">{{ currentUser?.isSuperAdmin ? "Super Admin" : "User Backend" }}</div>
          <div class="topbar-title">{{ pageTitle }}</div>
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
                <a-menu-item key="password" @click="openPasswordModal">
                  <LockOutlined />
                  修改密码
                </a-menu-item>
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

  <a-modal
    v-model:open="passwordModalOpen"
    title="修改密码"
    ok-text="保存"
    cancel-text="取消"
    :confirm-loading="changingPassword"
    @ok="submitPasswordChange"
    @cancel="resetPasswordForm"
  >
    <a-form layout="vertical">
      <a-form-item label="旧密码">
        <a-input-password v-model:value="passwordForm.oldPassword" autocomplete="current-password" />
      </a-form-item>
      <a-form-item label="新密码">
        <a-input-password v-model:value="passwordForm.newPassword" autocomplete="new-password" placeholder="至少 6 位" />
      </a-form-item>
      <a-form-item label="确认新密码">
        <a-input-password v-model:value="passwordForm.confirmPassword" autocomplete="new-password" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  DatabaseOutlined,
  FolderOpenOutlined,
  LockOutlined,
  LogoutOutlined,
  SettingOutlined,
  TeamOutlined
} from "@ant-design/icons-vue";
import { changePassword, clearAuthToken, getAuthToken, logout } from "@/api";
import { useTaskStore } from "@/composables";

const router = useRouter();
const route = useRoute();
const { workspace, currentUser, bootstrapAuth, clearAuthState } = useTaskStore();
const passwordModalOpen = ref(false);
const changingPassword = ref(false);
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});

type NavItem = { path: string; label: string; disabled: boolean };
type NavSection = { label: string; icon: unknown; items: NavItem[] };

const navSections = computed<NavSection[]>(() => [
  {
    label: "用户后台",
    icon: FolderOpenOutlined,
    items: [
      { path: "/dashboard", label: "任务看板", disabled: false },
      { path: "/crawl-jobs", label: "评论采集", disabled: false },
      { path: "/analysis-runs", label: "分析记录", disabled: false }
    ]
  },
  {
    label: "模型与抓取",
    icon: SettingOutlined,
    items: [
      { path: "/settings/ai", label: "提示词与模型", disabled: false },
      { path: "/settings/crawler", label: "抓取设置", disabled: false }
    ]
  },
  {
    label: "平台管理",
    icon: TeamOutlined,
    items: currentUser.value?.isSuperAdmin ? [{ path: "/admin", label: "超管后台", disabled: false }] : []
  },
  {
    label: "数据",
    icon: DatabaseOutlined,
    items: [{ path: "/reviews", label: "评论明细", disabled: !workspace.value }]
  }
].filter((section) => section.items.length));

const isPublicRoute = computed(() => Boolean(route.meta.public));
const usageText = computed(() => {
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodReviewCount}/${workspace.value.monthlyReviewLimit}`;
});

const runUsageText = computed(() => {
  if (!workspace.value) {
    return "0/0";
  }
  return `${workspace.value.currentPeriodRunCount}/${workspace.value.monthlyRunLimit}`;
});

const usagePercent = computed(() => {
  if (!workspace.value?.monthlyReviewLimit) {
    return 0;
  }
  return Math.min(Math.round((workspace.value.currentPeriodReviewCount / workspace.value.monthlyReviewLimit) * 100), 100);
});

const pageTitle = computed(() => {
  if (route.path === "/admin") {
    return "超管后台";
  }
  if (route.path.startsWith("/settings/ai")) {
    return "提示词与模型设置";
  }
  if (route.path.startsWith("/settings/crawler")) {
    return "抓取设置";
  }
  if (route.path === "/crawl-jobs") {
    return "评论采集";
  }
  if (route.path.includes("/reviews") || route.path === "/reviews") {
    return "评论明细";
  }
  if (route.path.includes("/runs") || route.path === "/analysis-runs") {
    return "分析记录";
  }
  return "用户后台";
});

const accountInitial = computed(() => (currentUser.value?.name || currentUser.value?.email || "U").slice(0, 1).toUpperCase());

function sectionActive(section: NavSection) {
  if (section.label === "用户后台" && route.path.startsWith("/tasks/")) {
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

function resetPasswordForm() {
  passwordForm.oldPassword = "";
  passwordForm.newPassword = "";
  passwordForm.confirmPassword = "";
}

function openPasswordModal() {
  resetPasswordForm();
  passwordModalOpen.value = true;
}

async function submitPasswordChange() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    message.error("请输入旧密码和新密码");
    return;
  }
  if (passwordForm.newPassword.length < 6) {
    message.error("新密码至少需要 6 位");
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.error("两次输入的新密码不一致");
    return;
  }

  changingPassword.value = true;
  try {
    await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
    message.success("密码已修改，请重新登录");
    passwordModalOpen.value = false;
    resetPasswordForm();
    clearAuthToken();
    clearAuthState();
    router.push("/login");
  } catch (error: any) {
    const text = typeof error?.response?.data?.message === "string" ? error.response.data.message : "密码修改失败";
    message.error(text);
  } finally {
    changingPassword.value = false;
  }
}

onMounted(() => {
  if (getAuthToken()) {
    bootstrapAuth();
  }
});
</script>
