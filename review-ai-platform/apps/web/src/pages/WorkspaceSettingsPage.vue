<template>
  <div class="review-page">
    <div class="page-toolbar dashboard-toolbar">
      <div class="toolbar-title-block">
        <div class="toolbar-title">空间设置</div>
        <div class="toolbar-subtitle">管理当前租户空间、模型策略和分析提示词。</div>
      </div>
      <a-space wrap>
        <a-button @click="loadAiSettings" :loading="loadingAi">刷新</a-button>
        <a-button type="primary" @click="modalOpen = true">新建空间</a-button>
      </a-space>
    </div>

    <div class="settings-grid">
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

    <div class="settings-layout">
      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">模型设置</div>
            <div class="settings-section-title">分析模型</div>
          </div>
          <a-tag :color="canEditAi ? 'blue' : 'default'">{{ canEditAi ? "可编辑" : "只读" }}</a-tag>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item label="Provider">
            <a-select v-model:value="aiForm.provider" :disabled="!canEditAi">
              <a-select-option v-for="provider in AI_PROVIDER_PRESETS" :key="provider.id" :value="provider.id">
                {{ provider.label }}
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="API Key">
            <a-input-password
              v-model:value="aiForm.apiKey"
              :disabled="!canEditAi"
              :placeholder="aiForm.apiKeySet ? `Saved (${aiForm.apiKey || 'masked'}), enter a new key to replace` : currentProvider?.apiKeyHint || 'API Key'"
            />
          </a-form-item>
          <a-form-item label="Base URL">
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
          <a-form-item label="Prompt Version">
            <a-input v-model:value="aiForm.promptVersion" :disabled="!canEditAi" placeholder="例如：v2-thai" />
          </a-form-item>
          <a-form-item label="Temperature">
            <a-input-number v-model:value="aiForm.temperature" :disabled="!canEditAi" :min="0" :max="2" :step="0.1" class="full-input" />
          </a-form-item>
        </a-form>
      </section>

      <section class="settings-panel settings-panel-wide">
        <div class="settings-section-head">
          <div>
            <div class="panel-label">提示词设置</div>
            <div class="settings-section-title">评论分析 Prompt</div>
          </div>
          <a-button type="primary" :disabled="!canEditAi" :loading="savingAi" @click="saveAiSettings">保存设置</a-button>
        </div>
        <a-form layout="vertical" class="settings-form">
          <a-form-item label="System Prompt">
            <a-textarea v-model:value="aiForm.systemPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 3, maxRows: 6 }" />
          </a-form-item>
          <a-form-item label="User Prompt Template">
            <a-textarea v-model:value="aiForm.userPromptTemplate" :disabled="!canEditAi" :auto-size="{ minRows: 12, maxRows: 20 }" />
          </a-form-item>
          <a-form-item label="Summary Prompt">
            <a-textarea v-model:value="aiForm.summaryPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 6, maxRows: 12 }" />
          </a-form-item>
          <a-form-item label="Product Insights Prompt">
            <a-textarea v-model:value="aiForm.insightsPrompt" :disabled="!canEditAi" :auto-size="{ minRows: 8, maxRows: 16 }" />
          </a-form-item>
        </a-form>
        <div class="settings-help">
          可用变量：{taxonomy}、{ratingStar}、{comment}、{commentTr}
        </div>
      </section>
    </div>

    <div class="table-shell">
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
            <a-button size="small" :disabled="record.slug === workspace?.slug" @click="switchTo(record.slug)">
              切换
            </a-button>
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
import { message } from "ant-design-vue";
import { AI_PROVIDER_PRESETS } from "@review-ai/shared";
import type { MemberRole, WorkspaceAiSettingDTO } from "@review-ai/shared";
import { createWorkspace, fetchWorkspaceAiSettings, updateWorkspaceAiSettings } from "@/api";
import { useTaskStore } from "@/composables";

const { workspace, workspaces, currentUser, refreshTasks, switchWorkspace } = useTaskStore();
const modalOpen = ref(false);
const saving = ref(false);
const loadingAi = ref(false);
const savingAi = ref(false);
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

const currentRole = computed(() => workspaces.value.find((item) => item.slug === workspace.value?.slug)?.role || null);
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
  { title: "操作", key: "action", width: 120 }
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
    assignAiForm(await fetchWorkspaceAiSettings());
  } catch {
    message.error("AI 设置加载失败");
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

async function switchTo(slug: string) {
  await switchWorkspace(slug);
  message.success("空间已切换");
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
