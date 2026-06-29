<template>
  <a-config-provider :locale="antdLocale">
    <div v-if="isPublicRoute" class="public-route-shell" :class="appDeviceClass">
      <router-view />
    </div>

    <a-layout v-else class="app-shell" :class="appDeviceClass">
    <a-layout-sider theme="light" width="288" class="app-sidebar" :class="{ 'app-sidebar-collapsed': sidebarCollapsed }">
      <div class="brand-block">
        <div class="brand-mark">RI</div>
        <div class="brand-copy">
          <div class="brand-title">ReviewIQ</div>
          <div class="brand-subtitle">{{ currentUser?.isSuperAdmin ? t("shell.adminConsole") : t("shell.userConsole") }}</div>
        </div>
      </div>

      <div class="workspace-card">
        <div class="workspace-card-top">
          <span>{{ t("shell.userQuota") }}</span>
          <a-tag :color="currentUser?.isSuperAdmin ? 'purple' : 'blue'">
            {{ currentUser?.isSuperAdmin ? t("common.superAdmin") : t("common.user") }}
          </a-tag>
        </div>
        <div class="quota-card-title">{{ currentUser?.name || t("common.currentAccount") }}</div>
        <div class="workspace-card-meta">{{ usageText }} {{ t("shell.reviewQuotaUsed") }}</div>
        <a-progress :percent="usagePercent" :show-info="false" size="small" />
        <div class="workspace-card-meta quota-card-secondary">{{ runUsageText }} {{ t("shell.runQuotaUsed") }}</div>
      </div>

      <nav class="side-nav">
        <div v-for="section in navSections" :key="section.label" class="side-nav-section">
          <div class="side-nav-group" :class="{ active: sectionActive(section) }">
            <component :is="section.icon" />
            <span class="side-nav-group-label">{{ section.label }}</span>
          </div>
          <div class="side-nav-children">
            <button
              v-for="item in section.items"
              :key="item.path"
              type="button"
              class="side-nav-subitem"
              :class="{ active: itemActive(item), disabled: item.disabled }"
              :disabled="item.disabled"
              :title="item.label"
              :aria-label="item.label"
              @click="router.push(item.path)"
            >
              <component :is="item.icon" class="side-nav-icon" aria-hidden="true" />
              <span class="side-nav-label">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </nav>
    </a-layout-sider>

    <a-layout class="app-main">
      <header class="topbar">
        <a-button class="sidebar-toggle" type="text" @click="sidebarCollapsed = !sidebarCollapsed">
          <template #icon>
            <MenuUnfoldOutlined v-if="sidebarCollapsed" />
            <MenuFoldOutlined v-else />
          </template>
        </a-button>
        <div class="topbar-left">
          <div class="topbar-eyebrow">{{ currentUser?.isSuperAdmin ? t("shell.superAdmin") : t("shell.userBackend") }}</div>
          <div class="topbar-title">{{ pageTitle }}</div>
        </div>

        <div class="topbar-actions">
          <a-button class="topbar-help-button" @click="router.push('/help')">
            <template #icon>
              <QuestionCircleOutlined />
            </template>
            {{ t("common.help") }}
          </a-button>
          <a-dropdown :trigger="['click']">
            <button type="button" class="language-chip" :aria-label="t('common.language')">
              <GlobalOutlined />
              <span>{{ currentLanguageLabel }}</span>
            </button>
            <template #overlay>
              <a-menu :selected-keys="[locale]" @click="handleLocaleMenuClick">
                <a-menu-item v-for="option in languageOptions" :key="option.value">
                  {{ option.nativeLabel }}
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-dropdown>
            <button type="button" class="account-chip">
              <span class="account-avatar">{{ accountInitial }}</span>
              <span class="account-name">{{ currentUser?.name || t("common.account") }}</span>
            </button>
            <template #overlay>
              <a-menu>
                <a-menu-item key="email" disabled>{{ currentUser?.email || "-" }}</a-menu-item>
                <a-menu-divider />
                <a-menu-item key="password" @click="openPasswordModal">
                  <LockOutlined />
                  {{ t("shell.changePassword") }}
                </a-menu-item>
                <a-menu-item key="logout" @click="handleLogout">
                  <LogoutOutlined />
                  {{ t("shell.logout") }}
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
      :title="t('shell.changePassword')"
      :ok-text="t('common.save')"
      :cancel-text="t('common.cancel')"
      :confirm-loading="changingPassword"
      @ok="submitPasswordChange"
      @cancel="resetPasswordForm"
    >
      <a-form layout="vertical">
        <a-form-item :label="t('shell.oldPassword')">
          <a-input-password v-model:value="passwordForm.oldPassword" autocomplete="current-password" />
        </a-form-item>
        <a-form-item :label="t('shell.newPassword')">
          <a-input-password v-model:value="passwordForm.newPassword" autocomplete="new-password" :placeholder="t('shell.passwordPlaceholder')" />
        </a-form-item>
        <a-form-item :label="t('shell.confirmNewPassword')">
          <a-input-password v-model:value="passwordForm.confirmPassword" autocomplete="new-password" />
        </a-form-item>
      </a-form>
    </a-modal>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import enUS from "ant-design-vue/es/locale/en_US";
import thTH from "ant-design-vue/es/locale/th_TH";
import zhCN from "ant-design-vue/es/locale/zh_CN";
import {
  ApiOutlined,
  CloudDownloadOutlined,
  DatabaseOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  QuestionCircleOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UnorderedListOutlined
} from "@ant-design/icons-vue";
import { changePassword, clearAuthToken, getAuthToken, logout } from "@/api";
import { useTaskStore } from "@/composables";
import { type AppLocale, useI18n } from "@/i18n";

const router = useRouter();
const route = useRoute();
const { workspace, currentUser, bootstrapAuth, clearAuthState } = useTaskStore();
const { locale, languageOptions, currentLanguageLabel, setLocale, t } = useI18n();
const SIDEBAR_COLLAPSED_KEY = "reviewiq:sidebar-collapsed";
const DEVICE_CLASS_NAMES = ["app-device-mobile", "app-device-desktop"] as const;
const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
const narrowViewportQuery = window.matchMedia("(max-width: 760px)");
const passwordModalOpen = ref(false);
const sidebarCollapsed = ref(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
const deviceKind = ref<"mobile" | "desktop">("desktop");
const changingPassword = ref(false);
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: ""
});

type NavItem = { path: string; label: string; disabled: boolean; icon: unknown };
type NavSection = { label: string; icon: unknown; items: NavItem[] };
const antdLocales = {
  "zh-CN": zhCN,
  "en-US": enUS,
  "th-TH": thTH
} as const;
const antdLocale = computed(() => antdLocales[locale.value]);

const navSections = computed<NavSection[]>(() => [
  {
    label: t("nav.userBackend"),
    icon: FolderOpenOutlined,
    items: [
      { path: "/dashboard", label: t("nav.taskBoard"), disabled: false, icon: DashboardOutlined },
      { path: "/growth", label: t("nav.growthOps"), disabled: false, icon: RiseOutlined },
      { path: "/crawl-jobs", label: t("nav.reviewCollection"), disabled: false, icon: CloudDownloadOutlined },
      { path: "/analysis-runs", label: t("nav.analysisRuns"), disabled: false, icon: UnorderedListOutlined },
      { path: "/help", label: t("nav.helpCenter"), disabled: false, icon: QuestionCircleOutlined }
    ]
  },
  ...(currentUser.value?.isSuperAdmin
    ? [
        {
          label: t("nav.modelCrawler"),
          icon: SettingOutlined,
          items: [
            { path: "/settings/ai", label: t("nav.promptsModels"), disabled: false, icon: ExperimentOutlined },
            { path: "/settings/crawler", label: t("nav.crawlerSettings"), disabled: false, icon: ApiOutlined }
          ]
        }
      ]
    : []),
  {
    label: t("nav.platformAdmin"),
    icon: TeamOutlined,
    items: currentUser.value?.isSuperAdmin ? [{ path: "/admin", label: t("nav.adminConsole"), disabled: false, icon: SafetyCertificateOutlined }] : []
  },
  {
    label: t("nav.data"),
    icon: DatabaseOutlined,
    items: [{ path: "/reviews", label: t("nav.reviewDetails"), disabled: !workspace.value, icon: FileSearchOutlined }]
  }
].filter((section) => section.items.length));

const isPublicRoute = computed(() => Boolean(route.meta.public));
const appDeviceClass = computed(() => `app-device-${deviceKind.value}`);
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
    return t("nav.adminConsole");
  }
  if (route.path.startsWith("/settings/ai")) {
    return t("page.promptsModelsSettings");
  }
  if (route.path.startsWith("/settings/crawler")) {
    return t("nav.crawlerSettings");
  }
  if (route.path === "/crawl-jobs") {
    return t("nav.reviewCollection");
  }
  if (route.path === "/growth") {
    return t("nav.growthOps");
  }
  if (route.path.includes("/reviews") || route.path === "/reviews") {
    return t("nav.reviewDetails");
  }
  if (route.path.includes("/runs") || route.path === "/analysis-runs") {
    return t("nav.analysisRuns");
  }
  if (route.path === "/help") {
    return t("nav.helpCenter");
  }
  return t("nav.userBackend");
});

const accountInitial = computed(() => (currentUser.value?.name || currentUser.value?.email || "U").slice(0, 1).toUpperCase());

function detectDeviceKind() {
  const nav = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  const userAgent = navigator.userAgent || "";
  const userAgentMobile = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
  const iPadLike = /iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  const coarsePointer = coarsePointerQuery.matches;
  const touchDevice = navigator.maxTouchPoints > 1;
  const narrowViewport = narrowViewportQuery.matches;
  return nav.userAgentData?.mobile || userAgentMobile || iPadLike || (coarsePointer && touchDevice) || narrowViewport ? "mobile" : "desktop";
}

function applyDeviceClass() {
  deviceKind.value = detectDeviceKind();
  document.documentElement.classList.remove(...DEVICE_CLASS_NAMES);
  document.body.classList.remove(...DEVICE_CLASS_NAMES);
  document.documentElement.classList.add(`app-device-${deviceKind.value}`);
  document.body.classList.add(`app-device-${deviceKind.value}`);
}

function sectionActive(section: NavSection) {
  if (section.items.some((item) => item.path === "/dashboard") && route.path.startsWith("/tasks/")) {
    return true;
  }
  return section.items.some((item) => item.path === route.path);
}

function itemActive(item: NavItem) {
  if (item.path === "/growth" && route.path === "/growth") {
    return true;
  }
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

function handleLocaleMenuClick(event: { key: string | number }) {
  setLocale(String(event.key) as AppLocale);
}

async function submitPasswordChange() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword) {
    message.error(t("shell.passwordRequired"));
    return;
  }
  if (passwordForm.newPassword.length < 6) {
    message.error(t("shell.passwordTooShort"));
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    message.error(t("shell.passwordMismatch"));
    return;
  }

  changingPassword.value = true;
  try {
    await changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
    message.success(t("shell.passwordChanged"));
    passwordModalOpen.value = false;
    resetPasswordForm();
    clearAuthToken();
    clearAuthState();
    router.push("/login");
  } catch (error: any) {
    const text = typeof error?.response?.data?.message === "string" ? error.response.data.message : t("shell.passwordChangeFailed");
    message.error(text);
  } finally {
    changingPassword.value = false;
  }
}

onMounted(() => {
  applyDeviceClass();
  window.addEventListener("resize", applyDeviceClass);
  coarsePointerQuery.addEventListener("change", applyDeviceClass);
  narrowViewportQuery.addEventListener("change", applyDeviceClass);
  if (getAuthToken()) {
    bootstrapAuth();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", applyDeviceClass);
  coarsePointerQuery.removeEventListener("change", applyDeviceClass);
  narrowViewportQuery.removeEventListener("change", applyDeviceClass);
  document.documentElement.classList.remove(...DEVICE_CLASS_NAMES);
  document.body.classList.remove(...DEVICE_CLASS_NAMES);
});

watch(sidebarCollapsed, (collapsed) => {
  window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
});
</script>
