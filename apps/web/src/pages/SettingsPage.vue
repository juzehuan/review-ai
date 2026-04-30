<template>
  <div class="settings-page">
    <div class="settings-header">
      <div class="settings-title-block">
        <a-button class="back-btn" @click="goBack">
          <template #icon><LeftOutlined /></template>
          返回
        </a-button>
        <div>
          <div class="settings-title">系统设置</div>
          <div class="settings-subtitle">配置 AI 模型平台、API Key 与分析提示词。改动后下一次发起的分析任务会立即生效。</div>
        </div>
      </div>
      <a-button type="primary" :loading="saving" @click="save">
        <template #icon><SaveOutlined /></template>
        保存配置
      </a-button>
    </div>

    <!-- Model config -->
    <div class="settings-card">
      <div class="card-title">
        <ApiOutlined /> 模型平台
        <a-tag v-if="config.apiKeySet" color="success">已配置 Key</a-tag>
        <a-tag v-else color="warning">未配置 Key</a-tag>
      </div>

      <div class="form-grid">
        <div class="form-item">
          <div class="form-label">服务商</div>
          <a-select
            v-model:value="form.provider"
            style="width: 100%"
            @change="onProviderChange"
          >
            <a-select-option v-for="p in PROVIDERS" :key="p.id" :value="p.id">
              {{ p.label }}
            </a-select-option>
          </a-select>
          <div v-if="currentProvider?.notes" class="form-hint warn">{{ currentProvider.notes }}</div>
        </div>

        <div class="form-item">
          <div class="form-label">
            模型名称
            <a-tooltip title="火山引擎可填 Endpoint ID（ep-xxx）或公开模型名">
              <QuestionCircleOutlined class="hint-icon" />
            </a-tooltip>
          </div>
          <a-auto-complete
            v-model:value="form.modelName"
            :options="modelOptions"
            placeholder="例：gpt-4o-mini / doubao-seed-2-0..."
            style="width: 100%"
            allow-clear
          />
        </div>

        <div class="form-item form-item-full">
          <div class="form-label">
            API Key
            <a-tooltip title="保留为空则继续使用之前保存的密钥；只有输入新密钥才会覆盖">
              <QuestionCircleOutlined class="hint-icon" />
            </a-tooltip>
          </div>
          <a-input-password
            v-model:value="form.apiKey"
            :placeholder="config.apiKeySet ? `当前已保存（${config.apiKey || '已加密'}），输入新值覆盖` : currentProvider?.apiKeyHint || '输入 API Key'"
            allow-clear
          />
        </div>

        <div class="form-item form-item-full">
          <div class="form-label">
            自定义 Base URL（可选）
            <a-tooltip title="留空使用所选服务商的默认地址">
              <QuestionCircleOutlined class="hint-icon" />
            </a-tooltip>
          </div>
          <a-input
            v-model:value="form.baseUrl"
            :placeholder="currentProvider?.baseUrl || 'https://api.example.com/v1'"
            allow-clear
          />
        </div>
      </div>
    </div>

    <!-- Prompts -->
    <div class="settings-card">
      <div class="card-title">
        <FileTextOutlined /> 分析提示词
        <a-tag color="blue">支持变量占位符</a-tag>
      </div>

      <div class="prompt-tabs">
        <a-tabs v-model:activeKey="activePromptTab">
          <a-tab-pane key="review" tab="单条评论分析">
            <div class="prompt-meta">
              <div class="meta-vars">
                可用变量：
                <code v-pre>{{taxonomy}}</code>
                <code v-pre>{{rating_star}}</code>
                <code v-pre>{{comment_original}}</code>
                <code v-pre>{{comment_translated}}</code>
              </div>
              <a-button type="link" size="small" @click="resetPrompt('review')">
                <template #icon><ReloadOutlined /></template>
                恢复默认
              </a-button>
            </div>
            <a-textarea
              v-model:value="form.reviewPrompt"
              :rows="14"
              placeholder="自定义单条评论分析的 Prompt"
              :auto-size="{ minRows: 14, maxRows: 30 }"
            />
          </a-tab-pane>

          <a-tab-pane key="summary" tab="AI 智能总结">
            <div class="prompt-meta">
              <div class="meta-vars">
                可用变量：
                <code v-pre>{{review_count}}</code>
                <code v-pre>{{avg_rating}}</code>
                <code v-pre>{{nps}}</code>
                <code v-pre>{{positive_pct}}</code>
                <code v-pre>{{neutral_pct}}</code>
                <code v-pre>{{negative_pct}}</code>
                <code v-pre>{{top_issues}}</code>
                <code v-pre>{{promoters_pct}}</code>
                <code v-pre>{{detractors_pct}}</code>
              </div>
              <a-button type="link" size="small" @click="resetPrompt('summary')">
                <template #icon><ReloadOutlined /></template>
                恢复默认
              </a-button>
            </div>
            <a-textarea
              v-model:value="form.summaryPrompt"
              :rows="10"
              placeholder="自定义 AI 智能总结的 Prompt"
              :auto-size="{ minRows: 10, maxRows: 24 }"
            />
          </a-tab-pane>

          <a-tab-pane key="insights" tab="产品总结（6 卡）">
            <div class="prompt-meta">
              <div class="meta-vars">
                可用变量：
                <code v-pre>{{review_count}}</code>
                <code v-pre>{{avg_rating}}</code>
                <code v-pre>{{nps}}</code>
                <code v-pre>{{top_issues}}</code>
                <code v-pre>{{top_variants}}</code>
                <code v-pre>{{positive_samples}}</code>
                <code v-pre>{{negative_samples}}</code>
                <code v-pre>{{neutral_samples}}</code>
              </div>
              <a-button type="link" size="small" @click="resetPrompt('insights')">
                <template #icon><ReloadOutlined /></template>
                恢复默认
              </a-button>
            </div>
            <a-textarea
              v-model:value="form.insightsPrompt"
              :rows="16"
              placeholder="自定义产品总结的 Prompt"
              :auto-size="{ minRows: 16, maxRows: 36 }"
            />
            <div class="prompt-warn">
              ⚠ 此提示词必须让模型输出包含 6 个字符串字段的 JSON：userPersonas / usageScenarios / sellingPoints / advantages / improvements / expectations。否则前端无法渲染产品总结区。
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import {
  ApiOutlined,
  FileTextOutlined,
  LeftOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SaveOutlined
} from "@ant-design/icons-vue";
import type { AiConfigDTO } from "@review-ai/shared";
import { AI_PROVIDER_PRESETS, DEFAULT_PROMPTS } from "@review-ai/shared";
import { fetchAiConfig, updateAiConfig } from "@/api";

const PROVIDERS = AI_PROVIDER_PRESETS;
const router = useRouter();

function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
}

const config = ref<AiConfigDTO>({
  provider: "volcengine",
  apiKey: null,
  apiKeySet: false,
  baseUrl: null,
  modelName: "",
  reviewPrompt: "",
  summaryPrompt: "",
  insightsPrompt: "",
  updatedAt: ""
});

const form = reactive({
  provider: "volcengine",
  apiKey: "",
  baseUrl: "",
  modelName: "",
  reviewPrompt: "",
  summaryPrompt: "",
  insightsPrompt: ""
});

const saving = ref(false);
const activePromptTab = ref<"review" | "summary" | "insights">("review");

const currentProvider = computed(() => PROVIDERS.find((p) => p.id === form.provider));

const modelOptions = computed(() =>
  (currentProvider.value?.models || []).map((m) => ({ value: m, label: m }))
);

function applyConfig(c: AiConfigDTO) {
  config.value = c;
  form.provider = c.provider;
  form.apiKey = "";
  form.baseUrl = c.baseUrl || "";
  form.modelName = c.modelName;
  form.reviewPrompt = c.reviewPrompt;
  form.summaryPrompt = c.summaryPrompt;
  form.insightsPrompt = c.insightsPrompt;
}

async function load() {
  try {
    const data = await fetchAiConfig();
    applyConfig(data);
  } catch (e) {
    message.error("加载配置失败：" + ((e as Error)?.message || e));
  }
}

function onProviderChange(value: string) {
  const preset = PROVIDERS.find((p) => p.id === value);
  if (preset && (!form.modelName || !preset.models.includes(form.modelName))) {
    form.modelName = preset.models[0] || "";
  }
}

function resetPrompt(which: "review" | "summary" | "insights") {
  if (which === "review") form.reviewPrompt = DEFAULT_PROMPTS.reviewPrompt;
  if (which === "summary") form.summaryPrompt = DEFAULT_PROMPTS.summaryPrompt;
  if (which === "insights") form.insightsPrompt = DEFAULT_PROMPTS.insightsPrompt;
  message.success("已恢复默认提示词，记得点保存。");
}

async function save() {
  saving.value = true;
  try {
    const payload: Record<string, string | undefined> = {
      provider: form.provider,
      modelName: form.modelName,
      baseUrl: form.baseUrl || undefined,
      reviewPrompt: form.reviewPrompt,
      summaryPrompt: form.summaryPrompt,
      insightsPrompt: form.insightsPrompt
    };
    if (form.apiKey && !form.apiKey.includes("*")) {
      payload.apiKey = form.apiKey;
    }
    const updated = await updateAiConfig(payload);
    applyConfig(updated);
    message.success("配置已保存。");
  } catch (e) {
    message.error("保存失败：" + ((e as Error)?.message || e));
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 8px 0 4px;
}

.settings-title-block {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.back-btn {
  margin-top: 4px;
}

.settings-title {
  font-size: 24px;
  font-weight: 800;
  color: #1a2844;
  letter-spacing: -0.02em;
}

.settings-subtitle {
  margin-top: 5px;
  font-size: 13px;
  color: #7b8494;
  max-width: 700px;
  line-height: 1.5;
}

.settings-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(229, 234, 244, 0.95);
  border-radius: 18px;
  padding: 22px 24px;
  box-shadow: 0 6px 22px rgba(26, 38, 64, 0.05);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: #1a2844;
  margin-bottom: 18px;
}

.card-title :deep(.anticon) {
  color: #6366f1;
  font-size: 17px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-item-full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: #4b5d7c;
  display: flex;
  align-items: center;
  gap: 5px;
}

.hint-icon {
  color: #98a1b2;
  font-size: 13px;
  cursor: help;
}

.form-hint {
  font-size: 11px;
  color: #98a1b2;
}

.form-hint.warn {
  color: #b45309;
}

.prompt-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 12px;
}

.prompt-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f6f7fb;
  border-radius: 8px;
}

.meta-vars {
  font-size: 11px;
  color: #6b7280;
  line-height: 1.8;
}

.meta-vars code {
  font-family: "SF Mono", Consolas, monospace;
  font-size: 11px;
  background: #fff;
  border: 1px solid #e5e7eb;
  padding: 1px 6px;
  margin: 0 3px;
  border-radius: 4px;
  color: #4f46e5;
}

.prompt-warn {
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef3c7;
  color: #92400e;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 800px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
