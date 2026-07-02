<template>
  <div class="review-page">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">{{ tr(pageTitle) }}</div>
        <div class="toolbar-subtitle">{{ tr(pageSubtitle) }}</div>
      </div>
      <a-space wrap>
        <a-button @click="reloadCurrentSection" :loading="loading">
          <template #icon><ReloadOutlined /></template>
          {{ tr("刷新") }}
        </a-button>
        <a-button v-if="activeSection === 'workspace'" :disabled="!canManageMembers" @click="openMemberModal">
          <template #icon><UserAddOutlined /></template>
          {{ tr("添加成员") }}
        </a-button>
        <a-button v-if="activeSection === 'workspace'" type="primary" @click="modalOpen = true">
          <template #icon><PlusOutlined /></template>
          {{ tr("新建空间") }}
        </a-button>
      </a-space>
    </div>

    <div v-if="activeSection === 'workspace'" class="settings-grid">
      <section class="settings-panel">
        <div class="panel-label">{{ tr("当前空间") }}</div>
        <div class="settings-title">{{ workspace?.name || "-" }}</div>
        <div class="settings-meta">{{ workspace?.slug || "-" }}</div>
      </section>
      <section class="settings-panel">
        <div class="panel-label">{{ tr("我的角色") }}</div>
        <div class="settings-title">{{ tr(roleLabel(currentRole)) }}</div>
        <div class="settings-meta">{{ tr("所有者和管理员可以管理成员与空间配置") }}</div>
      </section>
      <section class="settings-panel">
        <div class="panel-label">{{ tr("评论额度") }}</div>
        <div class="settings-title">{{ tr(reviewUsageLabel) }}</div>
        <a-progress :percent="reviewUsagePercent" size="small" />
      </section>
      <section class="settings-panel">
        <div class="panel-label">{{ tr("分析次数") }}</div>
        <div class="settings-title">{{ tr(runUsageLabel) }}</div>
        <a-progress :percent="runUsagePercent" size="small" />
      </section>
    </div>

    <div v-if="activeSection === 'workspace'" class="settings-layout settings-layout-single">
      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">Members</div>
            <div class="settings-section-title">当前空间成员</div>
          </div>
          <a-tag :color="canManageMembers ? 'blue' : 'default'">{{ tr(canManageMembers ? "可管理" : "只读") }}</a-tag>
        </div>
        <a-table
          :columns="memberColumns"
          :data-source="members"
          :loading="loadingMembers"
          row-key="id"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'user'">
              <div class="member-cell">
                <div class="member-avatar">{{ record.user.name.slice(0, 1).toUpperCase() }}</div>
                <div>
                  <div class="member-name">{{ record.user.name }}</div>
                  <div class="member-email">{{ record.user.email }}</div>
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'role'">
              <a-select
                :value="record.role"
                class="role-select"
                :disabled="!canManageMembers || !canEditMember(record)"
                @change="changeRoleFromSelect(record.id, $event)"
              >
                <a-select-option v-for="role in roleOptions" :key="role.value" :value="role.value">
                  {{ tr(role.label) }}
                </a-select-option>
              </a-select>
            </template>
            <template v-else-if="column.key === 'isSuperAdmin'">
              <a-tag :color="record.user.isSuperAdmin ? 'purple' : 'default'">
                {{ tr(record.user.isSuperAdmin ? "平台超管" : "普通账号") }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-popconfirm :title="tr('确定从当前空间移除该成员？')" @confirm="removeMember(record.id)">
                <a-button danger size="small" :disabled="!canManageMembers || !canRemoveMember(record)">{{ tr("移除") }}</a-button>
              </a-popconfirm>
            </template>
          </template>
        </a-table>
        <div class="settings-help">
          {{ tr("这里管理的是当前空间成员关系；平台账号、超管权限和租户额度由超管后台管理。") }}
        </div>
      </section>
    </div>

    <div v-if="activeSection === 'ai'" class="settings-layout">
      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">模型设置</div>
            <div class="settings-section-title">分析模型</div>
          </div>
          <a-tag :color="canEditAi ? 'blue' : 'default'">{{ tr(canEditAi ? "可编辑" : "只读") }}</a-tag>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item :label="tr('模型供应商')">
            <a-select v-model:value="aiForm.provider" :disabled="!canEditAi">
              <a-select-option v-for="provider in AI_PROVIDER_PRESETS" :key="provider.id" :value="provider.id">
                {{ provider.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="tr('接口密钥')">
            <a-input-password
              v-model:value="aiForm.apiKey"
              :disabled="!canEditAi"
              :placeholder="tr(apiKeyPlaceholder)"
            />
          </a-form-item>
          <a-form-item :label="tr('接口地址')">
            <a-input
              v-model:value="aiForm.baseUrl"
              :disabled="!canEditAi"
              :placeholder="currentProvider?.baseUrl || 'https://api.example.com/v1'"
            />
          </a-form-item>
          <a-form-item :label="tr('模型名称')">
            <a-select v-model:value="aiForm.modelName" :disabled="!canEditAi" show-search>
              <a-select-option v-for="model in providerModels" :key="model" :value="model">
                {{ model }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item :label="tr('提示词版本')">
            <a-input v-model:value="aiForm.promptVersion" :disabled="!canEditAi" :placeholder="tr('例如：v2-thai')" />
          </a-form-item>
          <a-form-item :label="tr('随机性')">
            <a-input-number v-model:value="aiForm.temperature" :disabled="!canEditAi" :min="0" :max="2" :step="0.1" class="full-input" />
          </a-form-item>
        </a-form>
      </section>

      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">提示词设置</div>
            <div class="settings-section-title">{{ activePromptProfile?.label || "评论" }}提示词</div>
          </div>
          <a-space>
            <a-button :disabled="!canEditAi" @click="resetDefaultPrompts">
              <template #icon><UndoOutlined /></template>
              {{ tr("恢复默认提示词") }}
            </a-button>
            <a-button type="primary" :disabled="!canEditAi" :loading="savingAi" @click="saveAiSettings">
              <template #icon><SaveOutlined /></template>
              {{ tr("保存设置") }}
            </a-button>
          </a-space>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item :label="tr('系统提示词')">
            <a-textarea v-model:value="aiForm.systemPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 3, maxRows: 6 }" />
          </a-form-item>
          <a-form-item :label="tr('分析类型')">
            <a-segmented v-model:value="promptProfileType" :options="promptProfileOptions" />
            <div class="settings-help compact-help">{{ tr(activePromptProfile?.description || "") }}</div>
          </a-form-item>
          <a-form-item :label="tr('单条评论分析提示词模板')">
            <a-textarea v-model:value="activeUserPromptTemplate" :disabled="!canEditAi" :auto-size="{ minRows: 12, maxRows: 20 }" />
          </a-form-item>
          <a-form-item :label="tr('总体总结提示词')">
            <a-textarea v-model:value="activeSummaryPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 6, maxRows: 12 }" />
          </a-form-item>
          <a-form-item :label="tr('分析报告提示词')">
            <a-textarea v-model:value="activeInsightsPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 8, maxRows: 16 }" />
          </a-form-item>
        </a-form>
        <div class="settings-help">
          {{ tr("可用变量：{taxonomy}、{ratingStar}、{comment}、{commentTr}") }}
        </div>
      </section>

    </div>

    <div v-if="activeSection === 'crawler'" class="settings-layout settings-layout-single">
      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">爬虫设置</div>
            <div class="settings-section-title">Scrapling 评论抓取</div>
          </div>
          <a-space wrap>
            <a-button :href="browserExtensionDownloadUrl" download="review-exporter.zip">
              <template #icon><DownloadOutlined /></template>
              {{ tr("下载浏览器插件") }}
            </a-button>
            <a-button type="primary" :disabled="!canEditAi" :loading="savingCrawler" @click="saveCrawlerSettings">
              {{ tr("保存爬虫设置") }}
            </a-button>
          </a-space>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item :label="tr('启用链接抓取')">
            <a-switch v-model:checked="crawlerForm.enabled" :disabled="!canEditAi" />
          </a-form-item>
          <a-form-item :label="tr('Python 命令')">
            <a-input v-model:value="crawlerForm.pythonBin" :disabled="!canEditAi" :placeholder="tr('python 或 C:\\Python312\\python.exe')" />
          </a-form-item>
          <a-form-item :label="tr('代理地址')">
            <a-input v-model:value="crawlerForm.proxyUrl" :disabled="!canEditAi" :placeholder="tr('例如：http://127.0.0.1:7890')" />
          </a-form-item>
          <a-form-item :label="tr('默认来源渠道')">
            <a-select v-model:value="crawlerForm.defaultSourceChannel" :disabled="!canEditAi" :options="crawlerSourceChannelOptions" />
          </a-form-item>
          <a-form-item :label="tr('默认抓取条数')">
            <a-input-number v-model:value="crawlerForm.defaultMaxReviews" :disabled="!canEditAi" :min="0" :max="20000" class="full-input" />
            <div class="settings-help">{{ tr("填 0 表示不限，适用于 Shopee、YouTube、TikTok、Facebook 评论采集。") }}</div>
          </a-form-item>
          <a-form-item :label="tr('超时时间（秒）')">
            <a-input-number v-model:value="crawlerForm.requestTimeoutSec" :disabled="!canEditAi" :min="30" :max="900" class="full-input" />
          </a-form-item>
        </a-form>
        <div class="settings-help">
          {{ tr("链接抓取当前支持 Shopee 商品、YouTube 视频、TikTok 视频和 Facebook 帖子/图片/Reel 评论。代理会传给本地 Scrapling 脚本，用于访问公开评论接口。") }}
        </div>
      </section>
    </div>

    <div v-if="activeSection === 'workspace'" class="table-shell">
      <div class="table-title">{{ tr("我的空间") }}</div>
      <a-table :columns="columns" :data-source="workspaces" row-key="id" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="member-name">{{ record.name }}</div>
            <div class="member-email">{{ record.slug }}</div>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag color="blue">{{ tr(roleLabel(record.role)) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'usage'">
            {{ record.currentPeriodReviewCount }}/{{ record.monthlyReviewLimit }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" :disabled="record.slug === workspace?.slug" @click="switchTo(record.slug)">
                {{ tr("切换") }}
              </a-button>
              <a-popconfirm
                :title="tr('确定删除这个工作空间吗？')"
                :description="tr('删除后空间内的任务、评论、分析结果和成员关系都会被移除。')"
                :ok-text="tr('删除')"
                :cancel-text="tr('取消')"
                placement="left"
                @confirm="removeWorkspace(record.id)"
              >
                <a-button size="small" danger :disabled="!canDeleteWorkspace(record)">{{ tr("删除") }}</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      :open="modalOpen"
      :title="tr('新建租户空间')"
      :ok-text="tr('创建')"
      :cancel-text="tr('取消')"
      :confirm-loading="saving"
      @ok="submit"
      @cancel="modalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item :label="tr('空间名称')">
          <a-input v-model:value="form.name" :placeholder="tr('例如：品牌运营团队')" />
        </a-form-item>
        <a-form-item :label="tr('空间标识')">
          <a-input v-model:value="form.slug" :placeholder="tr('可选，例如：brand-ops')" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      :open="memberModalOpen"
      :title="tr('添加空间成员')"
      :ok-text="tr('保存')"
      :cancel-text="tr('取消')"
      :confirm-loading="savingMember"
      @ok="submitMember"
      @cancel="memberModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item :label="tr('姓名')">
          <a-input v-model:value="memberForm.name" :placeholder="tr('例如：运营同事')" />
        </a-form-item>
        <a-form-item :label="tr('邮箱')">
          <a-input v-model:value="memberForm.email" placeholder="name@example.com" />
        </a-form-item>
        <a-form-item :label="tr('空间角色')">
          <a-select v-model:value="memberForm.role">
            <a-select-option v-for="role in roleOptions" :key="role.value" :value="role.value">
              {{ tr(role.label) }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <div class="settings-help">
          {{ tr("如果该邮箱尚未注册，系统会先创建占位账号；对方用同一邮箱注册后即可进入此空间。") }}
        </div>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import { DownloadOutlined, PlusOutlined, ReloadOutlined, SaveOutlined, UndoOutlined, UserAddOutlined } from "@ant-design/icons-vue";
import {
  ANALYSIS_TYPE_PRESETS,
  AI_PROVIDER_PRESETS,
  CRAWL_SOURCE_CHANNEL_PRESETS,
  DEFAULT_INSIGHTS_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE,
  getAnalysisPromptProfile,
  normalizeCrawlSourceChannel
} from "@review-ai/shared";
import type { AnalysisType, MemberRole, WorkspaceAiSettingDTO, WorkspaceCrawlerSettingDTO, WorkspaceMemberDTO } from "@review-ai/shared";
import {
  createWorkspace,
  createWorkspaceMember,
  deleteWorkspace,
  deleteWorkspaceMember,
  fetchWorkspaceAiSettings,
  fetchWorkspaceCrawlerSettings,
  fetchWorkspaceMembers,
  updateWorkspaceMember,
  updateWorkspaceAiSettings,
  updateWorkspaceCrawlerSettings
} from "@/api";
import { useTaskStore } from "@/composables";
import { translateStaticText } from "@/static-i18n";

const { workspace, workspaces, currentUser, refreshTasks, switchWorkspace } = useTaskStore();
const tr = (value: string) => translateStaticText(value);
const route = useRoute();
const router = useRouter();
const modalOpen = ref(false);
const memberModalOpen = ref(false);
const saving = ref(false);
const savingMember = ref(false);
const deletingWorkspaceId = ref("");
const loading = ref(false);
const loadingMembers = ref(false);
const savingAi = ref(false);
const syncingAiForm = ref(false);
const savingCrawler = ref(false);
const browserExtensionDownloadUrl = "/downloads/review-exporter.zip";
const promptProfileType = ref<AnalysisType>("product");
const form = reactive({
  name: "",
  slug: ""
});
const memberForm = reactive({
  name: "",
  email: "",
  role: "analyst" as MemberRole
});
const members = ref<WorkspaceMemberDTO[]>([]);
const aiForm = reactive<WorkspaceAiSettingDTO>({
  provider: "openai",
  apiKey: null,
  apiKeySet: false,
  baseUrl: null,
  modelName: "gpt-5.4-mini",
  promptVersion: "v2-thai",
  systemPrompt: "",
  userPromptTemplate: "",
  summaryPrompt: "",
  insightsPrompt: "",
  videoUserPromptTemplate: "",
  videoSummaryPrompt: "",
  videoInsightsPrompt: "",
  tweetUserPromptTemplate: "",
  tweetSummaryPrompt: "",
  tweetInsightsPrompt: "",
  temperature: 0.2,
  updatedAt: null
});
const crawlerForm = reactive<WorkspaceCrawlerSettingDTO>({
  enabled: true,
  pythonBin: "python",
  proxyUrl: null,
  shopeeCookie: null,
  shopeeCookieSet: false,
  crawlChannels: ["browser_intercept"],
  defaultSourceChannel: "YouTube",
  defaultMaxReviews: 200,
  requestTimeoutSec: 180,
  updatedAt: null
});

const currentRole = computed(() => workspaces.value.find((item) => item.slug === workspace.value?.slug)?.role || null);
const activeSection = computed<"workspace" | "ai" | "crawler">(() => {
  if (route.path.endsWith("/ai")) {
    return "ai";
  }
  if (route.path.endsWith("/crawler")) {
    return "crawler";
  }
  return "workspace";
});
const pageTitle = computed(() => {
  if (activeSection.value === "ai") {
    return "AI 设置";
  }
  if (activeSection.value === "crawler") {
    return "爬虫设置";
  }
  return "空间与成员";
});
const pageSubtitle = computed(() => {
  if (activeSection.value === "ai") {
    return "配置当前账号的模型供应商、接口密钥和评论分析提示词。";
  }
  if (activeSection.value === "crawler") {
    return "配置当前账号的 Shopee、YouTube、TikTok、Facebook 评论抓取代理和默认抓取参数。";
  }
  return "管理当前空间、成员角色、我的空间列表和额度使用情况。";
});
const canEditAi = computed(() => {
  return Boolean(currentUser.value?.isSuperAdmin);
});
const canManageMembers = computed(() => {
  return Boolean(currentUser.value?.isSuperAdmin || currentRole.value === "owner" || currentRole.value === "admin");
});
const currentProvider = computed(() => AI_PROVIDER_PRESETS.find((item) => item.id === aiForm.provider) || null);
const apiKeyPlaceholder = computed(() =>
  aiForm.apiKeySet ? `已保存（${aiForm.apiKey || "已隐藏"}），输入新密钥可替换` : currentProvider.value?.apiKeyHint || "API Key"
);
const providerModels = computed(() => {
  const models = currentProvider.value?.models || [];
  return models.includes(aiForm.modelName) ? models : [aiForm.modelName, ...models].filter(Boolean);
});
const promptProfileOptions = computed(() => ANALYSIS_TYPE_PRESETS.map((item) => ({
  label: tr(item.label),
  value: item.value
})));
const crawlerSourceChannelOptions = computed(() => CRAWL_SOURCE_CHANNEL_PRESETS.map((item) => ({
  label: item.label,
  value: item.value
})));
const activePromptProfile = computed(() => {
  return ANALYSIS_TYPE_PRESETS.find((item) => item.value === promptProfileType.value);
});
const activeUserPromptTemplate = computed({
  get() {
    if (promptProfileType.value === "video") {
      return aiForm.videoUserPromptTemplate;
    }
    if (promptProfileType.value === "tweet") {
      return aiForm.tweetUserPromptTemplate;
    }
    return aiForm.userPromptTemplate;
  },
  set(value: string) {
    if (promptProfileType.value === "video") {
      aiForm.videoUserPromptTemplate = value;
      return;
    }
    if (promptProfileType.value === "tweet") {
      aiForm.tweetUserPromptTemplate = value;
      return;
    }
    aiForm.userPromptTemplate = value;
  }
});
const activeSummaryPrompt = computed({
  get() {
    if (promptProfileType.value === "video") {
      return aiForm.videoSummaryPrompt;
    }
    if (promptProfileType.value === "tweet") {
      return aiForm.tweetSummaryPrompt;
    }
    return aiForm.summaryPrompt;
  },
  set(value: string) {
    if (promptProfileType.value === "video") {
      aiForm.videoSummaryPrompt = value;
      return;
    }
    if (promptProfileType.value === "tweet") {
      aiForm.tweetSummaryPrompt = value;
      return;
    }
    aiForm.summaryPrompt = value;
  }
});
const activeInsightsPrompt = computed({
  get() {
    if (promptProfileType.value === "video") {
      return aiForm.videoInsightsPrompt;
    }
    if (promptProfileType.value === "tweet") {
      return aiForm.tweetInsightsPrompt;
    }
    return aiForm.insightsPrompt;
  },
  set(value: string) {
    if (promptProfileType.value === "video") {
      aiForm.videoInsightsPrompt = value;
      return;
    }
    if (promptProfileType.value === "tweet") {
      aiForm.tweetInsightsPrompt = value;
      return;
    }
    aiForm.insightsPrompt = value;
  }
});

const reviewUsagePercent = computed(() => {
  if (currentUser.value?.isSuperAdmin) {
    return 0;
  }
  if (!workspace.value?.monthlyReviewLimit) {
    return 0;
  }
  return Math.min(
    Math.round((workspace.value.currentPeriodReviewCount / workspace.value.monthlyReviewLimit) * 100),
    100
  );
});

const runUsagePercent = computed(() => {
  if (currentUser.value?.isSuperAdmin) {
    return 0;
  }
  if (!workspace.value?.monthlyRunLimit) {
    return 0;
  }
  return Math.min(Math.round((workspace.value.currentPeriodRunCount / workspace.value.monthlyRunLimit) * 100), 100);
});

const reviewUsageLabel = computed(() =>
  currentUser.value?.isSuperAdmin
    ? "不限额"
    : `${workspace.value?.currentPeriodReviewCount || 0}/${workspace.value?.monthlyReviewLimit || 0}`
);

const runUsageLabel = computed(() =>
  currentUser.value?.isSuperAdmin
    ? "不限额"
    : `${workspace.value?.currentPeriodRunCount || 0}/${workspace.value?.monthlyRunLimit || 0}`
);

const columns = computed(() => [
  { title: tr("空间"), key: "name", width: 320 },
  { title: tr("角色"), key: "role", width: 140 },
  { title: tr("套餐"), dataIndex: "planTier", key: "planTier", width: 120 },
  { title: tr("评论用量"), key: "usage", width: 180 },
  { title: tr("操作"), key: "action", width: 180 }
]);

const roleOptions: Array<{ label: string; value: MemberRole }> = [
  { label: "所有者", value: "owner" },
  { label: "管理员", value: "admin" },
  { label: "分析师", value: "analyst" },
  { label: "只读", value: "viewer" }
];

const memberColumns = computed(() => [
  { title: tr("成员"), key: "user", width: 320 },
  { title: tr("空间角色"), key: "role", width: 180 },
  { title: tr("平台权限"), key: "isSuperAdmin", width: 140 },
  { title: tr("加入时间"), dataIndex: "createdAt", key: "createdAt", width: 220 },
  { title: tr("操作"), key: "action", width: 120 }
]);

function assignAiForm(data: WorkspaceAiSettingDTO) {
  syncingAiForm.value = true;
  aiForm.provider = data.provider;
  aiForm.apiKey = data.apiKey;
  aiForm.apiKeySet = data.apiKeySet;
  aiForm.baseUrl = data.baseUrl;
  aiForm.modelName = data.modelName;
  aiForm.promptVersion = data.promptVersion;
  aiForm.systemPrompt = data.systemPrompt;
  aiForm.userPromptTemplate = data.userPromptTemplate;
  aiForm.summaryPrompt = data.summaryPrompt;
  aiForm.insightsPrompt = data.insightsPrompt;
  aiForm.videoUserPromptTemplate = data.videoUserPromptTemplate;
  aiForm.videoSummaryPrompt = data.videoSummaryPrompt;
  aiForm.videoInsightsPrompt = data.videoInsightsPrompt;
  aiForm.tweetUserPromptTemplate = data.tweetUserPromptTemplate;
  aiForm.tweetSummaryPrompt = data.tweetSummaryPrompt;
  aiForm.tweetInsightsPrompt = data.tweetInsightsPrompt;
  aiForm.temperature = data.temperature;
  aiForm.updatedAt = data.updatedAt;
  queueMicrotask(() => {
    syncingAiForm.value = false;
  });
}

watch(
  () => aiForm.provider,
  () => {
    if (syncingAiForm.value) {
      return;
    }
    const provider = AI_PROVIDER_PRESETS.find((item) => item.id === aiForm.provider);
    aiForm.baseUrl = provider?.baseUrl || null;
    if (provider?.models.length) {
      aiForm.modelName = provider.models[0];
    }
  }
);

function assignCrawlerForm(data: WorkspaceCrawlerSettingDTO) {
  crawlerForm.enabled = data.enabled;
  crawlerForm.pythonBin = data.pythonBin;
  crawlerForm.proxyUrl = data.proxyUrl;
  crawlerForm.shopeeCookie = null;
  crawlerForm.shopeeCookieSet = false;
  crawlerForm.crawlChannels = data.crawlChannels;
  crawlerForm.defaultSourceChannel = normalizeCrawlSourceChannel(data.defaultSourceChannel, "YouTube");
  crawlerForm.defaultMaxReviews = data.defaultMaxReviews;
  crawlerForm.requestTimeoutSec = data.requestTimeoutSec;
  crawlerForm.updatedAt = data.updatedAt;
}

function resetDefaultPrompts() {
  aiForm.systemPrompt = DEFAULT_SYSTEM_PROMPT;
  if (promptProfileType.value === "product") {
    aiForm.userPromptTemplate = DEFAULT_USER_PROMPT_TEMPLATE;
    aiForm.summaryPrompt = DEFAULT_SUMMARY_PROMPT;
    aiForm.insightsPrompt = DEFAULT_INSIGHTS_PROMPT;
  } else {
    const profile = getAnalysisPromptProfile(promptProfileType.value);
    activeUserPromptTemplate.value = profile.userPromptTemplate;
    activeSummaryPrompt.value = profile.summaryPrompt;
    activeInsightsPrompt.value = profile.insightsPrompt;
  }
  message.success(tr("已恢复当前类型默认提示词，保存后生效"));
}

function roleLabel(role?: MemberRole | null) {
  if (role === "owner") {
    return "所有者";
  }
  if (role === "admin") {
    return "管理员";
  }
  if (role === "analyst") {
    return "分析师";
  }
  if (role === "viewer") {
    return "只读";
  }
  return "-";
}

async function loadAiSettings() {
  try {
    assignAiForm(await fetchWorkspaceAiSettings());
  } catch {
    message.error(tr("模型设置加载失败"));
  }
}

async function loadCrawlerSettings() {
  try {
    assignCrawlerForm(await fetchWorkspaceCrawlerSettings());
  } catch {
    message.error(tr("抓取设置加载失败"));
  }
}

async function loadMembers() {
  if (!canManageMembers.value) {
    members.value = [];
    return;
  }
  loadingMembers.value = true;
  try {
    members.value = await fetchWorkspaceMembers();
  } catch {
    members.value = [];
    message.error(tr("成员列表加载失败，请检查权限"));
  } finally {
    loadingMembers.value = false;
  }
}

async function reloadCurrentSection() {
  if ((activeSection.value === "ai" || activeSection.value === "crawler") && currentUser.value && !currentUser.value.isSuperAdmin) {
    router.replace("/dashboard");
    return;
  }
  loading.value = true;
  try {
    if (activeSection.value === "workspace") {
      await Promise.all([refreshTasks(), loadMembers()]);
      return;
    }
    if (activeSection.value === "ai") {
      await loadAiSettings();
      return;
    }
    if (activeSection.value === "crawler") {
      await loadCrawlerSettings();
    }
  } finally {
    loading.value = false;
  }
}

async function saveAiSettings() {
  savingAi.value = true;
  try {
    assignAiForm(await updateWorkspaceAiSettings({ ...aiForm }));
    message.success(tr("AI 设置已保存"));
  } catch {
    message.error(tr("AI 设置保存失败，请检查权限或输入内容"));
  } finally {
    savingAi.value = false;
  }
}

async function saveCrawlerSettings() {
  savingCrawler.value = true;
  try {
    assignCrawlerForm(await updateWorkspaceCrawlerSettings({
      ...crawlerForm,
      shopeeCookie: null,
      defaultSourceChannel: normalizeCrawlSourceChannel(crawlerForm.defaultSourceChannel, "YouTube")
    }));
    message.success(tr("爬虫设置已保存"));
  } catch {
    message.error(tr("爬虫设置保存失败，请检查权限或输入内容"));
  } finally {
    savingCrawler.value = false;
  }
}

async function switchTo(slug: string) {
  await switchWorkspace(slug);
  await reloadCurrentSection();
  message.success(tr("空间已切换"));
}

function openMemberModal() {
  memberForm.name = "";
  memberForm.email = "";
  memberForm.role = "analyst";
  memberModalOpen.value = true;
}

function canEditMember(record: WorkspaceMemberDTO) {
  if (currentUser.value?.isSuperAdmin) {
    return true;
  }
  if (currentRole.value === "owner") {
    return true;
  }
  return record.role !== "owner";
}

function canRemoveMember(record: WorkspaceMemberDTO) {
  return canEditMember(record) && record.user.id !== currentUser.value?.id;
}

async function submitMember() {
  if (!memberForm.name.trim() || !memberForm.email.trim()) {
    message.error(tr("请填写姓名和邮箱"));
    return;
  }
  savingMember.value = true;
  try {
    await createWorkspaceMember({ ...memberForm, name: memberForm.name.trim(), email: memberForm.email.trim() });
    message.success(tr("成员已添加到当前空间"));
    memberModalOpen.value = false;
    await loadMembers();
  } catch {
    message.error(tr("成员保存失败，请检查权限或输入信息"));
  } finally {
    savingMember.value = false;
  }
}

async function changeRole(memberId: string, role: MemberRole) {
  try {
    await updateWorkspaceMember(memberId, { role });
    message.success(tr("成员角色已更新"));
    await loadMembers();
  } catch {
    message.error(tr("角色更新失败，请检查权限"));
  }
}

function changeRoleFromSelect(memberId: string, role: unknown) {
  changeRole(memberId, role as MemberRole);
}

async function removeMember(memberId: string) {
  try {
    await deleteWorkspaceMember(memberId);
    message.success(tr("成员已从当前空间移除"));
    await loadMembers();
  } catch {
    message.error(tr("成员移除失败，请检查权限"));
  }
}

function canDeleteWorkspace(record: { id: string; role: MemberRole }) {
  if (deletingWorkspaceId.value === record.id || workspaces.value.length <= 1) {
    return false;
  }
  return Boolean(currentUser.value?.isSuperAdmin || record.role === "owner");
}

async function removeWorkspace(workspaceId: string) {
  deletingWorkspaceId.value = workspaceId;
  try {
    const target = workspaces.value.find((item) => item.id === workspaceId);
    await deleteWorkspace(workspaceId);
    const nextWorkspace = workspaces.value.find((item) => item.id !== workspaceId);
    if (nextWorkspace) {
      await switchWorkspace(nextWorkspace.slug);
    } else {
      await refreshTasks();
    }
    message.success(tr(`工作空间「${target?.name || "已选空间"}」已删除`));
  } catch {
    message.error(tr("删除工作空间失败，请检查权限或稍后重试"));
  } finally {
    deletingWorkspaceId.value = "";
  }
}

async function submit() {
  if (!form.name.trim()) {
    message.error(tr("请填写空间名称"));
    return;
  }

  saving.value = true;
  try {
    const next = await createWorkspace({
      name: form.name.trim(),
      slug: form.slug.trim() || undefined
    });
    await switchWorkspace(next.slug);
    await refreshTasks();
    message.success(tr("空间已创建"));
    form.name = "";
    form.slug = "";
    modalOpen.value = false;
  } catch {
    message.error(tr("空间创建失败，请稍后重试"));
  } finally {
    saving.value = false;
  }
}

watch(
  () => workspace.value?.slug,
  () => {
    if (workspace.value?.slug) {
      reloadCurrentSection();
    }
  }
);

watch(
  () => route.path,
  () => {
    reloadCurrentSection();
  }
);

onMounted(reloadCurrentSection);
</script>
