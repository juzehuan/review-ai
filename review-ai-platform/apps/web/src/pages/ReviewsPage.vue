<template>
  <div v-if="!selectedTask" class="empty-state">
    <a-empty description="先创建分析项目并导入评论 CSV" />
  </div>

  <div v-else class="review-page">
    <div class="page-toolbar review-hero">
      <div class="toolbar-title-block">
        <div class="toolbar-title">评论列表</div>
        <div class="toolbar-subtitle">筛选、分组、保存视图，并把 AI 分析结果沉淀为团队可复用的评论视图。</div>
      </div>
      <a-space wrap>
        <a-button @click="loadRuns">
          <template #icon><ReloadOutlined /></template>
          刷新状态
        </a-button>
        <a-button type="primary" @click="runAnalysis" :loading="running">
          <template #icon><RobotOutlined /></template>
          发起分析
        </a-button>
        <a-button v-if="canCancelRun" danger @click="cancelAnalysis">
          <template #icon><StopOutlined /></template>
          停止分析
        </a-button>
        <a-select
          v-if="resultRuns.length"
          v-model:value="selectedResultRunId"
          class="filter-select-lg"
          placeholder="分析批次"
          @change="loadReviews"
        >
          <a-select-option v-for="run in resultRuns" :key="run.id" :value="run.id">
            {{ run.modelName }} · {{ formatRunTime(run.finishedAt || run.startedAt) }}
          </a-select-option>
        </a-select>
        <a-tag :color="runStatusColor(latestRun?.status)">
          {{ latestRun ? `最新分析：${runStatusLabel(latestRun.status)}` : "尚未分析" }}
        </a-tag>
      </a-space>
    </div>

    <div v-if="latestRun" class="analysis-progress-panel">
      <div class="analysis-progress-head">
        <span>{{ runStatusLabel(latestRun.status) }}</span>
        <span>{{ latestRun.successCount }}/{{ latestRun.reviewCount || 0 }} 完成，{{ latestRun.failedCount }} 失败</span>
      </div>
      <a-progress :percent="progressPercent" :status="progressStatus" />
      <div v-if="latestRun.lastError" class="analysis-progress-error">{{ latestRun.lastError }}</div>
    </div>

    <a-alert
      v-if="evidenceIssue || evidenceReviewIds.length"
      type="info"
      show-icon
      class="evidence-alert"
      :message="evidenceAlertMessage"
    >
      <template #action>
        <a-button size="small" @click="clearEvidenceFilter">清除筛选</a-button>
      </template>
    </a-alert>

    <div class="analysis-progress-panel">
      <div class="analysis-progress-head">
        <span>行动项</span>
        <a-button size="small" @click="loadActionItems">刷新</a-button>
      </div>
      <a-empty v-if="!actionItems.length" description="暂无行动项" />
      <div v-else class="view-strip">
        <button v-for="item in actionItems.slice(0, 8)" :key="item.id" type="button" class="view-pill">
          <span>{{ item.title }}</span>
          <a-tag :color="item.priority === 'high' ? 'red' : 'blue'">{{ item.priority }}</a-tag>
          <a-tag>{{ item.status }}</a-tag>
        </button>
      </div>
    </div>

    <div class="view-strip">
      <button
        v-for="view in savedViews"
        :key="view.id"
        type="button"
        class="view-pill"
        :class="{ 'view-pill-active': activeViewId === view.id }"
        @click="applySavedView(view.id)"
      >
        <span>{{ view.name }}</span>
        <a-tag v-if="view.isDefault" color="blue">默认</a-tag>
      </button>
      <button type="button" class="view-pill view-pill-ghost" @click="clearActiveView">临时视图</button>
    </div>

    <div class="review-stats-grid">
      <div class="mini-stat-card mini-stat-warm">
        <div class="mini-stat-label">筛选结果</div>
        <div class="mini-stat-value">{{ totalCount }}</div>
      </div>
      <div class="mini-stat-card mini-stat-cool">
        <div class="mini-stat-label">当前载入</div>
        <div class="mini-stat-value">{{ rows.length }}</div>
      </div>
      <div class="mini-stat-card mini-stat-ink">
        <div class="mini-stat-label">带媒体评论</div>
        <div class="mini-stat-value">{{ mediaCount }}</div>
      </div>
      <div class="mini-stat-card mini-stat-alert">
        <div class="mini-stat-label">负向评论</div>
        <div class="mini-stat-value">{{ negativeCount }}</div>
      </div>
    </div>

    <div class="page-toolbar review-controls">
      <a-space wrap>
        <a-select v-model:value="filters.ratingStar" allow-clear placeholder="星级" class="filter-select-sm">
          <a-select-option v-for="star in [1, 2, 3, 4, 5]" :key="star" :value="star">{{ star }} 星</a-select-option>
        </a-select>

        <a-select v-model:value="filters.sentiment" allow-clear placeholder="情感" class="filter-select">
          <a-select-option value="positive">正向</a-select-option>
          <a-select-option value="neutral">中性</a-select-option>
          <a-select-option value="negative">负向</a-select-option>
        </a-select>

        <a-select v-model:value="filters.intent" allow-clear placeholder="评论意图" class="filter-select">
          <a-select-option v-for="intent in intentOptions" :key="intent" :value="intent">{{ intent }}</a-select-option>
        </a-select>

        <a-select v-model:value="filters.hasMedia" allow-clear placeholder="媒体" class="filter-select">
          <a-select-option :value="true">有图/视频</a-select-option>
          <a-select-option :value="false">纯文本</a-select-option>
        </a-select>

        <a-input v-model:value="filters.keyword" placeholder="关键词或标签" class="filter-input" allow-clear>
          <template #prefix><SearchOutlined /></template>
        </a-input>

        <a-select v-model:value="groupBy" class="filter-select-lg">
          <a-select-option value="sentiment">按情感分组</a-select-option>
          <a-select-option value="ratingStar">按星级分组</a-select-option>
          <a-select-option value="analysisTag">按 AI 标签分组</a-select-option>
          <a-select-option value="intent">按评论意图分组</a-select-option>
        </a-select>

        <a-segmented v-model:value="viewMode" :options="viewOptions" />

        <a-dropdown>
          <a-button>
            <template #icon><SettingOutlined /></template>
            列
          </a-button>
          <template #overlay>
            <div class="column-menu">
              <a-checkbox-group v-model:value="visibleColumnKeys" :options="columnOptions" />
            </div>
          </template>
        </a-dropdown>

        <a-button type="primary" ghost @click="loadReviews" :loading="loading">筛选</a-button>
        <a-button :disabled="!activeFilterCount" @click="resetFilters">重置</a-button>
        <a-tag v-if="activeFilterCount" color="blue">已启用 {{ activeFilterCount }} 个筛选</a-tag>
        <a-button @click="saveCurrentView">
          <template #icon><SaveOutlined /></template>
          保存视图
        </a-button>
        <a-button @click="handleExport" :loading="exporting">
          <template #icon><DownloadOutlined /></template>
          导出当前结果
        </a-button>
        <a-button @click="setCurrentAsDefault" :disabled="!activeViewId">
          <template #icon><StarOutlined /></template>
          设为默认
        </a-button>
      </a-space>
    </div>

    <div v-if="viewMode === 'table'" class="table-shell">
      <a-table
        :columns="visibleColumns"
        :data-source="rows"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: 1280 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'ratingStar'">
            <a-rate :value="record.ratingStar" disabled />
          </template>
          <template v-else-if="column.key === 'analysisTags'">
            <a-space wrap>
              <a-tag v-for="tag in record.analysisTags" :key="tag">{{ tag }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'sentiment'">
            <a-tag :color="sentimentColor(record.sentiment)">{{ sentimentLabel(record.sentiment) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'intentLabels'">
            <a-space wrap>
              <a-tag v-for="intent in record.intentLabels" :key="intent" color="blue">{{ intent }}</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.key === 'comment'">
            <a class="table-comment-link" @click="selectedRow = record">{{ truncate(record.comment, 72) }}</a>
          </template>
          <template v-else-if="column.key === 'hasMedia'">
            <a-tag :color="record.hasMedia ? 'blue' : 'default'">{{ record.hasMedia ? "有" : "无" }}</a-tag>
          </template>
          <template v-else>
            {{ displayCell(record, column.key) }}
          </template>
        </template>
      </a-table>
    </div>

    <div v-else class="group-list">
      <div v-for="group in groupedRows" :key="group.key" class="group-card">
        <div class="group-header">
          <div>
            <div class="group-title">{{ group.label }}</div>
            <div class="group-subtitle">共 {{ group.items.length }} 条评论</div>
          </div>
          <a-tag color="blue">{{ group.items.length }}</a-tag>
        </div>

        <div class="group-items">
          <div v-for="item in group.items.slice(0, 6)" :key="item.id" class="group-item" @click="selectedRow = item">
            <div class="group-item-top">
              <span>{{ item.commentTime || "-" }}</span>
              <a-rate :value="item.ratingStar" disabled />
            </div>
            <div class="group-item-summary">{{ item.summary || truncate(item.comment, 96) }}</div>
            <div class="group-item-tags">
              <a-tag :color="sentimentColor(item.sentiment)">{{ sentimentLabel(item.sentiment) }}</a-tag>
              <a-tag v-for="tag in item.analysisTags.slice(0, 3)" :key="tag">{{ tag }}</a-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <a-drawer :open="Boolean(selectedRow)" width="680" title="评论详情" @close="selectedRow = null">
      <template v-if="selectedRow">
        <a-descriptions bordered :column="1" size="small">
          <a-descriptions-item label="评论 ID">{{ selectedRow.cmtId }}</a-descriptions-item>
          <a-descriptions-item label="评分">{{ selectedRow.ratingStar }}</a-descriptions-item>
          <a-descriptions-item label="规格">{{ selectedRow.variantName || "-" }}</a-descriptions-item>
          <a-descriptions-item label="来源">{{ selectedRow.sourceChannel }}</a-descriptions-item>
          <a-descriptions-item label="评论时间">{{ selectedRow.commentTime || "-" }}</a-descriptions-item>
          <a-descriptions-item label="媒体">{{ selectedRow.hasMedia ? "有" : "无" }}</a-descriptions-item>
          <a-descriptions-item label="原始评论">{{ selectedRow.comment }}</a-descriptions-item>
          <a-descriptions-item label="翻译评论">{{ selectedRow.commentTr || "-" }}</a-descriptions-item>
          <a-descriptions-item label="AI 摘要">{{ selectedRow.summary || "-" }}</a-descriptions-item>
          <a-descriptions-item label="AI 情感">{{ sentimentLabel(selectedRow.sentiment) }}</a-descriptions-item>
          <a-descriptions-item label="AI 标签">{{ selectedRow.analysisTags.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="评论意图">{{ selectedRow.intentLabels.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="关键词">{{ selectedRow.keywords.join("、") || "-" }}</a-descriptions-item>
          <a-descriptions-item label="问题点">{{ selectedRow.painPoints.join("、") || "-" }}</a-descriptions-item>
        </a-descriptions>
        <div class="drawer-actions">
          <a-button type="primary" @click="createActionFromSelectedRow">转为行动项</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      :open="saveViewModalOpen"
      title="保存筛选视图"
      ok-text="保存"
      cancel-text="取消"
      @ok="confirmSaveView"
      @cancel="saveViewModalOpen = false"
    >
      <a-form layout="vertical">
        <a-form-item label="视图名称">
          <a-input v-model:value="pendingViewName" placeholder="例如：负向问题评论 / 5 星好评 / 带图评论" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { message } from "ant-design-vue";
import {
  DownloadOutlined,
  ReloadOutlined,
  RobotOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  StarOutlined,
  StopOutlined
} from "@ant-design/icons-vue";
import type { AnalysisRunDTO, ReviewActionItemDTO, ReviewRowDTO, SavedReviewViewDTO, Sentiment } from "@review-ai/shared";
import {
  cancelRun,
  createActionItem,
  createRun,
  createSavedView,
  exportReviews,
  fetchActionItems,
  fetchReviews,
  fetchRuns,
  fetchSavedViews,
  updateSavedView
} from "@/api";
import { useTaskStore } from "@/composables";

type PaginationConfig = {
  current?: number;
  pageSize?: number;
  total?: number;
};

type SorterConfig = {
  field?: string;
  order?: "ascend" | "descend";
};

type ColumnKey =
  | "cmtId"
  | "productName"
  | "variantName"
  | "comment"
  | "commentTime"
  | "ratingStar"
  | "sourceChannel"
  | "hasMedia"
  | "analysisTags"
  | "intentLabels"
  | "sentiment";

type SavedView = {
  id: string;
  name: string;
  isDefault: boolean;
  filters: {
    ratingStar?: number;
    sentiment?: string;
    intent?: string;
    hasMedia?: boolean;
    keyword: string;
  };
  groupBy: "sentiment" | "ratingStar" | "analysisTag" | "intent";
  viewMode: "table" | "grouped";
  sortBy: string;
  sortOrder: "asc" | "desc";
  visibleColumnKeys: ColumnKey[];
};

const DEFAULT_VIEW_ID = "all-comments";
const route = useRoute();
const router = useRouter();
const { selectedTask, setSelectedTask } = useTaskStore();
const loading = ref(false);
const running = ref(false);
const rows = ref<ReviewRowDTO[]>([]);
const allRuns = ref<AnalysisRunDTO[]>([]);
const latestRun = ref<AnalysisRunDTO | null>(null);
const selectedResultRunId = ref<string | undefined>();
const evidenceIssue = ref("");
const evidenceReviewIds = ref<string[]>([]);
const actionItems = ref<ReviewActionItemDTO[]>([]);
const selectedRow = ref<ReviewRowDTO | null>(null);
const exporting = ref(false);
const saveViewModalOpen = ref(false);
const pendingViewName = ref("");
const activeViewId = ref<string>("");
const savedViews = ref<SavedView[]>([]);
const pagination = reactive<PaginationConfig>({
  current: 1,
  pageSize: 10,
  total: 0
});

const filters = reactive({
  ratingStar: undefined as number | undefined,
  sentiment: undefined as string | undefined,
  intent: undefined as string | undefined,
  hasMedia: undefined as boolean | undefined,
  keyword: ""
});

const viewMode = ref<"table" | "grouped">("table");
const groupBy = ref<"sentiment" | "ratingStar" | "analysisTag" | "intent">("sentiment");
const sortState = reactive({
  sortBy: "commentTime",
  sortOrder: "desc" as "asc" | "desc"
});

const viewOptions = [
  { label: "表格", value: "table" },
  { label: "分组", value: "grouped" }
];

const allColumns = [
  { title: "编号", dataIndex: "cmtId", key: "cmtId", width: 140 },
  { title: "商品名称", dataIndex: "productName", key: "productName", width: 200 },
  { title: "规格/颜色", dataIndex: "variantName", key: "variantName", width: 140 },
  { title: "用户评价", dataIndex: "comment", key: "comment", width: 380 },
  { title: "评论时间", dataIndex: "commentTime", key: "commentTime", width: 180, sorter: true },
  { title: "评级", dataIndex: "ratingStar", key: "ratingStar", width: 160, sorter: true },
  { title: "渠道", dataIndex: "sourceChannel", key: "sourceChannel", width: 120 },
  { title: "媒体", dataIndex: "hasMedia", key: "hasMedia", width: 100 },
  { title: "AI 标签", dataIndex: "analysisTags", key: "analysisTags", width: 220 },
  { title: "评论意图", dataIndex: "intentLabels", key: "intentLabels", width: 200 },
  { title: "AI 情感", dataIndex: "sentiment", key: "sentiment", width: 120, sorter: true }
] as const;

const columnOptions = allColumns.map((column) => ({ label: column.title, value: column.key }));
const visibleColumnKeys = ref<ColumnKey[]>(allColumns.map((column) => column.key));
const intentOptions = computed(() =>
  [...new Set(rows.value.flatMap((item) => item.intentLabels || []))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN"))
);
const totalCount = computed(() => pagination.total || 0);
const mediaCount = computed(() => rows.value.filter((item) => item.hasMedia).length);
const negativeCount = computed(() => rows.value.filter((item) => item.sentiment === "negative").length);
const visibleColumns = computed(() => allColumns.filter((column) => visibleColumnKeys.value.includes(column.key)));
const activeFilterCount = computed(() =>
  [filters.ratingStar, filters.sentiment, filters.intent, filters.hasMedia, filters.keyword.trim()].filter((value) => value !== undefined && value !== "").length
);
const canCancelRun = computed(() => Boolean(latestRun.value && ["queued", "running"].includes(latestRun.value.status)));
const resultRuns = computed(() => allRuns.value.filter((run) => ["completed", "partial_failed"].includes(run.status)));
const progressPercent = computed(() => {
  if (!latestRun.value?.reviewCount) {
    return 0;
  }
  return Math.min(Math.round((latestRun.value.successCount / latestRun.value.reviewCount) * 100), 100);
});
const progressStatus = computed(() => {
  if (latestRun.value?.status === "failed") {
    return "exception";
  }
  if (latestRun.value?.status === "completed") {
    return "success";
  }
  return "active";
});
const evidenceAlertMessage = computed(() => {
  if (evidenceReviewIds.value.length) {
    return `正在查看行动项关联的 ${evidenceReviewIds.value.length} 条评论证据`;
  }
  return `正在查看「${evidenceIssue.value}」相关评论证据`;
});

let pollTimer: ReturnType<typeof setInterval> | null = null;
const applyingSavedView = ref(false);

const groupedRows = computed(() => {
  const groups = new Map<string, { key: string; label: string; items: ReviewRowDTO[] }>();

  for (const row of rows.value) {
    if (groupBy.value === "sentiment") {
      const key = row.sentiment || "unknown";
      addGroupItem(groups, key, sentimentLabel(row.sentiment), row);
      continue;
    }

    if (groupBy.value === "ratingStar") {
      const key = String(row.ratingStar);
      addGroupItem(groups, key, `${row.ratingStar} 星`, row);
      continue;
    }

    if (groupBy.value === "intent") {
      const intents = row.intentLabels.length ? row.intentLabels : ["未识别意图"];
      for (const intent of intents) {
        addGroupItem(groups, intent, intent, row);
      }
      continue;
    }

    const tags = row.analysisTags.length ? row.analysisTags : ["未打标"];
    for (const tag of tags) {
      addGroupItem(groups, tag, tag, row);
    }
  }

  return [...groups.values()].sort((a, b) => b.items.length - a.items.length);
});

function addGroupItem(
  groups: Map<string, { key: string; label: string; items: ReviewRowDTO[] }>,
  key: string,
  label: string,
  row: ReviewRowDTO
) {
  if (!groups.has(key)) {
    groups.set(key, { key, label, items: [] });
  }
  groups.get(key)!.items.push(row);
}

function buildDefaultView(): SavedView {
  return {
    id: DEFAULT_VIEW_ID,
    name: "全部评论",
    isDefault: true,
    filters: { keyword: "" },
    groupBy: "sentiment",
    viewMode: "table",
    sortBy: "commentTime",
    sortOrder: "desc",
    visibleColumnKeys: allColumns.map((column) => column.key)
  };
}

function savedViewFromDto(view: SavedReviewViewDTO): SavedView {
  const filters = view.filters as SavedView["filters"];
  return {
    id: view.id,
    name: view.name,
    isDefault: view.isDefault,
    filters: {
      ratingStar: typeof filters.ratingStar === "number" ? filters.ratingStar : undefined,
      sentiment: typeof filters.sentiment === "string" ? filters.sentiment : undefined,
      intent: typeof filters.intent === "string" ? filters.intent : undefined,
      hasMedia: typeof filters.hasMedia === "boolean" ? filters.hasMedia : undefined,
      keyword: typeof filters.keyword === "string" ? filters.keyword : ""
    },
    groupBy: ["sentiment", "ratingStar", "analysisTag", "intent"].includes(view.groupBy)
      ? (view.groupBy as SavedView["groupBy"])
      : "sentiment",
    viewMode: view.viewMode === "grouped" ? "grouped" : "table",
    sortBy: view.sortBy || "commentTime",
    sortOrder: view.sortOrder === "asc" ? "asc" : "desc",
    visibleColumnKeys: view.visibleColumnKeys.filter((key): key is ColumnKey =>
      allColumns.some((column) => column.key === key)
    )
  };
}

function snapshotCurrentView(name: string, id?: string): SavedView {
  return {
    id: id || `view-${Date.now()}`,
    name,
    isDefault: false,
    filters: {
      ratingStar: filters.ratingStar,
      sentiment: filters.sentiment,
      intent: filters.intent,
      hasMedia: filters.hasMedia,
      keyword: filters.keyword
    },
    groupBy: groupBy.value,
    viewMode: viewMode.value,
    sortBy: sortState.sortBy,
    sortOrder: sortState.sortOrder,
    visibleColumnKeys: [...visibleColumnKeys.value]
  };
}

async function loadSavedViews() {
  if (!selectedTask.value) {
    return;
  }
  const serverViews = await fetchSavedViews(selectedTask.value.id);
  savedViews.value = serverViews.length ? serverViews.map(savedViewFromDto) : [buildDefaultView()];
  const defaultView = savedViews.value.find((item) => item.isDefault) || savedViews.value[0];
  activeViewId.value = defaultView.id;
  applyView(defaultView);
}

function applyView(view: SavedView) {
  applyingSavedView.value = true;
  filters.ratingStar = view.filters.ratingStar;
  filters.sentiment = view.filters.sentiment;
  filters.intent = view.filters.intent;
  filters.hasMedia = view.filters.hasMedia;
  filters.keyword = view.filters.keyword;
  groupBy.value = view.groupBy;
  viewMode.value = view.viewMode;
  sortState.sortBy = view.sortBy;
  sortState.sortOrder = view.sortOrder;
  visibleColumnKeys.value = [...view.visibleColumnKeys];
  queueMicrotask(() => {
    applyingSavedView.value = false;
  });
}

function applySavedView(viewId: string) {
  const view = savedViews.value.find((item) => item.id === viewId);
  if (!view) {
    return;
  }
  activeViewId.value = view.id;
  applyView(view);
  pagination.current = 1;
  loadReviews();
}

function clearActiveView() {
  activeViewId.value = "";
}

function saveCurrentView() {
  pendingViewName.value = "";
  saveViewModalOpen.value = true;
}

async function confirmSaveView() {
  if (!selectedTask.value) {
    return;
  }
  if (!pendingViewName.value.trim()) {
    message.error("请输入视图名称。");
    return;
  }

  const nextView = snapshotCurrentView(pendingViewName.value.trim());
  const created = await createSavedView(selectedTask.value.id, nextView);
  const createdView = savedViewFromDto(created);
  savedViews.value.push(createdView);
  activeViewId.value = createdView.id;
  saveViewModalOpen.value = false;
  pendingViewName.value = "";
  message.success("视图已保存。");
}

async function setCurrentAsDefault() {
  if (!selectedTask.value || !activeViewId.value) {
    message.warning("请先选择一个已保存视图。");
    return;
  }

  await updateSavedView(selectedTask.value.id, activeViewId.value, { isDefault: true });
  savedViews.value = (await fetchSavedViews(selectedTask.value.id)).map(savedViewFromDto);
  message.success("默认视图已更新。");
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function displayCell(record: ReviewRowDTO, key: ColumnKey) {
  const value = record[key];
  if (Array.isArray(value)) {
    return value.join("、") || "-";
  }
  return value ?? "-";
}

function sentimentLabel(value: Sentiment | null) {
  if (value === "positive") {
    return "正向";
  }
  if (value === "negative") {
    return "负向";
  }
  if (value === "neutral") {
    return "中性";
  }
  return "未分析";
}

function sentimentColor(value: Sentiment | null) {
  if (value === "positive") {
    return "green";
  }
  if (value === "negative") {
    return "red";
  }
  if (value === "neutral") {
    return "gold";
  }
  return "default";
}

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
  return "未知";
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

function formatRunTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function loadRuns() {
  if (!selectedTask.value) {
    latestRun.value = null;
    return;
  }

  const runs = await fetchRuns(selectedTask.value.id);
  allRuns.value = runs;
  latestRun.value = runs[0] || null;
  if (!selectedResultRunId.value || !runs.some((run) => run.id === selectedResultRunId.value)) {
    selectedResultRunId.value = resultRuns.value[0]?.id;
  }

  if (latestRun.value && ["queued", "running"].includes(latestRun.value.status)) {
    running.value = true;
    if (!pollTimer) {
      pollTimer = setInterval(async () => {
        await loadRuns();
        await loadReviews();
        if (!latestRun.value || !["queued", "running"].includes(latestRun.value.status)) {
          running.value = false;
          stopPolling();
          message.success("分析已完成，列表已刷新。");
        }
      }, 5000);
    }
  } else {
    running.value = false;
    stopPolling();
  }
}

async function loadActionItems() {
  if (!selectedTask.value) {
    actionItems.value = [];
    return;
  }
  actionItems.value = await fetchActionItems(selectedTask.value.id, { status: "open" });
}

async function loadReviews() {
  if (!selectedTask.value) {
    return;
  }

  loading.value = true;
  try {
    const pageSize = viewMode.value === "grouped" ? 500 : pagination.pageSize || 10;
    const page = viewMode.value === "grouped" ? 1 : pagination.current || 1;
    const result = await fetchReviews(selectedTask.value.id, {
      page,
      pageSize,
      ratingStar: filters.ratingStar,
      sentiment: filters.sentiment,
      intent: filters.intent,
      hasMedia: filters.hasMedia,
      keyword: filters.keyword || undefined,
      sortBy: sortState.sortBy,
      sortOrder: sortState.sortOrder,
      runId: selectedResultRunId.value,
      issue: evidenceIssue.value || undefined,
      reviewIds: evidenceReviewIds.value.length ? evidenceReviewIds.value.join(",") : undefined
    });
    rows.value = result.items;
    pagination.total = result.total;
    if (viewMode.value === "grouped") {
      pagination.current = 1;
    }
  } finally {
    loading.value = false;
  }
}

async function runAnalysis() {
  if (!selectedTask.value) {
    return;
  }

  running.value = true;
  try {
    await createRun(selectedTask.value.id);
    message.success("分析任务已提交，系统会自动轮询状态。");
    await loadRuns();
  } catch {
    running.value = false;
    message.error("发起分析失败。");
  }
}

async function cancelAnalysis() {
  if (!selectedTask.value || !latestRun.value) {
    return;
  }

  try {
    latestRun.value = await cancelRun(selectedTask.value.id, latestRun.value.id);
    running.value = false;
    stopPolling();
    message.success("分析已停止。");
  } catch {
    message.error("停止分析失败，请稍后重试。");
  }
}

async function createActionFromSelectedRow() {
  if (!selectedTask.value || !selectedRow.value) {
    return;
  }
  const row = selectedRow.value;
  await createActionItem(selectedTask.value.id, {
    runId: selectedResultRunId.value || latestRun.value?.id || null,
    title: row.summary || truncate(row.comment, 48),
    description: row.suggestion || row.comment,
    priority: row.sentiment === "negative" || row.needsAttention ? "high" : "medium",
    source: "review",
    relatedReviewIds: [row.id]
  });
  await loadActionItems();
  message.success("已创建行动项。");
}

async function handleExport() {
  if (!selectedTask.value) {
    return;
  }

  exporting.value = true;
  try {
    const { blob, filename } = await exportReviews(selectedTask.value.id, {
      ratingStar: filters.ratingStar,
      sentiment: filters.sentiment,
      intent: filters.intent,
      hasMedia: filters.hasMedia,
      keyword: filters.keyword || undefined,
      runId: selectedResultRunId.value,
      issue: evidenceIssue.value || undefined,
      reviewIds: evidenceReviewIds.value.length ? evidenceReviewIds.value.join(",") : undefined
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${selectedTask.value.name}-reviews.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    message.error("导出失败，当前筛选条件可能没有评论。");
  } finally {
    exporting.value = false;
  }
}

function resetFilters() {
  filters.ratingStar = undefined;
  filters.sentiment = undefined;
  filters.intent = undefined;
  filters.hasMedia = undefined;
  filters.keyword = "";
  sortState.sortBy = "commentTime";
  sortState.sortOrder = "desc";
  pagination.current = 1;
  clearActiveView();
  loadReviews();
}

function clearEvidenceFilter() {
  evidenceIssue.value = "";
  evidenceReviewIds.value = [];
  if (selectedTask.value) {
    router.replace(`/tasks/${selectedTask.value.id}/reviews`);
  }
  loadReviews();
}

function handleTableChange(next: PaginationConfig, _: unknown, sorter: SorterConfig | SorterConfig[]) {
  pagination.current = next.current || 1;
  pagination.pageSize = next.pageSize || 10;

  const targetSorter = Array.isArray(sorter) ? sorter[0] : sorter;
  if (targetSorter?.field) {
    sortState.sortBy = targetSorter.field === "sentiment" ? "sentimentScore" : String(targetSorter.field);
    sortState.sortOrder = targetSorter.order === "ascend" ? "asc" : "desc";
  }

  clearActiveView();
  loadReviews();
}

watch(
  () => selectedTask.value?.id,
  async (taskId) => {
    pagination.current = 1;
    if (taskId) {
      await loadSavedViews();
    }
    await loadRuns();
    await loadActionItems();
    await loadReviews();
  },
  { immediate: true }
);

watch(
  () => route.params.taskId,
  (taskId) => {
    if (typeof taskId === "string" && taskId !== selectedTask.value?.id) {
      setSelectedTask(taskId);
    }
  },
  { immediate: true }
);

watch(
  () => [route.query.issue, route.query.runId, route.query.reviewIds],
  ([issue, runId, reviewIds]) => {
    evidenceIssue.value = typeof issue === "string" ? issue : "";
    evidenceReviewIds.value =
      typeof reviewIds === "string"
        ? reviewIds
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    if (typeof runId === "string") {
      selectedResultRunId.value = runId;
    }
    pagination.current = 1;
    loadReviews();
  },
  { immediate: true }
);

watch(viewMode, async () => {
  pagination.current = 1;
  if (!applyingSavedView.value) {
    clearActiveView();
  }
  await loadReviews();
});

watch([groupBy, visibleColumnKeys], () => {
  if (!applyingSavedView.value) {
    clearActiveView();
  }
});

watch(
  [() => filters.ratingStar, () => filters.sentiment, () => filters.intent, () => filters.hasMedia, () => filters.keyword],
  () => {
    if (!applyingSavedView.value) {
      clearActiveView();
    }
  }
);

onBeforeUnmount(stopPolling);
</script>
