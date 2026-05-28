<template>
  <div class="review-page">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">{{ pageTitle }}</div>
        <div class="toolbar-subtitle">{{ pageSubtitle }}</div>
      </div>
      <a-space wrap>
        <a-button @click="loadAiSettings" :loading="loadingAi">刷新</a-button>
        <a-button v-if="activeSection === 'workspace'" type="primary" @click="modalOpen = true">新建空间</a-button>
      </a-space>
    </div>

    <div v-if="activeSection === 'workspace'" class="settings-grid">
      <section class="settings-panel">
        <div class="panel-label">当前空间</div>
        <div class="settings-title">{{ workspace?.name || "-" }}</div>
        <div class="settings-meta">{{ workspace?.slug || "-" }}</div>
      </section>
      <section class="settings-panel">
        <div class="panel-label">我的角色</div>
        <div class="settings-title">{{ roleLabel(currentRole) }}</div>
        <div class="settings-meta">所有者和管理员可以编辑 AI 设置</div>
      </section>
      <section class="settings-panel">
        <div class="panel-label">评论额度</div>
        <div class="settings-title">{{ workspace?.currentPeriodReviewCount || 0 }}/{{ workspace?.monthlyReviewLimit || 0 }}</div>
        <a-progress :percent="reviewUsagePercent" size="small" />
      </section>
      <section class="settings-panel">
        <div class="panel-label">分析次数</div>
        <div class="settings-title">{{ workspace?.currentPeriodRunCount || 0 }}/{{ workspace?.monthlyRunLimit || 0 }}</div>
        <a-progress :percent="runUsagePercent" size="small" />
      </section>
    </div>

    <div v-if="activeSection === 'ai'" class="settings-layout">
      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">模型设置</div>
            <div class="settings-section-title">分析模型</div>
          </div>
          <a-tag :color="canEditAi ? 'blue' : 'default'">{{ canEditAi ? "可编辑" : "只读" }}</a-tag>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item label="模型供应商">
            <a-select v-model:value="aiForm.provider" :disabled="!canEditAi">
              <a-select-option v-for="provider in AI_PROVIDER_PRESETS" :key="provider.id" :value="provider.id">
                {{ provider.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="接口密钥">
            <a-input-password
              v-model:value="aiForm.apiKey"
              :disabled="!canEditAi"
              :placeholder="aiForm.apiKeySet ? `已保存（${aiForm.apiKey || '已隐藏'}），输入新密钥可替换` : currentProvider?.apiKeyHint || 'API Key'"
            />
          </a-form-item>
          <a-form-item label="接口地址">
            <a-input
              v-model:value="aiForm.baseUrl"
              :disabled="!canEditAi"
              :placeholder="currentProvider?.baseUrl || 'https://api.example.com/v1'"
            />
          </a-form-item>
          <a-form-item label="模型名称">
            <a-select v-model:value="aiForm.modelName" :disabled="!canEditAi" show-search>
              <a-select-option v-for="model in providerModels" :key="model" :value="model">
                {{ model }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="提示词版本">
            <a-input v-model:value="aiForm.promptVersion" :disabled="!canEditAi" placeholder="例如：v2-thai" />
          </a-form-item>
          <a-form-item label="随机性">
            <a-input-number v-model:value="aiForm.temperature" :disabled="!canEditAi" :min="0" :max="2" :step="0.1" class="full-input" />
          </a-form-item>
        </a-form>
      </section>

      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">提示词设置</div>
            <div class="settings-section-title">评论分析提示词</div>
          </div>
          <a-space>
            <a-button :disabled="!canEditAi" @click="resetDefaultPrompts">恢复默认提示词</a-button>
            <a-button type="primary" :disabled="!canEditAi" :loading="savingAi" @click="saveAiSettings">保存设置</a-button>
          </a-space>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item label="系统提示词">
            <a-textarea v-model:value="aiForm.systemPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 3, maxRows: 6 }" />
          </a-form-item>
          <a-form-item label="评论分析提示词模板">
            <a-textarea v-model:value="aiForm.userPromptTemplate" :disabled="!canEditAi" :auto-size="{ minRows: 12, maxRows: 20 }" />
          </a-form-item>
          <a-form-item label="总体总结提示词">
            <a-textarea v-model:value="aiForm.summaryPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 6, maxRows: 12 }" />
          </a-form-item>
          <a-form-item label="产品洞察提示词">
            <a-textarea v-model:value="aiForm.insightsPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 8, maxRows: 16 }" />
          </a-form-item>
        </a-form>
        <div class="settings-help">
          可用变量：{taxonomy}、{ratingStar}、{comment}、{commentTr}
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
          <a-button type="primary" :disabled="!canEditAi" :loading="savingCrawler" @click="saveCrawlerSettings">
            保存爬虫设置
          </a-button>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item label="启用链接抓取">
            <a-switch v-model:checked="crawlerForm.enabled" :disabled="!canEditAi" />
          </a-form-item>
          <a-form-item label="Python 命令">
            <a-input v-model:value="crawlerForm.pythonBin" :disabled="!canEditAi" placeholder="python 或 C:\\Python312\\python.exe" />
          </a-form-item>
          <a-form-item label="代理地址">
            <a-input v-model:value="crawlerForm.proxyUrl" :disabled="!canEditAi" placeholder="例如：http://127.0.0.1:7890" />
          </a-form-item>
          <a-form-item label="Shopee Cookie">
            <a-input-password
              v-model:value="crawlerForm.shopeeCookie"
              :disabled="!canEditAi"
              :placeholder="crawlerForm.shopeeCookieSet ? `已保存（${crawlerForm.shopeeCookie || '已隐藏'}），输入新 Cookie 可替换` : '可选，用于减少风控拦截'"
            />
          </a-form-item>
          <a-form-item label="抓取渠道">
            <a-checkbox-group v-model:value="crawlerForm.crawlChannels" :disabled="!canEditAi" class="crawler-channel-list">
              <a-checkbox v-for="channel in CRAWLER_CHANNEL_PRESETS" :key="channel.id" :value="channel.id">
                <span class="channel-title">{{ channel.label }}</span>
                <span class="channel-desc">{{ channel.description }}</span>
              </a-checkbox>
            </a-checkbox-group>
          </a-form-item>
          <a-form-item label="默认来源渠道">
            <a-input v-model:value="crawlerForm.defaultSourceChannel" :disabled="!canEditAi" placeholder="Shopee" />
          </a-form-item>
          <a-form-item label="默认抓取条数">
            <a-input-number v-model:value="crawlerForm.defaultMaxReviews" :disabled="!canEditAi" :min="1" :max="1000" class="full-input" />
          </a-form-item>
          <a-form-item label="超时时间（秒）">
            <a-input-number v-model:value="crawlerForm.requestTimeoutSec" :disabled="!canEditAi" :min="30" :max="900" class="full-input" />
          </a-form-item>
        </a-form>
        <div class="settings-help">
          这些设置只作用于当前空间的“链接抓取”导入。Cookie 和代理会传给本地 Scrapling 脚本，不会展示明文。
        </div>
      </section>
    </div>

    <div v-if="activeSection === 'workspace'" class="table-shell">
      <a-table :columns="columns" :data-source="workspaces" row-key="id" :pagination="false">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="member-name">{{ record.name }}</div>
            <div class="member-email">{{ record.slug }}</div>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag color="blue">{{ roleLabel(record.role) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'usage'">
            {{ record.currentPeriodReviewCount }}/{{ record.monthlyReviewLimit }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button size="small" :disabled="record.slug === workspace?.slug" @click="switchTo(record.slug)">
                切换
              </a-button>
              <a-popconfirm
                title="确定删除这个工作空间吗？"
                description="删除后空间内的任务、评论、分析结果和成员关系都会被移除。"
                ok-text="删除"
                cancel-text="取消"
                placement="left"
                @confirm="removeWorkspace(record.id)"
              >
                <a-button size="small" danger :disabled="!canDeleteWorkspace(record)">删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      :open="modalOpen"
      title="新建租户空间"
      ok-text="创建"
      cancel-text="取消"
      :confirm-loading="saving"
      @ok="submit"
      @cancel="modalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="空间名称">
          <a-input v-model:value="form.name" placeholder="例如：品牌运营团队" />
        </a-form-item>
        <a-form-item label="空间标识">
          <a-input v-model:value="form.slug" placeholder="可选，例如：brand-ops" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { message } from "ant-design-vue";
import {
  AI_PROVIDER_PRESETS,
  CRAWLER_CHANNEL_PRESETS,
  DEFAULT_INSIGHTS_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT_TEMPLATE
} from "@review-ai/shared";
import type { MemberRole, WorkspaceAiSettingDTO, WorkspaceCrawlerSettingDTO } from "@review-ai/shared";
import {
  createWorkspace,
  deleteWorkspace,
  fetchWorkspaceAiSettings,
  fetchWorkspaceCrawlerSettings,
  updateWorkspaceAiSettings,
  updateWorkspaceCrawlerSettings
} from "@/api";
import { useTaskStore } from "@/composables";

const { workspace, workspaces, currentUser, refreshTasks, switchWorkspace } = useTaskStore();
const route = useRoute();
const modalOpen = ref(false);
const saving = ref(false);
const deletingWorkspaceId = ref("");
const loadingAi = ref(false);
const savingAi = ref(false);
const savingCrawler = ref(false);
const form = reactive({
  name: "",
  slug: ""
});
const aiForm = reactive<WorkspaceAiSettingDTO>({
  provider: "openai",
  apiKey: null,
  apiKeySet: false,
  baseUrl: null,
  modelName: "gpt-4.1-mini",
  promptVersion: "v2-thai",
  systemPrompt: "",
  userPromptTemplate: "",
  summaryPrompt: "",
  insightsPrompt: "",
  temperature: 0.2,
  updatedAt: null
});
const crawlerForm = reactive<WorkspaceCrawlerSettingDTO>({
  enabled: true,
  pythonBin: "python",
  proxyUrl: null,
  shopeeCookie: null,
  shopeeCookieSet: false,
  crawlChannels: ["api_exporter", "api_basic", "browser_intercept"],
  defaultSourceChannel: "Shopee",
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
  return "空间设置";
});
const pageSubtitle = computed(() => {
  if (activeSection.value === "ai") {
    return "配置当前空间的模型供应商、接口密钥和评论分析提示词。";
  }
  if (activeSection.value === "crawler") {
    return "配置当前空间的 Scrapling 评论抓取渠道、代理、Cookie 和默认抓取参数。";
  }
  return "管理当前租户空间、成员角色视图和额度使用情况。";
});
const canEditAi = computed(() => {
  return Boolean(currentUser.value?.isSuperAdmin || currentRole.value === "owner" || currentRole.value === "admin");
});
const currentProvider = computed(() => AI_PROVIDER_PRESETS.find((item) => item.id === aiForm.provider) || null);
const providerModels = computed(() => {
  const models = currentProvider.value?.models || [];
  return models.includes(aiForm.modelName) ? models : [aiForm.modelName, ...models].filter(Boolean);
});

const reviewUsagePercent = computed(() => {
  if (!workspace.value?.monthlyReviewLimit) {
    return 0;
  }
  return Math.min(
    Math.round((workspace.value.currentPeriodReviewCount / workspace.value.monthlyReviewLimit) * 100),
    100
  );
});

const runUsagePercent = computed(() => {
  if (!workspace.value?.monthlyRunLimit) {
    return 0;
  }
  return Math.min(Math.round((workspace.value.currentPeriodRunCount / workspace.value.monthlyRunLimit) * 100), 100);
});

const columns = [
  { title: "空间", key: "name", width: 320 },
  { title: "角色", key: "role", width: 140 },
  { title: "套餐", dataIndex: "planTier", key: "planTier", width: 120 },
  { title: "评论用量", key: "usage", width: 180 },
  { title: "操作", key: "action", width: 180 }
];

function assignAiForm(data: WorkspaceAiSettingDTO) {
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
  aiForm.temperature = data.temperature;
  aiForm.updatedAt = data.updatedAt;
}

function assignCrawlerForm(data: WorkspaceCrawlerSettingDTO) {
  crawlerForm.enabled = data.enabled;
  crawlerForm.pythonBin = data.pythonBin;
  crawlerForm.proxyUrl = data.proxyUrl;
  crawlerForm.shopeeCookie = data.shopeeCookie;
  crawlerForm.shopeeCookieSet = data.shopeeCookieSet;
  crawlerForm.crawlChannels = data.crawlChannels;
  crawlerForm.defaultSourceChannel = data.defaultSourceChannel;
  crawlerForm.defaultMaxReviews = data.defaultMaxReviews;
  crawlerForm.requestTimeoutSec = data.requestTimeoutSec;
  crawlerForm.updatedAt = data.updatedAt;
}

function resetDefaultPrompts() {
  aiForm.systemPrompt = DEFAULT_SYSTEM_PROMPT;
  aiForm.userPromptTemplate = DEFAULT_USER_PROMPT_TEMPLATE;
  aiForm.summaryPrompt = DEFAULT_SUMMARY_PROMPT;
  aiForm.insightsPrompt = DEFAULT_INSIGHTS_PROMPT;
  message.success("已恢复默认提示词，保存后生效");
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
  loadingAi.value = true;
  try {
    const [aiSettings, crawlerSettings] = await Promise.all([
      fetchWorkspaceAiSettings(),
      fetchWorkspaceCrawlerSettings()
    ]);
    assignAiForm(aiSettings);
    assignCrawlerForm(crawlerSettings);
  } catch {
    message.error("空间设置加载失败");
  } finally {
    loadingAi.value = false;
  }
}

async function saveAiSettings() {
  savingAi.value = true;
  try {
    assignAiForm(await updateWorkspaceAiSettings({ ...aiForm }));
    message.success("AI 设置已保存");
  } catch {
    message.error("AI 设置保存失败，请检查权限或输入内容");
  } finally {
    savingAi.value = false;
  }
}

async function saveCrawlerSettings() {
  if (!crawlerForm.crawlChannels.length) {
    message.error("请至少选择一个抓取渠道");
    return;
  }
  savingCrawler.value = true;
  try {
    assignCrawlerForm(await updateWorkspaceCrawlerSettings({ ...crawlerForm }));
    message.success("爬虫设置已保存");
  } catch {
    message.error("爬虫设置保存失败，请检查权限或输入内容");
  } finally {
    savingCrawler.value = false;
  }
}

async function switchTo(slug: string) {
  await switchWorkspace(slug);
  message.success("空间已切换");
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
    message.success(`工作空间「${target?.name || "已选空间"}」已删除`);
  } catch {
    message.error("删除工作空间失败，请检查权限或稍后重试");
  } finally {
    deletingWorkspaceId.value = "";
  }
}

async function submit() {
  if (!form.name.trim()) {
    message.error("请填写空间名称");
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
    message.success("空间已创建");
    form.name = "";
    form.slug = "";
    modalOpen.value = false;
  } catch {
    message.error("空间创建失败，请稍后重试");
  } finally {
    saving.value = false;
  }
}

watch(
  () => workspace.value?.slug,
  () => {
    if (workspace.value?.slug) {
      loadAiSettings();
    }
  }
);

onMounted(loadAiSettings);
</script>
